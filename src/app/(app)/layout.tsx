import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/Nav";
import { PrefsProvider } from "@/components/Prefs";
import { getProfile, requireUserId } from "@/lib/lessons/service";
import { displayPrefs } from "@/lib/profile-form";
import { createClient } from "@/lib/supabase/server";
import { ttsConfigured } from "@/lib/tts";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const db = await createClient();
  const userId = await requireUserId(db).catch(() => redirect("/login"));
  const profile = await getProfile(db, userId);
  if (!profile?.onboarding_completed_at) redirect("/onboarding");
  if (!profile.diagnostic_completed_at) redirect("/diagnostic");

  return (
    <PrefsProvider initial={displayPrefs(profile)} ttsAvailable={ttsConfigured()}>
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="rounded-lg">
            <div className="text-2xl font-extrabold tracking-tight">
              <span lang="zh-HK">一齊學</span> <span className="text-sage">✳</span>
            </div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-muted">LET&apos;S CANTO</div>
          </Link>
          <Link
            href="/settings"
            className="flex min-h-11 items-center gap-2 rounded-full bg-mist px-4 font-bold text-forest"
            aria-label="Settings and profile"
          >
            {profile.display_name.slice(0, 12)} <span aria-hidden>⚙</span>
          </Link>
        </header>
        <main>{children}</main>
      </div>
      <BottomNav />
    </PrefsProvider>
  );
}
