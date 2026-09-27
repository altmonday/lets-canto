"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayButton, useAudioAvailable } from "@/components/Audio";
import { Recorder } from "@/components/Recorder";
import { Button, Card, Pill, ProgressBar, Zh } from "@/components/ui";
import { DIAGNOSTIC_SKILLS, ITEMS_PER_SKILL, nextItem, type DiagnosticResponse, type SelfAssessment } from "@/lib/diagnostic";

const SKILL_NAMES: Record<string, string> = {
  characters: "Characters",
  vocab_recognition: "Vocabulary",
  tone: "Tones",
  listening: "Listening",
  sentence: "Sentences",
  reading: "Reading",
};

type Stage = "intro" | "audio" | "quiz" | "speaking" | "submitting" | "error";

export function DiagnosticRunner({ self, name, retake }: { self: SelfAssessment; name: string; retake: boolean }) {
  const router = useRouter();
  const deviceAudio = useAudioAvailable();
  const [stage, setStage] = useState<Stage>("intro");
  const [audioOk, setAudioOk] = useState(true);
  const [responses, setResponses] = useState<(DiagnosticResponse & { choice: number | null })[]>([]);
  const [speakingRating, setSpeakingRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = useMemo(() => {
    for (const skill of DIAGNOSTIC_SKILLS) {
      const item = nextItem(skill, responses, self, audioOk);
      if (item) return item;
    }
    return null;
  }, [responses, self, audioOk]);

  const total = DIAGNOSTIC_SKILLS.length * ITEMS_PER_SKILL;
  const answer = (choice: number | null) => {
    if (!current) return;
    setResponses((rs) => [
      ...rs,
      { itemId: current.id, skill: current.skill, difficulty: current.difficulty, correct: choice === current.answer, skipped: choice === null, choice },
    ]);
  };

  const submit = async () => {
    setStage("submitting");
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: responses.map((r) => ({ itemId: r.itemId, choice: r.choice })),
          audioAvailable: audioOk,
          speakingRating,
        }),
        // Never wait forever: the server gives up well before this.
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save your results.");
        setStage("error");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      // The connection dropped (e.g. the phone slept). The results may well have been saved.
      setError("We lost the connection while building your plan. It may have finished anyway — check your dashboard first.");
      setStage("error");
    }
  };

  if (stage === "intro") {
    return (
      <div className="space-y-5">
        <Pill>PLACEMENT · ABOUT 8 MINUTES</Pill>
        <h1 className="text-3xl font-extrabold tracking-tight">{retake ? "Retake your placement" : `Nice to meet you, ${name}.`}</h1>
        <p className="text-muted">
          A short adaptive quiz across characters, vocabulary, tones, listening, sentences and reading. Questions get harder when you&apos;re
          right and easier when you&apos;re not — so it&apos;s normal to miss some. Choose “I don&apos;t know” rather than guessing.
        </p>
        <Button variant="dark" className="w-full" onClick={() => setStage("audio")}>
          Start →
        </Button>
      </div>
    );
  }

  if (stage === "audio") {
    return (
      <Card className="space-y-4">
        <h2 className="text-xl font-extrabold">Sound check</h2>
        <p>Tap play. Can you hear someone say “good morning” in Cantonese?</p>
        <PlayButton text="早晨" label="Play" />
        {deviceAudio === false && <p className="text-sm text-rose">This device doesn&apos;t seem to have a Cantonese voice.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="dark" onClick={() => (setAudioOk(true), setStage("quiz"))}>
            Yes, I can hear it
          </Button>
          <Button variant="secondary" onClick={() => (setAudioOk(false), setStage("quiz"))}>
            No audio — skip listening
          </Button>
        </div>
      </Card>
    );
  }

  if (stage === "quiz" && current) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Pill>{SKILL_NAMES[current.skill]}</Pill>
          <span className="text-sm text-muted">
            {responses.length + 1} / ~{total}
          </span>
        </div>
        <ProgressBar value={(responses.length / total) * 100} label="Placement progress" />
        <Card className="space-y-4" key={current.id}>
          <h2 className="text-lg font-bold">{current.prompt}</h2>
          {current.display && (
            <p className="text-center">
              {/[一-鿿]/.test(current.display) ? (
                <Zh className="text-5xl font-bold">{current.display}</Zh>
              ) : (
                <span className="text-2xl font-bold text-jade">{current.display}</span>
              )}
            </p>
          )}
          {current.passage && (
            <div className="space-y-1 rounded-xl bg-clay p-4 text-lg">
              {current.passage.map((l, i) => (
                <p key={i}>
                  <Zh>{l}</Zh>
                </p>
              ))}
            </div>
          )}
          {current.audio && (
            <div className="flex flex-wrap gap-3">
              {current.audio.map((a, i) => (
                <PlayButton key={i} text={a.zh} label={current.audio!.length > 1 ? `Sound ${i + 1}` : "Listen"} compact={false} />
              ))}
            </div>
          )}
          <div className="grid gap-2">
            {current.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => answer(i)}
                className="min-h-12 rounded-xl border border-line bg-white px-4 py-2 text-left hover:border-forest-soft"
              >
                <span lang={/[一-鿿]/.test(opt) ? "zh-HK" : undefined}>{opt}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => answer(-1)}>
              I don&apos;t know
            </Button>
            {current.needsAudio && (
              <Button variant="ghost" onClick={() => answer(null)}>
                Can&apos;t play audio
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (stage === "speaking" || (stage === "quiz" && !current)) {
    return (
      <Card className="space-y-4">
        <Pill>SPEAKING · LAST STEP</Pill>
        <h2 className="text-xl font-extrabold">Introduce yourself</h2>
        <p>
          Say hello and your name, e.g. <Zh className="font-bold">你好，我叫…</Zh> <span className="text-jade">(nei5 hou2, ngo5 giu3 …)</span>. Add
          anything else you can.
        </p>
        <Recorder />
        <p className="text-sm text-muted">Automatic Cantonese pronunciation scoring isn&apos;t reliable enough yet, so please rate yourself honestly:</p>
        <div className="grid gap-2">
          {[
            [1, "I couldn't really say it"],
            [2, "I managed a simple sentence"],
            [3, "I said several sentences comfortably"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={speakingRating === value}
              onClick={() => setSpeakingRating(value as number)}
              className={`min-h-12 rounded-xl border px-4 text-left ${speakingRating === value ? "border-forest bg-mist font-bold" : "border-line bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="dark" className="w-full" onClick={submit}>
          {speakingRating ? "Build my plan →" : "Skip and build my plan →"}
        </Button>
      </Card>
    );
  }

  if (stage === "submitting") {
    return (
      <Card className="space-y-3 text-center" aria-live="polite">
        <div className="text-4xl" aria-hidden>
          ✳
        </div>
        <h2 className="text-xl font-extrabold">Building your 12-month pathway…</h2>
        <p className="text-muted">We&apos;re personalising your plan from your answers. This can take up to a minute — please keep this screen open.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <p className="text-rose">{error}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="dark" onClick={() => (router.replace("/"), router.refresh())}>
          Go to my dashboard
        </Button>
        <Button variant="secondary" onClick={submit}>
          Try again
        </Button>
      </div>
    </Card>
  );
}
