import { PageTitle } from "@/components/ui";
import { requireUserId, type VocabRow } from "@/lib/lessons/service";
import { isMastered } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";
import { VocabBank } from "./VocabBank";

export default async function VocabularyPage({ searchParams }: PageProps<"/vocabulary">) {
  const { review } = await searchParams;
  const db = await createClient();
  const userId = await requireUserId(db);
  const [{ data: vocab }, { data: phrases }] = await Promise.all([
    db
      .from("user_vocabulary")
      .select("id, zh, jyutping, en, category, example, recognition_card, production_card, recognition_due, production_due, lapses, bookmarked, personal_note, source_lesson_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2000),
    db.from("phrase_notes").select("id, zh, jyutping, en, note, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const now = new Date().toISOString();
  const words = ((vocab ?? []) as VocabRow[]).map((v) => ({
    id: v.id,
    zh: v.zh,
    jyutping: v.jyutping,
    en: v.en,
    category: v.category ?? "other",
    example: v.example,
    bookmarked: v.bookmarked,
    note: v.personal_note,
    lapses: v.lapses,
    recognitionDue: v.recognition_due <= now,
    productionDue: v.production_due <= now && v.recognition_card.reps >= 2,
    recognitionMastered: isMastered(v.recognition_card),
    productionMastered: isMastered(v.production_card),
    nextReview: v.recognition_due < v.production_due ? v.recognition_due : v.production_due,
    sourceLessonId: v.source_lesson_id,
  }));

  return (
    <div>
      <PageTitle title="Vocabulary" subtitle="Every word from your lessons, with recognition and production tracked separately." />
      <VocabBank words={words} phrases={phrases ?? []} startInReview={review === "1"} />
    </div>
  );
}
