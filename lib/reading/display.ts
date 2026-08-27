import type { ReadingContext, ReadingSynthesis } from "@/domain/reading-compiler/types";
import { correspondenceById } from "@/data/correspondences/graph";
import { SOURCES } from "@/data/sources/manifest";

/**
 * Browser display payloads (spec §6.4, Appendix D). Everything here lives
 * only in the active session's memory — the transparency layers exist while
 * the reading is open and are intentionally not recoverable later.
 */

export interface ReadingDisplay {
  readingMoment: string;
  domainLabel: string;
  focusLabel: string;
  insightLabel: string;
  timePerspectiveLabel: string;
  depth: string;
  spread: {
    id: string;
    name: string;
    positions: Array<{ index: number; id: string; label: string; purpose: string }>;
  };
  cards: Array<{
    cardId: string;
    name: string;
    orientation: "upright" | "reversed";
    positionLabel: string;
    positionPurpose: string;
    meaning: string;
  }>;
  basisSummary: {
    included: string[];
    notIncluded: string[];
  };
  whatShaped: WhatShapedLayer;
  detailedBasis: DetailedBasisRow[];
  deterministicFallback: ReadingSynthesis;
}

export interface WhatShapedLayer {
  cards: string[];
  personal: string[];
  currentSky: string[];
  availableNotEmphasized: string[];
  notAvailable: string[];
}

export interface DetailedBasisRow {
  statement: string;
  category: string;
  tradition: string;
  acceptanceClass: string;
  sources: string[];
}

const TRADITION_LABELS: Record<string, string> = {
  rws: "Rider–Waite–Smith tradition",
  golden_dawn: "Golden Dawn / Hermetic",
  hermetic_qabalah: "Hermetic Qabalah",
  western_astrology: "Western astrology",
  pythagorean_numerology: "Western/Pythagorean numerology",
  classical_elements: "Classical elements",
  planetary_symbolism: "Traditional planetary symbolism",
  modern_eclectic: "Modern convention",
};

const sourceTitle = (id: string): string =>
  SOURCES.find((s) => s.id === id)?.title ?? id;

function basisSummary(context: ReadingContext): ReadingDisplay["basisSummary"] {
  const included: string[] = ["Tarot and spread symbolism", "Current celestial conditions"];
  included.push(`${context.reading.domain.label} — ${context.reading.focus.label}`);
  included.push(context.reading.insight.label);
  if (context.capability.stableDateAstrology || context.capability.fullNatalChart) {
    included.push(
      context.capability.fullNatalChart ? "Full natal astrology" : "Birth-date astrology",
    );
  }
  if (context.capability.numerology) included.push("Numerology and personal cycles");
  if (context.resonances.some((r) => r.category === "hermetic")) {
    included.push("Hermetic correspondences");
  }

  const notIncluded: string[] = [];
  if (!context.capability.birthDateProvided) {
    notIncluded.push("No personal birth information will be used.");
  } else if (!context.capability.natalHouses) {
    notIncluded.push(
      "Natal houses and Ascendant — birth time and birthplace were not provided.",
    );
  }
  return { included, notIncluded };
}

function whatShaped(context: ReadingContext): WhatShapedLayer {
  const strongBands = new Set(["strong", "dominant"]);
  const cardStatements = [
    ...context.providerEvidence
      .filter(
        (e) =>
          (e.category === "tarot_card" || e.category === "tarot_pattern") &&
          strongBands.has(e.significance),
      )
      .map((e) => e.statement),
  ].slice(0, 5);

  const personal = context.resonances
    .filter((r) => r.category === "personal")
    .map((r) => r.statement)
    .slice(0, 4);

  const sky = context.resonances
    .filter((r) => r.category === "current_sky")
    .map((r) => r.statement)
    .slice(0, 3);
  if (sky.length === 0) {
    const lunar = context.currentSky.find((s) => s.type === "lunar_phase");
    if (lunar) sky.push(`${lunar.displayFact}.`);
  }

  const emphasizedFacts = new Set(
    [...personal, ...sky].join(" ").toLowerCase().split(/\W+/),
  );
  const availableNotEmphasized = context.personalFactors
    .filter((f) => {
      const key = f.displayFact.toLowerCase().split(/\W+/).slice(0, 4);
      return !key.every((k) => emphasizedFacts.has(k));
    })
    .map((f) => f.displayFact)
    .slice(0, 5);

  return {
    cards: cardStatements,
    personal,
    currentSky: sky,
    availableNotEmphasized,
    notAvailable: context.unavailable.map((u) => u.userFacingExplanation),
  };
}

function detailedBasis(context: ReadingContext): DetailedBasisRow[] {
  const rows: DetailedBasisRow[] = [];
  const seen = new Set<string>();
  // Provenance-carrying evidence nodes come first so the dedupe below keeps
  // the enriched row; provider-evidence entries fill in anything remaining
  // (notably card observations, grounded in the card's own source refs).
  const allNodes: Array<{
    statement: string;
    category: string;
    provenanceIds: string[];
  }> = [...context.tarotPatterns, ...context.resonances].map((node) => ({
    statement: node.statement,
    category: node.category,
    provenanceIds: node.provenanceIds,
  }));
  const cardProvenance = new Map(
    context.reading.cards.map((c) => [c.evidenceId, c.cardId]),
  );
  for (const e of context.providerEvidence) {
    allNodes.push({
      statement: e.statement,
      category: e.category,
      provenanceIds:
        e.category === "tarot_card" && cardProvenance.has(e.id)
          ? ["src_waite_pkt_1911"]
          : [],
    });
  }
  for (const node of allNodes) {
    if (seen.has(node.statement)) continue;
    seen.add(node.statement);
    let tradition = "—";
    let acceptanceClass = "—";
    const sources = new Set<string>();
    for (const provenanceId of node.provenanceIds) {
      const record = correspondenceById(provenanceId);
      if (record) {
        tradition = TRADITION_LABELS[record.traditionId] ?? record.traditionId;
        acceptanceClass = record.acceptanceClass;
        for (const ref of record.sourceRefs) sources.add(sourceTitle(ref));
      } else if (provenanceId.startsWith("src_")) {
        sources.add(sourceTitle(provenanceId));
        const source = SOURCES.find((s) => s.id === provenanceId);
        if (tradition === "—" && source && source.tradition !== "general") {
          tradition = TRADITION_LABELS[source.tradition] ?? source.tradition;
        }
      }
    }
    rows.push({
      statement: node.statement,
      category: node.category,
      tradition,
      acceptanceClass,
      sources: [...sources],
    });
  }
  return rows.slice(0, 40);
}

export function buildReadingDisplay(
  context: ReadingContext,
  deterministicFallback: ReadingSynthesis,
): ReadingDisplay {
  return {
    readingMoment: context.reading.momentUtc,
    domainLabel: context.reading.domain.label,
    focusLabel: context.reading.focus.label,
    insightLabel: context.reading.insight.label,
    timePerspectiveLabel: context.reading.timePerspective.label,
    depth: context.reading.depth,
    spread: {
      id: context.reading.spread.id,
      name: context.reading.spread.name,
      positions: context.reading.spread.positions,
    },
    cards: context.reading.cards.map((c) => ({
      cardId: c.cardId,
      name: c.name,
      orientation: c.orientation,
      positionLabel: c.positionLabel,
      positionPurpose: c.positionPurpose,
      meaning: c.canonicalMeaningSummary,
    })),
    basisSummary: basisSummary(context),
    whatShaped: whatShaped(context),
    detailedBasis: detailedBasis(context),
    deterministicFallback,
  };
}
