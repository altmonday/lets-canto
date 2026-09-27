import { OBJECTIVE_SKILLS, SKILLS, type Skill } from "./skills";

/**
 * Adaptive learning engine. Pure functions only — the API routes feed in evidence
 * from the database and persist the results.
 */

export type SkillState = { estimate: number; evidence: number };
export type SkillMap = Record<Skill, SkillState>;

/**
 * Elo-style update with damping: the more evidence we have, the less any single
 * answer moves the estimate. An isolated error on a well-evidenced skill shifts it
 * by only a point or two.
 */
export function updateSkill(state: SkillState, correct: boolean, itemDifficulty = state.estimate): SkillState {
  const expected = 1 / (1 + Math.exp(-(state.estimate - itemDifficulty) / 12));
  const k = Math.max(1.5, 8 / Math.sqrt(1 + state.evidence / 10));
  const estimate = Math.max(0, Math.min(100, state.estimate + k * ((correct ? 1 : 0) - expected)));
  return { estimate: Math.round(estimate * 10) / 10, evidence: state.evidence + 1 };
}

export function defaultSkills(initial?: Partial<Record<Skill, number>>): SkillMap {
  return Object.fromEntries(SKILLS.map((s) => [s, { estimate: initial?.[s] ?? 20, evidence: 0 }])) as SkillMap;
}

export type AttemptEvidence = {
  skill: string;
  correct: boolean | null;
  lessonId: string | null;
  itemKey: string;
  vocabZh: string | null;
  createdAt: string;
};

export type LessonEvidence = { id: string; score: number | null; completedAt: string | null; day: number };

export type AdaptiveInput = {
  skills: SkillMap;
  recentAttempts: AttemptEvidence[]; // newest first
  recentLessons: LessonEvidence[]; // completed, newest first
  difficultyOffset: number; // learner request: -2..+2
  goals: string[];
  dueReviewCount: number;
  now?: Date;
};

export type Directive = {
  code:
    | "tone_focus"
    | "production_practice"
    | "advance"
    | "reteach"
    | "more_audio"
    | "catch_up"
    | "learner_easier"
    | "learner_harder"
    | "reading_focus"
    | "review_heavy";
  /** Shown to the learner: why the lesson looks the way it does. */
  explanation: string;
  /** Sent to the lesson generator. */
  instruction: string;
  /** Items to revisit, where relevant. */
  items?: string[];
};

function errorRate(attempts: AttemptEvidence[]): number {
  const graded = attempts.filter((a) => a.correct !== null);
  if (graded.length === 0) return 0;
  return graded.filter((a) => a.correct === false).length / graded.length;
}

export function computeDirectives(input: AdaptiveInput): Directive[] {
  const { skills, recentAttempts, recentLessons } = input;
  const now = input.now ?? new Date();
  const directives: Directive[] = [];

  // Persistent tone errors (need a pattern, not one slip)
  const toneAttempts = recentAttempts.filter((a) => a.skill === "tone").slice(0, 20);
  if ((toneAttempts.length >= 5 && errorRate(toneAttempts) >= 0.4) || skills.tone.estimate < 30) {
    directives.push({
      code: "tone_focus",
      explanation: "Tones have been tricky lately, so today includes extra tone listening and pronunciation.",
      instruction:
        "The learner has persistent tone errors. Give 4-5 tone pairs contrasting commonly confused tones (especially 2 vs 5, 3 vs 6, 4 vs 6), make at least half the listening questions tone-focused, and add a pronunciation tip to each speaking prompt.",
    });
  }

  // Recognises but cannot produce
  const gap = skills.vocab_recognition.estimate - skills.vocab_production.estimate;
  const productionReviews = recentAttempts.filter((a) => a.skill === "vocab_production").slice(0, 20);
  if (gap >= 15 || (productionReviews.length >= 5 && errorRate(productionReviews) >= 0.4)) {
    directives.push({
      code: "production_practice",
      explanation: "You recognise more words than you can recall, so today asks you to produce them more often.",
      instruction:
        "The learner recognises words but struggles to produce them. Make at least half the assessment questions production-direction (English meaning → choose the Cantonese), with skill 'vocab_production', and make speaking prompts reuse recent vocabulary.",
    });
  }

  // Performance on recent lessons
  const scored = recentLessons.filter((l) => l.score !== null);
  const last = scored[0];
  if (scored.length >= 2 && scored[0].score! >= 0.9 && scored[1].score! >= 0.9) {
    directives.push({
      code: "advance",
      explanation: "You've scored 90%+ on your last two lessons, so today moves a step harder.",
      instruction:
        "The learner is consistently succeeding. Raise difficulty: longer reading passage (6-8 lines), less common vocabulary within the theme, and a new sentence pattern.",
    });
  } else if (last && last.score! < 0.6) {
    const missed = recentAttempts
      .filter((a) => a.lessonId === last.id && a.correct === false)
      .map((a) => a.vocabZh ?? a.itemKey)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 6);
    directives.push({
      code: "reteach",
      explanation: "Some of the last lesson didn't stick yet, so today revisits it with fresh examples.",
      instruction:
        "The learner scored under 60% last lesson. Before new material, re-teach the missed items with different example sentences than before, and keep new words to 5.",
      items: missed,
    });
  }

  // Strong reading, weak listening
  if (skills.reading.estimate - skills.listening.estimate >= 15) {
    directives.push({
      code: "more_audio",
      explanation: "Your reading is ahead of your listening, so today has more audio-first practice.",
      instruction:
        "Listening is the learner's weak spot relative to reading. Use 5 listening questions where the answer depends on hearing the audio, and keep the reading passage short.",
    });
  } else if (
    skills.characters.estimate < 30 &&
    input.goals.some((g) => g === "reading" || g === "family") &&
    skills.listening.estimate - skills.reading.estimate >= 15
  ) {
    directives.push({
      code: "reading_focus",
      explanation: "You understand more than you can read, so today builds character recognition.",
      instruction:
        "The learner's listening is ahead of their reading. Include character-recognition assessment questions (show the characters, skill 'characters') and a reading passage built from familiar words.",
    });
  }

  // Missed days
  const lastCompleted = recentLessons.find((l) => l.completedAt)?.completedAt;
  if (lastCompleted) {
    const days = (now.getTime() - new Date(lastCompleted).getTime()) / 86_400_000;
    if (days >= 3) {
      directives.push({
        code: "catch_up",
        explanation: `Welcome back — it's been ${Math.floor(days)} days, so today is a lighter catch-up with more review.`,
        instruction:
          "The learner has been away for several days. Make this a manageable catch-up: only 4-5 new words, a short reading passage, and questions that reuse recent material.",
      });
    }
  }

  if (input.dueReviewCount >= 25) {
    directives.push({
      code: "review_heavy",
      explanation: `You have ${input.dueReviewCount} words due for review, so today introduces fewer new words.`,
      instruction: "The learner has a large review backlog. Introduce only 4-5 new words.",
    });
  }

  // Learner-requested difficulty
  if (input.difficultyOffset < 0) {
    directives.push({
      code: "learner_easier",
      explanation: "You asked for easier lessons, so today's content is gentler.",
      instruction: "The learner asked for easier lessons: shorter sentences, high-frequency words, more English support in explanations.",
    });
  } else if (input.difficultyOffset > 0) {
    directives.push({
      code: "learner_harder",
      explanation: "You asked for more challenge, so today stretches you further.",
      instruction: "The learner asked for more challenge: longer natural sentences, more colloquial particles, fewer hints.",
    });
  }

  return directives;
}

/** Overall target level for content difficulty (0..100). Not shown as a proficiency score. */
export function targetLevel(skills: SkillMap, difficultyOffset: number): number {
  const avg = OBJECTIVE_SKILLS.reduce((sum, s) => sum + skills[s].estimate, 0) / OBJECTIVE_SKILLS.length;
  return Math.max(0, Math.min(100, Math.round(avg + difficultyOffset * 10)));
}

export function levelDescription(level: number): string {
  if (level < 20) return "absolute beginner: very short phrases, high-frequency words, full Jyutping support";
  if (level < 40) return "beginner: short simple sentences, familiar everyday topics";
  if (level < 60) return "lower intermediate: connected sentences, common particles and aspect markers";
  if (level < 80) return "intermediate: natural-speed dialogue, colloquial expressions, short paragraphs";
  return "upper intermediate: longer passages, idiomatic Hong Kong Cantonese, nuance and register";
}
