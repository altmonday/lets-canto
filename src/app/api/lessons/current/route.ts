import { authed } from "@/lib/api/handler";
import { currentLesson } from "@/lib/lessons/service";

// Lesson generation can take a minute or more.
export const maxDuration = 300;

export const POST = authed(undefined, async ({ db, userId }) => {
  const lesson = await currentLesson(db, userId);
  return { id: lesson.id, day: lesson.day, generator: lesson.generator };
});
