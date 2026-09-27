/**
 * Jyutping validation and Chinese/Jyutping alignment checks.
 * Used to quality-gate AI-generated content before learners see it.
 */

const INITIALS = "(?:gw|kw|ng|b|p|m|f|d|t|n|l|g|k|h|w|z|c|s|j)?";
const FINALS =
  "(?:aa|aai|aau|aam|aan|aang|aap|aat|aak|ai|au|am|an|ang|ap|at|ak|" +
  "e|ei|eu|em|en|eng|ep|et|ek|i|iu|im|in|ing|ip|it|ik|" +
  "o|oi|ou|on|ong|ot|ok|oe|oeng|oet|oek|eoi|eon|eot|" +
  "u|ui|un|ung|ut|uk|yu|yun|yut|m|ng)";
const SYLLABLE_RE = new RegExp(`^${INITIALS}${FINALS}[1-6]$`);

// CJK Unified Ideographs, Extension A, Compatibility Ideographs, and Extension B+ (surrogates).
const CJK_RE = /[㐀-䶿一-鿿豈-﫿]|[\ud840-\ud87f][\udc00-\udfff]/g;

export function isJyutpingSyllable(token: string): boolean {
  return SYLLABLE_RE.test(token);
}

export function countHanzi(text: string): number {
  return (text.match(CJK_RE) ?? []).length;
}

export function hasHanzi(text: string): boolean {
  return countHanzi(text) > 0;
}

function tokens(jyutping: string): string[] {
  return jyutping
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export type AlignmentResult = { ok: true } | { ok: false; reason: string };

/**
 * Checks that a Chinese line and its Jyutping describe the same reading:
 * one valid syllable per character, Latin words (names) passed through unchanged,
 * and no Arabic digits in the Chinese (they have no unambiguous reading).
 */
export function checkAlignment(zh: string, jyutping: string): AlignmentResult {
  if (!zh.trim()) return { ok: false, reason: "empty Chinese text" };
  if (/[0-9０-９]/.test(zh)) return { ok: false, reason: `digits in "${zh}" — write numbers in characters` };
  const hanzi = countHanzi(zh);
  if (hanzi === 0) return { ok: false, reason: `"${zh}" has no Chinese characters` };

  const latinWords = new Set((zh.match(/[A-Za-z]+/g) ?? []).map((w) => w.toLowerCase()));
  let syllables = 0;
  for (const token of tokens(jyutping)) {
    if (/[1-6]$/.test(token)) {
      if (!isJyutpingSyllable(token)) {
        return { ok: false, reason: `"${token}" is not a valid Jyutping syllable (in "${zh}")` };
      }
      syllables++;
    } else if (!latinWords.has(token)) {
      return { ok: false, reason: `"${token}" in the Jyutping for "${zh}" has no tone number` };
    }
  }
  if (syllables !== hanzi) {
    return {
      ok: false,
      reason: `"${zh}" has ${hanzi} characters but its Jyutping "${jyutping}" has ${syllables} syllables`,
    };
  }
  return { ok: true };
}

/** Normalise learner-typed Jyutping for comparison (case, spacing, punctuation). */
export function normaliseJyutping(input: string): string {
  return tokens(input).join(" ");
}

/** Strip tone numbers — used to give partial credit when only tones are wrong. */
export function stripTones(input: string): string {
  return normaliseJyutping(input).replace(/[1-6]/g, "");
}
