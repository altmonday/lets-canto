import { z } from "zod";
import { authed } from "@/lib/api/handler";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    zh: z.string().trim().min(1).max(200),
    jyutping: z.string().max(400).optional(),
    en: z.string().max(300).optional(),
    note: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
]);

export const POST = authed(Body, async ({ db, userId }, body) => {
  if (body.action === "add") {
    const { data } = await db
      .from("phrase_notes")
      .insert({ user_id: userId, zh: body.zh, jyutping: body.jyutping ?? null, en: body.en ?? null, note: body.note ?? null })
      .select("id")
      .single();
    return { id: data?.id };
  }
  await db.from("phrase_notes").delete().eq("id", body.id).eq("user_id", userId);
  return { ok: true };
});
