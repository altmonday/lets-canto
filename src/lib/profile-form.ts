import type { ProfileFormValues } from "@/components/ProfileForm";
import type { ProfileRow } from "./lessons/service";

export function profileToForm(p: ProfileRow): ProfileFormValues {
  const prefs = p.preferences as Partial<ProfileFormValues["preferences"]>;
  const self = p.self_assessment as Partial<ProfileFormValues["selfAssessment"]>;
  return {
    displayName: p.display_name,
    ageBracket: p.age_bracket,
    languages: p.languages,
    background: p.background ?? "",
    exposure: p.cantonese_exposure ?? "",
    selfAssessment: { speaking: self.speaking ?? 2, listening: self.listening ?? 2, reading: self.reading ?? 1, pronunciation: self.pronunciation ?? 2 },
    jyutpingFamiliarity: p.jyutping_familiarity ?? "none",
    goals: p.goals,
    dailyMinutes: p.daily_minutes,
    preferences: {
      showJyutping: prefs.showJyutping ?? true,
      showEnglish: prefs.showEnglish ?? true,
      audioRate: prefs.audioRate ?? "normal",
      difficulty: prefs.difficulty ?? "balanced",
    },
    recordingConsent: p.recording_consent,
    family: [],
  };
}

export function displayPrefs(p: ProfileRow | null) {
  const prefs = (p?.preferences ?? {}) as Partial<ProfileFormValues["preferences"]>;
  return {
    showChinese: true,
    showJyutping: prefs.showJyutping ?? true,
    showEnglish: prefs.showEnglish ?? true,
    audioRate: prefs.audioRate ?? "normal",
  } as const;
}
