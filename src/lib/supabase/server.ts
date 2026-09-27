import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Request-scoped client acting as the signed-in learner. Row-level security applies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes sessions instead.
        }
      },
    },
  });
}

/** Service-role client. Only used for account deletion; never exposed to the browser. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createAdminClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
