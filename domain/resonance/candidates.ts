import { getCard } from "@/data/tarot/cards";
import { correspondencesFor } from "@/data/correspondences/graph";
import type { CardConcepts, TarotPattern } from "@/domain/tarot/patterns";
import type {
  DrawnCard,
  SpreadDefinition,
  TarotCardDefinition,
  ThemeTag,
} from "@/domain/tarot/types";
import type { ReadingSelections } from "@/domain/intake/types";
import type {
  CurrentSky,
  NatalInformation,
  TransitHit,
} from "@/domain/astrology/types";
import { SIGN_LABELS, SIGN_RULER } from "@/domain/astrology/zodiac";
import type { NumerologyProfile } from "@/domain/numerology/engine";
import { birthCardTrumpNumber } from "@/domain/numerology/engine";
import type { EvidenceCategory, EvidenceNode } from "./types";

/**
 * Candidate evidence generation (spec §13.1). Base scores follow the
 * specification's table; multipliers/collapse happen in scoring.ts.
 */

const THEME_DOMAINS: Partial<Record<ThemeTag, string[]>> = {
  material: ["money", "career", "home"],
  abundance: ["money"],
  scarcity: ["money"],
  work: ["career", "money"],
  authority: ["career", "conflict"],
  connection: ["love", "home", "conflict"],
  emotional: ["love", "home", "growth"],
  harmony: ["love", "home"],
  communication: ["love", "conflict", "career"],
  conflict: ["conflict"],
  power: ["conflict", "career"],
  justice: ["conflict", "decision"],
  choice: ["decision"],
  cycles: ["timing", "change"],
  change: ["change", "timing"],
  endings: ["change"],
  beginnings: ["change", "creativity"],
  transformation: ["growth", "spiritual", "change"],
  healing: ["growth", "spiritual"],
  intuition: ["spiritual"],
  mystery: ["spiritual"],
  insight: ["spiritual", "growth", "decision"],
  discipline: ["growth", "career", "creativity"],
  growth: ["growth", "career"],
  freedom: ["growth", "change"],
  stability: ["home", "money", "career"],
  structure: ["career", "home", "conflict"],
  waiting: ["timing"],
  completion: ["timing", "change"],
};

const THEME_INSIGHTS: Partial<Record<ThemeTag, string[]>> = {
  mystery: ["hidden"],
  illusion: ["hidden", "caution"],
  insight: ["hidden", "integration"],
  intuition: ["hidden"],
  stability: ["support"],
  harmony: ["support", "integration"],
  healing: ["support", "potential"],
  hope: ["support", "potential"],
  abundance: ["support", "potential"],
  growth: ["potential", "change"],
  beginnings: ["potential", "change"],
  conflict: ["resistance", "caution"],
  restraint: ["resistance"],
  fear: ["resistance", "caution"],
  loss: ["caution"],
  risk: ["caution"],
  caution: ["caution"],
  excess: ["caution"],
  endings: ["change"],
  change: ["change", "direction"],
  movement: ["change", "direction", "influence"],
  cycles: ["change", "direction"],
  transformation: ["change", "potential"],
  balance: ["integration"],
  completion: ["direction", "integration"],
  power: ["influence"],
  authority: ["influence"],
  truth: ["influence", "integration"],
  choice: ["direction"],
  waiting: ["caution"],
};

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function resetEvidenceIdsForTests(): void {
  counter = 0;
}

function node(
  prefix: string,
  category: EvidenceCategory,
  statement: string,
  baseScore: number,
  roots: string[],
  extras: Partial<EvidenceNode> = {},
): EvidenceNode {
  return {
    id: nextId(prefix),
    statement,
    category,
    rootSourceIds: [...new Set(roots)].sort(),
    lineageParentIds: [],
    provenanceIds: [],
    baseScore,
    adjustedScore: baseScore,
    significanceBand: "ignore",
    domainTags: [],
    insightTags: [],
    timeTags: [],
    cardIds: [],
    conceptIds: [],
    active: true,
    ...extras,
  };
}

function cardTags(card: TarotCardDefinition): {
  domainTags: string[];
  insightTags: string[];
} {
  const domains = new Set<string>();
  const insights = new Set<string>();
  for (const tag of card.themeTags) {
    for (const d of THEME_DOMAINS[tag] ?? []) domains.add(d);
    for (const i of THEME_INSIGHTS[tag] ?? []) insights.add(i);
  }
  return { domainTags: [...domains], insightTags: [...insights] };
}

const ORIENTATION_LABEL = { upright: "upright", reversed: "reversed" } as const;

/** One primary observation node per drawn card. */
export function cardEvidence(
  draw: DrawnCard[],
  spread: SpreadDefinition,
  selections: ReadingSelections,
): EvidenceNode[] {
  return draw.map((drawn) => {
    const card = getCard(drawn.cardId);
    const position = spread.positions[drawn.drawIndex]!;
    const meaning =
      drawn.orientation === "upright" ? card.uprightMeaning : card.reversedMeaning;
    // Cards are the reading: the base keeps every card observation at least
    // in the "supporting" band before bonuses (spec §15.2 hierarchy).
    let base = 9;
    if (position.emphasis === "primary") base += 2;
    if (position.insightAffinity.includes(selections.insightId)) base += 4;
    if (drawn.orientation === "reversed" && selections.insightId === "not_obvious") {
      base += 2;
    }
    const tags = cardTags(card);
    return node(
      "ev_card",
      "tarot_card",
      `${card.canonicalName} (${ORIENTATION_LABEL[drawn.orientation]}) in the "${position.label}" position. ${meaning}`,
      base,
      [`draw:${card.id}`],
      {
        cardIds: [card.id],
        conceptIds: [`card:${card.id}`],
        provenanceIds: card.sourceRefs,
        timeTags: card.arcana === "major" ? ["longer"] : ["near", "developing"],
        ...tags,
      },
    );
  });
}

/** Pattern nodes (tension pairs are handled by the tension compiler). */
export function patternEvidence(patterns: TarotPattern[]): EvidenceNode[] {
  return patterns
    .filter((p) => p.kind !== "tension_pair")
    .map((p) => {
      const domains = new Set<string>();
      const insights = new Set<string>();
      for (const cardId of p.cardIds) {
        const tags = cardTags(getCard(cardId));
        for (const d of tags.domainTags) domains.add(d);
        for (const i of tags.insightTags) insights.add(i);
      }
      return node("ev_pat", "tarot_pattern", p.statement, p.weight, [
        ...p.cardIds.map((id) => `draw:${id}`),
      ], {
        cardIds: p.cardIds,
        conceptIds: p.conceptIds,
        timeTags: ["developing"],
        domainTags: p.kind === "suit_emphasis" || p.kind === "element_emphasis" ? [...domains] : [],
        insightTags: [...insights],
      });
    });
}

function signLabel(concept: string): string {
  const sign = concept.replace("sign:", "") as keyof typeof SIGN_LABELS;
  return SIGN_LABELS[sign] ?? concept;
}

function planetLabel(concept: string): string {
  const name = concept.replace("planet:", "");
  return name.charAt(0).toUpperCase() + name.slice(1);
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
  asc: "Ascendant",
  mc: "Midheaven",
  dsc: "Descendant",
  ic: "IC",
};

/** "the Sun"/"the Moon"/"the North Node" but bare planet names. */
function bodyPhrase(body: string): string {
  const label = BODY_LABELS[body] ?? body;
  return ["sun", "moon", "north_node", "asc", "mc", "dsc", "ic"].includes(body)
    ? `the ${label}`
    : label;
}

/** Class A/B sign attributions of a drawn card (court signs are class C). */
function classABSignAttributions(cardId: string): Array<{ sign: string; recordId: string }> {
  const out: Array<{ sign: string; recordId: string }> = [];
  for (const rec of correspondencesFor(`card:${cardId}`)) {
    if (
      rec.relationshipType === "attributed_to" &&
      rec.targetConceptId.startsWith("sign:") &&
      (rec.acceptanceClass === "A" || rec.acceptanceClass === "B")
    ) {
      out.push({ sign: rec.targetConceptId, recordId: rec.id });
    }
    if (rec.relationshipType === "decan_of") {
      for (const d of correspondencesFor(rec.targetConceptId)) {
        if (d.relationshipType === "decan_sign") {
          out.push({ sign: d.targetConceptId, recordId: d.id });
        }
      }
    }
  }
  return out;
}

function classABPlanetAttributions(cardId: string): Array<{ planet: string; recordId: string }> {
  const out: Array<{ planet: string; recordId: string }> = [];
  for (const rec of correspondencesFor(`card:${cardId}`)) {
    if (
      rec.relationshipType === "attributed_to" &&
      rec.targetConceptId.startsWith("planet:") &&
      (rec.acceptanceClass === "A" || rec.acceptanceClass === "B")
    ) {
      out.push({ planet: rec.targetConceptId, recordId: rec.id });
    }
  }
  return out;
}

/** Personal resonances between natal/numerology facts and the actual draw. */
export function personalResonanceEvidence(
  draw: DrawnCard[],
  natal: NatalInformation,
  numerology: NumerologyProfile | null,
): EvidenceNode[] {
  const nodes: EvidenceNode[] = [];

  // Tarot birth card appears in the random draw: +12.
  if (numerology) {
    const trumps = new Set(
      numerology.birthCards.trumps.map((t) => birthCardTrumpNumber(t)),
    );
    for (const drawn of draw) {
      const card = getCard(drawn.cardId);
      if (card.arcana === "major" && trumps.has(card.number)) {
        nodes.push(
          node(
            "ev_res",
            "personal",
            `${card.canonicalName} is one of your tarot birth cards, counted from your birth date. It also came up in this random draw.`,
            12,
            ["numerology:birth_cards", `draw:${card.id}`],
            {
              cardIds: [card.id],
              conceptIds: [`card:${card.id}`],
              provenanceIds: ["src_pythagorean_numerology_v1"],
              timeTags: ["longer"],
            },
          ),
        );
      }
    }

    // Exact numerological repetition linked to a drawn card: +8.
    const personalNumbers: Array<{ value: number; label: string; root: string }> = [
      { value: numerology.lifePath, label: `Life Path ${numerology.lifePath}`, root: "numerology:life_path" },
      { value: numerology.personalYear, label: `Personal Year ${numerology.personalYear}`, root: "numerology:personal_year" },
      { value: numerology.birthday, label: `Birthday Number ${numerology.birthday}`, root: "numerology:birthday" },
    ];
    for (const pn of personalNumbers) {
      const matching = draw
        .map((d) => getCard(d.cardId))
        .filter((c) => c.numerologyNumber !== null && c.numerologyNumber === pn.value);
      if (matching.length > 0) {
        const names = matching.map((c) => c.canonicalName).join(" and ");
        nodes.push(
          node(
            "ev_res",
            "personal",
            `Your ${pn.label} shows up in the cards too: ${names}.`,
            8,
            [pn.root, ...matching.map((c) => `draw:${c.id}`)],
            {
              cardIds: matching.map((c) => c.id),
              conceptIds: [`number:${pn.value}`],
              provenanceIds: ["src_pythagorean_numerology_v1"],
              timeTags: pn.root === "numerology:personal_year" ? ["developing"] : ["longer"],
            },
          ),
        );
      }
    }
  }

  // Known natal sign matches a class A/B tarot attribution: +10.
  const natalPlacements: Array<{ body: string; sign: string; precision: string }> = [];
  if (natal.kind === "partial") {
    for (const p of natal.profile.stablePlacements) {
      natalPlacements.push({ body: p.body, sign: `sign:${p.sign}`, precision: "stable-sign" });
    }
  } else if (natal.kind === "exact") {
    for (const p of natal.chart.bodies) {
      natalPlacements.push({ body: p.body, sign: `sign:${p.sign}`, precision: "exact" });
    }
  }
  for (const drawn of draw) {
    const attributions = classABSignAttributions(drawn.cardId);
    for (const attribution of attributions) {
      for (const placement of natalPlacements) {
        if (placement.sign === attribution.sign) {
          const card = getCard(drawn.cardId);
          nodes.push(
            node(
              "ev_res",
              "personal",
              `Your birth chart has ${bodyPhrase(placement.body)} in ${signLabel(placement.sign)}. ${card.canonicalName} is a ${signLabel(placement.sign)} card in this tradition, so the draw echoes your chart.`,
              10,
              [`natal:${placement.body}`, `draw:${card.id}`],
              {
                cardIds: [card.id],
                conceptIds: [attribution.sign],
                provenanceIds: [attribution.recordId],
                timeTags: ["longer"],
              },
            ),
          );
        }
      }
    }
  }

  // Chart ruler matches a card's planetary attribution (exact charts): +10.
  if (natal.kind === "exact") {
    const ruler = SIGN_RULER[natal.chart.chartRulerSign];
    for (const drawn of draw) {
      for (const attribution of classABPlanetAttributions(drawn.cardId)) {
        if (attribution.planet === `planet:${ruler}`) {
          const card = getCard(drawn.cardId);
          nodes.push(
            node(
              "ev_res",
              "personal",
              `Your rising sign is ${SIGN_LABELS[natal.chart.chartRulerSign]}, and ${planetLabel(attribution.planet)} is its ruling planet. ${card.canonicalName} is a ${planetLabel(attribution.planet)} card, so it speaks with extra weight for you.`,
              10,
              ["natal:chart_ruler", `draw:${card.id}`],
              {
                cardIds: [card.id],
                conceptIds: [attribution.planet],
                provenanceIds: [attribution.recordId],
                timeTags: ["longer"],
              },
            ),
          );
        }
      }
    }
  }

  return nodes;
}

/** Current-sky evidence: transits and sky-to-card reinforcement. */
export function currentSkyEvidence(
  draw: DrawnCard[],
  sky: CurrentSky,
  transits: TransitHit[],
): EvidenceNode[] {
  const nodes: EvidenceNode[] = [];

  // Relevant transits within orb: +7 (weak-orb reduction applied here).
  const ASPECT_PHRASE: Record<string, string> = {
    conjunction: "sitting right beside",
    opposition: "directly across from",
    trine: "at an easy, flowing angle to",
    square: "at a hard, testing angle to",
    sextile: "at a friendly angle to",
    quincunx: "at an awkward angle to",
  };
  for (const transit of transits.slice(0, 8)) {
    const maxOrb = transit.transitingBody === "moon" ? 1.5 : 3;
    const ratio = transit.orb / maxOrb;
    const weakness = ratio <= 0.5 ? 1 : Math.max(0.55, 1 - 0.45 * ((ratio - 0.5) / 0.5));
    const applying =
      transit.applying === null
        ? ""
        : transit.applying
          ? " The angle is still tightening."
          : " The angle is starting to ease.";
    const slow = ["jupiter", "saturn", "uranus", "neptune", "pluto"].includes(
      transit.transitingBody,
    );
    nodes.push(
      node(
        "ev_sky",
        "current_sky",
        `In the sky right now, ${BODY_LABELS[transit.transitingBody]} is ${ASPECT_PHRASE[transit.type] ?? "at a meaningful angle to"} ${bodyPhrase(transit.natalBody)} in your birth chart.${applying}`,
        Math.round(7 * weakness * (transit.applying ? 1.05 : 1) * 10) / 10,
        [`current:${transit.transitingBody}`, `natal:${transit.natalBody}`],
        {
          conceptIds: [`planet:${transit.transitingBody}`],
          timeTags: slow ? ["longer", "developing"] : ["near"],
          provenanceIds: ["src_ptolemy_tetrabiblos"],
        },
      ),
    );
  }

  // Current sky independently reinforces a tarot attribution: +5.
  for (const drawn of draw) {
    const card = getCard(drawn.cardId);
    for (const attribution of classABSignAttributions(card.id)) {
      for (const body of sky.bodies) {
        if (`sign:${body.sign}` === attribution.sign && ["sun", "moon"].includes(body.body)) {
          nodes.push(
            node(
              "ev_sky",
              "current_sky",
              `The ${BODY_LABELS[body.body]} is in ${signLabel(attribution.sign)} right now. ${card.canonicalName} is a ${signLabel(attribution.sign)} card, so the sky echoes the draw.`,
              5,
              [`current:${body.body}`, `draw:${card.id}`],
              {
                cardIds: [card.id],
                conceptIds: [attribution.sign],
                provenanceIds: [attribution.recordId],
                timeTags: ["near"],
              },
            ),
          );
        }
      }
    }
    // Decan-exact reinforcement: the Sun transiting the card's own decan.
    for (const rec of correspondencesFor(`card:${card.id}`)) {
      if (rec.relationshipType === "decan_of") {
        const decan = rec.targetConceptId; // decan:virgo_1
        const [signName, decanIndex] = decan.replace("decan:", "").split("_");
        if (
          sky.sunSeason.sign === signName &&
          String(sky.sunSeason.decan) === decanIndex
        ) {
          nodes.push(
            node(
              "ev_sky",
              "current_sky",
              `The Sun is passing through the exact slice of ${signLabel(`sign:${signName}`)} tied to ${card.canonicalName}. The sky and this draw line up closely here.`,
              6,
              ["current:sun", `draw:${card.id}`],
              {
                cardIds: [card.id],
                conceptIds: [decan],
                provenanceIds: [rec.id],
                timeTags: ["near"],
              },
            ),
          );
        }
      }
    }
  }

  // Lunar phase resonance with the lunar trumps (modest, class-C style).
  const lunarCards = draw
    .map((d) => getCard(d.cardId))
    .filter((c) => c.id === "major_18_moon" || c.id === "major_02_high_priestess");
  if (lunarCards.length > 0 && ["full", "new"].includes(sky.lunar.phaseName)) {
    const names = lunarCards.map((c) => c.canonicalName).join(" and ");
    nodes.push(
      node(
        "ev_sky",
        "current_sky",
        `This draw fell near the ${sky.lunar.phaseName} moon, and ${names} appeared. The sky and the cards share the same moon mood.`,
        3,
        ["current:moon", ...lunarCards.map((c) => `draw:${c.id}`)],
        {
          cardIds: lunarCards.map((c) => c.id),
          conceptIds: ["planet:moon"],
          provenanceIds: ["src_agrippa_1533"],
          timeTags: ["near"],
        },
      ),
    );
  }

  return nodes;
}

/** Deep Hermetic layer: decans, sephiroth, letters/paths, court structure. */
export function hermeticEvidence(
  draw: DrawnCard[],
  cardConcepts: CardConcepts[],
): EvidenceNode[] {
  const nodes: EvidenceNode[] = [];
  for (const drawn of draw) {
    const card = getCard(drawn.cardId);
    for (const rec of correspondencesFor(`card:${card.id}`)) {
      if (rec.relationshipType === "decan_of") {
        const decanConcept = rec.targetConceptId;
        const decanRecords = correspondencesFor(decanConcept);
        const ruler = decanRecords.find((r) => r.relationshipType === "decan_ruler");
        const sign = decanRecords.find((r) => r.relationshipType === "decan_sign");
        if (ruler && sign) {
          nodes.push(
            node(
              "ev_herm",
              "hermetic",
              `In the Golden Dawn card tradition, ${card.canonicalName} is tied to ${planetLabel(ruler.targetConceptId)} in ${signLabel(sign.targetConceptId)}. Think of ${planetLabel(ruler.targetConceptId)}'s way of acting, set on ${signLabel(sign.targetConceptId)}'s ground.`,
              3,
              [`draw:${card.id}`],
              {
                cardIds: [card.id],
                conceptIds: [decanConcept, ruler.targetConceptId, sign.targetConceptId],
                provenanceIds: [rec.id, ruler.id, sign.id],
                timeTags: ["developing"],
              },
            ),
          );
        }
      }
      if (rec.relationshipType === "hebrew_letter") {
        const letter = rec.targetConceptId.replace("hebrew:", "");
        const letterName = letter.charAt(0).toUpperCase() + letter.slice(1);
        nodes.push(
          node(
            "ev_herm",
            "hermetic",
            `In Hermetic Qabalah, ${card.canonicalName} carries the Hebrew letter ${letterName}. That letter marks one path on the Tree of Life.`,
            3,
            [`draw:${card.id}`],
            {
              cardIds: [card.id],
              conceptIds: [rec.targetConceptId],
              provenanceIds: [rec.id],
              timeTags: ["longer"],
            },
          ),
        );
      }
    }
    // Sephira of pip rank (via number concept).
    if (card.arcana === "minor" && card.numerologyNumber !== null && card.numerologyNumber <= 10) {
      for (const rec of correspondencesFor(`number:${card.numerologyNumber}`)) {
        if (rec.relationshipType === "sephira") {
          nodes.push(
            node(
              "ev_herm",
              "hermetic",
              `${card.canonicalName} sits at ${rec.notes?.includes("↔") ? rec.notes.split("↔")[1]!.split("(")[0]!.trim() : `sephira ${rec.targetConceptId.replace("sephira:", "")}`} on the Tree of Life. Every card with this number shares that station.`,
              2,
              [`draw:${card.id}`],
              {
                cardIds: [card.id],
                conceptIds: [rec.targetConceptId],
                provenanceIds: [rec.id],
                timeTags: ["longer"],
              },
            ),
          );
        }
      }
    }
  }
  void cardConcepts;
  return nodes;
}
