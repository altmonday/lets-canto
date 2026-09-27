import type { GeneratedLesson, Line, Mcq, VocabItem } from "../schemas";
import type { CurriculumPosition } from "./framework";
import { TONE_PAIRS, TOPIC_KEYS, TOPICS, type TopicKey } from "./seed";

/**
 * Deterministic lesson built from hand-authored seed content. Used when AI generation
 * fails or isn't configured, so a learner never gets a broken lesson. It still
 * respects the learner's vocabulary bank (only unseen words are taught).
 */

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function shuffleWithAnswer(correct: string, distractors: string[], rand: () => number) {
  const options = [correct, ...distractors.filter((d) => d !== correct).slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answer_index: options.indexOf(correct) };
}

function topicOrder(start: TopicKey): TopicKey[] {
  const i = TOPIC_KEYS.indexOf(start);
  return [...TOPIC_KEYS.slice(i), ...TOPIC_KEYS.slice(0, i)];
}

export function pickNewWords(start: TopicKey, knownZh: Set<string>, count: number): { words: VocabItem[]; topic: TopicKey } {
  for (const key of topicOrder(start)) {
    const fresh = TOPICS[key].words.filter((w) => !knownZh.has(w.zh));
    if (fresh.length >= Math.min(count, 4)) return { words: fresh.slice(0, count), topic: key };
  }
  // Everything in the seed bank is known: recycle the week's topic as consolidation.
  return { words: TOPICS[start].words.slice(0, count), topic: start };
}

export function buildFallbackLesson(pos: CurriculumPosition, knownZh: Set<string>, day: number): GeneratedLesson {
  const rand = rng(day * 7919 + pos.curriculumDay);
  const { words, topic } = pickNewWords(pos.weekInfo.topic, knownZh, 6);
  const t = TOPICS[topic];
  const allMeanings = TOPIC_KEYS.flatMap((k) => TOPICS[k].words.map((w) => w.en));
  const allZh = TOPIC_KEYS.flatMap((k) => TOPICS[k].words.map((w) => w.zh));
  const distractorsFor = (pool: string[], correct: string) =>
    pool.filter((p) => p !== correct).sort(() => rand() - 0.5).slice(0, 3);

  const pairStart = (day * 3) % TONE_PAIRS.length;
  const pairs = [0, 1, 2].map((i) => TONE_PAIRS[(pairStart + i) % TONE_PAIRS.length]);

  const listeningQs: Mcq[] = words.slice(0, 3).map((w) => ({
    prompt: "Listen. What does this sentence mean?",
    audio: w.example,
    ...shuffleWithAnswer(w.example.en, distractorsFor(words.map((x) => x.example.en), w.example.en), rand),
    explanation: `${w.example.zh} (${w.example.jyutping}) — ${w.example.en}`,
    skill: "listening",
    vocab_zh: w.zh,
  }));
  const tonePair = pairs[0];
  const toneLine: Line = {
    zh: `${tonePair.a.zh}，${tonePair.b.zh}`,
    jyutping: `${tonePair.a.jyutping}, ${tonePair.b.jyutping}`,
    en: `${tonePair.a.en}, ${tonePair.b.en}`,
  };
  listeningQs.push({
    prompt: "Listen to the two syllables. Same tone or different?",
    audio: toneLine,
    options: ["Same tone", "Different tones"],
    answer_index: tonePair.same_tone ? 0 : 1,
    explanation: tonePair.note,
    skill: "tone",
    vocab_zh: null,
  });

  const assessment: Mcq[] = words.flatMap((w, i): Mcq[] =>
    i % 2 === 0
      ? [
          {
            prompt: `What does ${w.zh} mean?`,
            audio: null,
            ...shuffleWithAnswer(w.en, distractorsFor(allMeanings, w.en), rand),
            explanation: `${w.zh} (${w.jyutping}) means “${w.en}”.`,
            skill: "vocab_recognition",
            vocab_zh: w.zh,
          },
        ]
      : [
          {
            prompt: `How do you say “${w.en}”?`,
            audio: null,
            ...shuffleWithAnswer(w.zh, distractorsFor(allZh, w.zh), rand),
            explanation: `“${w.en}” is ${w.zh} (${w.jyutping}).`,
            skill: "vocab_production",
            vocab_zh: w.zh,
          },
        ],
  );

  return {
    title: pos.weekInfo.theme,
    title_zh: pos.weekInfo.themeZh,
    summary: `Practise ${t.label.toLowerCase()} vocabulary with listening, reading and speaking.`,
    objectives: pos.weekInfo.objectives,
    why_this_lesson: `This lesson follows Month ${pos.month}, Week ${pos.week} of your plan: ${pos.weekInfo.theme}.`,
    listening: {
      intro: "Listen first, then check your understanding. Replay as often as you like.",
      tone_focus: {
        explanation: "Cantonese has six tones. Listen to each pair and notice whether the pitch matches.",
        pairs,
      },
      questions: listeningQs,
    },
    new_material: {
      words,
      patterns: [
        {
          pattern: pos.weekInfo.patterns[0] ?? "Using today's words",
          explanation: "See how today's words work in full sentences.",
          examples: words.slice(0, 2).map((w) => w.example),
        },
      ],
    },
    reading: {
      title: t.passage.title,
      passage: t.passage.lines,
      register_note: null,
      questions: t.passage.questions,
    },
    speaking: {
      intro: "Record yourself, then compare with the model. Recordings stay on your device.",
      prompts: words.slice(0, 3).map((w) => ({
        situation: `Say: “${w.example.en}”`,
        target: w.example,
        hint: `Use ${w.zh} (${w.jyutping}).`,
      })),
    },
    assessment: { questions: assessment },
    family: t.family,
  };
}
