"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Fetches (or generates) the current lesson, then opens it. Generation can take a while. */
export function StartLessonButton({ label, endpoint = "/api/lessons/current", variant = "primary" }: { label: string; endpoint?: string; variant?: "primary" | "dark" | "secondary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST", signal: AbortSignal.timeout(320_000) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBusy(false);
        setError(data.error ?? "Couldn't prepare the lesson. Please try again.");
        return;
      }
      router.push(`/lesson/${data.id}`);
    } catch {
      // Connection dropped: the lesson may still have been prepared, so a refresh usually finds it.
      setBusy(false);
      setError("The connection dropped while your lesson was being written. Refresh the page — it's often ready.");
    }
  };

  return (
    <div className="space-y-2">
      <Button variant={variant} onClick={go} disabled={busy} aria-busy={busy}>
        {busy ? "Preparing your lesson…" : label}
      </Button>
      {busy && <p className="text-sm opacity-80" aria-live="polite">Writing a lesson around your latest progress — this can take a couple of minutes. Please keep this screen open.</p>}
      {error && <p className="text-sm text-rose" role="alert">{error}</p>}
    </div>
  );
}
