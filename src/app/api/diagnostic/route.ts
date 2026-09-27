import { z } from "zod";
import { authed } from "@/lib/api/handler";
import { DIAGNOSTIC_ITEMS, scoreDiagnostic, type DiagnosticResponse, type SelfAssessment } from "@/lib/diagnostic";
import { HttpError, getProfile, initSkills } from "@/lib/lessons/service";
import { createPlanVersion } from "@/lib/lessons/plans";

export const maxDuration = 300;

const Body = z.object({
  responses: z
    .array(z.object({ itemId: z.string(), choice: z.number().int().nullable() }))
    .max(40),
  audioAvailable: z.boolean(),
  speakingRating: z.number().int().min(1).max(3).nullable(),
});

export const POST = authed(Body, async ({ db, userId }, body) => {
  const profile = await getProfile(db, userId);
  if (!profile) throw new HttpError(409, "Complete onboarding first");

  // Score on the server from the item bank — never trust client-side correctness.
  const responses: DiagnosticResponse[] = [];
  for (const r of body.responses) {
    const item = DIAGNOSTIC_ITEMS.find((i) => i.id === r.itemId);
    if (!item) continue;
    responses.push({
      itemId: item.id,
      skill: item.skill,
      difficulty: item.difficulty,
      correct: r.choice === item.answer,
      skipped: r.choice === null,
    });
  }
  const self = profile.self_assessment as SelfAssessment;
  const results = scoreDiagnostic(responses, self);
  if (body.speakingRating) {
    const bump = (body.speakingRating - 2) * 8;
    results.fluency = Math.max(5, Math.min(90, results.fluency + bump));
    results.confidence = Math.max(5, Math.min(90, results.confidence + bump));
  }

  await db.from("diagnostics").insert({ user_id: userId, responses, results });
  await initSkills(db, userId, results);
  const answered = responses.filter((r) => !r.skipped);
  if (answered.length) {
    await db.from("activity_attempts").insert(
      answered.map((r) => ({
        user_id: userId,
        section: "diagnostic",
        item_key: r.itemId,
        skill: r.skill,
        correct: r.correct,
        score: r.correct ? 1 : 0,
      })),
    );
  }

  const notes = [
    body.audioAvailable ? "" : "Audio was unavailable, so listening and tone results rely on self-report.",
    body.speakingRating ? `Self-rated spoken introduction: ${body.speakingRating}/3.` : "",
  ].filter(Boolean);
  await createPlanVersion(db, userId, results, profile.diagnostic_completed_at ? "Diagnostic retaken" : "Initial placement", {
    keepStartMonth: false,
    diagnosticNotes: notes,
  });
  // Unfinished backup lessons (written without AI) make way for personalised ones.
  // Completed lessons are never touched.
  await db
    .from("lessons")
    .update({ status: "superseded" })
    .eq("user_id", userId)
    .in("status", ["ready", "in_progress"])
    .like("generator", "fallback%");
  await db.from("learner_profiles").update({ diagnostic_completed_at: new Date().toISOString() }).eq("user_id", userId);
  return { results };
});
