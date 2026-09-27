import { redirect } from "next/navigation";
import { EMPTY_PROFILE, ProfileForm } from "@/components/ProfileForm";
import { getProfile, requireUserId } from "@/lib/lessons/service";
import { profileToForm } from "@/lib/profile-form";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const db = await createClient();
  const userId = await requireUserId(db).catch(() => redirect("/login"));
  const profile = await getProfile(db, userId);
  if (profile?.diagnostic_completed_at) redirect("/");

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="text-2xl font-extrabold tracking-tight">
        <span lang="zh-HK">一齊學</span> <span className="text-sage">✳</span>
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Let&apos;s shape your pathway.</h1>
      <p className="mb-6 mt-2 text-muted">About five minutes. You can change any of this later in Settings.</p>
      <ProfileForm initial={profile ? profileToForm(profile) : EMPTY_PROFILE} mode="onboarding" />
    </main>
  );
}
