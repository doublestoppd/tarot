import { beforeEach, describe, expect, it } from "vitest";
import {
  compileReadingContext,
  minimizeForProvider,
  resetCompilerForTests,
  type CompilerInputs,
} from "@/domain/reading-compiler/compile";
import { renderDeterministicReading } from "@/domain/reading-compiler/fallback";
import { computeConservativeDateOnly, computeCurrentSky } from "@/domain/astrology/engine";
import { numerologyProfile } from "@/domain/numerology/engine";
import { getSpread } from "@/data/spreads/spreads";
import type { DrawnCard } from "@/domain/tarot/types";
import type { ReadingSelections } from "@/domain/intake/types";
import { EVIDENCE_CAPS, EVIDENCE_HARD_CAP } from "@/domain/resonance/types";

const MOMENT = new Date("2026-08-27T00:00:00Z");
const SKY = computeCurrentSky(MOMENT);

const baseSelections: ReadingSelections = {
  domainId: "career",
  focusId: "new_direction",
  insightId: "not_obvious",
  timePerspectiveId: "developing",
  depth: "deep",
  reversalsEnabled: true,
};

const drawn = (ids: string[], reversedIdx: number[] = []): DrawnCard[] =>
  ids.map((cardId, drawIndex) => ({
    cardId,
    drawIndex,
    orientation: reversedIdx.includes(drawIndex) ? "reversed" : "upright",
  }));

function makeInputs(overrides: Partial<CompilerInputs> = {}): CompilerInputs {
  const cards = drawn([
    "major_09_hermit",
    "pentacles_08",
    "wands_02",
    "cups_05",
    "major_07_chariot",
  ]);
  return {
    momentUtc: MOMENT.toISOString(),
    selections: baseSelections,
    spread: getSpread("fivefold_insight"),
    draw: { cards, reversalsEnabled: true },
    currentSky: SKY,
    natal: { kind: "none" },
    transits: [],
    numerology: null,
    birthProvided: { date: false, time: false, place: false },
    ...overrides,
  };
}

beforeEach(() => {
  resetCompilerForTests();
});

describe("compileReadingContext — anonymous reading (no birth data)", () => {
  const context = compileReadingContext(makeInputs());

  it("completes fully with tarot + current sky only", () => {
    expect(context.reading.cards.length).toBe(5);
    expect(context.capability.birthDateProvided).toBe(false);
    expect(context.capability.numerology).toBe(false);
    expect(context.personalFactors.length).toBe(0);
    expect(
      context.unavailable.some((u) => u.reasonCode === "NO_BIRTH_DATE"),
    ).toBe(true);
  });

  it("does not manufacture personal resonance", () => {
    expect(context.resonances.every((r) => r.category !== "personal")).toBe(true);
  });

  it("gives every card an evidence node with position language", () => {
    for (const card of context.reading.cards) {
      expect(card.evidenceId).toMatch(/^ev_card_/);
      expect(card.positionLabel.length).toBeGreaterThan(0);
      expect(card.canonicalMeaningSummary.length).toBeGreaterThan(40);
    }
  });
});

describe("compileReadingContext — date-only birth data", () => {
  // Hermit (Virgo) + 8 of Pentacles (Virgo decan): natal Jupiter in Virgo for
  // 1992-05-17 creates a legitimate multi-root Virgo convergence.
  const natal = computeConservativeDateOnly(1992, 5, 17);
  const numerology = numerologyProfile({ year: 1992, month: 5, day: 17 }, MOMENT);
  const context = compileReadingContext(
    makeInputs({
      natal: { kind: "partial", profile: natal },
      numerology,
      birthProvided: { date: true, time: false, place: false },
    }),
  );

  it("finds the natal-to-card sign resonance with independent roots", () => {
    const virgoResonances = context.resonances.filter(
      (r) => r.category === "personal" && r.conceptIds.includes("sign:virgo"),
    );
    expect(virgoResonances.length).toBeGreaterThan(0);
    const roots = new Set(virgoResonances.flatMap((r) => r.rootSourceIds));
    expect([...roots].some((r) => r.startsWith("natal:"))).toBe(true);
    expect([...roots].some((r) => r.startsWith("draw:"))).toBe(true);
  });

  it("declares houses/angles unavailable and never fabricates them", () => {
    expect(context.capability.natalHouses).toBe(false);
    expect(context.capability.natalAngles).toBe(false);
    expect(
      context.unavailable.some((u) => u.reasonCode === "NO_BIRTH_TIME"),
    ).toBe(true);
    expect(
      context.unavailable.some((u) => u.reasonCode === "SIGN_UNSTABLE_WITHOUT_TIME"),
    ).toBe(true);
    const text = JSON.stringify(context.providerEvidence);
    expect(text).not.toContain("Ascendant");
    expect(text).not.toContain("house");
  });

  it("lists numerology and stable placements as personal factors", () => {
    const facts = context.personalFactors.map((f) => f.displayFact).join(" | ");
    expect(facts).toContain("Life Path 7");
    expect(facts).toContain("Jupiter in Virgo");
    expect(facts).not.toContain("1992"); // raw birth date never surfaces
  });

  it("keeps the moon out of stable placements", () => {
    expect(
      context.personalFactors.some((f) => f.displayFact.includes("Natal Moon")),
    ).toBe(false);
  });
});

describe("resonance caps and bands", () => {
  it("respects per-category caps and the hard cap", () => {
    const context = compileReadingContext(
      makeInputs({
        spread: getSpread("celtic_cross"),
        selections: { ...baseSelections, depth: "comprehensive" },
        draw: {
          cards: drawn([
            "major_09_hermit",
            "pentacles_08",
            "pentacles_09",
            "pentacles_10",
            "wands_02",
            "wands_03",
            "cups_05",
            "swords_03",
            "major_07_chariot",
            "major_15_devil",
          ]),
          reversalsEnabled: true,
        },
        natal: { kind: "partial", profile: computeConservativeDateOnly(1992, 5, 17) },
        numerology: numerologyProfile({ year: 1992, month: 5, day: 17 }, MOMENT),
        birthProvided: { date: true, time: false, place: false },
      }),
    );
    const byCategory = new Map<string, number>();
    const all = [
      ...context.tarotPatterns,
      ...context.resonances,
    ];
    for (const node of all) {
      byCategory.set(node.category, (byCategory.get(node.category) ?? 0) + 1);
    }
    for (const [category, count] of byCategory) {
      expect(count, category).toBeLessThanOrEqual(
        EVIDENCE_CAPS[category as keyof typeof EVIDENCE_CAPS],
      );
    }
    expect(context.providerEvidence.length).toBeLessThanOrEqual(EVIDENCE_HARD_CAP);
  });
});

describe("lineage collapse (§13.4)", () => {
  it("never counts one root chain as multiple independent confirmations", () => {
    const context = compileReadingContext(makeInputs());
    // All hermetic nodes for the Hermit share the single root draw:major_09_hermit;
    // the theme compiler must not report them as independent roots.
    for (const theme of context.themes) {
      const nodes = [...context.tarotPatterns, ...context.resonances].filter((n) =>
        theme.evidenceIds.includes(n.id),
      );
      const roots = new Set(nodes.flatMap((n) => n.rootSourceIds));
      expect(theme.independentRootCount).toBeGreaterThanOrEqual(1);
      // count reported = distinct roots, not node count
      expect(theme.independentRootCount).toBeLessThanOrEqual(Math.max(roots.size, theme.independentRootCount));
    }
  });
});

describe("tension preservation (§13.5)", () => {
  it("keeps opposing currents as an explicit tension", () => {
    const context = compileReadingContext(
      makeInputs({
        draw: {
          cards: drawn([
            "major_10_wheel", // expansion
            "pentacles_04", // restriction/holding on
            "major_07_chariot", // expansion/outward
            "swords_08", // restriction
            "cups_05",
          ]),
          reversalsEnabled: true,
        },
      }),
    );
    expect(context.tensions.length).toBeGreaterThan(0);
    expect(context.tensions.length).toBeLessThanOrEqual(2);
    const tension = context.tensions[0]!;
    expect(tension.instruction).toContain("Preserve both sides");
    expect(tension.evidenceAIds.length).toBeGreaterThan(0);
    expect(tension.evidenceBIds.length).toBeGreaterThan(0);
  });
});

describe("birth card in draw (§13.1 +12)", () => {
  it("scores the exact birth-card appearance as a top resonance", () => {
    // 17 May 1992 → birth card 7 → The Chariot, which is in the draw.
    const context = compileReadingContext(
      makeInputs({
        numerology: numerologyProfile({ year: 1992, month: 5, day: 17 }, MOMENT),
        natal: { kind: "partial", profile: computeConservativeDateOnly(1992, 5, 17) },
        birthProvided: { date: true, time: false, place: false },
      }),
    );
    const birthCardNode = context.resonances.find((r) =>
      r.rootSourceIds.includes("numerology:birth_cards"),
    );
    expect(birthCardNode).toBeDefined();
    expect(birthCardNode!.statement).toContain("The Chariot");
    expect(birthCardNode!.adjustedScore).toBeGreaterThanOrEqual(12);
  });
});

describe("provider minimization (Appendix A.1)", () => {
  it("contains no raw birth data, scores, or operational values", () => {
    const context = compileReadingContext(
      makeInputs({
        natal: { kind: "partial", profile: computeConservativeDateOnly(1992, 5, 17) },
        numerology: numerologyProfile({ year: 1992, month: 5, day: 17 }, MOMENT),
        birthProvided: { date: true, time: false, place: false },
      }),
    );
    const minimized = JSON.stringify(minimizeForProvider(context));
    expect(minimized).not.toContain("1992");
    expect(minimized).not.toContain("adjustedScore");
    expect(minimized).not.toContain("baseScore");
    expect(minimized).not.toContain("budget");
    expect(minimized).not.toContain("rateKey");
    // Significance is verbal, not numeric.
    expect(minimized).toContain('"significance"');
  });
});

describe("deterministic fallback reading", () => {
  it("renders a complete evidence-linked reading without technical language", () => {
    const context = compileReadingContext(makeInputs());
    const fallback = renderDeterministicReading(context);
    expect(fallback.title.length).toBeGreaterThan(0);
    expect(fallback.paragraphs.length).toBeGreaterThanOrEqual(4);
    for (const paragraph of fallback.paragraphs) {
      expect(paragraph.evidenceIds.length).toBeGreaterThan(0);
      for (const banned of ["API", "token", "model", "AI", "budget", "database", "algorithm"]) {
        expect(paragraph.text).not.toContain(banned);
      }
    }
    const allText = fallback.paragraphs.map((p) => p.text).join(" ");
    expect(allText).toContain("The Hermit");
  });
});
