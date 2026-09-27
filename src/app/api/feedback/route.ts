import { z } from "zod";
import { authed } from "@/lib/api/handler";
import { AiGenerationError, aiConfigured } from "@/lib/ai/claude";
import { generateSpeakingFeedback } from "@/lib/ai/generators";
import { targetLevel } from "@/lib/adaptive";
import {
  HttpError,
  checkAiQuota,
  getLesson,
  getProfile,
  loadSkills,
  logEvent,
  recordEvidence,
  saveProgress,
  startLesson,
} from "@/lib/lessons/service";

export const maxDuration = 120;

const Body = z.object({
  lessonId: z.string().uuid(),
  promptIndex: z.number().int().min(0),
  attempt: z.string().trim().min(1).max(300),
});

export const POST = authed(Body, async ({ db, userId }, body) => {
  if (!aiConfigured()) throw new HttpError(503, "Written feedback isn't available right now");
  if (!(await checkAiQuota(db, userId, "ai_feedback", 80))) throw new HttpError(429, "You've reached today's feedback limit");

  let lesson = await getLesson(db, userId, body.lessonId);
  if (lesson.status === "completed") throw new HttpError(409, "This lesson is already complete");
  lesson = await startLesson(db, userId, lesson);
  const prompt = lesson.content.speaking.prompts[body.promptIndex];
  if (!prompt) throw new HttpError(400, "Unknown prompt");

  const [profile, skills] = await Promise.all([getProfile(db, userId), loadSkills(db, userId)]);
  await logEvent(db, userId, "ai_feedback", { lessonId: lesson.id });
  const { feedback } = await generateSpeakingFeedback({
    situation: prompt.situation,
    target: prompt.target,
    attempt: body.attempt,
    learnerLevel: targetLevel(skills, profile?.difficulty_offset ?? 0),
  }).catch((error) => {
    if (error instanceof AiGenerationError) throw new HttpError(502, `Feedback isn't available: ${error.message}`);
    throw error;
  });

  await recordEvidence(db, userId, {
    lessonId: lesson.id,
    section: "speaking",
    itemKey: `speaking:${body.promptIndex}:written`,
    skill: "sentence",
    correct: feedback.communicates,
    response: { attempt: body.attempt },
  });
  const key = `speaking:${body.promptIndex}`;
  const progress = { answers: { ...(lesson.progress.answers ?? {}) }, viewed: [...(lesson.progress.viewed ?? [])] };
  progress.answers[key] = { ...progress.answers[key], typed: body.attempt, at: new Date().toISOString() };
  await saveProgress(db, userId, lesson, progress);
  return { feedback, progress };
});
