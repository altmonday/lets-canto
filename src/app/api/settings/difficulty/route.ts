import { z } from "zod";
import { authed } from "@/lib/api/handler";
import { getProfile, logEvent } from "@/lib/lessons/service";

const Body = z.object({ direction: z.enum(["easier", "harder", "reset"]) });

/** Learner-requested difficulty. Applies from the next lesson; history is untouched. */
export const POST = authed(Body, async ({ db, userId }, body) => {
  const profile = await getProfile(db, userId);
  const current = profile?.difficulty_offset ?? 0;
  const next = body.direction === "reset" ? 0 : Math.max(-2, Math.min(2, current + (body.direction === "easier" ? -1 : 1)));
  await db.from("learner_profiles").update({ difficulty_offset: next }).eq("user_id", userId);
  await db.from("lessons").update({ status: "superseded" }).eq("user_id", userId).eq("status", "ready");
  await logEvent(db, userId, "difficulty_changed", { from: current, to: next });
  return { difficultyOffset: next };
});
