import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { checkAlignment, isJyutpingSyllable } from "@/lib/jyutping";
import { TONE_PAIRS, TOPICS, TOPIC_KEYS } from "@/lib/curriculum/seed";
import { DIAGNOSTIC_ITEMS } from "@/lib/diagnostic";
import { GeneratedLesson, GeneratedRoadmap, FamilyStory, SpeakingFeedback, type Line } from "@/lib/schemas";

function allSeedLines(): [string, Line][] {
  const out: [string, Line][] = [];
  for (const key of TOPIC_KEYS) {
    const t = TOPICS[key];
    for (const w of t.words) {
      out.push([`${key}.word`, { zh: w.zh, jyutping: w.jyutping, en: w.en }], [`${key}.example`, w.example]);
    }
    t.passage.lines.forEach((l) => out.push([`${key}.passage`, l]));
    t.family.lines.forEach((l) => out.push([`${key}.family`, l]));
  }
  TONE_PAIRS.forEach((p) => out.push(["tone.a", p.a], ["tone.b", p.b]));
  DIAGNOSTIC_ITEMS.forEach((i) => i.audio?.forEach((a) => out.push([i.id, a])));
  return out;
}

describe("Jyutping validation", () => {
  it("accepts valid syllables and rejects invalid ones", () => {
    for (const s of ["ngo5", "m4", "ng5", "hoeng1", "zyu6", "gwaa3", "jyun2", "seoi2", "ceot1", "goek3"]) expect(isJyutpingSyllable(s), s).toBe(true);
    for (const s of ["ngo7", "xin1", "zh1", "ngo", "shi4"]) expect(isJyutpingSyllable(s), s).toBe(false);
  });

  it("requires one syllable per character", () => {
    expect(checkAlignment("我好肚餓。", "ngo5 hou2 tou5 ngo6.").ok).toBe(true);
    expect(checkAlignment("我好肚餓。", "ngo5 hou2 ngo6.").ok).toBe(false);
    expect(checkAlignment("我叫Angela。", "ngo5 giu3 Angela.").ok).toBe(true);
    expect(checkAlignment("我有3個仔", "ngo5 jau5 saam1 go3 zai2").ok).toBe(false);
    expect(checkAlignment("食", "sik").ok).toBe(false);
  });

  it("every hand-authored seed line is aligned", () => {
    const failures = allSeedLines()
      .map(([where, l]) => [where, checkAlignment(l.zh, l.jyutping)] as const)
      .filter(([, r]) => !r.ok);
    expect(failures).toEqual([]);
  });

  it("diagnostic items have valid answers", () => {
    for (const item of DIAGNOSTIC_ITEMS) {
      expect(item.answer, item.id).toBeGreaterThanOrEqual(0);
      expect(item.answer, item.id).toBeLessThan(item.options.length);
    }
  });
});

describe("structured-output schemas", () => {
  it("convert to JSON Schema output formats for the Claude API", () => {
    for (const schema of [GeneratedLesson, GeneratedRoadmap, SpeakingFeedback, FamilyStory]) {
      const format = betaZodOutputFormat(schema);
      expect(format.type).toBe("json_schema");
      expect(JSON.stringify(format.schema).length).toBeGreaterThan(100);
    }
  });
});
