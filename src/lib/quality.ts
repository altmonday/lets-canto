import { checkAlignment, hasHanzi } from "./jyutping";
import type { GeneratedLesson, Line, Mcq } from "./schemas";

export const LESSON_MINIMUMS = {
  words: 4,
  maxWords: 8,
  listeningQuestions: 2,
  passageLines: 3,
  readingQuestions: 2,
  speakingPrompts: 2,
  assessmentQuestions: 4,
} as const;

export type QualityReport = {
  /** Every problem found, phrased so it can be sent back to the generator for a retry. */
  issues: string[];
  /** Lesson with invalid items removed. Null when too much was removed to be usable. */
  repaired: GeneratedLesson | null;
};

function lineOk(line: Line, where: string, issues: string[]): boolean {
  const result = checkAlignment(line.zh, line.jyutping);
  if (!result.ok) issues.push(`${where}: ${result.reason}`);
  if (!line.en.trim()) {
    issues.push(`${where}: missing English translation for "${line.zh}"`);
    return false;
  }
  return result.ok;
}

function mcqOk(q: Mcq, where: string, issues: string[]): boolean {
  let ok = true;
  if (q.options.length < 2 || q.options.length > 5) {
    issues.push(`${where}: needs 2-5 options (has ${q.options.length})`);
    ok = false;
  }
  if (new Set(q.options.map((o) => o.trim())).size !== q.options.length) {
    issues.push(`${where}: duplicate options`);
    ok = false;
  }
  if (!Number.isInteger(q.answer_index) || q.answer_index < 0 || q.answer_index >= q.options.length) {
    issues.push(`${where}: answer_index ${q.answer_index} is out of range`);
    ok = false;
  }
  if (q.audio && !lineOk(q.audio, `${where} audio`, issues)) ok = false;
  return ok;
}

/**
 * Validates a generated lesson: Jyutping/character alignment on every Cantonese line,
 * well-formed questions, required section sizes, and no re-teaching of words the
 * learner already has in their bank.
 */
export function checkLesson(lesson: GeneratedLesson, knownZh: Set<string>): QualityReport {
  const issues: string[] = [];

  if (!hasHanzi(lesson.title_zh)) issues.push("title_zh must be in Traditional Chinese");

  const words = lesson.new_material.words.filter((w, i) => {
    const where = `new_material.words[${i}]`;
    let ok = lineOk({ zh: w.zh, jyutping: w.jyutping, en: w.en }, where, issues);
    if (!lineOk(w.example, `${where}.example`, issues)) ok = false;
    if (knownZh.has(w.zh)) {
      issues.push(`${where}: "${w.zh}" is already in the learner's vocabulary bank — choose a genuinely new word`);
      ok = false;
    }
    return ok;
  });
  const seen = new Set<string>();
  const uniqueWords = words.filter((w) => (seen.has(w.zh) ? false : (seen.add(w.zh), true)));
  if (uniqueWords.length > LESSON_MINIMUMS.maxWords) {
    issues.push(`new_material.words: ${uniqueWords.length} words — teach at most ${LESSON_MINIMUMS.maxWords}`);
  }

  const patterns = lesson.new_material.patterns
    .map((p, i) => ({
      ...p,
      examples: p.examples.filter((ex, j) => lineOk(ex, `new_material.patterns[${i}].examples[${j}]`, issues)),
    }))
    .filter((p) => p.examples.length > 0);

  const tonePairs = lesson.listening.tone_focus.pairs.filter((p, i) => {
    const a = lineOk(p.a, `listening.tone_focus.pairs[${i}].a`, issues);
    const b = lineOk(p.b, `listening.tone_focus.pairs[${i}].b`, issues);
    return a && b;
  });

  const listeningQs = lesson.listening.questions.filter((q, i) => mcqOk(q, `listening.questions[${i}]`, issues));
  const passage = lesson.reading.passage.filter((l, i) => lineOk(l, `reading.passage[${i}]`, issues));
  const readingQs = lesson.reading.questions.filter((q, i) => mcqOk(q, `reading.questions[${i}]`, issues));
  const speaking = lesson.speaking.prompts.filter((p, i) => lineOk(p.target, `speaking.prompts[${i}].target`, issues));
  const assessment = lesson.assessment.questions.filter((q, i) => mcqOk(q, `assessment.questions[${i}]`, issues));
  const familyLines = lesson.family.lines.filter((l, i) => lineOk(l, `family.lines[${i}]`, issues));

  const counts: [string, number, number][] = [
    ["new_material.words", uniqueWords.length, LESSON_MINIMUMS.words],
    ["listening.questions", listeningQs.length, LESSON_MINIMUMS.listeningQuestions],
    ["reading.passage", passage.length, LESSON_MINIMUMS.passageLines],
    ["reading.questions", readingQs.length, LESSON_MINIMUMS.readingQuestions],
    ["speaking.prompts", speaking.length, LESSON_MINIMUMS.speakingPrompts],
    ["assessment.questions", assessment.length, LESSON_MINIMUMS.assessmentQuestions],
  ];
  let usable = familyLines.length > 0;
  for (const [name, have, need] of counts) {
    if (have < need) {
      issues.push(`${name}: needs at least ${need} valid items (has ${have})`);
      usable = false;
    }
  }

  const repaired: GeneratedLesson | null = usable
    ? {
        ...lesson,
        new_material: { words: uniqueWords.slice(0, LESSON_MINIMUMS.maxWords), patterns },
        listening: { ...lesson.listening, tone_focus: { ...lesson.listening.tone_focus, pairs: tonePairs }, questions: listeningQs },
        reading: { ...lesson.reading, passage, questions: readingQs },
        speaking: { ...lesson.speaking, prompts: speaking },
        assessment: { questions: assessment },
        family: { ...lesson.family, lines: familyLines },
      }
    : null;

  return { issues, repaired };
}
