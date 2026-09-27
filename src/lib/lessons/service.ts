import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeDirectives, defaultSkills, targetLevel, updateSkill, type SkillMap } from "../adaptive";
import { aiConfigured, MODEL } from "../ai/claude";
import { generateLesson, type FamilySummary, type LearnerSummary } from "../ai/generators";
import { buildFallbackLesson } from "../curriculum/fallback";
import { positionFor } from "../curriculum/framework";
import type { GeneratedRoadmap, LessonContent, ReviewItem } from "../schemas";
import { isSkill, SKILLS, type Skill } from "../skills";
import { newCard, reviewCard, type ReviewGrade, type StoredCard } from "../srs";

type DB = SupabaseClient;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUserId(db: DB): Promise<string> {
  const { data } = await db.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) throw new HttpError(401, "Not signed in");
  return sub;
}

// ---------------------------------------------------------------------------
// Profile & plan
// ---------------------------------------------------------------------------

export type ProfileRow = {
  user_id: string;
  display_name: string;
  age_bracket: string | null;
  languages: string[];
  background: string | null;
  cantonese_exposure: string | null;
  self_assessment: Record<string, number>;
  jyutping_familiarity: string | null;
  goals: string[];
  daily_minutes: number;
  preferences: Record<string, unknown>;
  difficulty_offset: number;
  onboarding_completed_at: string | null;
  diagnostic_completed_at: string | null;
  recording_consent: boolean;
};

export async function getProfile(db: DB, userId: string): Promise<ProfileRow | null> {
  const { data } = await db.from("learner_profiles").select("*").eq("user_id", userId).maybeSingle();
  return data as ProfileRow | null;
}

export function learnerSummary(p: ProfileRow): LearnerSummary {
  return {
    name: p.display_name,
    ageBracket: p.age_bracket,
    languages: p.languages,
    background: p.background,
    exposure: p.cantonese_exposure,
    goals: p.goals,
    jyutpingFamiliarity: p.jyutping_familiarity,
    dailyMinutes: p.daily_minutes,
    preferences: p.preferences,
  };
}

export async function getFamily(db: DB, userId: string): Promise<(FamilySummary & { id: string })[]> {
  const { data } = await db
    .from("family_members")
    .select("id, nickname, age_band, interests")
    .eq("user_id", userId)
    .order("created_at");
  return (data ?? []) as (FamilySummary & { id: string })[];
}

export type PlanRow = {
  id: string;
  version: number;
  start_month: number;
  plan: GeneratedRoadmap;
  generator: string;
  reason: string | null;
  created_at: string;
};

export async function getActivePlan(db: DB, userId: string): Promise<PlanRow | null> {
  const { data } = await db
    .from("curriculum_plans")
    .select("id, version, start_month, plan, generator, reason, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data as PlanRow | null;
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export async function loadSkills(db: DB, userId: string): Promise<SkillMap> {
  const { data } = await db.from("skill_mastery").select("skill, estimate, evidence").eq("user_id", userId);
  const skills = defaultSkills();
  for (const row of data ?? []) {
    if (isSkill(row.skill)) skills[row.skill] = { estimate: Number(row.estimate), evidence: row.evidence };
  }
  return skills;
}

export async function saveSkills(db: DB, userId: string, skills: Partial<SkillMap>) {
  const rows = Object.entries(skills).map(([skill, s]) => ({
    user_id: userId,
    skill,
    estimate: s!.estimate,
    evidence: s!.evidence,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) await db.from("skill_mastery").upsert(rows);
}

export async function initSkills(db: DB, userId: string, estimates: Record<Skill, number>) {
  const rows = SKILLS.map((skill) => ({ user_id: userId, skill, estimate: estimates[skill], evidence: 0 }));
  await db.from("skill_mastery").upsert(rows);
}

/** Records one piece of evidence and updates the matching skill estimate. */
export async function recordEvidence(
  db: DB,
  userId: string,
  attempt: {
    lessonId: string | null;
    section: string;
    itemKey: string;
    skill: Skill;
    correct: boolean | null;
    score?: number | null;
    response?: unknown;
    vocabZh?: string | null;
  },
) {
  await db.from("activity_attempts").insert({
    user_id: userId,
    lesson_id: attempt.lessonId,
    section: attempt.section,
    item_key: attempt.itemKey,
    skill: attempt.skill,
    correct: attempt.correct,
    score: attempt.score ?? (attempt.correct === null ? null : attempt.correct ? 1 : 0),
    response: attempt.response ?? null,
    vocab_zh: attempt.vocabZh ?? null,
  });
  if (attempt.correct !== null) {
    const skills = await loadSkills(db, userId);
    await saveSkills(db, userId, { [attempt.skill]: updateSkill(skills[attempt.skill], attempt.correct) });
  }
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type VocabRow = {
  id: string;
  zh: string;
  jyutping: string;
  en: string;
  category: string | null;
  example: { zh: string; jyutping: string; en: string } | null;
  recognition_card: StoredCard;
  production_card: StoredCard;
  recognition_due: string;
  production_due: string;
  lapses: number;
  bookmarked: boolean;
  personal_note: string | null;
  source_lesson_id: string | null;
  created_at: string;
};

export async function knownWords(db: DB, userId: string): Promise<string[]> {
  const { data } = await db.from("user_vocabulary").select("zh").eq("user_id", userId).limit(2000);
  return (data ?? []).map((r) => r.zh as string);
}

export async function dueReviewItems(db: DB, userId: string, limit = 8): Promise<ReviewItem[]> {
  const now = new Date().toISOString();
  const { data } = await db
    .from("user_vocabulary")
    .select("id, zh, jyutping, en, recognition_card, recognition_due, production_due")
    .eq("user_id", userId)
    .or(`recognition_due.lte.${now},production_due.lte.${now}`)
    .order("recognition_due")
    .limit(limit * 2);
  const items: ReviewItem[] = [];
  for (const row of data ?? []) {
    const recognitionDue = row.recognition_due <= now;
    const learned = (row.recognition_card as StoredCard).reps >= 2;
    // Production practice only once a word can be recognised reliably.
    const direction = row.production_due <= now && learned ? "production" : recognitionDue ? "recognition" : null;
    if (direction) items.push({ vocabId: row.id, zh: row.zh, jyutping: row.jyutping, en: row.en, direction });
    if (items.length >= limit) break;
  }
  return items;
}

export async function countDue(db: DB, userId: string): Promise<number> {
  const now = new Date().toISOString();
  const { count } = await db
    .from("user_vocabulary")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .or(`recognition_due.lte.${now},production_due.lte.${now}`);
  return count ?? 0;
}

export async function gradeVocab(db: DB, userId: string, vocabId: string, direction: "recognition" | "production", grade: ReviewGrade) {
  const { data: row } = await db
    .from("user_vocabulary")
    .select("id, zh, recognition_card, production_card, lapses")
    .eq("user_id", userId)
    .eq("id", vocabId)
    .maybeSingle();
  if (!row) throw new HttpError(404, "Word not found");
  const card = reviewCard((direction === "recognition" ? row.recognition_card : row.production_card) as StoredCard, grade);
  await db
    .from("user_vocabulary")
    .update({
      [`${direction}_card`]: card,
      [`${direction}_due`]: card.due,
      [`${direction}_last_review`]: new Date().toISOString(),
      lapses: row.lapses + (grade === "again" ? 1 : 0),
    })
    .eq("id", vocabId)
    .eq("user_id", userId);
  return { zh: row.zh as string, card };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export type LessonAnswer = { choice?: number; correct?: boolean; grade?: ReviewGrade; rating?: number; typed?: string; at: string };
export type LessonProgress = { answers: Record<string, LessonAnswer>; viewed: string[] };

export type LessonRow = {
  id: string;
  day: number;
  curriculum_day: number;
  month: number;
  week: number;
  kind: "daily" | "extra";
  status: "ready" | "in_progress" | "completed" | "superseded";
  content: LessonContent;
  generator: string;
  review_status: string;
  adaptations: { code: string; explanation: string }[];
  progress: LessonProgress;
  score: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

const LESSON_COLUMNS =
  "id, day, curriculum_day, month, week, kind, status, content, generator, review_status, adaptations, progress, score, created_at, started_at, completed_at";

export async function getLesson(db: DB, userId: string, id: string): Promise<LessonRow> {
  const { data } = await db.from("lessons").select(LESSON_COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  if (!data) throw new HttpError(404, "Lesson not found");
  return data as LessonRow;
}

const STALE_UNSTARTED_MS = 36 * 3_600_000;

/**
 * Returns the learner's current daily lesson, creating it if needed. Unstarted
 * lessons older than 36 hours are regenerated so they reflect the latest evidence
 * (e.g. a catch-up after missed days).
 */
export async function currentLesson(db: DB, userId: string): Promise<LessonRow> {
  const { data: open } = await db
    .from("lessons")
    .select(LESSON_COLUMNS)
    .eq("user_id", userId)
    .eq("kind", "daily")
    .in("status", ["ready", "in_progress"])
    .order("day")
    .limit(1);
  const existing = open?.[0] as LessonRow | undefined;
  if (existing) {
    const stale = existing.status === "ready" && Date.now() - new Date(existing.created_at).getTime() > STALE_UNSTARTED_MS;
    if (!stale) return existing;
    await db.from("lessons").update({ status: "superseded" }).eq("id", existing.id).eq("user_id", userId);
  }
  const { data: last } = await db
    .from("lessons")
    .select("day")
    .eq("user_id", userId)
    .eq("kind", "daily")
    .eq("status", "completed")
    .order("day", { ascending: false })
    .limit(1);
  const day = (last?.[0]?.day ?? 0) + 1;
  return createLesson(db, userId, day, "daily");
}

async function aiCallsSince(db: DB, userId: string, type: string, hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { count } = await db
    .from("progress_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", since);
  return count ?? 0;
}

export async function checkAiQuota(db: DB, userId: string, type: string, maxPerDay: number): Promise<boolean> {
  return (await aiCallsSince(db, userId, type, 24)) < maxPerDay;
}

export async function logEvent(db: DB, userId: string, type: string, data: Record<string, unknown> = {}) {
  await db.from("progress_events").insert({ user_id: userId, type, data });
}

export async function createLesson(db: DB, userId: string, day: number, kind: "daily" | "extra"): Promise<LessonRow> {
  const [profile, plan, skills, family, known, review, dueCount] = await Promise.all([
    getProfile(db, userId),
    getActivePlan(db, userId),
    loadSkills(db, userId),
    getFamily(db, userId),
    knownWords(db, userId),
    dueReviewItems(db, userId),
    countDue(db, userId),
  ]);
  if (!profile?.diagnostic_completed_at || !plan) throw new HttpError(409, "Finish onboarding and the diagnostic first");

  const [{ data: attempts }, { data: recent }] = await Promise.all([
    db
      .from("activity_attempts")
      .select("skill, correct, lesson_id, item_key, vocab_zh, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("lessons")
      .select("id, day, score, completed_at, content")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5),
  ]);

  const position = positionFor(day, plan.start_month);
  const directives = computeDirectives({
    skills,
    recentAttempts: (attempts ?? []).map((a) => ({
      skill: a.skill,
      correct: a.correct,
      lessonId: a.lesson_id,
      itemKey: a.item_key,
      vocabZh: a.vocab_zh,
      createdAt: a.created_at,
    })),
    recentLessons: (recent ?? []).map((l) => ({ id: l.id, score: l.score === null ? null : Number(l.score), completedAt: l.completed_at, day: l.day })),
    difficultyOffset: profile.difficulty_offset,
    goals: profile.goals,
    dueReviewCount: dueCount,
  });
  const level = targetLevel(skills, profile.difficulty_offset);

  let generated = null;
  let generator = "fallback:v1";
  let reviewStatus = "seed";
  if (aiConfigured() && (await checkAiQuota(db, userId, "ai_lesson", 12))) {
    try {
      await logEvent(db, userId, "ai_lesson", { day, kind });
      const result = await generateLesson({
        learner: learnerSummary(profile),
        family: family.map(({ nickname, age_band, interests }) => ({ nickname, age_band, interests })),
        position,
        personalisedMonth: plan.plan.months?.[position.month - 1] ?? null,
        level,
        skills,
        directives,
        knownWords: known.slice(-400),
        recentLessons: (recent ?? []).map((l) => {
          const c = l.content as LessonContent;
          return { day: l.day, title: c.title, words: c.new_material.words.map((w) => w.zh), passageTitle: c.reading.title };
        }),
        review,
        kind,
        day,
      });
      generated = result.lesson;
      generator = `claude:${result.model}`;
      reviewStatus = "unreviewed";
      if (result.issues.length) await logEvent(db, userId, "ai_quality_repaired", { day, issues: result.issues.slice(0, 20) });
    } catch (error) {
      await logEvent(db, userId, "ai_fallback", { day, kind, model: MODEL, error: String(error).slice(0, 500) });
    }
  }
  generated ??= buildFallbackLesson(position, new Set(known), day);

  const content: LessonContent = { ...generated, review };
  const { data, error } = await db
    .from("lessons")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      day,
      curriculum_day: position.curriculumDay,
      month: position.month,
      week: position.week,
      kind,
      status: "ready",
      content,
      generator,
      review_status: reviewStatus,
      adaptations: directives.map((d) => ({ code: d.code, explanation: d.explanation })),
      progress: { answers: {}, viewed: [] },
    })
    .select(LESSON_COLUMNS)
    .single();
  if (error) {
    // Another request created this day's lesson concurrently — use that one.
    if (error.code === "23505") {
      const { data: other } = await db
        .from("lessons")
        .select(LESSON_COLUMNS)
        .eq("user_id", userId)
        .eq("day", day)
        .eq("kind", "daily")
        .neq("status", "superseded")
        .single();
      if (other) return other as LessonRow;
    }
    throw new HttpError(500, `Could not save lesson: ${error.message}`);
  }
  return data as LessonRow;
}

// ---------------------------------------------------------------------------
// Answering and completion
// ---------------------------------------------------------------------------

export function requiredKeys(content: LessonContent): string[] {
  return [
    ...content.review.map((_, i) => `review:${i}`),
    ...content.listening.questions.map((_, i) => `listening:${i}`),
    ...content.reading.questions.map((_, i) => `reading:${i}`),
    ...content.assessment.questions.map((_, i) => `assessment:${i}`),
  ];
}

export function missingForCompletion(lesson: LessonRow): string[] {
  const answers = lesson.progress.answers ?? {};
  const missing = requiredKeys(lesson.content).filter((k) => !answers[k]);
  if (!(lesson.progress.viewed ?? []).includes("new_material")) missing.push("new_material");
  if (lesson.content.speaking.prompts.length && !lesson.content.speaking.prompts.some((_, i) => answers[`speaking:${i}`])) {
    missing.push("speaking");
  }
  return missing;
}

export function lessonScore(lesson: LessonRow): number {
  const answers = lesson.progress.answers ?? {};
  const keys = requiredKeys(lesson.content).filter((k) => !k.startsWith("review:"));
  if (keys.length === 0) return 1;
  return keys.filter((k) => answers[k]?.correct).length / keys.length;
}

export async function saveProgress(db: DB, userId: string, lesson: LessonRow, progress: LessonProgress) {
  const { error } = await db
    .from("lessons")
    .update({
      progress,
      status: "in_progress",
      started_at: lesson.started_at ?? new Date().toISOString(),
    })
    .eq("id", lesson.id)
    .eq("user_id", userId)
    .neq("status", "completed");
  if (error) throw new HttpError(500, error.message);
}

/** On first open, refresh the review snapshot so it reflects today's due words. */
export async function startLesson(db: DB, userId: string, lesson: LessonRow): Promise<LessonRow> {
  if (lesson.status !== "ready") return lesson;
  const review = await dueReviewItems(db, userId);
  const content = { ...lesson.content, review };
  const started_at = new Date().toISOString();
  await db
    .from("lessons")
    .update({ content, status: "in_progress", started_at })
    .eq("id", lesson.id)
    .eq("user_id", userId)
    .eq("status", "ready");
  return { ...lesson, content, status: "in_progress", started_at };
}

export async function addLessonVocabulary(db: DB, userId: string, lesson: LessonRow) {
  const answers = lesson.progress.answers ?? {};
  const tested = new Map<string, boolean>();
  lesson.content.assessment.questions.forEach((q, i) => {
    if (q.vocab_zh && answers[`assessment:${i}`]) {
      tested.set(q.vocab_zh, (tested.get(q.vocab_zh) ?? true) && Boolean(answers[`assessment:${i}`].correct));
    }
  });
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const rows = lesson.content.new_material.words.map((w) => {
    const result = tested.get(w.zh);
    const recognition = result === undefined ? newCard(now) : reviewCard(newCard(now), result ? "good" : "again", now);
    const production = { ...newCard(tomorrow) };
    return {
      user_id: userId,
      zh: w.zh,
      jyutping: w.jyutping,
      en: w.en,
      category: w.category,
      example: w.example,
      source_lesson_id: lesson.id,
      recognition_card: recognition,
      production_card: production,
      recognition_due: recognition.due,
      production_due: production.due,
      lapses: result === false ? 1 : 0,
    };
  });
  if (rows.length) await db.from("user_vocabulary").upsert(rows, { onConflict: "user_id,zh", ignoreDuplicates: true });
}
