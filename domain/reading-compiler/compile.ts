import { getCard } from "@/data/tarot/cards";
import { correspondencesFor } from "@/data/correspondences/graph";
import {
  DOMAINS,
  INSIGHT_LENSES,
  TIME_PERSPECTIVES,
} from "@/data/intake/taxonomy";
import type { ReadingSelections } from "@/domain/intake/types";
import type { SpreadDefinition, TarotDraw } from "@/domain/tarot/types";
import { extractPatterns } from "@/domain/tarot/patterns";
import type {
  CurrentSky,
  NatalInformation,
  TransitHit,
} from "@/domain/astrology/types";
import { SIGN_LABELS } from "@/domain/astrology/zodiac";
import type { NumerologyProfile } from "@/domain/numerology/engine";
import { scoreResonance } from "@/domain/resonance/scoring";
import { compileTensions, compileThemes } from "@/domain/resonance/themes";
import { resetEvidenceIdsForTests } from "@/domain/resonance/candidates";
import type { EvidenceNode } from "@/domain/resonance/types";
import type {
  CapabilityFlags,
  CurrentSkyFactor,
  PersonalFactor,
  ProviderEvidenceItem,
  ReadingContext,
  UnavailableFactor,
} from "./types";

/**
 * ReadingContext assembly (spec Appendix A). Pure and deterministic: all
 * astronomical/numerological computation happens upstream; this module only
 * organizes, scores, selects, and minimizes.
 */

export interface CompilerInputs {
  momentUtc: string;
  selections: ReadingSelections;
  spread: SpreadDefinition;
  draw: TarotDraw;
  currentSky: CurrentSky;
  natal: NatalInformation;
  transits: TransitHit[];
  numerology: NumerologyProfile | null;
  birthProvided: { date: boolean; time: boolean; place: boolean };
}

const BODY_LABELS: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  north_node: "North Node",
};

function capabilityFlags(inputs: CompilerInputs): CapabilityFlags {
  const { natal, birthProvided, numerology } = inputs;
  const exact = natal.kind === "exact";
  return {
    tarot: true,
    currentAstrology: true,
    birthDateProvided: birthProvided.date,
    birthTimeProvided: birthProvided.time,
    birthplaceProvided: birthProvided.place,
    stableDateAstrology: natal.kind === "partial",
    fullNatalChart: exact,
    natalHouses: exact,
    natalAngles: exact,
    numerology: numerology !== null,
  };
}

function personalFactors(
  inputs: CompilerInputs,
  personalEvidence: EvidenceNode[],
): PersonalFactor[] {
  const factors: PersonalFactor[] = [];
  let n = 0;
  const nextId = () => `pf_${++n}`;

  if (inputs.numerology) {
    const num = inputs.numerology;
    factors.push(
      {
        evidenceId: nextId(),
        type: "life_path",
        displayFact: `Life Path ${num.lifePath}`,
        precision: "derived-date",
        provenanceIds: ["src_pythagorean_numerology_v1"],
      },
      {
        evidenceId: nextId(),
        type: "personal_year",
        displayFact: `Personal Year ${num.personalYear}, Personal Month ${num.personalMonth}`,
        precision: "derived-date",
        provenanceIds: ["src_pythagorean_numerology_v1"],
      },
      {
        evidenceId: nextId(),
        type: "birth_cards",
        displayFact: `Tarot birth card${num.birthCards.trumps.length > 1 ? "s" : ""}: ${num.birthCards.trumps
          .map((t) => getCardNameByTrump(t))
          .join(" · ")} (modern convention)`,
        precision: "derived-date",
        provenanceIds: ["src_pythagorean_numerology_v1"],
      },
    );
  }

  if (inputs.natal.kind === "partial") {
    for (const p of inputs.natal.profile.stablePlacements) {
      factors.push({
        evidenceId: nextId(),
        type: "natal_stable_sign",
        displayFact: `${BODY_LABELS[p.body] ?? p.body} in ${SIGN_LABELS[p.sign]} at birth (true for any birth time on that date)`,
        precision: "stable-sign",
        provenanceIds: ["src_astronomy_engine"],
      });
    }
  } else if (inputs.natal.kind === "exact") {
    for (const p of inputs.natal.chart.bodies) {
      factors.push({
        evidenceId: nextId(),
        type: "natal_position",
        displayFact: `${BODY_LABELS[p.body] ?? p.body} in ${SIGN_LABELS[p.sign]} at birth${p.retrograde ? " (retrograde)" : ""}`,
        precision: "exact",
        provenanceIds: ["src_astronomy_engine"],
      });
    }
    factors.push({
      evidenceId: nextId(),
      type: "natal_angles",
      displayFact: `Rising sign ${SIGN_LABELS[inputs.natal.chart.chartRulerSign]}; houses: ${inputs.natal.chart.houses.system === "placidus" ? "Placidus" : "Whole Sign"}`,
      precision: "exact",
      provenanceIds: ["src_astronomy_engine"],
    });
  }

  // Resonance evidence derived from personal factors is already in the
  // evidence graph; the factors list is display/inspection material.
  void personalEvidence;
  return factors;
}

function getCardNameByTrump(trumpChainValue: number): string {
  const number = trumpChainValue === 22 ? 0 : trumpChainValue;
  const majors = [
    "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
    "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
    "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
    "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement",
    "The World",
  ];
  return majors[number] ?? `Trump ${number}`;
}

function currentSkyFactors(inputs: CompilerInputs): CurrentSkyFactor[] {
  const sky = inputs.currentSky;
  const factors: CurrentSkyFactor[] = [];
  let n = 0;
  const nextId = () => `sk_${++n}`;

  const phaseLabel = sky.lunar.phaseName.replace(/_/g, " ");
  factors.push({
    evidenceId: nextId(),
    type: "lunar_phase",
    displayFact: `${phaseLabel.charAt(0).toUpperCase() + phaseLabel.slice(1)} moon in ${SIGN_LABELS[sky.bodies.find((b) => b.body === "moon")!.sign]} (${Math.round(sky.lunar.illuminationFraction * 100)}% illuminated, ${sky.lunar.waxing ? "waxing" : "waning"})`,
    relevance: 3,
    provenanceIds: ["src_astronomy_engine"],
  });
  factors.push({
    evidenceId: nextId(),
    type: "solar_season",
    displayFact: `Sun in ${SIGN_LABELS[sky.sunSeason.sign]}, decan ${sky.sunSeason.decan}`,
    relevance: 3,
    provenanceIds: ["src_astronomy_engine"],
  });
  const retrogrades = sky.bodies.filter(
    (b) => b.retrograde && b.body !== "north_node" && b.body !== "moon",
  );
  if (retrogrades.length > 0) {
    factors.push({
      evidenceId: nextId(),
      type: "retrogrades",
      displayFact: `Retrograde at the draw moment: ${retrogrades.map((b) => BODY_LABELS[b.body]).join(", ")}`,
      relevance: 2,
      provenanceIds: ["src_astronomy_engine"],
    });
  }
  const aspectQuality: Record<string, string> = {
    conjunction: "side by side",
    opposition: "directly across from each other",
    trine: "at an easy angle",
    square: "at a hard angle",
    sextile: "at a friendly angle",
    quincunx: "at an awkward angle",
  };
  for (const aspect of sky.aspects.slice(0, 3)) {
    factors.push({
      evidenceId: nextId(),
      type: "sky_aspect",
      displayFact: `${BODY_LABELS[aspect.a] ?? aspect.a} and ${BODY_LABELS[aspect.b] ?? aspect.b} ${aspectQuality[aspect.type] ?? aspect.type} (${aspect.type}, ${aspect.orb.toFixed(1)}° apart)`,
      relevance: 2,
      provenanceIds: ["src_astronomy_engine", "src_ptolemy_tetrabiblos"],
    });
  }
  return factors;
}

function unavailableFactors(inputs: CompilerInputs): UnavailableFactor[] {
  const out: UnavailableFactor[] = [];
  const { natal, birthProvided } = inputs;
  if (!birthProvided.date) {
    out.push({
      factor: "birth_astrology",
      reasonCode: "NO_BIRTH_DATE",
      userFacingExplanation: "No personal birth information was used.",
    });
    out.push({
      factor: "numerology",
      reasonCode: "NO_BIRTH_DATE",
      userFacingExplanation: "Numerology requires a birth date.",
    });
  } else if (natal.kind === "partial") {
    out.push({
      factor: "natal_houses_angles",
      reasonCode: "NO_BIRTH_TIME",
      userFacingExplanation:
        "Houses and rising sign were left out because birth time and birthplace were not given.",
    });
    for (const body of natal.profile.omittedBodies) {
      out.push({
        factor: `natal_${body}`,
        reasonCode: "SIGN_UNSTABLE_WITHOUT_TIME",
        userFacingExplanation: `${BODY_LABELS[body] ?? body} at birth was left out. Its sign changes during the possible hours of this birth date, so the app does not guess.`,
      });
    }
  } else if (natal.kind === "exact" && natal.chart.houses.system === "whole_sign") {
    out.push({
      factor: "placidus_houses",
      reasonCode: "HIGH_LATITUDE_FALLBACK",
      userFacingExplanation: natal.chart.houses.fallbackReason ??
        "Whole Sign houses were used because Placidus houses are not defined reliably at this latitude.",
    });
  }
  return out;
}

const CATEGORY_PROVENANCE_LABEL: Record<string, string> = {
  tarot_card: "Rider–Waite–Smith tradition",
  tarot_pattern: "Spread structure",
  personal: "Personal factors",
  current_sky: "Current celestial moment",
  hermetic: "Golden Dawn / Hermetic correspondence",
  tension: "Compiled tension",
};

function providerEvidence(selected: EvidenceNode[]): ProviderEvidenceItem[] {
  return selected
    .filter(
      (n) =>
        n.category === "tarot_card" ||
        (n.significanceBand !== "ignore" && n.significanceBand !== "background"),
    )
    .map((n) => ({
      id: n.id,
      statement: n.statement,
      category: n.category,
      significance:
        n.significanceBand === "dominant"
          ? ("dominant" as const)
          : n.significanceBand === "strong"
            ? ("strong" as const)
            : ("supporting" as const),
      provenanceLabel: CATEGORY_PROVENANCE_LABEL[n.category],
      rootIds: n.rootSourceIds,
    }));
}

export function compileReadingContext(inputs: CompilerInputs): ReadingContext {
  const { selections, spread, draw } = inputs;

  const domain = DOMAINS.find((d) => d.id === selections.domainId);
  const focus = domain?.focuses.find((f) => f.id === selections.focusId);
  const insight = INSIGHT_LENSES.find((l) => l.id === selections.insightId);
  const time = TIME_PERSPECTIVES.find((t) => t.id === selections.timePerspectiveId);
  if (!domain || !focus || !insight || !time) {
    throw new Error("Reading selections reference unknown taxonomy ids");
  }

  const { patterns, cardConcepts } = extractPatterns(draw.cards, spread);
  const resonance = scoreResonance({
    selections,
    spread,
    draw: draw.cards,
    patterns,
    cardConcepts,
    currentSky: inputs.currentSky,
    natal: inputs.natal,
    transits: inputs.transits,
    numerology: inputs.numerology,
  });

  const themes = compileThemes(resonance.selected, selections);
  const tensions = compileTensions(patterns, resonance.selected, themes);

  const cardNodes = resonance.selected.filter((n) => n.category === "tarot_card");
  const cards = draw.cards.map((drawn) => {
    const card = getCard(drawn.cardId);
    const position = spread.positions[drawn.drawIndex]!;
    const evidenceNode = cardNodes.find((n) => n.cardIds[0] === card.id);
    return {
      evidenceId: evidenceNode?.id ?? `card_${drawn.drawIndex}`,
      cardId: card.id,
      name: card.canonicalName,
      orientation: drawn.orientation,
      positionId: position.id,
      positionLabel: position.label,
      positionPurpose: position.purpose,
      canonicalMeaningSummary:
        drawn.orientation === "upright" ? card.uprightMeaning : card.reversedMeaning,
      activeCorrespondenceIds: correspondencesFor(`card:${card.id}`).map((r) => r.id),
    };
  });

  const personalNodes = resonance.selected.filter((n) => n.category === "personal");

  return {
    schemaVersion: "1.0",
    reading: {
      momentUtc: inputs.momentUtc,
      domain: { id: domain.id, label: domain.label },
      focus: { id: focus.id, label: focus.label },
      insight: { id: insight.id, label: insight.label },
      timePerspective: { id: time.id, label: time.label },
      depth: selections.depth,
      spread: {
        id: spread.id,
        name: spread.name,
        positions: spread.positions.map((p) => ({
          index: p.index,
          id: p.id,
          label: p.label,
          purpose: p.purpose,
        })),
      },
      cards,
    },
    capability: capabilityFlags(inputs),
    personalFactors: personalFactors(inputs, personalNodes),
    currentSky: currentSkyFactors(inputs),
    tarotPatterns: resonance.selected.filter((n) => n.category === "tarot_pattern"),
    resonances: resonance.selected.filter(
      (n) => n.category === "personal" || n.category === "current_sky" || n.category === "hermetic",
    ),
    themes,
    tensions,
    unavailable: unavailableFactors(inputs),
    providerEvidence: providerEvidence(resonance.selected),
  };
}

/**
 * Provider minimization (spec Appendix A.1): the model-facing payload. No
 * raw birth data, no scores, no discarded candidates, no operational data.
 */
export function minimizeForProvider(context: ReadingContext): object {
  return {
    reading: {
      moment: context.reading.momentUtc,
      domain: context.reading.domain.label,
      focus: context.reading.focus.label,
      insight: context.reading.insight.label,
      timePerspective: context.reading.timePerspective.label,
      depth: context.reading.depth,
      spread: {
        name: context.reading.spread.name,
        positions: context.reading.spread.positions.map((p) => ({
          label: p.label,
          purpose: p.purpose,
        })),
      },
      cards: context.reading.cards.map((c) => ({
        evidenceId: c.evidenceId,
        name: c.name,
        orientation: c.orientation,
        position: c.positionLabel,
        positionPurpose: c.positionPurpose,
        meaning: c.canonicalMeaningSummary,
      })),
    },
    capability: {
      birthDateProvided: context.capability.birthDateProvided,
      fullNatalChart: context.capability.fullNatalChart,
      natalHousesAvailable: context.capability.natalHouses,
      numerologyAvailable: context.capability.numerology,
    },
    evidence: context.providerEvidence.map((e) => ({
      id: e.id,
      statement: e.statement,
      category: e.category,
      significance: e.significance,
      tradition: e.provenanceLabel,
    })),
    themes: context.themes.map((t) => ({
      label: t.label,
      thesis: t.shortThesis,
      significance: t.significance,
      evidenceIds: t.evidenceIds,
    })),
    tensions: context.tensions.map((t) => ({
      id: t.id,
      sideA: t.themeA,
      evidenceAIds: t.evidenceAIds,
      sideB: t.themeB,
      evidenceBIds: t.evidenceBIds,
      instruction: t.instruction,
    })),
    unavailable: context.unavailable.map((u) => u.userFacingExplanation),
  };
}

/** Test seam: deterministic evidence ids across runs. */
export function resetCompilerForTests(): void {
  resetEvidenceIdsForTests();
}
