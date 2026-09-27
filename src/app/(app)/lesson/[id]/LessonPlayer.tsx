"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayButton } from "@/components/Audio";
import { CantoLine } from "@/components/CantoLine";
import { McqCard, type McqResult } from "@/components/Mcq";
import { LayerToggles } from "@/components/Prefs";
import { Recorder } from "@/components/Recorder";
import { Button, ButtonLink, Card, Pill, ProgressBar, Zh } from "@/components/ui";
import type { LessonContent, SpeakingFeedback } from "@/lib/schemas";
import type { LessonProgress } from "@/lib/lessons/service";

type Props = {
  lesson: {
    id: string;
    day: number;
    month: number;
    week: number;
    kind: "daily" | "extra";
    status: string;
    content: LessonContent;
    generator: string;
    review_status: string;
    adaptations: { code: string; explanation: string }[];
    progress: LessonProgress;
    score: number | null;
  };
  feedbackAvailable: boolean;
};

type SectionId = "review" | "listening" | "new" | "reading" | "speaking" | "check" | "family";

export function LessonPlayer({ lesson, feedbackAvailable }: Props) {
  const router = useRouter();
  const c = lesson.content;
  const readOnly = lesson.status === "completed";
  const [progress, setProgress] = useState<LessonProgress>({ answers: lesson.progress.answers ?? {}, viewed: lesson.progress.viewed ?? [] });
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(lesson.score);

  const sections: { id: SectionId; label: string; minutes: number }[] = [
    ...(c.review.length ? [{ id: "review" as const, label: "Review", minutes: 3 }] : []),
    { id: "listening", label: "Listen", minutes: 5 },
    { id: "new", label: "New words", minutes: 5 },
    { id: "reading", label: "Read", minutes: 5 },
    { id: "speaking", label: "Speak", minutes: 5 },
    { id: "check", label: "Check", minutes: 3 },
    { id: "family", label: "Family", minutes: 5 },
  ];
  const [active, setActive] = useState<SectionId>(sections[0].id);

  const answered = (key: string) => Boolean(progress.answers[key]);
  const sectionDone: Record<SectionId, boolean> = {
    review: c.review.every((_, i) => answered(`review:${i}`)),
    listening: c.listening.questions.every((_, i) => answered(`listening:${i}`)),
    new: progress.viewed.includes("new_material"),
    reading: c.reading.questions.every((_, i) => answered(`reading:${i}`)),
    speaking: c.speaking.prompts.some((_, i) => answered(`speaking:${i}`)),
    check: c.assessment.questions.every((_, i) => answered(`assessment:${i}`)),
    family: progress.viewed.includes("family"),
  };
  const required = sections.filter((s) => s.id !== "family");
  const doneCount = required.filter((s) => sectionDone[s.id]).length;

  const post = async (body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch("/api/lessons/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't save that answer — check your connection and try again.");
      return null;
    }
    if (data.progress) setProgress(data.progress);
    return data;
  };

  const answerMcq = (section: "listening" | "reading" | "assessment", i: number) => async (choice: number): Promise<McqResult | null> => {
    const data = await post({ key: `${section}:${i}`, choice });
    if (!data) return null;
    if (data.alreadyAnswered) {
      const q = c[section].questions[i];
      return { correct: Boolean(data.answer?.correct), answerIndex: q.answer_index, explanation: q.explanation };
    }
    return { correct: data.correct, answerIndex: data.answerIndex, explanation: data.explanation };
  };

  const complete = async () => {
    setCompleting(true);
    setError(null);
    const res = await fetch("/api/lessons/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id }),
    });
    const data = await res.json().catch(() => ({}));
    setCompleting(false);
    if (!res.ok) return setError(data.error ?? "Couldn't complete the lesson.");
    setFinalScore(data.score);
    router.refresh();
  };

  const idx = sections.findIndex((s) => s.id === active);
  const goNext = () => {
    const next = sections[idx + 1];
    if (next) {
      setActive(next.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const aiLabel = lesson.generator.startsWith("claude:") && lesson.review_status === "unreviewed";

  return (
    <div className="space-y-5">
      <div className="mt-6">
        <div className="flex flex-wrap gap-2">
          <Pill>
            {lesson.kind === "extra" ? "EXTRA PRACTICE" : `DAY ${lesson.day}`} · MONTH {lesson.month} · WEEK {lesson.week}
          </Pill>
          {aiLabel && <Pill tone="clay">Personalised by AI · awaiting native review</Pill>}
          {lesson.generator.startsWith("fallback") && <Pill tone="clay">Core lesson</Pill>}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          {c.title} · <Zh>{c.title_zh}</Zh>
        </h1>
        <p className="mt-1 text-muted">{c.summary}</p>
      </div>

      <Card className="space-y-3 bg-mist/60">
        <h2 className="font-bold">Why this lesson</h2>
        <p className="text-sm">{c.why_this_lesson}</p>
        {lesson.adaptations.length > 0 && (
          <ul className="space-y-1 text-sm text-muted">
            {lesson.adaptations.map((a) => (
              <li key={a.code}>✳ {a.explanation}</li>
            ))}
          </ul>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-bold">Today&apos;s objectives</summary>
          <ul className="mt-2 list-disc pl-5">
            {c.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </details>
      </Card>

      <div className="sticky top-0 z-10 -mx-4 space-y-3 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <LayerToggles />
        <nav aria-label="Lesson sections" className="flex gap-1.5 overflow-x-auto pb-1">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              aria-current={active === s.id ? "step" : undefined}
              className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-bold ${
                active === s.id ? "bg-forest text-white" : sectionDone[s.id] ? "bg-ok-soft text-jade" : "bg-white text-muted"
              }`}
            >
              {sectionDone[s.id] ? "✓ " : ""}
              {s.label}
            </button>
          ))}
        </nav>
        <ProgressBar value={(doneCount / required.length) * 100} label="Lesson progress" />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-soft p-3 text-sm text-rose">
          {error}
        </p>
      )}

      <p className="text-sm text-muted">
        About {sections[idx].minutes} minutes{active === "family" ? " · optional" : ""}
      </p>

      {active === "review" && (
        <div className="space-y-4">
          <p className="text-muted">Words due for spaced review. Try to recall each one before revealing.</p>
          {c.review.map((item, i) => (
            <ReviewCard
              key={item.vocabId + i}
              item={item}
              grade={progress.answers[`review:${i}`]?.grade}
              readOnly={readOnly}
              onGrade={(grade) => post({ key: `review:${i}`, grade })}
            />
          ))}
        </div>
      )}

      {active === "listening" && (
        <div className="space-y-4">
          <p>{c.listening.intro}</p>
          {c.listening.tone_focus.pairs.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-lg font-bold">Tone focus</h2>
              <p className="text-sm text-muted">{c.listening.tone_focus.explanation}</p>
              {c.listening.tone_focus.pairs.map((p, i) => (
                <TonePairRow key={i} pair={p} />
              ))}
            </Card>
          )}
          {c.listening.questions.map((q, i) => (
            <Card key={i}>
              <McqCard q={q} number={i + 1} listening existing={progress.answers[`listening:${i}`]} onAnswer={answerMcq("listening", i)} readOnly={readOnly} />
            </Card>
          ))}
        </div>
      )}

      {active === "new" && (
        <div className="space-y-4">
          {c.new_material.words.map((w, i) => (
            <Card key={i} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <CantoLine line={{ zh: w.zh, jyutping: w.jyutping, en: w.en }} size="lg" forceAll />
                <Pill>{w.category}</Pill>
              </div>
              <div className="rounded-xl bg-paper p-3">
                <CantoLine line={w.example} size="sm" />
              </div>
              {w.note && <p className="text-sm text-muted">💡 {w.note}</p>}
            </Card>
          ))}
          {c.new_material.patterns.map((p, i) => (
            <Card key={i} className="space-y-3">
              <h2 className="text-lg font-bold">
                Pattern: <Zh>{p.pattern}</Zh>
              </h2>
              <p className="text-sm">{p.explanation}</p>
              {p.examples.map((ex, j) => (
                <CantoLine key={j} line={ex} size="sm" />
              ))}
            </Card>
          ))}
          {!readOnly && !sectionDone.new && (
            <Button variant="dark" className="w-full" onClick={() => post({ key: "viewed:new_material" })}>
              I&apos;ve studied these ✓
            </Button>
          )}
        </div>
      )}

      {active === "reading" && (
        <div className="space-y-4">
          <Card className="space-y-4 bg-clay">
            <h2 className="text-lg font-bold">{c.reading.title}</h2>
            {c.reading.passage.map((l, i) => (
              <CantoLine key={i} line={l} compactAudio />
            ))}
            <PlayButton text={c.reading.passage.map((l) => l.zh).join("")} label="Play whole passage" />
          </Card>
          {c.reading.register_note && (
            <Card className="text-sm">
              <b>Spoken vs written Chinese: </b>
              {c.reading.register_note}
            </Card>
          )}
          {c.reading.questions.map((q, i) => (
            <Card key={i}>
              <McqCard q={q} number={i + 1} existing={progress.answers[`reading:${i}`]} onAnswer={answerMcq("reading", i)} readOnly={readOnly} />
            </Card>
          ))}
        </div>
      )}

      {active === "speaking" && (
        <div className="space-y-4">
          <p>{c.speaking.intro}</p>
          <p className="text-sm text-muted">
            Recordings stay on your device. Automatic tone grading for Cantonese isn&apos;t reliable enough yet, so compare with the model and rate
            yourself.
          </p>
          {c.speaking.prompts.map((p, i) => (
            <SpeakingCard
              key={i}
              prompt={p}
              index={i}
              readOnly={readOnly}
              existing={progress.answers[`speaking:${i}`]}
              feedbackAvailable={feedbackAvailable}
              lessonId={lesson.id}
              onRate={(rating) => post({ key: `speaking:${i}`, rating })}
              onProgress={setProgress}
            />
          ))}
        </div>
      )}

      {active === "check" && (
        <div className="space-y-4">
          <p className="text-muted">A quick check of today&apos;s material. Your first answer counts.</p>
          {c.assessment.questions.map((q, i) => (
            <Card key={i}>
              <McqCard q={q} number={i + 1} existing={progress.answers[`assessment:${i}`]} onAnswer={answerMcq("assessment", i)} readOnly={readOnly} />
            </Card>
          ))}
        </div>
      )}

      {active === "family" && (
        <Card className="space-y-4 bg-clay">
          <Pill tone="clay">{c.family.kind.toUpperCase()}</Pill>
          <h2 className="text-xl font-bold">{c.family.title}</h2>
          <p className="text-sm text-muted">{c.family.age_note}</p>
          <p>{c.family.instructions}</p>
          {c.family.lines.map((l, i) => (
            <CantoLine key={i} line={l} />
          ))}
          {!readOnly && !sectionDone.family && (
            <Button variant="secondary" onClick={() => post({ key: "viewed:family" })}>
              We did this together ♡
            </Button>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {idx < sections.length - 1 && (
          <Button variant="secondary" onClick={goNext}>
            Next: {sections[idx + 1].label} →
          </Button>
        )}
      </div>

      <Card className="space-y-3">
        {readOnly || finalScore !== null ? (
          <>
            <h2 className="text-xl font-extrabold">Lesson complete ✓</h2>
            <p>
              Score on today&apos;s questions: <b>{Math.round((finalScore ?? 0) * 100)}%</b>. New words have been added to your vocabulary bank and
              scheduled for review.
            </p>
            <ButtonLink href="/" variant="dark">
              Back to Today
            </ButtonLink>
          </>
        ) : (
          <>
            <h2 className="font-bold">Finish today&apos;s lesson</h2>
            <p className="text-sm text-muted">
              {doneCount === required.length
                ? "Everything's answered — well done."
                : `Complete every section except Family to finish (${doneCount}/${required.length} done). Answers save automatically, so you can stop and resume on any device.`}
            </p>
            <Button variant="dark" className="w-full" disabled={doneCount < required.length || completing} onClick={complete}>
              {completing ? "Saving…" : "Complete lesson ✓"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

function TonePairRow({ pair }: { pair: LessonContent["listening"]["tone_focus"]["pairs"][number] }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-xl bg-paper p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2">
          <Zh className="text-2xl font-bold">{pair.a.zh}</Zh>
          <PlayButton text={pair.a.zh} compact />
        </span>
        <span className="flex items-center gap-2">
          <Zh className="text-2xl font-bold">{pair.b.zh}</Zh>
          <PlayButton text={pair.b.zh} compact />
        </span>
        <button type="button" className="min-h-10 rounded-lg px-3 text-sm font-bold text-forest underline" onClick={() => setRevealed((r) => !r)}>
          {revealed ? "Hide" : "Same or different?"}
        </button>
      </div>
      {revealed && (
        <p className="mt-2 text-sm">
          <b>{pair.same_tone ? "Same tone." : "Different tones."}</b>{" "}
          <span className="text-jade">
            {pair.a.jyutping} / {pair.b.jyutping}
          </span>{" "}
          — {pair.note}
        </p>
      )}
    </div>
  );
}

function ReviewCard({
  item,
  grade,
  readOnly,
  onGrade,
}: {
  item: LessonContent["review"][number];
  grade?: string;
  readOnly: boolean;
  onGrade: (g: "again" | "hard" | "good" | "easy") => Promise<unknown>;
}) {
  const [revealed, setRevealed] = useState(Boolean(grade));
  const [busy, setBusy] = useState(false);
  const production = item.direction === "production";
  return (
    <Card className="space-y-3">
      <Pill>{production ? "SAY IT IN CANTONESE" : "WHAT DOES THIS MEAN?"}</Pill>
      {production ? (
        <p className="text-2xl font-bold">{item.en}</p>
      ) : (
        <div className="flex items-center gap-3">
          <Zh className="text-3xl font-bold">{item.zh}</Zh>
          <PlayButton text={item.zh} compact />
        </div>
      )}
      {revealed ? (
        <div className="rounded-xl bg-paper p-3">
          <CantoLine line={{ zh: item.zh, jyutping: item.jyutping, en: item.en }} forceAll compactAudio />
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setRevealed(true)}>
          {production ? "Say it aloud, then reveal" : "Reveal"}
        </Button>
      )}
      {revealed && (
        <div>
          <p className="mb-2 text-sm text-muted">{grade ? "Your rating:" : "How well did you remember it?"}</p>
          <div className="grid grid-cols-4 gap-2">
            {(["again", "hard", "good", "easy"] as const).map((g) => (
              <button
                key={g}
                type="button"
                disabled={Boolean(grade) || busy || readOnly}
                onClick={async () => {
                  setBusy(true);
                  await onGrade(g);
                  setBusy(false);
                }}
                className={`min-h-11 rounded-lg text-sm font-bold capitalize ${grade === g ? "bg-forest text-white" : "bg-mist text-forest"} disabled:opacity-70`}
              >
                {g === "again" ? "Forgot" : g}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function SpeakingCard({
  prompt,
  index,
  readOnly,
  existing,
  feedbackAvailable,
  lessonId,
  onRate,
  onProgress,
}: {
  prompt: LessonContent["speaking"]["prompts"][number];
  index: number;
  readOnly: boolean;
  existing?: { rating?: number; typed?: string };
  feedbackAvailable: boolean;
  lessonId: string;
  onRate: (rating: number) => Promise<unknown>;
  onProgress: (p: LessonProgress) => void;
}) {
  const [showModel, setShowModel] = useState(Boolean(existing));
  const [rating, setRating] = useState(existing?.rating);
  const [typed, setTyped] = useState(existing?.typed ?? "");
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [fbState, setFbState] = useState<"idle" | "loading" | "error">("idle");
  const [fbError, setFbError] = useState<string | null>(null);

  const getFeedback = async () => {
    setFbState("loading");
    setFbError(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, promptIndex: index, attempt: typed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFbState("error");
      setFbError(data.error ?? "Feedback isn't available right now.");
      return;
    }
    setFeedback(data.feedback);
    if (data.progress) onProgress(data.progress);
    setFbState("idle");
  };

  return (
    <Card className="space-y-4">
      <div>
        <Pill>PROMPT {index + 1}</Pill>
        <p className="mt-2 text-lg font-bold">{prompt.situation}</p>
        <p className="text-sm text-muted">Hint: {prompt.hint}</p>
      </div>
      {!readOnly && <Recorder />}
      {showModel ? (
        <div className="rounded-xl bg-paper p-3">
          <p className="mb-1 text-xs font-bold text-muted">MODEL ANSWER</p>
          <CantoLine line={prompt.target} forceAll />
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setShowModel(true)}>
          Show model answer
        </Button>
      )}

      {!readOnly && (
        <div>
          <p className="mb-2 text-sm font-bold">How close were you?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              [1, "Needs work"],
              [2, "Close"],
              [3, "Nailed it"],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={rating === v}
                onClick={async () => {
                  setRating(v as number);
                  setShowModel(true);
                  await onRate(v as number);
                }}
                className={`min-h-11 rounded-lg text-sm font-bold ${rating === v ? "bg-forest text-white" : "bg-mist text-forest"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedbackAvailable && !readOnly && (
        <details className="rounded-xl border border-line p-3" open={Boolean(feedback)}>
          <summary className="cursor-pointer font-bold">Get written feedback on what you said</summary>
          <p className="mt-2 text-sm text-muted">
            Type what you said (characters, Jyutping or both). Feedback covers words and grammar — it can&apos;t hear your recording.
          </p>
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-line p-3"
            maxLength={300}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="What you said"
            placeholder="e.g. ngo5 soeng2 sik6 min6"
          />
          <Button className="mt-2" variant="secondary" disabled={!typed.trim() || fbState === "loading"} onClick={getFeedback}>
            {fbState === "loading" ? "Checking…" : "Check my answer"}
          </Button>
          {fbError && <p className="mt-2 text-sm text-rose">{fbError}</p>}
          {feedback && (
            <div className="mt-3 space-y-2 text-sm" aria-live="polite">
              <p>
                <b>{feedback.communicates ? "✓ A Hong Kong speaker would understand you." : "A listener might not follow this yet."}</b> Understood as: “
                {feedback.understood_as}”
              </p>
              {feedback.corrections.map((corr, i) => (
                <div key={i} className="rounded-lg bg-paper p-2">
                  <p>{corr.issue}</p>
                  {corr.suggestion && <CantoLine line={corr.suggestion} size="sm" compactAudio forceAll />}
                </div>
              ))}
              {feedback.tone_notes && <p className="text-muted">Tones: {feedback.tone_notes}</p>}
              <div>
                <p className="text-xs font-bold text-muted">NATURAL VERSION</p>
                <CantoLine line={feedback.natural_version} size="sm" compactAudio forceAll />
              </div>
              <p className="text-jade">{feedback.encouragement}</p>
            </div>
          )}
        </details>
      )}
    </Card>
  );
}
