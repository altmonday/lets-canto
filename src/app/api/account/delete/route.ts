import { z } from "zod";
import { authed } from "@/lib/api/handler";
import { HttpError } from "@/lib/lessons/service";
import { createServiceClient } from "@/lib/supabase/server";

const Body = z.object({ confirm: z.literal("DELETE") });

/**
 * Permanently deletes the account. Every learner table references auth.users with
 * ON DELETE CASCADE, so removing the auth user removes all of their data.
 */
export const POST = authed(Body, async ({ db, userId }) => {
  let admin;
  try {
    admin = createServiceClient();
  } catch {
    throw new HttpError(503, "Account deletion isn't configured on this server. Contact support.");
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new HttpError(500, error.message);
  await db.auth.signOut();
  return { ok: true };
});
