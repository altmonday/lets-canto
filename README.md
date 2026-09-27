# Let's Canto · 一齊學

A personalised Hong Kong Cantonese tutor for heritage learners, diaspora families and beginners. Each learner has their own account, takes an adaptive placement quiz, gets a personalised 12-month pathway, and receives daily lessons written by Claude from their own evidence (answers, spaced-repetition history, goals and family).

The original static prototype is kept in [`prototype/`](prototype/) for visual reference.

## What's built

| Area | Implementation |
|---|---|
| Accounts | Supabase Auth: email + password, magic link, password reset, cross-device sessions |
| Data isolation | Postgres row-level security on every table (owner-only); evidence tables are append-only; completed lessons are immutable (DB trigger) |
| Onboarding | Name, age bracket, languages, background, Cantonese exposure, self-assessment, Jyutping familiarity, goals, time, family (nickname + age band only), preferences, recording consent |
| Diagnostic | Adaptive quiz across characters, vocabulary, tones, listening, sentence construction and reading (difficulty moves up/down per answer), plus a recorded self-introduction. Scored on the server |
| Curriculum | Fixed 12-month framework (`src/lib/curriculum/framework.ts`) → monthly milestones → weekly themes → daily lessons. Claude personalises the roadmap; placement can skip foundations |
| Lessons | Generated one at a time by Claude from the latest evidence: spaced review → listening + tone pairs → 5–8 new words + patterns → reading with comprehension → speaking → assessment → family extension |
| Adaptation | Separate estimates for 10 skills (damped Elo updates). Rules in `src/lib/adaptive.ts`: tone focus, production practice, raise difficulty, re-teach missed items, more audio, catch-up after missed days, review backlog, learner-requested easier/harder. Each lesson shows *why* it was adapted |
| Spaced repetition | FSRS (`ts-fsrs`), separate recognition and production cards per word |
| Quality gate | Every Cantonese line is checked for one valid Jyutping syllable per character; questions validated; known words rejected. One repair round-trip with Claude, then invalid items are dropped; if too little survives, a hand-authored fallback lesson is served. Lessons are never broken |
| Audio | Azure `zh-HK` neural voices via `/api/tts` when configured; otherwise an on-device `zh-HK` voice. Never falls back to Mandarin. Natural/slow/loop playback |
| Speaking | Microphone recording for self-comparison (stays on device, never uploaded), self-rating, optional Claude written feedback on what the learner typed (it explicitly can't hear audio) |
| Vocabulary | Auto-populated bank with search, filters (due/bookmarked/mastered/difficult), categories, notes, FSRS review sessions, personal phrase notebook |
| Family | Adult-managed child profiles, family activity in every lesson, Claude-written picture-book stories per child, reading library |
| Progress | Per-skill estimates vs placement baseline, evidence counts, "self-rated" labels, mastered words (recognition vs production), recurring difficulties, lesson scores |
| Privacy | JSON export, permanent account deletion (cascades), privacy/retention page |
| PWA | Manifest, installable, service worker caches visited pages and audio |

## Claude integration

All AI calls are server-side (`src/lib/ai/`); the API key never reaches the browser.

- **Model:** `claude-opus-5` (override with `ANTHROPIC_MODEL`), adaptive thinking, `effort: medium` for lessons (tune with `LESSON_EFFORT`), `low` for speaking feedback.
- **Structured output:** Zod schemas in `src/lib/schemas.ts` are sent as the output format, so responses are schema-valid JSON — never HTML.
- **Refusal fallback:** server-side `fallbacks: "default"` is enabled, so a false-positive safety decline re-runs on a fallback model rather than failing a lesson. Disable with `ANTHROPIC_DISABLE_FALLBACKS=1`.
- **Caching:** system prompts are byte-stable and marked for prompt caching; learner data goes in the user turn.
- **Cost guard:** per-user daily quotas (12 lessons, 80 feedback checks, 10 stories, 6 roadmaps) via `progress_events`.
- **Where it's used:** personalised roadmap after the diagnostic and on goal change; each daily/extra lesson; speaking feedback; family stories.

Lessons are generated when the learner reaches them (and prefetched right after the previous lesson completes), so each one reflects the latest results. Unstarted lessons older than 36 hours are regenerated so a returning learner gets a catch-up lesson. Goal and difficulty changes supersede unstarted lessons only; completed lessons and all evidence are kept.

## Setup

1. **Supabase:** create a project, then run `supabase/migrations/20260927000000_init.sql` in the SQL editor (or `supabase db push`).
   - Auth → URL Configuration: set Site URL to your deployment and add `https://<your-domain>/auth/callback` as a redirect URL.
   - Auth → Email: keep "Confirm email" on for public use.
2. **Environment:** copy `.env.example` to `.env.local` and fill in the values. On Vercel, add the same variables under Project → Settings → Environment Variables.
3. **Run locally:**
   ```bash
   npm install
   npm run dev
   ```
4. **Deploy:** import the repo into Vercel (framework preset: Next.js). API routes that call Claude set `maxDuration = 300`; that needs a plan that allows it (Vercel Pro, or Hobby with Fluid compute).

Without `ANTHROPIC_API_KEY` the app still works end-to-end using the fallback curriculum; without Azure keys it uses on-device voices.

## Development

```bash
npm test          # vitest: Jyutping alignment of all seed content, adaptive rules, FSRS, placement, fallback lessons
npm run typecheck
npm run lint
npm run build
```

Key files:

- `src/lib/lessons/service.ts` — evidence, skills, vocabulary, lesson creation/answering/completion
- `src/lib/ai/generators.ts`, `src/lib/ai/prompts.ts` — Claude prompts and generation with repair loop
- `src/lib/adaptive.ts`, `src/lib/srs.ts`, `src/lib/diagnostic.ts` — learning engine
- `src/lib/quality.ts`, `src/lib/jyutping.ts` — content quality gate
- `src/lib/curriculum/` — framework, seed content, fallback lesson and roadmap
- `src/app/(app)/lesson/[id]/LessonPlayer.tsx` — daily lesson experience
- `src/proxy.ts` — session refresh and route protection (Next.js 16 "proxy", formerly middleware)

## Known limitations / next steps

- **Native review.** AI-generated and seed Cantonese is labelled "awaiting native review". A fluent Hong Kong Cantonese reviewer should check the seed content (`src/lib/curriculum/seed.ts`) and sample generated lessons before public launch. The `review_status` column is in place; the admin review/publish UI (brief §17) isn't built yet.
- **Pronunciation grading** is self-rated by design; no provider has been validated for Cantonese tone-level scoring.
- **TTS and Jyutping alignment:** neural TTS reads the characters, so a polyphonic character may occasionally be voiced differently from its Jyutping. Reviewers should flag these.
- **Quarterly and Month-12 assessments** use the lesson assessment on milestone days plus a retakeable placement quiz; dedicated long-form conversation and reading assessments aren't built yet.
- **Offline:** the service worker caches pages you've opened; answers still need a connection.
- **Privacy review** for Australian and launch-market requirements is still needed before public release (brief §16).
