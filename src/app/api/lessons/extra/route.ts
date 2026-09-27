import { authed } from "@/lib/api/handler";
import { HttpError, checkAiQuota, createLesson } from "@/lib/lessons/service";

export const maxDuration = 300;

/** Additional practice on request. Doesn't advance the pathway day. */
export const POST = authed(undefined, async ({ db, userId }) => {
  if (!(await checkAiQuota(db, userId, "ai_lesson", 12))) throw new HttpError(429, "You've reached today's limit for new practice sets");
  const { data } = await db
    .from("lessons")
    .select("day")
    .eq("user_id", userId)
    .eq("kind", "daily")
    .eq("status", "completed")
    .order("day", { ascending: false })
    .limit(1);
  const lesson = await createLesson(db, userId, Math.max(1, data?.[0]?.day ?? 1), "extra");
  return { id: lesson.id };
});
