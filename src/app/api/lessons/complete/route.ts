import { after } from "next/server";
import { z } from "zod";
import { authed } from "@/lib/api/handler";
import {
  HttpError,
  addLessonVocabulary,
  currentLesson,
  getLesson,
  lessonScore,
  logEvent,
  missingForCompletion,
} from "@/lib/lessons/service";

export const maxDuration = 300;

const Body = z.object({ lessonId: z.string().uuid() });

export const POST = authed(Body, async ({ db, userId }, body) => {
  const lesson = await getLesson(db, userId, body.lessonId);
  if (lesson.status === "completed") return { ok: true, score: lesson.score };

  const missing = missingForCompletion(lesson);
  if (missing.length) throw new HttpError(400, `Not finished yet: ${missing.join(", ")}`);

  const score = Math.round(lessonScore(lesson) * 100) / 100;
  const { error } = await db
    .from("lessons")
    .update({ status: "completed", score, completed_at: new Date().toISOString() })
    .eq("id", lesson.id)
    .eq("user_id", userId);
  if (error) throw new HttpError(500, error.message);

  await addLessonVocabulary(db, userId, lesson);
  await db.from("reading_content").insert({
    user_id: userId,
    source: "lesson",
    lesson_id: lesson.id,
    title: lesson.content.reading.title,
    content: { passage: lesson.content.reading.passage, register_note: lesson.content.reading.register_note },
    generator: lesson.generator,
  });
  await logEvent(db, userId, "lesson_completed", { day: lesson.day, kind: lesson.kind, score });

  // Prepare the next lesson in the background, from evidence that now includes today.
  if (lesson.kind === "daily") {
    after(async () => {
      try {
        await currentLesson(db, userId);
      } catch (e) {
        console.error("Prefetch failed", e);
      }
    });
  }
  return { ok: true, score };
});
