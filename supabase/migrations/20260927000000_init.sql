-- Let's Canto — initial schema
-- Every learner-owned row carries user_id and is protected by row-level security,
-- so one account can never read or write another account's data, even if an API
-- route has a bug. Deleting the auth user cascades to all learner data.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Learner profile (onboarding answers + preferences)
-- ---------------------------------------------------------------------------
create table public.learner_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  age_bracket text,
  languages text[] not null default '{}',
  background text,
  cantonese_exposure text,
  self_assessment jsonb not null default '{}'::jsonb,   -- {speaking,listening,reading,pronunciation}: 1..5
  jyutping_familiarity text,
  goals text[] not null default '{}',
  daily_minutes int not null default 30,
  preferences jsonb not null default '{}'::jsonb,       -- {showJyutping,showEnglish,showChinese,audioRate,difficulty}
  difficulty_offset int not null default 0,            -- learner-requested easier (-) / harder (+)
  onboarding_completed_at timestamptz,
  diagnostic_completed_at timestamptz,
  recording_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adult-managed family profile: children are described, never registered.
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null,
  age_band text not null,          -- '0-2' | '3-5' | '6-8' | '9-12' | '13+'
  interests text,
  created_at timestamptz not null default now()
);
create index on public.family_members (user_id);

-- ---------------------------------------------------------------------------
-- Diagnostic
-- ---------------------------------------------------------------------------
create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  responses jsonb not null,        -- [{itemId, skill, difficulty, correct, skipped}]
  results jsonb not null,          -- {skill: estimate}
  created_at timestamptz not null default now()
);
create index on public.diagnostics (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Curriculum plans (versioned; a goal change creates a new active version)
-- ---------------------------------------------------------------------------
create table public.curriculum_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  version int not null,
  is_active boolean not null default true,
  start_month int not null default 1,        -- placement: advanced learners bypass foundations
  plan jsonb not null,                       -- personalised roadmap (see src/lib/schemas.ts)
  generator text not null,                   -- 'claude:<model>' | 'fallback:v1'
  reason text,                               -- why this version exists
  created_at timestamptz not null default now(),
  unique (user_id, version)
);
create unique index curriculum_plans_one_active on public.curriculum_plans (user_id) where is_active;

-- ---------------------------------------------------------------------------
-- Lessons: generated one at a time from the latest evidence.
-- Completed lessons are immutable (enforced by trigger below).
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.curriculum_plans (id) on delete set null,
  day int not null,                           -- learner pathway day (1, 2, 3 …)
  curriculum_day int not null,                -- position in the 12-month framework
  month int not null,
  week int not null,
  kind text not null default 'daily',         -- 'daily' | 'extra'
  status text not null default 'ready',       -- 'ready' | 'in_progress' | 'completed' | 'superseded'
  content jsonb not null,
  content_version int not null default 1,
  generator text not null,
  review_status text not null default 'unreviewed', -- native-speaker review workflow
  adaptations jsonb not null default '[]'::jsonb,   -- directives + human explanations
  progress jsonb not null default '{}'::jsonb,      -- auto-saved answers for resume
  score numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index lessons_one_daily_per_day on public.lessons (user_id, day)
  where kind = 'daily' and status <> 'superseded';
create index on public.lessons (user_id, created_at desc);

create or replace function public.protect_completed_lessons()
returns trigger language plpgsql as $$
begin
  if old.status = 'completed' and (
       new.content is distinct from old.content
    or new.progress is distinct from old.progress
    or new.score is distinct from old.score
    or new.status is distinct from old.status) then
    raise exception 'Completed lessons are immutable';
  end if;
  return new;
end $$;

create trigger lessons_protect_completed
  before update on public.lessons
  for each row execute function public.protect_completed_lessons();

-- ---------------------------------------------------------------------------
-- Evidence: every answered item. Append-only for learners.
-- ---------------------------------------------------------------------------
create table public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  section text not null,             -- listening | reading | assessment | speaking | review | diagnostic | practice
  item_key text not null,
  skill text not null,
  correct boolean,
  score numeric,                     -- 0..1
  response jsonb,
  vocab_zh text,
  created_at timestamptz not null default now()
);
create index on public.activity_attempts (user_id, created_at desc);
create index on public.activity_attempts (user_id, skill, created_at desc);

-- ---------------------------------------------------------------------------
-- Separate skill estimates (never compressed into a single score)
-- ---------------------------------------------------------------------------
create table public.skill_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null,
  estimate numeric not null,         -- 0..100
  evidence int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);

-- ---------------------------------------------------------------------------
-- Vocabulary knowledge bank with FSRS state for recognition AND production
-- ---------------------------------------------------------------------------
create table public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  zh text not null,
  jyutping text not null,
  en text not null,
  category text,
  example jsonb,                     -- {zh, jyutping, en}
  source_lesson_id uuid references public.lessons (id) on delete set null,
  recognition_card jsonb not null,
  production_card jsonb not null,
  recognition_due timestamptz not null default now(),
  production_due timestamptz not null default now(),
  recognition_last_review timestamptz,
  production_last_review timestamptz,
  lapses int not null default 0,
  pronunciation_notes text,
  bookmarked boolean not null default false,
  personal_note text,
  created_at timestamptz not null default now(),
  unique (user_id, zh)
);
create index on public.user_vocabulary (user_id, recognition_due);
create index on public.user_vocabulary (user_id, production_due);

-- Personal phrase notebook
create table public.phrase_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  zh text not null,
  jyutping text,
  en text,
  note text,
  created_at timestamptz not null default now()
);
create index on public.phrase_notes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Reading & family library (lesson passages + generated family stories)
-- ---------------------------------------------------------------------------
create table public.reading_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family_member_id uuid references public.family_members (id) on delete set null,
  source text not null,              -- 'lesson' | 'family_story'
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  content jsonb not null,
  generator text not null,
  created_at timestamptz not null default now()
);
create index on public.reading_content (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Progress events (lesson completed, goal changed, AI fallback used, …)
-- Also used to rate-limit AI generation per user.
-- ---------------------------------------------------------------------------
create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.progress_events (user_id, type, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security: owner-only access on every table
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'learner_profiles','family_members','diagnostics','curriculum_plans','lessons',
    'activity_attempts','skill_mastery','user_vocabulary','phrase_notes',
    'reading_content','progress_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy "owner insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "owner update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "owner delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Evidence and history are append-only from the learner's side.
drop policy "owner update" on public.activity_attempts;
drop policy "owner delete" on public.activity_attempts;
drop policy "owner update" on public.diagnostics;
drop policy "owner delete" on public.diagnostics;
drop policy "owner update" on public.progress_events;
drop policy "owner delete" on public.progress_events;
