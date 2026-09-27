"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";

type Mode = "signin" | "signup" | "magic" | "forgot";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    params.get("error") ? { kind: "error", text: "That sign-in link has expired or was already used. Please try again." } : null,
  );

  const callback = (path: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Full reload so the server renders with the new session cookie.
        window.location.assign(next);
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback("/onboarding") } });
        if (error) throw error;
        if (data.session) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/onboarding");
          return;
        }
        setMessage({ kind: "ok", text: "Check your email to confirm your account, then come back here." });
      }
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback(next) } });
        if (error) throw error;
        setMessage({ kind: "ok", text: "We've emailed you a sign-in link." });
      }
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback("/auth/reset") });
        if (error) throw error;
        setMessage({ kind: "ok", text: "If that email has an account, a reset link is on its way." });
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setMessage(null);
      }}
      aria-pressed={mode === m}
      className={`min-h-10 flex-1 rounded-lg text-sm font-bold ${mode === m ? "bg-forest text-white" : "text-muted"}`}
    >
      {label}
    </button>
  );

  return (
    <Card>
      <div className="mb-5 flex gap-1 rounded-xl bg-mist p-1">
        {tab("signin", "Sign in")}
        {tab("signup", "Create account")}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-line px-3"
          />
        </label>
        {(mode === "signin" || mode === "signup") && (
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-line px-3"
            />
            {mode === "signup" && <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>}
          </label>
        )}
        {message && (
          <p role="status" className={`rounded-lg p-3 text-sm ${message.kind === "ok" ? "bg-ok-soft text-jade" : "bg-rose-soft text-rose"}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" variant="dark" className="w-full" disabled={busy}>
          {busy
            ? "Please wait…"
            : { signin: "Sign in", signup: "Create my account", magic: "Email me a sign-in link", forgot: "Send reset link" }[mode]}
        </Button>
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" className="min-h-10 text-forest underline" onClick={() => setMode(mode === "magic" ? "signin" : "magic")}>
          {mode === "magic" ? "Use a password instead" : "Email me a link instead"}
        </button>
        <button type="button" className="min-h-10 text-forest underline" onClick={() => setMode("forgot")}>
          Forgot password?
        </button>
      </div>
    </Card>
  );
}
