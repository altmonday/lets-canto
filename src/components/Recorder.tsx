"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

/**
 * Microphone recorder for self-comparison. Audio stays in this browser tab only —
 * it is never uploaded and is discarded when the page closes.
 */
export function Recorder({ onRecorded }: { onRecorded?: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "denied" | "unsupported">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const start = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setState("idle");
        onRecorded?.();
      };
      recorder.current = rec;
      rec.start();
      setState("recording");
    } catch {
      setState("denied");
    }
  };

  const stop = () => recorder.current?.stop();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {state === "recording" ? (
          <Button variant="danger" onClick={stop}>
            ■ Stop recording
          </Button>
        ) : (
          <Button variant="secondary" onClick={start}>
            🎙 {url ? "Record again" : "Record"}
          </Button>
        )}
        {url && state !== "recording" && <audio controls src={url} className="h-10 max-w-full" />}
      </div>
      {state === "denied" && <p className="text-sm text-rose">Microphone access was blocked. You can still practise aloud and rate yourself.</p>}
      {state === "unsupported" && <p className="text-sm text-rose">Recording isn&apos;t supported in this browser. Practise aloud and rate yourself.</p>}
    </div>
  );
}
