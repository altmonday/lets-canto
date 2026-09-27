import { z } from "zod";
import { authed } from "@/lib/api/handler";

const Body = z.object({
  vocabId: z.string().uuid(),
  bookmarked: z.boolean().optional(),
  personalNote: z.string().max(500).nullable().optional(),
});

export const POST = authed(Body, async ({ db, userId }, body) => {
  const patch: Record<string, unknown> = {};
  if (body.bookmarked !== undefined) patch.bookmarked = body.bookmarked;
  if (body.personalNote !== undefined) patch.personal_note = body.personalNote;
  await db.from("user_vocabulary").update(patch).eq("id", body.vocabId).eq("user_id", userId);
  return { ok: true };
});
