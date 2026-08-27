import { beforeEach, describe, expect, it } from "vitest";
import {
  compileReadingContext,
  resetCompilerForTests,
  type CompilerInputs,
} from "@/domain/reading-compiler/compile";
import {
  computeQualityFlags,
  repairInstruction,
  validateSynthesis,
  validEvidenceIds,
} from "@/domain/safety/validate";
import type { ReadingSynthesis } from "@/domain/reading-compiler/types";
import { computeConservativeDateOnly, computeCurrentSky } from "@/domain/astrology/engine";
import { numerologyProfile } from "@/domain/numerology/engine";
import { getSpread } from "@/data/spreads/spreads";
import type { DrawnCard } from "@/domain/tarot/types";

const MOMENT = new Date("2026-08-27T00:00:00Z");
const SKY = computeCurrentSky(MOMENT);

const drawn = (ids: string[]): DrawnCard[] =>
  ids.map((cardId, drawIndex) => ({ cardId, drawIndex, orientation: "upright" as const }));

function buildContext(withBirth: boolean) {
  resetCompilerForTests();
  const inputs: CompilerInputs = {
    momentUtc: MOMENT.toISOString(),
    selections: {
      domainId: "career",
      focusId: "new_direction",
      insightId: "broader_picture",
      timePerspectiveId: "present_developing",
      depth: "deep",
      reversalsEnabled: true,
    },
    spread: getSpread("fivefold_insight"),
    draw: {
      cards: drawn([
        "major_09_hermit",
        "pentacles_08",
        "wands_02",
        "cups_05",
        "major_07_chariot",
      ]),
      reversalsEnabled: true,
    },
    currentSky: SKY,
    natal: withBirth
      ? { kind: "partial", profile: computeConservativeDateOnly(1992, 5, 17) }
      : { kind: "none" },
    transits: [],
    numerology: withBirth
      ? numerologyProfile({ year: 1992, month: 5, day: 17 }, MOMENT)
      : null,
    birthProvided: { date: withBirth, time: false, place: false },
  };
  return compileReadingContext(inputs);
}

function validSynthesis(context: ReturnType<typeof buildContext>): ReadingSynthesis {
  const ids = [...validEvidenceIds(context)];
  const cardIds = context.reading.cards.map((c) => c.evidenceId);
  const filler =
    "The pattern here asks for patient attention: the position's purpose and the card's own register meet without strain, and the sensible reading lets that meeting stand at its natural size, neither inflated into drama nor dismissed as coincidence, while the surrounding cards keep their own counsel and lend the paragraph the weight of the spread as a whole.";
  const paragraph = (evidenceIds: string[]) => ({
    text: filler + " " + filler,
    evidenceIds,
  });
  return {
    title: "Between Structure and Movement",
    paragraphs: [
      paragraph([cardIds[0]!]),
      paragraph([cardIds[1]!]),
      paragraph([cardIds[2]!]),
      paragraph([cardIds[3]!]),
      paragraph([cardIds[4]!]),
      paragraph([ids[0]!]),
    ],
    usedEvidenceIds: cardIds,
    qualityFlags: {
      containsDirectPrediction: false,
      containsUnsupportedBiography: false,
      containsUnsupportedCorrespondence: false,
    },
  };
}

describe("validateSynthesis", () => {
  let context: ReturnType<typeof buildContext>;
  beforeEach(() => {
    context = buildContext(false);
  });

  it("accepts a compliant synthesis", () => {
    const result = validateSynthesis(validSynthesis(context), context);
    expect(result.problems.filter((p) => p.severity !== "minor")).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("rejects invented evidence ids as fatal", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[0]!.evidenceIds = ["ev_card_9999"];
    const result = validateSynthesis(synthesis, context);
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.code === "INVENTED_EVIDENCE_ID" && p.severity === "fatal")).toBe(true);
  });

  it("rejects paragraphs without evidence", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[2]!.evidenceIds = [];
    const result = validateSynthesis(synthesis, context);
    expect(result.problems.some((p) => p.code === "PARAGRAPH_WITHOUT_EVIDENCE")).toBe(true);
  });

  it("requires four card-rooted paragraphs at deep depth", () => {
    const synthesis = validSynthesis(context);
    const nonCard = context.providerEvidence.find(
      (e) => !e.rootIds.some((r) => r.startsWith("draw:")),
    );
    // Overwrite all citations with a non-card id (or synthetic tension id).
    const id = nonCard?.id ?? context.tensions[0]?.id;
    if (!id) return; // context without non-card evidence can't exercise this
    for (const p of synthesis.paragraphs) p.evidenceIds = [id];
    const result = validateSynthesis(synthesis, context);
    expect(result.problems.some((p) => p.code === "INSUFFICIENT_CARD_GROUNDING")).toBe(true);
  });

  it("flags technical language, chat framing, and ending questions", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[1]!.text += " The model computed this via the API.";
    synthesis.paragraphs[5]!.text += " Would you like me to draw again?";
    const result = validateSynthesis(synthesis, context);
    const codes = result.problems.map((p) => p.code);
    expect(codes).toContain("TECHNICAL_LANGUAGE");
    expect(codes).toContain("CHAT_FRAMING");
    expect(codes).toContain("ENDS_WITH_QUESTION");
    expect(result.ok).toBe(false);
    expect(result.repairable).toBe(true);
  });

  it("flags direct predictions and prohibited topics", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[0]!.text += " You will receive the offer next week; it is guaranteed.";
    synthesis.paragraphs[1]!.text += " The cards suggest a pregnancy.";
    const result = validateSynthesis(synthesis, context);
    const codes = result.problems.map((p) => p.code);
    expect(codes).toContain("DIRECT_PREDICTION");
    expect(codes).toContain("PROHIBITED_TOPIC");
  });

  it("flags unsupported esoterica and invented biography as fatal", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[0]!.text += " Carry a clear crystal for protection.";
    synthesis.paragraphs[1]!.text += " Your boss has been undermining you.";
    const result = validateSynthesis(synthesis, context);
    expect(result.problems.some((p) => p.code === "UNSUPPORTED_ESOTERICA" && p.severity === "fatal")).toBe(true);
    expect(result.problems.some((p) => p.code === "UNSUPPORTED_BIOGRAPHY" && p.severity === "fatal")).toBe(true);
  });

  it("blocks references to houses/angles when birth time is absent", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[3]!.text += " With your Ascendant rising in the tenth house, ambition dominates.";
    const result = validateSynthesis(synthesis, context);
    expect(result.problems.some((p) => p.code === "UNAVAILABLE_FACTOR")).toBe(true);
  });

  it("blocks numerology and natal references without a birth date", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[2]!.text += " Your Life Path number confirms this, as does your natal pattern.";
    const result = validateSynthesis(synthesis, context);
    const unavailable = result.problems.filter((p) => p.code === "UNAVAILABLE_FACTOR");
    expect(unavailable.length).toBeGreaterThanOrEqual(2);
  });

  it("blocks astrological vocabulary not present in the supplied context", () => {
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[1]!.text += " A hidden Scorpio influence colors everything here.";
    const result = validateSynthesis(synthesis, context);
    expect(
      result.problems.some(
        (p) => p.code === "UNSUPPORTED_CORRESPONDENCE" && p.detail === "scorpio",
      ),
    ).toBe(true);
  });

  it("allows astrological vocabulary that the context legitimately supplies", () => {
    const withBirth = buildContext(true);
    const synthesis = validSynthesis(withBirth);
    synthesis.paragraphs[0]!.text += " The Virgo repetition gives the withdrawal its precision.";
    const result = validateSynthesis(synthesis, withBirth);
    expect(result.problems.some((p) => p.code === "UNSUPPORTED_CORRESPONDENCE")).toBe(false);
  });
});

describe("computeQualityFlags and repairInstruction", () => {
  it("derives flags from the text, not from the model", () => {
    const context = buildContext(false);
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[0]!.text += " You will inevitably succeed.";
    const flags = computeQualityFlags(synthesis);
    expect(flags.containsDirectPrediction).toBe(true);
    expect(flags.containsUnsupportedBiography).toBe(false);
  });

  it("builds a narrow correction instruction", () => {
    const context = buildContext(false);
    const synthesis = validSynthesis(context);
    synthesis.paragraphs[0]!.text += " The algorithm says you will win.";
    const result = validateSynthesis(synthesis, context);
    const instruction = repairInstruction(result.problems);
    expect(instruction).toContain("TECHNICAL_LANGUAGE");
    expect(instruction).toContain("DIRECT_PREDICTION");
    expect(instruction).toContain("Do not introduce new evidence ids");
  });
});
