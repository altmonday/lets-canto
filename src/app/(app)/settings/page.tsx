import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { PageTitle } from "@/components/ui";
import { getProfile, requireUserId } from "@/lib/lessons/service";
import { profileToForm } from "@/lib/profile-form";
import { createClient } from "@/lib/supabase/server";
import { AccountActions, DifficultyControl } from "./SettingsClient";

export default async function SettingsPage() {
  const db = await createClient();
  const userId = await requireUserId(db);
  const [profile, { data: claims }] = await Promise.all([getProfile(db, userId), db.auth.getClaims()]);

  return (
    <div className="space-y-8">
      <PageTitle title="Settings" subtitle={`Signed in as ${String(claims?.claims?.email ?? "")}`} />
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Lesson difficulty</h2>
        <DifficultyControl initial={profile!.difficulty_offset} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Your profile & goals</h2>
        <p className="mb-3 text-sm text-muted">Changing your goals re-plans upcoming lessons. Completed lessons and your history stay as they are.</p>
        <ProfileForm initial={profileToForm(profile!)} mode="edit" />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Placement</h2>
        <Link href="/diagnostic" className="text-forest underline">
          Retake the placement quiz
        </Link>
        <p className="mt-1 text-sm text-muted">Resets your skill estimates from a fresh quiz. Lesson history is kept.</p>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Account & data</h2>
        <AccountActions />
        <p className="mt-3 text-sm">
          <Link href="/privacy" className="text-forest underline">
            Privacy &amp; data retention
          </Link>
        </p>
      </section>
    </div>
  );
}
