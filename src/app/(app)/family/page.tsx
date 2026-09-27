import { PageTitle } from "@/components/ui";
import { aiConfigured } from "@/lib/ai/claude";
import { getFamily, requireUserId } from "@/lib/lessons/service";
import type { FamilyActivity } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { FamilyHub } from "./FamilyHub";

export default async function FamilyPage() {
  const db = await createClient();
  const userId = await requireUserId(db);
  const [members, { data: library }, { data: lessons }] = await Promise.all([
    getFamily(db, userId),
    db.from("reading_content").select("id, source, title, content, family_member_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
    db
      .from("lessons")
      .select("id, day, content->family")
      .eq("user_id", userId)
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const activities = ((lessons ?? []) as unknown as { id: string; day: number; family: FamilyActivity }[]).filter((l) => l.family);

  return (
    <div>
      <PageTitle title="Family" subtitle="Five playful minutes of Cantonese with the children in your life." />
      <FamilyHub members={members} library={library ?? []} activities={activities} storiesAvailable={aiConfigured()} />
    </div>
  );
}
