import { z } from "zod";
import { authed } from "@/lib/api/handler";
import { gradeVocab, recordEvidence } from "@/lib/lessons/service";

const Body = z.object({
  vocabId: z.string().uuid(),
  direction: z.enum(["recognition", "production"]),
  grade: z.enum(["again", "hard", "good", "easy"]),
});

/** Independent vocabulary practice outside lessons. */
export const POST = authed(Body, async ({ db, userId }, body) => {
  const { zh, card } = await gradeVocab(db, userId, body.vocabId, body.direction, body.grade);
  await recordEvidence(db, userId, {
    lessonId: null,
    section: "practice",
    itemKey: `vocab:${body.vocabId}:${body.direction}`,
    skill: body.direction === "production" ? "vocab_production" : "vocab_recognition",
    correct: body.grade !== "again",
    vocabZh: zh,
  });
  return { due: card.due };
});
