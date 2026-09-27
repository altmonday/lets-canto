import { notFound } from "next/navigation";
import { aiConfigured } from "@/lib/ai/claude";
import { getLesson, HttpError, requireUserId, startLesson } from "@/lib/lessons/service";
import { createClient } from "@/lib/supabase/server";
import { LessonPlayer } from "./LessonPlayer";

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const userId = await requireUserId(db);
  let lesson = await getLesson(db, userId, id).catch((e) => {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  });
  if (lesson.status === "superseded") notFound();
  // Snapshot today's due review words before rendering, so item indices stay stable.
  lesson = await startLesson(db, userId, lesson);
  return <LessonPlayer key={lesson.id} lesson={lesson} feedbackAvailable={aiConfigured()} />;
}
