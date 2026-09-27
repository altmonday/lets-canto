import { z } from "zod";
import { authed } from "@/lib/api/handler";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    nickname: z.string().trim().min(1).max(30),
    ageBand: z.enum(["0-2", "3-5", "6-8", "9-12", "13+"]),
    interests: z.string().max(200).optional(),
  }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

/** Children are described by the adult (nickname, age band, interests) — never registered. */
export const POST = authed(Body, async ({ db, userId }, body) => {
  if (body.action === "add") {
    await db.from("family_members").insert({ user_id: userId, nickname: body.nickname, age_band: body.ageBand, interests: body.interests ?? null });
  } else {
    await db.from("family_members").delete().eq("id", body.id).eq("user_id", userId);
  }
  return { ok: true };
});
