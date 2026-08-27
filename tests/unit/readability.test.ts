import { describe, expect, it } from "vitest";
import {
  countSyllables,
  fleschKincaidGrade,
  MAX_USER_FACING_GRADE,
  meetsReadingLevel,
  normalizeForScoring,
} from "@/domain/safety/readability";
import { ALL_CARDS } from "@/data/tarot/cards";
import { SPREADS } from "@/data/spreads/spreads";
import { INSIGHT_LENSES, TIME_PERSPECTIVES } from "@/data/intake/taxonomy";

describe("countSyllables", () => {
  it("counts common words", () => {
    expect(countSyllables("card")).toBe(1);
    expect(countSyllables("pattern")).toBe(2);
    expect(countSyllables("attention")).toBe(3);
    expect(countSyllables("made")).toBe(1); // silent trailing e
    expect(countSyllables("table")).toBe(2); // -le ending kept
    expect(countSyllables("a")).toBe(1);
  });
});

describe("normalizeForScoring", () => {
  it("replaces esoteric proper nouns with one-syllable stand-ins", () => {
    const cardName = ALL_CARDS[0]!.canonicalName;
    expect(normalizeForScoring(`${cardName} appears here`)).toBe(
      "card appears here",
    );
    expect(normalizeForScoring("Sagittarius meets Neptune")).toBe(
      "sign meets star",
    );
    expect(normalizeForScoring("the Pentacles run")).toBe("the suit run");
    expect(normalizeForScoring("Hermetic Qabalah")).toBe("sky sky");
  });

  it("leaves ordinary words alone", () => {
    expect(normalizeForScoring("The road waits.")).toBe("The road waits.");
  });
});

describe("fleschKincaidGrade", () => {
  it("scores simple prose low", () => {
    const simple =
      "The card asks for rest. You can set the work down. The road waits.";
    expect(fleschKincaidGrade(simple).grade).toBeLessThanOrEqual(4);
  });

  it("scores tangled prose above the ceiling", () => {
    const tangled =
      "Notwithstanding the considerable multiplicity of intersecting considerations, the interpretation necessarily accommodates significantly contradictory symbolic determinations without prioritizing definitive resolution.";
    expect(fleschKincaidGrade(tangled).grade).toBeGreaterThan(
      MAX_USER_FACING_GRADE,
    );
  });

  it("does not let long esoteric names inflate the score", () => {
    const withNames =
      "Sagittarius holds the Wheel of Fortune. Sagittarius is linked to the Wheel of Fortune in this tradition.";
    expect(fleschKincaidGrade(withNames).grade).toBeLessThanOrEqual(
      MAX_USER_FACING_GRADE,
    );
  });
});

/**
 * The plain-language rule (ADR 0009) applied to the authored content corpus.
 * Every prose string a user can read must sit at or below the ceiling.
 */
describe("authored content meets the reading level", () => {
  const offenders = (items: Array<{ id: string; text: string }>) =>
    items
      .filter((i) => !meetsReadingLevel(i.text))
      .map((i) => `${i.id} (grade ${fleschKincaidGrade(i.text).grade})`);

  it("card meanings read at or below the ceiling", () => {
    expect(
      offenders(
        ALL_CARDS.flatMap((c) => [
          { id: `${c.id}#upright`, text: c.uprightMeaning },
          { id: `${c.id}#reversed`, text: c.reversedMeaning },
        ]),
      ),
    ).toEqual([]);
  });

  it("spread descriptions and position purposes read at or below the ceiling", () => {
    expect(
      offenders(
        SPREADS.flatMap((s) => [
          { id: s.id, text: s.description },
          ...s.positions.map((p) => ({
            id: `${s.id}/${p.id}`,
            text: p.purpose,
          })),
        ]),
      ),
    ).toEqual([]);
  });

  it("intake lens and time descriptions read at or below the ceiling", () => {
    expect(
      offenders([
        ...INSIGHT_LENSES.map((l) => ({ id: `lens:${l.id}`, text: l.description })),
        ...TIME_PERSPECTIVES.map((t) => ({ id: `time:${t.id}`, text: t.description })),
      ]),
    ).toEqual([]);
  });
});
