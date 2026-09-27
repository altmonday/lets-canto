"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "./ui";

export type ProfileFormValues = {
  displayName: string;
  ageBracket: string | null;
  languages: string[];
  background: string;
  exposure: string;
  selfAssessment: { speaking: number; listening: number; reading: number; pronunciation: number };
  jyutpingFamiliarity: string;
  goals: string[];
  dailyMinutes: number;
  preferences: { showJyutping: boolean; showEnglish: boolean; audioRate: "normal" | "slow"; difficulty: "gentle" | "balanced" | "challenging" };
  recordingConsent: boolean;
  family: { nickname: string; ageBand: string; interests: string }[];
};

export const EMPTY_PROFILE: ProfileFormValues = {
  displayName: "",
  ageBracket: null,
  languages: ["English"],
  background: "",
  exposure: "",
  selfAssessment: { speaking: 2, listening: 2, reading: 1, pronunciation: 2 },
  jyutpingFamiliarity: "none",
  goals: [],
  dailyMinutes: 30,
  preferences: { showJyutping: true, showEnglish: true, audioRate: "normal", difficulty: "balanced" },
  recordingConsent: false,
  family: [],
};

const LANGUAGES = ["English", "Cantonese", "Mandarin", "Japanese", "Korean", "Vietnamese", "French", "Spanish"];
const EXPOSURE = [
  ["native_childhood", "I spoke Cantonese as a child"],
  ["heard_childhood", "I heard Cantonese growing up but rarely spoke it"],
  ["adult_some", "I've learned a little as an adult"],
  ["none", "I'm new to Cantonese"],
];
const GOALS = [
  ["conversation", "Everyday conversation"],
  ["family", "Speak with my family & children"],
  ["reading", "Read Traditional Chinese"],
  ["heritage", "Reconnect with my heritage"],
  ["travel", "Travel to Hong Kong"],
  ["work", "Use it at work"],
];
const SCALE: Record<string, string[]> = {
  speaking: ["Not at all", "A few words", "Simple phrases", "Everyday chat", "Fluent"],
  listening: ["Not at all", "A few words", "Slow, simple speech", "Most everyday talk", "Nearly everything"],
  reading: ["No characters", "Some characters", "Simple sentences", "Children's books", "Newspapers"],
  pronunciation: ["New to the sounds", "Unsure of tones", "Some tones", "Mostly accurate", "Native-like"],
};

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${selected ? "border-forest bg-forest text-white" : "border-line bg-white"}`}
    >
      {children}
    </button>
  );
}

const input = "min-h-12 w-full rounded-xl border border-line bg-white px-3";

export function ProfileForm({ initial, mode }: { initial: ProfileFormValues; mode: "onboarding" | "edit" }) {
  const router = useRouter();
  const [v, setV] = useState<ProfileFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const set = (patch: Partial<ProfileFormValues>) => setV((cur) => ({ ...cur, ...patch }));
  const toggleIn = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.exposure) return setError("Tell us about your Cantonese background.");
    if (v.goals.length === 0) return setError("Choose at least one goal.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        family: mode === "onboarding" ? v.family.filter((f) => f.nickname.trim()) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't save your profile.");
    if (mode === "onboarding") router.push("/diagnostic");
    else setSaved(data.replanned ? "Saved. Your goals changed, so upcoming lessons have been re-planned — past lessons are unchanged." : "Saved.");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section title="About you">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Preferred name</span>
          <input className={input} required maxLength={40} autoComplete="given-name" value={v.displayName} onChange={(e) => set({ displayName: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Age bracket (optional)</span>
          <select className={input} value={v.ageBracket ?? ""} onChange={(e) => set({ ageBracket: e.target.value || null })}>
            <option value="">Prefer not to say</option>
            {["18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-2 block text-sm font-bold">Languages you know</span>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <Chip key={l} selected={v.languages.includes(l)} onClick={() => set({ languages: toggleIn(v.languages, l) })}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Your Cantonese background</legend>
          <div className="grid gap-2">
            {EXPOSURE.map(([value, label]) => (
              <Chip key={value} selected={v.exposure === value} onClick={() => set({ exposure: value })}>
                {label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Anything else about your background? (optional)</span>
          <textarea
            className={`${input} min-h-20 py-2`}
            maxLength={300}
            placeholder="e.g. Born in Hong Kong, moved to Australia at 8. I recognise some kanji from Japanese."
            value={v.background}
            onChange={(e) => set({ background: e.target.value })}
          />
        </label>
      </Section>

      <Section title="Where you are now" hint="A rough guess is fine — the placement quiz next checks it.">
        {(Object.keys(SCALE) as (keyof ProfileFormValues["selfAssessment"])[]).map((skill) => (
          <label key={skill} className="block">
            <span className="mb-1 block text-sm font-bold capitalize">
              {skill}: <span className="font-normal text-muted">{SCALE[skill][v.selfAssessment[skill] - 1]}</span>
            </span>
            <input
              type="range"
              min={1}
              max={5}
              value={v.selfAssessment[skill]}
              onChange={(e) => set({ selfAssessment: { ...v.selfAssessment, [skill]: Number(e.target.value) } })}
              className="w-full accent-[#234d40]"
            />
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Jyutping (Cantonese romanisation)</span>
          <select className={input} value={v.jyutpingFamiliarity} onChange={(e) => set({ jyutpingFamiliarity: e.target.value })}>
            <option value="none">Never used it</option>
            <option value="seen">I&apos;ve seen it</option>
            <option value="slow">I can read it slowly</option>
            <option value="comfortable">I&apos;m comfortable with it</option>
          </select>
        </label>
      </Section>

      <Section title="Your goals">
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map(([value, label]) => (
            <Chip key={value} selected={v.goals.includes(value)} onClick={() => set({ goals: toggleIn(v.goals, value) })}>
              {label}
            </Chip>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Daily time</span>
          <select className={input} value={v.dailyMinutes} onChange={(e) => set({ dailyMinutes: Number(e.target.value) })}>
            {[15, 20, 30, 45].map((m) => (
              <option key={m} value={m}>
                {m} minutes{m === 30 ? " (recommended)" : ""}
              </option>
            ))}
          </select>
        </label>
      </Section>

      {mode === "onboarding" && (
        <Section title="Learning with children? (optional)" hint="Just a nickname and age band — children don't need accounts.">
          {v.family.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-xl bg-paper p-3 sm:grid-cols-3">
              <input
                className={input}
                placeholder="Nickname"
                maxLength={30}
                value={f.nickname}
                aria-label="Child nickname"
                onChange={(e) => set({ family: v.family.map((x, j) => (j === i ? { ...x, nickname: e.target.value } : x)) })}
              />
              <select
                className={input}
                value={f.ageBand}
                aria-label="Age band"
                onChange={(e) => set({ family: v.family.map((x, j) => (j === i ? { ...x, ageBand: e.target.value } : x)) })}
              >
                {["0-2", "3-5", "6-8", "9-12", "13+"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <input
                className={input}
                placeholder="Interests (e.g. dinosaurs)"
                maxLength={200}
                value={f.interests}
                aria-label="Interests"
                onChange={(e) => set({ family: v.family.map((x, j) => (j === i ? { ...x, interests: e.target.value } : x)) })}
              />
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => set({ family: [...v.family, { nickname: "", ageBand: "3-5", interests: "" }] })}>
            + Add a child
          </Button>
        </Section>
      )}

      <Section title="Preferences">
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={v.preferences.showJyutping} onChange={(e) => set({ preferences: { ...v.preferences, showJyutping: e.target.checked } })} />
          Show Jyutping by default
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={v.preferences.showEnglish} onChange={(e) => set({ preferences: { ...v.preferences, showEnglish: e.target.checked } })} />
          Show English translations by default
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Audio speed</span>
          <select className={input} value={v.preferences.audioRate} onChange={(e) => set({ preferences: { ...v.preferences, audioRate: e.target.value as "normal" | "slow" } })}>
            <option value="normal">Natural</option>
            <option value="slow">Slower</option>
          </select>
        </label>
        {mode === "onboarding" && (
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Challenge level</span>
            <select
              className={input}
              value={v.preferences.difficulty}
              onChange={(e) => set({ preferences: { ...v.preferences, difficulty: e.target.value as ProfileFormValues["preferences"]["difficulty"] } })}
            >
              <option value="gentle">Gentle</option>
              <option value="balanced">Balanced</option>
              <option value="challenging">Challenging</option>
            </select>
          </label>
        )}
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={v.recordingConsent} onChange={(e) => set({ recordingConsent: e.target.checked })} />
          <span>
            Use my microphone for speaking practice. <span className="text-sm text-muted">Recordings stay on this device and are never uploaded.</span>
          </span>
        </label>
      </Section>

      {error && <p className="rounded-lg bg-rose-soft p-3 text-sm text-rose" role="alert">{error}</p>}
      {saved && <p className="rounded-lg bg-ok-soft p-3 text-sm text-jade" role="status">{saved}</p>}
      <Button type="submit" variant="dark" className="w-full" disabled={busy}>
        {busy ? "Saving…" : mode === "onboarding" ? "Continue to placement quiz →" : "Save changes"}
      </Button>
    </form>
  );
}
