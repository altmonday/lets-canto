import { authed } from "@/lib/api/handler";

const TABLES = [
  "learner_profiles",
  "family_members",
  "diagnostics",
  "curriculum_plans",
  "lessons",
  "activity_attempts",
  "skill_mastery",
  "user_vocabulary",
  "phrase_notes",
  "reading_content",
  "progress_events",
];

/** Full data export as JSON. */
export const GET = authed(undefined, async ({ db, userId }) => {
  const exportData: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: userId };
  for (const table of TABLES) {
    const { data } = await db.from(table).select("*").eq("user_id", userId);
    exportData[table] = data ?? [];
  }
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lets-canto-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
