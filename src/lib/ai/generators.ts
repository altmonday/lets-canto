import "server-only";
import { FamilyStory, GeneratedLesson, GeneratedRoadmap, SpeakingFeedback, type ReviewItem } from "../schemas";
import { checkLesson } from "../quality";
import { checkAlignment } from "../jyutping";
import { generateStructured, AiGenerationError } from "./claude";
import { FEEDBACK_SYSTEM, LESSON_REPAIR_NOTE, LESSON_SYSTEM, ROADMAP_SYSTEM, STORY_SYSTEM } from "./prompts";
import type { CurriculumPosition } from "../curriculum/framework";
import { FRAMEWORK } from "../curriculum/framework";
import type { Directive, SkillMap } from "../adaptive";
import { levelDescription } from "../adaptive";

export type LearnerSummary = {
  name: string;
  ageBracket: string | null;
  languages: string[];
  background: string | null;
  exposure: string | null;
  goals: string[];
  jyutpingFamiliarity: string | null;
  dailyMinutes: number;
  preferences: Record<string, unknown>;
};

export type FamilySummary = { nickname: string; age_band: string; interests: string | null };

export type LessonContext = {
  learner: LearnerSummary;
  family: FamilySummary[];
  position: CurriculumPosition;
  personalisedMonth: { title: string; milestone: string; focus: string } | null;
  level: number;
  skills: SkillMap;
  directives: Directive[];
  knownWords: string[];
  recentLessons: { day: number; title: string; words: string[]; passageTitle: string }[];
  review: ReviewItem[];
  kind: "daily" | "extra";
  day: number;
};

function lessonPrompt(ctx: LessonContext): string {
  const p = ctx.position;
  const skills = Object.fromEntries(
    Object.entries(ctx.skills).map(([k, v]) => [k, `${Math.round(v.estimate)}/100 (${v.evidence} data points)`]),
  );
  return [
    `# Learner`,
    JSON.stringify(ctx.learner, null, 2),
    `# Family (adult-managed; children are not users)`,
    ctx.family.length ? JSON.stringify(ctx.family, null, 2) : "No children listed.",
    `# Today`,
    ctx.kind === "extra"
      ? `Extra practice session (does not advance the pathway). Target the learner's weakest areas below using the current week's theme.`
      : `Pathway day ${ctx.day}. Framework month ${p.month} "${p.monthInfo.title}" (${p.monthInfo.phase}: ${p.monthInfo.focus}), week ${p.week}, day ${p.dayInMonth} of the month.`,
    `Week theme: ${p.weekInfo.theme} (${p.weekInfo.themeZh}). Objectives: ${p.weekInfo.objectives.join("; ")}. Suggested patterns: ${p.weekInfo.patterns.join("; ")}.`,
    ctx.personalisedMonth ? `This learner's month plan: ${JSON.stringify(ctx.personalisedMonth)}` : "",
    p.isMonthMilestone
      ? `Today is the monthly milestone check: make the assessment cover the whole month (6 questions) and state the milestone in the objectives.`
      : p.isWeekReview
        ? `Today closes the week: make the assessment consolidate the whole week's material.`
        : "",
    `# Level`,
    `Target content level ${ctx.level}/100 — ${levelDescription(ctx.level)}.`,
    `Skill estimates (from recorded answers; low data points means uncertain): ${JSON.stringify(skills)}`,
    `# Adaptation instructions`,
    ctx.directives.length
      ? ctx.directives.map((d) => `- ${d.instruction}${d.items?.length ? ` Items to revisit: ${d.items.join("、")}` : ""}`).join("\n")
      : "- No special adaptations; follow the framework at the target level.",
    `# Revision words due today (weave these into examples and questions)`,
    ctx.review.length ? ctx.review.map((r) => `${r.zh} (${r.jyutping}) ${r.en}`).join("; ") : "None due.",
    `# Words the learner already has in their bank (do not teach these as new)`,
    ctx.knownWords.length ? ctx.knownWords.join("、") : "None yet.",
    `# Recent lessons (do not repeat their content)`,
    ctx.recentLessons.length
      ? ctx.recentLessons.map((l) => `Day ${l.day}: ${l.title}; words ${l.words.join("、")}; passage "${l.passageTitle}"`).join("\n")
      : "This is the learner's first lesson.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Generates a lesson, validates it, and gives the model one chance to repair any
 * failed checks. Returns a repaired lesson (invalid items dropped) or throws so the
 * caller can fall back to the deterministic lesson.
 */
export async function generateLesson(ctx: LessonContext): Promise<{ lesson: GeneratedLesson; model: string; issues: string[] }> {
  const known = new Set(ctx.knownWords);
  const prompt = lessonPrompt(ctx);
  const effort = (process.env.LESSON_EFFORT as "low" | "medium" | "high" | undefined) ?? "medium";

  // Lesson requests run in a 300-second function: leave room for the database work
  // and only attempt a repair round if there's enough time left for it.
  const started = Date.now();
  const first = await generateStructured({ schema: GeneratedLesson, system: LESSON_SYSTEM, prompt, effort, timeoutMs: 170_000 });
  let report = checkLesson(first.data, known);
  if (report.issues.length === 0) return { lesson: first.data, model: first.model, issues: [] };

  const remaining = 250_000 - (Date.now() - started);
  if (remaining > 90_000) {
    try {
      const second = await generateStructured({
        schema: GeneratedLesson,
        system: LESSON_SYSTEM,
        prompt: `${prompt}\n\n# Repair\n${LESSON_REPAIR_NOTE}\n\nIssues:\n${report.issues.map((i) => `- ${i}`).join("\n")}\n\nDraft:\n${JSON.stringify(first.data)}`,
        effort,
        timeoutMs: remaining,
      });
      const secondReport = checkLesson(second.data, known);
      if (secondReport.repaired) return { lesson: secondReport.repaired, model: second.model, issues: secondReport.issues };
      report = secondReport;
    } catch {
      // Fall through to the first draft's repaired version, if usable.
    }
  }
  if (report.repaired) return { lesson: report.repaired, model: first.model, issues: report.issues };
  throw new AiGenerationError(`Lesson failed quality checks: ${report.issues.slice(0, 5).join("; ")}`, "invalid_output");
}

export async function generateRoadmap(input: {
  learner: LearnerSummary;
  family: FamilySummary[];
  diagnostic: Record<string, number>;
  diagnosticNotes: string[];
}) {
  const framework = FRAMEWORK.map((m) => ({
    month: m.month,
    phase: m.phase,
    title: m.title,
    focus: m.focus,
    default_milestone: m.milestone,
    weeks: m.weeks.map((w) => w.theme),
  }));
  const prompt = [
    `# Learner`,
    JSON.stringify(input.learner, null, 2),
    `# Family`,
    input.family.length ? JSON.stringify(input.family, null, 2) : "No children listed.",
    `# Diagnostic estimates (0-100, from an adaptive placement quiz; approximate)`,
    JSON.stringify(input.diagnostic, null, 2),
    input.diagnosticNotes.length ? `Notes: ${input.diagnosticNotes.join("; ")}` : "",
    `# Framework`,
    JSON.stringify(framework, null, 2),
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await generateStructured({ schema: GeneratedRoadmap, system: ROADMAP_SYSTEM, prompt, effort: "low", maxTokens: 12000, timeoutMs: 60_000 });
  const roadmap = result.data;
  roadmap.start_month = Math.max(1, Math.min(4, Math.round(roadmap.start_month)));
  if (roadmap.months.length !== 12) throw new AiGenerationError("Roadmap must have 12 months", "invalid_output");
  roadmap.months = roadmap.months.map((m, i) => ({ ...m, month: i + 1 }));
  return { roadmap, model: result.model };
}

export async function generateSpeakingFeedback(input: {
  situation: string;
  target: { zh: string; jyutping: string; en: string };
  attempt: string;
  learnerLevel: number;
}) {
  const prompt = [
    `Prompt: ${input.situation}`,
    `Model answer: ${input.target.zh} (${input.target.jyutping}) — ${input.target.en}`,
    `Learner level: ${input.learnerLevel}/100 (${levelDescription(input.learnerLevel)})`,
    `Learner's attempt (typed): ${input.attempt}`,
  ].join("\n");
  const result = await generateStructured({ schema: SpeakingFeedback, system: FEEDBACK_SYSTEM, prompt, effort: "low", maxTokens: 8000, timeoutMs: 60_000 });
  const fb = result.data;
  // Drop any suggestion whose Jyutping doesn't line up with its characters.
  fb.corrections = fb.corrections.map((c) =>
    c.suggestion && !checkAlignment(c.suggestion.zh, c.suggestion.jyutping).ok ? { ...c, suggestion: null } : c,
  );
  return { feedback: fb, model: result.model, naturalOk: checkAlignment(fb.natural_version.zh, fb.natural_version.jyutping).ok };
}

export async function generateFamilyStory(input: {
  child: FamilySummary;
  theme: string;
  vocabulary: string[];
  learnerLevel: number;
}) {
  const prompt = [
    `Child: ${JSON.stringify(input.child)}`,
    `Theme or request: ${input.theme}`,
    `Adult reader's level: ${input.learnerLevel}/100 (${levelDescription(input.learnerLevel)})`,
    `Recent family vocabulary to reuse where natural: ${input.vocabulary.join("、") || "none"}`,
  ].join("\n");
  const result = await generateStructured({ schema: FamilyStory, system: STORY_SYSTEM, prompt, effort: "medium", maxTokens: 16000, timeoutMs: 150_000 });
  const story = result.data;
  story.pages = story.pages.filter((p) => checkAlignment(p.line.zh, p.line.jyutping).ok);
  story.questions_to_ask = story.questions_to_ask.filter((q) => checkAlignment(q.zh, q.jyutping).ok);
  if (story.pages.length < 3) throw new AiGenerationError("Story failed quality checks", "invalid_output");
  return { story, model: result.model };
}
