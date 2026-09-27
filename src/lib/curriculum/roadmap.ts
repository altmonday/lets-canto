import type { GeneratedRoadmap } from "../schemas";
import type { Skill } from "../skills";
import { FRAMEWORK } from "./framework";

/** Evidence-based placement: only skip foundations when the diagnostic shows mastery. */
export function placementStartMonth(results: Record<Skill, number>): number {
  const foundations = (results.tone + results.vocab_recognition + results.sentence + results.listening) / 4;
  if (foundations >= 80) return 4;
  if (foundations >= 70) return 3;
  if (foundations >= 58) return 2;
  return 1;
}

const GOAL_FOCUS: Record<string, string> = {
  conversation: "extra speaking practice",
  family: "family routines and storytime",
  reading: "character recognition and reading",
  heritage: "culture and family history",
  travel: "practical travel situations",
  work: "polite, practical workplace phrases",
};

/** Deterministic roadmap used when AI is unavailable. Still reflects goals and placement. */
export function buildFallbackRoadmap(results: Record<Skill, number>, goals: string[], hasChildren: boolean): GeneratedRoadmap {
  const startMonth = placementStartMonth(results);
  const emphasis = goals.map((g) => GOAL_FOCUS[g]).filter(Boolean);
  const weak = (Object.entries(results) as [Skill, number][])
    .filter(([s]) => ["listening", "tone", "reading", "characters", "vocab_production", "sentence"].includes(s))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([s]) => s.replace("_", " "));

  return {
    start_month: startMonth,
    summary:
      startMonth > 1
        ? `Your placement showed solid foundations, so your pathway starts at Month ${startMonth}. Lessons will lean towards ${emphasis.join(", ") || "balanced practice"}.`
        : `Your pathway starts with the foundations — Jyutping, tones and everyday words — and leans towards ${emphasis.join(", ") || "balanced practice"}.`,
    priorities: [...weak.map((w) => `Strengthen ${w}`), ...emphasis.map((e) => `Build ${e}`)].slice(0, 5),
    weekly_mix: {
      listening: 3 + (results.listening < results.reading ? 1 : 0),
      speaking: goals.includes("conversation") ? 5 : 3,
      reading: goals.includes("reading") ? 5 : 3,
      vocabulary: 3,
      family: hasChildren || goals.includes("family") ? 4 : 1,
    },
    months: FRAMEWORK.map((m) => ({
      month: m.month,
      title: m.title,
      milestone: m.milestone,
      focus: emphasis.length ? `${m.focus}, with ${emphasis[0]}` : m.focus,
    })),
  };
}
