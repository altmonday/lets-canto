import { redirect } from "next/navigation";
import { PrefsProvider } from "@/components/Prefs";
import { getProfile, requireUserId } from "@/lib/lessons/service";
import { displayPrefs } from "@/lib/profile-form";
import { createClient } from "@/lib/supabase/server";
import { ttsConfigured } from "@/lib/tts";
import type { SelfAssessment } from "@/lib/diagnostic";
import { DiagnosticRunner } from "./DiagnosticRunner";

export default async function DiagnosticPage() {
  const db = await createClient();
  const userId = await requireUserId(db).catch(() => redirect("/login"));
  const profile = await getProfile(db, userId);
  if (!profile) redirect("/onboarding");

  return (
    <PrefsProvider initial={{ ...displayPrefs(profile), showJyutping: false, showEnglish: false }} ttsAvailable={ttsConfigured()}>
      <main className="mx-auto max-w-xl px-4 py-8">
        <DiagnosticRunner self={profile.self_assessment as SelfAssessment} name={profile.display_name} retake={Boolean(profile.diagnostic_completed_at)} />
      </main>
    </PrefsProvider>
  );
}
