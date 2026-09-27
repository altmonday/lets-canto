"use client";

import { useState } from "react";
import type { Mcq } from "@/lib/schemas";
import { CantoLine } from "./CantoLine";
import { PlayButton } from "./Audio";

export type McqResult = { correct: boolean; answerIndex: number; explanation: string };

/**
 * One multiple-choice question. The first answer is final. In listening mode the
 * audio line's text stays hidden until the learner has answered.
 */
export function McqCard({
  q,
  number,
  listening = false,
  existing,
  onAnswer,
  readOnly = false,
}: {
  q: Mcq;
  number: number;
  listening?: boolean;
  existing?: { choice?: number; correct?: boolean };
  onAnswer: (choice: number) => Promise<McqResult | null>;
  readOnly?: boolean;
}) {
  const [choice, setChoice] = useState<number | undefined>(existing?.choice);
  const [result, setResult] = useState<McqResult | null>(
    existing?.choice !== undefined ? { correct: Boolean(existing.correct), answerIndex: q.answer_index, explanation: q.explanation } : null,
  );
  const [busy, setBusy] = useState(false);
  const answered = result !== null;

  const pick = async (i: number) => {
    if (answered || busy || readOnly) return;
    setBusy(true);
    setChoice(i);
    const r = await onAnswer(i);
    if (r) setResult(r);
    else setChoice(undefined);
    setBusy(false);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="font-bold">
        <span className="mr-2 text-muted">{number}.</span>
        {q.prompt}
      </legend>
      {q.audio &&
        (listening && !answered ? (
          <PlayButton text={q.audio.zh} label="Listen" />
        ) : (
          <div className="rounded-xl bg-paper p-3">
            <CantoLine line={q.audio} size="sm" />
          </div>
        ))}
      <div className="grid gap-2">
        {q.options.map((opt, i) => {
          const isAnswer = answered && i === result.answerIndex;
          const isWrongPick = answered && i === choice && !result.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={answered || busy || readOnly}
              onClick={() => pick(i)}
              aria-pressed={choice === i}
              className={`min-h-12 rounded-xl border px-4 py-2 text-left text-[15px] transition ${
                isAnswer
                  ? "border-sage bg-ok-soft font-bold"
                  : isWrongPick
                    ? "border-rose bg-rose-soft"
                    : choice === i
                      ? "border-forest bg-mist"
                      : "border-line bg-white hover:border-forest-soft"
              }`}
            >
              <span lang={/[一-鿿]/.test(opt) ? "zh-HK" : undefined}>{opt}</span>
              {isAnswer && <span className="sr-only"> (correct answer)</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={`text-sm ${result.correct ? "text-jade" : "text-rose"}`} role="status">
          <b>{result.correct ? "Correct. " : "Not quite. "}</b>
          {result.explanation}
        </p>
      )}
    </fieldset>
  );
}
