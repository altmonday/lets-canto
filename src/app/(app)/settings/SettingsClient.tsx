"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";

const LABELS: Record<number, string> = { [-2]: "Much gentler", [-1]: "Gentler", 0: "Balanced", 1: "More challenging", 2: "Much more challenging" };

async function clearLocalData() {
  try {
    localStorage.clear();
    if ("caches" in window) for (const key of await caches.keys()) await caches.delete(key);
  } catch {}
}

export function DifficultyControl({ initial }: { initial: number }) {
  const [offset, setOffset] = useState(initial);
  const [busy, setBusy] = useState(false);
  const change = async (direction: "easier" | "harder" | "reset") => {
    setBusy(true);
    const res = await fetch("/api/settings/difficulty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setOffset(data.difficultyOffset);
    setBusy(false);
  };
  return (
    <Card className="space-y-3">
      <p>
        Currently: <b>{LABELS[offset]}</b>. Applies from your next lesson.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy || offset <= -2} onClick={() => change("easier")}>
          Make it easier
        </Button>
        <Button variant="secondary" disabled={busy || offset >= 2} onClick={() => change("harder")}>
          Make it harder
        </Button>
        {offset !== 0 && (
          <Button variant="ghost" disabled={busy} onClick={() => change("reset")}>
            Reset
          </Button>
        )}
      </div>
    </Card>
  );
}

export function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    await createClient().auth.signOut();
    await clearLocalData();
    // Full reload clears all client state after the session ends.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  };

  const deleteAccount = async () => {
    const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Couldn't delete the account.");
    await clearLocalData();
    // Full reload clears all client state after the session ends.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <a href="/api/account/export" className="inline-flex min-h-11 items-center rounded-xl bg-mist px-4 font-bold text-forest">
          Export my data (JSON)
        </a>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <div className="border-t border-line pt-4">
        {!confirming ? (
          <Button variant="ghost" className="text-rose" onClick={() => setConfirming(true)}>
            Delete my account…
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              This permanently deletes your account, lessons, progress, vocabulary and family profile. It can&apos;t be undone. Type <b>DELETE</b> to
              confirm.
            </p>
            <input className="min-h-11 w-full rounded-lg border border-line px-3" value={text} onChange={(e) => setText(e.target.value)} aria-label="Type DELETE to confirm" />
            {error && <p className="text-sm text-rose">{error}</p>}
            <div className="flex gap-2">
              <Button variant="danger" disabled={text !== "DELETE"} onClick={deleteAccount}>
                Permanently delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
