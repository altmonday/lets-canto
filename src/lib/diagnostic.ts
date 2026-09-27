import type { Line } from "./schemas";
import type { Skill } from "./skills";
import { TONE_PAIRS, TOPICS } from "./curriculum/seed";

/**
 * Adaptive diagnostic. Each objective skill gets up to three items: a correct answer
 * moves up a difficulty level, a miss moves down. Self-report only sets the starting
 * level — the result comes from performance.
 */

export type DiagnosticSkill = "characters" | "vocab_recognition" | "tone" | "listening" | "sentence" | "reading";

export type DiagnosticItem = {
  id: string;
  skill: DiagnosticSkill;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  /** Text shown with the question (never includes the answer). */
  display?: string;
  /** Lines to play as audio; the learner hears them but doesn't see a translation. */
  audio?: Line[];
  /** Passage shown for reading items (Chinese only). */
  passage?: string[];
  options: string[];
  answer: number;
  needsAudio: boolean;
};

const L = (zh: string, jyutping: string, en: string): Line => ({ zh, jyutping, en });

const tone = (i: number, difficulty: DiagnosticItem["difficulty"]): DiagnosticItem => {
  const p = TONE_PAIRS[i];
  return {
    id: `tone-${i}`,
    skill: "tone",
    difficulty,
    prompt: "Listen to both syllables. Do they have the same tone?",
    audio: [p.a, p.b],
    options: ["Same tone", "Different tones"],
    answer: p.same_tone ? 0 : 1,
    needsAudio: true,
  };
};

const reading = (topic: keyof typeof TOPICS, q: number, difficulty: DiagnosticItem["difficulty"]): DiagnosticItem => {
  const passage = TOPICS[topic].passage;
  const question = passage.questions[q];
  return {
    id: `reading-${topic}-${q}`,
    skill: "reading",
    difficulty,
    prompt: question.prompt,
    passage: passage.lines.map((l) => l.zh),
    options: question.options,
    answer: question.answer_index,
    needsAudio: false,
  };
};

export const DIAGNOSTIC_ITEMS: DiagnosticItem[] = [
  // Character recognition — see a character, pick the meaning
  { id: "char-1", skill: "characters", difficulty: 1, prompt: "What does this character mean?", display: "人", options: ["person", "big", "mouth", "tree"], answer: 0, needsAudio: false },
  { id: "char-2", skill: "characters", difficulty: 2, prompt: "What does this character mean?", display: "水", options: ["fire", "water", "rice", "book"], answer: 1, needsAudio: false },
  { id: "char-3", skill: "characters", difficulty: 3, prompt: "What does this word mean?", display: "學校", options: ["student", "teacher", "school", "library"], answer: 2, needsAudio: false },
  { id: "char-4", skill: "characters", difficulty: 4, prompt: "What does this colloquial character mean?", display: "攰", options: ["tired", "angry", "hungry", "happy"], answer: 0, needsAudio: false },
  { id: "char-5", skill: "characters", difficulty: 5, prompt: "What does this spoken-Cantonese character mean?", display: "喺", options: ["to be at / in", "not have", "already", "(possessive 's)"], answer: 0, needsAudio: false },

  // Vocabulary recognition — hear the word (Jyutping shown), pick the meaning
  { id: "vocab-1", skill: "vocab_recognition", difficulty: 1, prompt: "What does this mean?", audio: [L("多謝", "do1 ze6", "thank you")], display: "do1 ze6", options: ["thank you", "sorry", "goodbye", "hello"], answer: 0, needsAudio: false },
  { id: "vocab-2", skill: "vocab_recognition", difficulty: 2, prompt: "What does this mean?", audio: [L("屋企", "uk1 kei2", "home")], display: "uk1 kei2", options: ["school", "home", "shop", "park"], answer: 1, needsAudio: false },
  { id: "vocab-3", skill: "vocab_recognition", difficulty: 3, prompt: "What does this mean?", audio: [L("瞓覺", "fan3 gaau3", "sleep")], display: "fan3 gaau3", options: ["wake up", "take a bath", "sleep", "get dressed"], answer: 2, needsAudio: false },
  { id: "vocab-4", skill: "vocab_recognition", difficulty: 4, prompt: "What does this mean?", audio: [L("掛住", "gwaa3 zyu6", "miss (someone)")], display: "gwaa3 zyu6", options: ["hang up", "worry", "wait for", "miss (someone)"], answer: 3, needsAudio: false },
  { id: "vocab-5", skill: "vocab_recognition", difficulty: 5, prompt: "What does this mean?", audio: [L("求其", "kau4 kei4", "whatever / careless")], display: "kau4 kei4", options: ["carefully", "whatever / careless", "please help", "strange"], answer: 1, needsAudio: false },

  // Tone discrimination — audio only
  tone(0, 1),
  tone(1, 2),
  tone(3, 3),
  tone(11, 4),
  tone(2, 5),

  // Listening comprehension — audio only
  { id: "listen-1", skill: "listening", difficulty: 1, prompt: "Listen. What did you hear?", audio: [L("早晨！", "zou2 san4!", "Good morning!")], options: ["Good morning!", "Good night!", "Thank you!", "Goodbye!"], answer: 0, needsAudio: true },
  { id: "listen-2", skill: "listening", difficulty: 2, prompt: "Listen. What did you hear?", audio: [L("我好肚餓。", "ngo5 hou2 tou5 ngo6.", "I'm very hungry.")], options: ["I'm very tired.", "I'm very hungry.", "I'm very happy.", "I'm very cold."], answer: 1, needsAudio: true },
  { id: "listen-3", skill: "listening", difficulty: 3, prompt: "Listen. What did you hear?", audio: [L("你食咗飯未呀？", "nei5 sik6 zo2 faan6 mei6 aa3?", "Have you eaten yet?")], options: ["What do you want to eat?", "Where are you going?", "Have you eaten yet?", "Do you like rice?"], answer: 2, needsAudio: true },
  { id: "listen-4", skill: "listening", difficulty: 4, prompt: "Listen. What did you hear?", audio: [L("聽日我哋去探婆婆。", "ting1 jat6 ngo5 dei6 heoi3 taam3 po4 po2.", "Tomorrow we're visiting Grandma.")], options: ["Yesterday Grandma visited us.", "Tomorrow we're visiting Grandma.", "Today Grandma is cooking.", "Grandma lives far away."], answer: 1, needsAudio: true },
  { id: "listen-5", skill: "listening", difficulty: 5, prompt: "Listen. What did you hear?", audio: [L("如果聽日落雨，我哋就留喺屋企睇書。", "jyu4 gwo2 ting1 jat6 lok6 jyu5, ngo5 dei6 zau6 lau4 hai2 uk1 kei2 tai2 syu1.", "If it rains tomorrow, we'll stay home and read.")], options: ["It rained yesterday so we read at home.", "If it rains tomorrow, we'll stay home and read.", "Tomorrow we'll read in the park.", "We'll buy books if it rains."], answer: 1, needsAudio: true },

  // Sentence construction — choose the natural Cantonese sentence
  { id: "sent-1", skill: "sentence", difficulty: 1, prompt: "Which is correct for “I'm very hungry”?", options: ["我好肚餓。", "好我肚餓。", "肚餓好我。"], answer: 0, needsAudio: false },
  { id: "sent-2", skill: "sentence", difficulty: 2, prompt: "Which is correct for “I have two sons”?", options: ["我有二個仔。", "我有兩個仔。", "我兩個有仔。"], answer: 1, needsAudio: false },
  { id: "sent-3", skill: "sentence", difficulty: 3, prompt: "Which is correct for “Mum is cooking”?", options: ["媽媽緊煮飯。", "媽媽煮咗緊飯。", "媽媽煮緊飯。"], answer: 2, needsAudio: false },
  { id: "sent-4", skill: "sentence", difficulty: 4, prompt: "Which is correct for “Have you eaten yet?”", options: ["你食咗飯未呀？", "你未食咗飯呀？", "你食飯咗未呀？"], answer: 0, needsAudio: false },
  { id: "sent-5", skill: "sentence", difficulty: 5, prompt: "Which is correct for “Where is my book?”", options: ["我喺邊度本書呀？", "本書我喺邊度呀？", "我本書喺邊度呀？"], answer: 2, needsAudio: false },

  // Reading comprehension — Chinese only
  reading("greetings", 0, 1),
  reading("family", 0, 2),
  reading("food", 1, 3),
  reading("feelings", 0, 4),
  reading("places", 0, 5),
];

export const DIAGNOSTIC_SKILLS: DiagnosticSkill[] = ["characters", "vocab_recognition", "tone", "listening", "sentence", "reading"];
export const ITEMS_PER_SKILL = 3;

export type DiagnosticResponse = {
  itemId: string;
  skill: DiagnosticSkill;
  difficulty: number;
  correct: boolean;
  skipped?: boolean;
};

export type SelfAssessment = {
  speaking: number; // 1..5
  listening: number;
  reading: number;
  pronunciation: number;
};

export function startingDifficulty(skill: DiagnosticSkill, self: SelfAssessment): number {
  const base =
    skill === "listening" || skill === "tone"
      ? self.listening
      : skill === "reading" || skill === "characters"
        ? self.reading
        : Math.round((self.speaking + self.listening) / 2);
  return Math.max(1, Math.min(3, base - 1));
}

/** Next item for a skill given responses so far, or null when that skill is done. */
export function nextItem(skill: DiagnosticSkill, responses: DiagnosticResponse[], self: SelfAssessment, audioAvailable: boolean): DiagnosticItem | null {
  const forSkill = responses.filter((r) => r.skill === skill);
  if (forSkill.length >= ITEMS_PER_SKILL) return null;
  if (forSkill.some((r) => r.skipped)) return null;

  let difficulty = startingDifficulty(skill, self);
  for (const r of forSkill) difficulty = Math.max(1, Math.min(5, r.difficulty + (r.correct ? 1 : -1)));

  const asked = new Set(forSkill.map((r) => r.itemId));
  const candidates = DIAGNOSTIC_ITEMS.filter((i) => i.skill === skill && !asked.has(i.id) && (audioAvailable || !i.needsAudio));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty));
  return candidates[0];
}

const selfToEstimate = (n: number) => Math.max(5, Math.min(80, (n - 1) * 18 + 5));

/**
 * Converts responses + self-assessment into initial skill estimates (0..100).
 * Objective skills come from performance; pronunciation, fluency and confidence are
 * self-reported (and labelled as such in the UI) until lesson evidence accumulates.
 */
export function scoreDiagnostic(responses: DiagnosticResponse[], self: SelfAssessment): Record<Skill, number> {
  const objective = (skill: DiagnosticSkill, fallback: number) => {
    const rs = responses.filter((r) => r.skill === skill && !r.skipped);
    if (rs.length === 0) return fallback;
    const highestCorrect = Math.max(0, ...rs.filter((r) => r.correct).map((r) => r.difficulty));
    const missesAtOrBelow = rs.filter((r) => !r.correct && r.difficulty <= Math.max(highestCorrect, 1)).length;
    return Math.max(5, Math.min(95, highestCorrect * 18 + 5 - missesAtOrBelow * 6));
  };

  const listeningSelf = selfToEstimate(self.listening);
  const readingSelf = selfToEstimate(self.reading);
  const tone = objective("tone", selfToEstimate(self.pronunciation));
  const vocabRecognition = objective("vocab_recognition", listeningSelf);
  const sentence = objective("sentence", selfToEstimate(self.speaking));

  return {
    listening: objective("listening", listeningSelf),
    tone,
    pronunciation: Math.round((selfToEstimate(self.pronunciation) + tone) / 2),
    fluency: selfToEstimate(self.speaking),
    vocab_recognition: vocabRecognition,
    vocab_production: Math.round(Math.min(vocabRecognition, (vocabRecognition + selfToEstimate(self.speaking)) / 2)),
    characters: objective("characters", readingSelf),
    reading: objective("reading", readingSelf),
    sentence,
    confidence: selfToEstimate(Math.round((self.speaking + self.pronunciation) / 2)),
  };
}
