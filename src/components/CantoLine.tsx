"use client";

import type { Line } from "@/lib/schemas";
import { PlayButton } from "./Audio";
import { usePrefs } from "./Prefs";

/** A Cantonese line with hideable Chinese / Jyutping / English layers and audio. */
export function CantoLine({
  line,
  size = "md",
  audio = true,
  compactAudio = false,
  forceAll = false,
}: {
  line: Line;
  size?: "sm" | "md" | "lg";
  audio?: boolean;
  compactAudio?: boolean;
  forceAll?: boolean;
}) {
  const p = usePrefs();
  const zhSize = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-lg";
  const showZh = forceAll || p.showChinese || (!p.showJyutping && !p.showEnglish);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {showZh && (
          <span lang="zh-HK" className={`${zhSize} font-bold leading-snug`}>
            {line.zh}
          </span>
        )}
        {audio && <PlayButton text={line.zh} compact={compactAudio} />}
      </div>
      {(forceAll || p.showJyutping) && <p className="font-semibold text-jade">{line.jyutping}</p>}
      {(forceAll || p.showEnglish) && <p className="text-muted">{line.en}</p>}
    </div>
  );
}
