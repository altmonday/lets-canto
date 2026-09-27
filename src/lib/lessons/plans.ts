import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiConfigured } from "../ai/claude";
import { generateRoadmap } from "../ai/generators";
import { buildFallbackRoadmap } from "../curriculum/roadmap";
import type { Skill } from "../skills";
import { checkAiQuota, getActivePlan, getFamily, getProfile, learnerSummary, logEvent } from "./service";

type DB = SupabaseClient;

/**
 * Creates a new active curriculum plan version. Previous versions are kept (history
 * is never erased); unstarted future lessons are superseded so they regenerate
 * against the new plan. Completed and in-progress lessons are untouched.
 */
export async function createPlanVersion(
  db: DB,
  userId: string,
  estimates: Record<Skill, number>,
  reason: string,
  opts: { keepStartMonth: boolean; diagnosticNotes?: string[] },
) {
  const [profile, family, previous] = await Promise.all([getProfile(db, userId), getFamily(db, userId), getActivePlan(db, userId)]);
  if (!profile) throw new Error("Profile missing");

  let roadmap = buildFallbackRoadmap(estimates, profile.goals, family.length > 0);
  let generator = "fallback:v1";
  if (aiConfigured() && (await checkAiQuota(db, userId, "ai_roadmap", 6))) {
    try {
      await logEvent(db, userId, "ai_roadmap", { reason });
      const result = await generateRoadmap({
        learner: learnerSummary(profile),
        family: family.map(({ nickname, age_band, interests }) => ({ nickname, age_band, interests })),
        diagnostic: estimates,
        diagnosticNotes: opts.diagnosticNotes ?? [],
      });
      roadmap = result.roadmap;
      generator = `claude:${result.model}`;
    } catch (error) {
      await logEvent(db, userId, "ai_fallback", { kind: "roadmap", error: String(error).slice(0, 500) });
    }
  }

  const startMonth = opts.keepStartMonth && previous ? previous.start_month : roadmap.start_month;
  roadmap.start_month = startMonth;

  if (previous) await db.from("curriculum_plans").update({ is_active: false }).eq("id", previous.id).eq("user_id", userId);
  const { data, error } = await db
    .from("curriculum_plans")
    .insert({
      user_id: userId,
      version: (previous?.version ?? 0) + 1,
      is_active: true,
      start_month: startMonth,
      plan: roadmap,
      generator,
      reason,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await db.from("lessons").update({ status: "superseded" }).eq("user_id", userId).eq("status", "ready");
  await logEvent(db, userId, "plan_created", { version: (previous?.version ?? 0) + 1, reason, generator });
  return data.id as string;
}
