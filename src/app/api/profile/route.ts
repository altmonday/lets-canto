import { z } from "zod";
import { authed } from "@/lib/api/handler";
import { getProfile, loadSkills } from "@/lib/lessons/service";
import { createPlanVersion } from "@/lib/lessons/plans";
import { SKILLS, type Skill } from "@/lib/skills";

export const maxDuration = 300;

const Scale = z.number().int().min(1).max(5);

const Body = z.object({
  displayName: z.string().trim().min(1).max(40),
  ageBracket: z.string().max(20).nullable().optional(),
  languages: z.array(z.string().max(40)).max(10),
  background: z.string().max(300).nullable().optional(),
  exposure: z.string().max(60),
  selfAssessment: z.object({ speaking: Scale, listening: Scale, reading: Scale, pronunciation: Scale }),
  jyutpingFamiliarity: z.string().max(40),
  goals: z.array(z.enum(["conversation", "family", "reading", "heritage", "travel", "work"])).min(1),
  dailyMinutes: z.number().int().min(10).max(60),
  preferences: z.object({
    showJyutping: z.boolean(),
    showEnglish: z.boolean(),
    audioRate: z.enum(["normal", "slow"]),
    difficulty: z.enum(["gentle", "balanced", "challenging"]),
  }),
  recordingConsent: z.boolean(),
  family: z
    .array(
      z.object({
        nickname: z.string().trim().min(1).max(30),
        ageBand: z.enum(["0-2", "3-5", "6-8", "9-12", "13+"]),
        interests: z.string().max(200).nullable().optional(),
      }),
    )
    .max(8)
    .optional(),
});

/** Saves onboarding or profile edits. A goal change recalculates future lessons without touching history. */
export const POST = authed(Body, async ({ db, userId }, body) => {
  const existing = await getProfile(db, userId);
  const difficultyOffset = existing
    ? existing.difficulty_offset
    : body.preferences.difficulty === "gentle"
      ? -1
      : body.preferences.difficulty === "challenging"
        ? 1
        : 0;

  const { error } = await db.from("learner_profiles").upsert({
    user_id: userId,
    display_name: body.displayName,
    age_bracket: body.ageBracket ?? null,
    languages: body.languages,
    background: body.background ?? null,
    cantonese_exposure: body.exposure,
    self_assessment: body.selfAssessment,
    jyutping_familiarity: body.jyutpingFamiliarity,
    goals: body.goals,
    daily_minutes: body.dailyMinutes,
    preferences: body.preferences,
    difficulty_offset: difficultyOffset,
    recording_consent: body.recordingConsent,
    onboarding_completed_at: existing?.onboarding_completed_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  if (body.family && !existing) {
    await db.from("family_members").insert(
      body.family.map((f) => ({ user_id: userId, nickname: f.nickname, age_band: f.ageBand, interests: f.interests ?? null })),
    );
  }

  const goalsChanged =
    existing?.diagnostic_completed_at &&
    [...existing.goals].sort().join() !== [...body.goals].sort().join();
  if (goalsChanged) {
    const skills = await loadSkills(db, userId);
    const estimates = Object.fromEntries(SKILLS.map((s) => [s, skills[s].estimate])) as Record<Skill, number>;
    await createPlanVersion(db, userId, estimates, `Goals changed to: ${body.goals.join(", ")}`, { keepStartMonth: true });
  }
  return { ok: true, replanned: Boolean(goalsChanged) };
});
