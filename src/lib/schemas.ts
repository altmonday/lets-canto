import { z } from "zod";
import { SKILLS } from "./skills";

/**
 * Schemas for AI-generated content. These are sent to Claude as the structured-output
 * format, then re-validated (plus Jyutping/character alignment checks in quality.ts)
 * before anything reaches a learner. Keep them free of min/max constraints — the
 * structured-output JSON Schema subset doesn't support all of them; quality.ts
 * enforces counts instead.
 */

export const SkillEnum = z.enum(SKILLS);

export const Line = z.object({
  zh: z.string().describe("Traditional Chinese, natural Hong Kong Cantonese"),
  jyutping: z
    .string()
    .describe("LSHK Jyutping with tone numbers, one syllable per Chinese character, space-separated"),
  en: z.string().describe("Natural English translation"),
});
export type Line = z.infer<typeof Line>;

export const Mcq = z.object({
  prompt: z.string().describe("Question shown to the learner, in English"),
  audio: Line.nullable().describe("Cantonese line to play/show with the question, or null"),
  options: z.array(z.string()),
  answer_index: z.number().int(),
  explanation: z.string().describe("One or two sentences explaining the correct answer"),
  skill: SkillEnum,
  vocab_zh: z.string().nullable().describe("Vocabulary item this tests (Traditional Chinese), or null"),
});
export type Mcq = z.infer<typeof Mcq>;

export const VocabItem = z.object({
  zh: z.string(),
  jyutping: z.string(),
  en: z.string(),
  category: z.string().describe("e.g. family, food, time, verbs, particles, household"),
  example: Line,
  note: z.string().nullable().describe("Usage/colloquial note, or null"),
});
export type VocabItem = z.infer<typeof VocabItem>;

export const Pattern = z.object({
  pattern: z.string().describe("Sentence pattern, e.g. 我想 + verb"),
  explanation: z.string(),
  examples: z.array(Line),
});

export const TonePair = z.object({
  a: Line,
  b: Line,
  same_tone: z.boolean(),
  note: z.string(),
});

export const SpeakingPrompt = z.object({
  situation: z.string().describe("Real-world situation in English"),
  target: Line.describe("A model answer the learner can compare against"),
  hint: z.string(),
});

export const FamilyActivity = z.object({
  kind: z.enum(["story", "song", "routine", "game"]),
  title: z.string(),
  age_note: z.string(),
  instructions: z.string(),
  lines: z.array(Line),
});
export type FamilyActivity = z.infer<typeof FamilyActivity>;

export const GeneratedLesson = z.object({
  title: z.string(),
  title_zh: z.string(),
  summary: z.string(),
  objectives: z.array(z.string()),
  why_this_lesson: z.string().describe("Explain to the learner, in 1-3 sentences, why today's focus was chosen"),
  listening: z.object({
    intro: z.string(),
    tone_focus: z.object({ explanation: z.string(), pairs: z.array(TonePair) }),
    questions: z.array(Mcq),
  }),
  new_material: z.object({
    words: z.array(VocabItem),
    patterns: z.array(Pattern),
  }),
  reading: z.object({
    title: z.string(),
    passage: z.array(Line),
    register_note: z
      .string()
      .nullable()
      .describe("Note on colloquial Cantonese vs Standard Written Chinese where relevant, else null"),
    questions: z.array(Mcq),
  }),
  speaking: z.object({ intro: z.string(), prompts: z.array(SpeakingPrompt) }),
  assessment: z.object({ questions: z.array(Mcq) }),
  family: FamilyActivity,
});
export type GeneratedLesson = z.infer<typeof GeneratedLesson>;

export type ReviewItem = {
  vocabId: string;
  zh: string;
  jyutping: string;
  en: string;
  direction: "recognition" | "production";
};

/** What is stored in lessons.content: the generated lesson plus the review snapshot. */
export type LessonContent = GeneratedLesson & { review: ReviewItem[] };

export const RoadmapMonth = z.object({
  month: z.number().int(),
  title: z.string(),
  milestone: z.string().describe("A concrete, checkable milestone for this learner"),
  focus: z.string().describe("How this month is tailored to the learner"),
});

export const GeneratedRoadmap = z.object({
  start_month: z
    .number()
    .int()
    .describe("1-4. Framework month to start at; >1 only if the diagnostic shows foundations are mastered"),
  summary: z.string().describe("2-3 sentence personalised overview addressed to the learner"),
  priorities: z.array(z.string()).describe("3-5 learning priorities in order"),
  weekly_mix: z.object({
    listening: z.number(),
    speaking: z.number(),
    reading: z.number(),
    vocabulary: z.number(),
    family: z.number(),
  }).describe("Relative emphasis, each 1-5"),
  months: z.array(RoadmapMonth),
});
export type GeneratedRoadmap = z.infer<typeof GeneratedRoadmap>;

export const SpeakingFeedback = z.object({
  understood_as: z.string().describe("What the learner's answer most likely means, in English"),
  communicates: z.boolean().describe("Would a Hong Kong Cantonese speaker understand the intended meaning?"),
  corrections: z.array(
    z.object({ issue: z.string(), suggestion: Line.nullable() }),
  ),
  natural_version: Line,
  encouragement: z.string(),
  tone_notes: z
    .string()
    .nullable()
    .describe("Only about tone numbers the learner wrote; never claim to have heard audio"),
});
export type SpeakingFeedback = z.infer<typeof SpeakingFeedback>;

export const FamilyStory = z.object({
  title: z.string(),
  title_zh: z.string(),
  age_note: z.string(),
  pages: z.array(
    z.object({ picture_idea: z.string(), line: Line }),
  ),
  questions_to_ask: z.array(Line),
  register_note: z.string().nullable(),
});
export type FamilyStory = z.infer<typeof FamilyStory>;
