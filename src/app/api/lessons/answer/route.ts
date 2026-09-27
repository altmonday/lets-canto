import { z } from "zod";
import { authed } from "@/lib/api/handler";
import {
  HttpError,
  getLesson,
  gradeVocab,
  recordEvidence,
  saveProgress,
  startLesson,
  type LessonAnswer,
} from "@/lib/lessons/service";
import { gradeFromAnswer } from "@/lib/srs";
import { isSkill } from "@/lib/skills";

const Body = z.object({
  lessonId: z.string().uuid(),
  key: z.string().regex(/^(listening|reading|assessment|review|speaking|viewed):[a-z_0-9]+$/),
  choice: z.number().int().optional(),
  grade: z.enum(["again", "hard", "good", "easy"]).optional(),
  rating: z.number().int().min(1).max(3).optional(),
});

/**
 * Records one answer. Correctness is computed on the server from the stored lesson;
 * multiple-choice answers are final (first answer counts), so a lesson can't be
 * completed by tapping until something turns green.
 */
export const POST = authed(Body, async ({ db, userId }, body) => {
  let lesson = await getLesson(db, userId, body.lessonId);
  if (lesson.status === "completed") throw new HttpError(409, "This lesson is already complete");
  if (lesson.status === "superseded") throw new HttpError(409, "This lesson was replaced by a newer version");
  lesson = await startLesson(db, userId, lesson);

  const progress = { answers: { ...(lesson.progress.answers ?? {}) }, viewed: [...(lesson.progress.viewed ?? [])] };
  const [section, rawIndex] = body.key.split(":");
  const now = new Date().toISOString();

  if (section === "viewed") {
    if (!progress.viewed.includes(rawIndex)) progress.viewed.push(rawIndex);
    await saveProgress(db, userId, lesson, progress);
    return { progress };
  }

  const index = Number(rawIndex);
  if (progress.answers[body.key] && section !== "speaking") {
    return { progress, alreadyAnswered: true, answer: progress.answers[body.key] };
  }

  let answer: LessonAnswer;
  let result: Record<string, unknown> = {};

  if (section === "listening" || section === "reading" || section === "assessment") {
    const q = lesson.content[section].questions[index];
    if (!q || body.choice === undefined) throw new HttpError(400, "Unknown question or missing choice");
    const correct = body.choice === q.answer_index;
    answer = { choice: body.choice, correct, at: now };
    result = { correct, answerIndex: q.answer_index, explanation: q.explanation };
    const skill = isSkill(q.skill) ? q.skill : "vocab_recognition";
    await recordEvidence(db, userId, {
      lessonId: lesson.id,
      section,
      itemKey: body.key,
      skill,
      correct,
      response: { choice: body.choice },
      vocabZh: q.vocab_zh,
    });
    // If this question tests a word already in the bank, it counts as a review of that word.
    if (q.vocab_zh) {
      const { data: vocab } = await db.from("user_vocabulary").select("id").eq("user_id", userId).eq("zh", q.vocab_zh).maybeSingle();
      if (vocab) await gradeVocab(db, userId, vocab.id, skill === "vocab_production" ? "production" : "recognition", gradeFromAnswer(correct, true));
    }
  } else if (section === "review") {
    const item = lesson.content.review[index];
    if (!item || !body.grade) throw new HttpError(400, "Unknown review item or missing grade");
    await gradeVocab(db, userId, item.vocabId, item.direction, body.grade);
    const correct = body.grade !== "again";
    answer = { grade: body.grade, correct, at: now };
    await recordEvidence(db, userId, {
      lessonId: lesson.id,
      section,
      itemKey: body.key,
      skill: item.direction === "production" ? "vocab_production" : "vocab_recognition",
      correct,
      vocabZh: item.zh,
    });
  } else if (section === "speaking") {
    const prompt = lesson.content.speaking.prompts[index];
    if (!prompt || !body.rating) throw new HttpError(400, "Unknown prompt or missing self-rating");
    answer = { ...progress.answers[body.key], rating: body.rating, at: now };
    // Self-rated: moves the fluency estimate gently and is labelled as self-reported.
    await recordEvidence(db, userId, {
      lessonId: lesson.id,
      section,
      itemKey: body.key,
      skill: "fluency",
      correct: body.rating >= 2,
      score: body.rating / 3,
      response: { selfRating: body.rating },
    });
  } else {
    throw new HttpError(400, "Unknown section");
  }

  progress.answers[body.key] = answer;
  await saveProgress(db, userId, lesson, progress);
  return { progress, ...result };
});
