"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type DisplayPrefs = {
  showChinese: boolean;
  showJyutping: boolean;
  showEnglish: boolean;
  audioRate: "normal" | "slow";
};

type Ctx = DisplayPrefs & {
  ttsAvailable: boolean;
  set: (patch: Partial<DisplayPrefs>) => void;
};

const PrefsContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "canto-display-prefs";

export function PrefsProvider({ initial, ttsAvailable, children }: { initial: DisplayPrefs; ttsAvailable: boolean; children: ReactNode }) {
  const [prefs, setPrefs] = useState<DisplayPrefs>(initial);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate per-device overrides after mount
      if (saved) setPrefs((p) => ({ ...p, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  const set = (patch: Partial<DisplayPrefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  return <PrefsContext.Provider value={{ ...prefs, ttsAvailable, set }}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Ctx {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}

export function LayerToggles() {
  const p = usePrefs();
  const toggle = (label: string, key: "showChinese" | "showJyutping" | "showEnglish") => (
    <button
      type="button"
      aria-pressed={p[key]}
      onClick={() => p.set({ [key]: !p[key] })}
      className={`min-h-9 rounded-lg px-3 text-sm font-bold ${p[key] ? "bg-forest text-white" : "bg-mist text-muted"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Text layers">
      {toggle("中文", "showChinese")}
      {toggle("Jyutping", "showJyutping")}
      {toggle("English", "showEnglish")}
      <button
        type="button"
        onClick={() => p.set({ audioRate: p.audioRate === "slow" ? "normal" : "slow" })}
        className="min-h-9 rounded-lg bg-mist px-3 text-sm font-bold text-forest"
      >
        Audio: {p.audioRate === "slow" ? "slow" : "natural"}
      </button>
    </div>
  );
}
