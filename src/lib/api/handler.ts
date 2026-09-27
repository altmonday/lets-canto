import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { HttpError, requireUserId } from "../lessons/service";

type Ctx = { db: SupabaseClient; userId: string; request: Request };

/** Wraps an API route: authenticates, parses JSON with an optional schema, maps errors to responses. */
export function authed<S extends z.ZodType | undefined = undefined>(
  schema: S,
  fn: (ctx: Ctx, body: S extends z.ZodType ? z.infer<S> : undefined) => Promise<unknown>,
) {
  return async (request: Request) => {
    try {
      const db = await createClient();
      const userId = await requireUserId(db);
      let body = undefined as S extends z.ZodType ? z.infer<S> : undefined;
      if (schema) {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
        body = parsed.data as typeof body;
      }
      const result = await fn({ db, userId, request }, body);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error(error);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
