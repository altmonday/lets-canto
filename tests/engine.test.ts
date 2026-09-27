import { describe, expect, it } from "vitest";
import { computeDirectives, defaultSkills, updateSkill, type AdaptiveInput } from "@/lib/adaptive";
import { buildFallbackLesson } from "@/lib/curriculum/fallback";
import { CURRICULUM_DAYS, positionFor } from "@/lib/curriculum/framework";
import { buildFallbackRoadmap, placementStartMonth } from "@/lib/curriculum/roadmap";
import { nextItem, scoreDiagnostic, type DiagnosticResponse } from "@/lib/diagnostic";
import { checkLesson } from "@/lib/quality";
import { GeneratedLesson } from "@/lib/schemas";
import { isMastered, newCard, reviewCard } from "@/lib/srs";

describe("curriculum positions", () => {
  it("maps days to months and weeks", () => {
    expect(positionFor(1)).toMatchObject({ month: 1, week: 1, curriculumDay: 1 });
    expect(positionFor(31)).toMatchObject({ month: 2, week: 1 });
    expect(positionFor(30)).toMatchObject({ month: 1, week: 4, isMonthMilestone: true });
    expect(positionFor(365)).toMatchObject({ month: 12 });
  });

  it("lets advanced learners bypass foundations", () => {
    expect(positionFor(1, 3)).toMatchObject({ month: 3, curriculumDay: 61 });
  });

  it("never runs out of content after day 365", () => {
    const p = positionFor(CURRICULUM_DAYS + 40);
    expect(p.month).toBe(12);
    expect(p.weekInfo.theme).toBeTruthy();
  });

  it("month 2 exists after month 1 with different themes", () => {
    expect(positionFor(35).weekInfo.theme).not.toBe(positionFor(5).weekInfo.theme);
  });
});

describe("fallback lessons", () => {
  it("are valid lessons that pass the quality gate", () => {
    const lesson = buildFallbackLesson(positionFor(1), new Set(), 1);
    expect(GeneratedLesson.safeParse(lesson).success).toBe(true);
    const report = checkLesson(lesson, new Set());
    expect(report.issues).toEqual([]);
    expect(report.repaired).not.toBeNull();
  });

  it("Day 2 teaches different words from Day 1 once Day 1's words are known", () => {
    const day1 = buildFallbackLesson(positionFor(1), new Set(), 1);
    const known = new Set(day1.new_material.words.map((w) => w.zh));
    const day2 = buildFallbackLesson(positionFor(2), known, 2);
    const day2Words = day2.new_material.words.map((w) => w.zh);
    expect(day2Words.some((w) => known.has(w))).toBe(false);
    expect(day2Words.length).toBeGreaterThanOrEqual(4);
  });
});

describe("quality gate", () => {
  it("rejects misaligned Jyutping and already-known words", () => {
    const lesson = buildFallbackLesson(positionFor(1), new Set(), 1);
    lesson.reading.passage[0] = { ...lesson.reading.passage[0], jyutping: "zou2 san4" };
    const known = new Set([lesson.new_material.words[0].zh]);
    const report = checkLesson(lesson, known);
    expect(report.issues.some((i) => i.includes("reading.passage[0]"))).toBe(true);
    expect(report.issues.some((i) => i.includes("already in the learner's vocabulary"))).toBe(true);
    // Invalid items are dropped rather than shown.
    expect(report.repaired?.new_material.words.some((w) => known.has(w.zh))).toBe(false);
  });

  it("returns no usable lesson when too much is broken", () => {
    const lesson = buildFallbackLesson(positionFor(1), new Set(), 1);
    lesson.assessment.questions = [];
    expect(checkLesson(lesson, new Set()).repaired).toBeNull();
  });
});

describe("adaptive engine", () => {
  const base = (): AdaptiveInput => ({
    skills: defaultSkills({ tone: 50, listening: 50, reading: 50, vocab_recognition: 50, vocab_production: 45, characters: 50 }),
    recentAttempts: [],
    recentLessons: [],
    difficultyOffset: 0,
    goals: ["conversation"],
    dueReviewCount: 0,
    now: new Date("2026-09-27T10:00:00Z"),
  });
  const attempt = (skill: string, correct: boolean) => ({ skill, correct, lessonId: "l1", itemKey: "x", vocabZh: null, createdAt: "" });

  it("does not overreact to an isolated error", () => {
    const s = updateSkill({ estimate: 60, evidence: 40 }, false);
    expect(60 - s.estimate).toBeLessThan(3);
  });

  it("persistent tone errors trigger tone focus, one slip does not", () => {
    const one = { ...base(), recentAttempts: [attempt("tone", false), ...Array(5).fill(attempt("tone", true))] };
    expect(computeDirectives(one).map((d) => d.code)).not.toContain("tone_focus");
    const many = { ...base(), recentAttempts: [...Array(4).fill(attempt("tone", false)), ...Array(4).fill(attempt("tone", true))] };
    expect(computeDirectives(many).map((d) => d.code)).toContain("tone_focus");
  });

  it("recognition/production gap triggers production practice", () => {
    const input = base();
    input.skills.vocab_production.estimate = 25;
    expect(computeDirectives(input).map((d) => d.code)).toContain("production_practice");
  });

  it("repeated success raises difficulty; a poor lesson triggers re-teaching of missed items", () => {
    const good = { ...base(), recentLessons: [{ id: "a", score: 0.95, completedAt: "2026-09-26T10:00:00Z", day: 2 }, { id: "b", score: 0.9, completedAt: "2026-09-25T10:00:00Z", day: 1 }] };
    expect(computeDirectives(good).map((d) => d.code)).toContain("advance");
    const poor = {
      ...base(),
      recentAttempts: [{ ...attempt("vocab_recognition", false), lessonId: "a", vocabZh: "攰" }],
      recentLessons: [{ id: "a", score: 0.4, completedAt: "2026-09-26T10:00:00Z", day: 2 }],
    };
    const reteach = computeDirectives(poor).find((d) => d.code === "reteach");
    expect(reteach?.items).toContain("攰");
  });

  it("strong reading + weak listening increases audio; missed days offer catch-up", () => {
    const input = base();
    input.skills.reading.estimate = 70;
    input.skills.listening.estimate = 40;
    input.recentLessons = [{ id: "a", score: 0.8, completedAt: "2026-09-20T10:00:00Z", day: 3 }];
    const codes = computeDirectives(input).map((d) => d.code);
    expect(codes).toContain("more_audio");
    expect(codes).toContain("catch_up");
  });
});

describe("spaced repetition", () => {
  it("schedules forgotten words sooner than remembered ones", () => {
    const now = new Date("2026-09-27T10:00:00Z");
    let good = newCard(now);
    let again = newCard(now);
    for (let i = 0; i < 3; i++) {
      good = reviewCard(good, "good", new Date(good.due));
      again = reviewCard(again, i === 2 ? "again" : "good", new Date(again.due));
    }
    expect(new Date(good.due).getTime()).toBeGreaterThan(new Date(again.due).getTime());
  });

  it("mastery extends intervals", () => {
    let card = newCard(new Date("2026-01-01T00:00:00Z"));
    const intervals: number[] = [];
    for (let i = 0; i < 6; i++) {
      const at = new Date(card.due);
      card = reviewCard(card, "good", at);
      intervals.push(new Date(card.due).getTime() - at.getTime());
    }
    expect(intervals[5]).toBeGreaterThan(intervals[2]);
    expect(isMastered(card)).toBe(true);
  });
});

describe("diagnostic and placement", () => {
  const heritage = { speaking: 3, listening: 4, reading: 2, pronunciation: 3 };
  const beginner = { speaking: 1, listening: 1, reading: 1, pronunciation: 1 };

  it("adapts difficulty to answers", () => {
    const first = nextItem("listening", [], heritage, true)!;
    const up = nextItem("listening", [{ itemId: first.id, skill: "listening", difficulty: first.difficulty, correct: true }], heritage, true)!;
    const down = nextItem("listening", [{ itemId: first.id, skill: "listening", difficulty: first.difficulty, correct: false }], heritage, true)!;
    expect(up.difficulty).toBeGreaterThan(down.difficulty);
  });

  it("skips audio items when audio is unavailable", () => {
    expect(nextItem("tone", [], heritage, false)).toBeNull();
  });

  it("different learners get materially different plans", () => {
    const strong: DiagnosticResponse[] = (["listening", "tone", "vocab_recognition", "sentence", "reading", "characters"] as const).flatMap((skill) =>
      [3, 4, 5].map((d) => ({ itemId: `${skill}-${d}`, skill, difficulty: d, correct: true })),
    );
    const weak: DiagnosticResponse[] = strong.map((r) => ({ ...r, difficulty: 1, correct: false }));
    const a = scoreDiagnostic(strong, heritage);
    const b = scoreDiagnostic(weak, beginner);
    expect(placementStartMonth(a)).toBeGreaterThan(1);
    expect(placementStartMonth(b)).toBe(1);

    const planA = buildFallbackRoadmap(a, ["reading"], false);
    const planB = buildFallbackRoadmap(b, ["family", "conversation"], true);
    expect(planA.start_month).not.toBe(planB.start_month);
    expect(planA.weekly_mix).not.toEqual(planB.weekly_mix);
    expect(planA.priorities).not.toEqual(planB.priorities);
    // And the day-one lesson differs because the framework position differs.
    const l1 = buildFallbackLesson(positionFor(1, planA.start_month), new Set(), 1);
    const l2 = buildFallbackLesson(positionFor(1, planB.start_month), new Set(), 1);
    expect(l1.title).not.toBe(l2.title);
  });
});
