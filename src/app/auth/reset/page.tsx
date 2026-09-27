"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) setStatus(error.message);
    // Full reload so the server renders with the new session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    else window.location.assign("/");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-4 text-3xl font-extrabold">Choose a new password</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-bold">New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-line px-3"
            />
          </label>
          {status && <p className="text-sm text-rose">{status}</p>}
          <Button type="submit" variant="dark" className="w-full" disabled={busy}>
            Save password
          </Button>
        </form>
      </Card>
    </main>
  );
}
