export const SKILLS = [
  "listening",
  "tone",
  "pronunciation",
  "fluency",
  "vocab_recognition",
  "vocab_production",
  "characters",
  "reading",
  "sentence",
  "confidence",
] as const;

export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  listening: "Listening",
  tone: "Tone discrimination",
  pronunciation: "Pronunciation",
  fluency: "Speaking fluency",
  vocab_recognition: "Vocabulary — recognise",
  vocab_production: "Vocabulary — produce",
  characters: "Character recognition",
  reading: "Reading",
  sentence: "Sentence construction",
  confidence: "Confidence",
};

/** Skills measured by objective items. Others rely on self-rating and are labelled as such. */
export const OBJECTIVE_SKILLS: Skill[] = [
  "listening",
  "tone",
  "vocab_recognition",
  "vocab_production",
  "characters",
  "reading",
  "sentence",
];

export function isSkill(value: string): value is Skill {
  return (SKILLS as readonly string[]).includes(value);
}

export function bandLabel(estimate: number): string {
  if (estimate < 20) return "Starting out";
  if (estimate < 40) return "Building";
  if (estimate < 60) return "Developing";
  if (estimate < 80) return "Confident";
  return "Strong";
}
