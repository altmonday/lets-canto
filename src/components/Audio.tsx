"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefs } from "./Prefs";

const blobCache = new Map<string, string>();
let current: HTMLAudioElement | null = null;

function cantoneseVoice(): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === "undefined") return undefined;
  return speechSynthesis.getVoices().find((v) => /^(yue|zh-HK)/i.test(v.lang) || /cantonese/i.test(v.name));
}

export type SpeakResult = "ok" | "unavailable";

/**
 * Plays Cantonese audio: server neural zh-HK voice when configured, otherwise an
 * on-device zh-HK voice. Never falls back to a Mandarin voice — that would teach
 * the wrong pronunciation.
 */
export function useSpeaker() {
  const { ttsAvailable, audioRate } = usePrefs();

  const speak = useCallback(
    async (text: string, opts: { rate?: "normal" | "slow"; onEnd?: () => void } = {}): Promise<SpeakResult> => {
      const rate = opts.rate ?? audioRate;
      current?.pause();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();

      if (ttsAvailable) {
        const key = `${rate}|${text}`;
        try {
          let src = blobCache.get(key);
          if (!src) {
            const res = await fetch(`/api/tts?rate=${rate}&text=${encodeURIComponent(text)}`);
            if (!res.ok) throw new Error("tts failed");
            src = URL.createObjectURL(await res.blob());
            blobCache.set(key, src);
          }
          current = new Audio(src);
          current.onended = () => opts.onEnd?.();
          await current.play();
          return "ok";
        } catch {
          // fall through to device voice
        }
      }

      const voice = cantoneseVoice();
      if (!voice) return "unavailable";
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = rate === "slow" ? 0.65 : 0.95;
      u.onend = () => opts.onEnd?.();
      speechSynthesis.speak(u);
      return "ok";
    },
    [ttsAvailable, audioRate],
  );

  return { speak };
}

/** Whether any Cantonese audio source is available on this device. */
export function useAudioAvailable(): boolean | null {
  const { ttsAvailable } = usePrefs();
  const [available, setAvailable] = useState<boolean | null>(ttsAvailable ? true : null);
  useEffect(() => {
    if (ttsAvailable) return;
    const check = () => setAvailable(Boolean(cantoneseVoice()));
    check();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.addEventListener?.("voiceschanged", check);
    const t = setTimeout(check, 800);
    return () => {
      clearTimeout(t);
      if (typeof speechSynthesis !== "undefined") speechSynthesis.removeEventListener?.("voiceschanged", check);
    };
  }, [ttsAvailable]);
  return available;
}

export function PlayButton({ text, label = "Play", compact = false }: { text: string; label?: string; compact?: boolean }) {
  const { speak } = useSpeaker();
  const [status, setStatus] = useState<"idle" | "playing" | "unavailable">("idle");
  const [looping, setLooping] = useState(false);
  const loopRef = useRef(false);

  const play = async (rate?: "normal" | "slow") => {
    setStatus("playing");
    const result = await speak(text, {
      rate,
      onEnd: () => {
        if (loopRef.current) setTimeout(() => play(rate), 700);
        else setStatus("idle");
      },
    });
    if (result === "unavailable") setStatus("unavailable");
  };

  const toggleLoop = () => {
    loopRef.current = !loopRef.current;
    setLooping(loopRef.current);
    if (loopRef.current) play();
  };

  const btn = "inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-lg bg-mist px-3 text-sm font-bold text-forest hover:brightness-95";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button type="button" className={btn} onClick={() => play()} aria-label={`${label}: ${text}`}>
        {status === "playing" ? "🔊" : "▶"} {!compact && label}
      </button>
      {!compact && (
        <>
          <button type="button" className={btn} onClick={() => play("slow")} aria-label={`Play slowly: ${text}`}>
            🐢
          </button>
          <button type="button" className={`${btn} ${looping ? "bg-forest text-white" : ""}`} onClick={toggleLoop} aria-pressed={looping} aria-label="Loop">
            ⟲
          </button>
        </>
      )}
      {status === "unavailable" && (
        <span className="text-xs text-rose">No Cantonese voice on this device — read the Jyutping instead.</span>
      )}
    </span>
  );
}
