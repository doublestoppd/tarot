import { getCard } from "@/data/tarot/cards";
import { correspondencesFor } from "@/data/correspondences/graph";
import type {
  DrawnCard,
  Element,
  SpreadDefinition,
  Suit,
  TarotCardDefinition,
  TensionTag,
} from "./types";

/**
 * Deterministic tarot pattern extraction (spec §9.4). Runs after the draw is
 * frozen; produces candidate evidence for the resonance compiler. This module
 * never sees birth data or reading intent — patterns are properties of the
 * spread alone.
 */

export type TarotPatternKind =
  | "major_emphasis"
  | "suit_emphasis"
  | "element_emphasis"
  | "element_absence"
  | "court_emphasis"
  | "number_repetition"
  | "sequence"
  | "attribution_repetition"
  | "orientation_pattern"
  | "tension_pair";

export interface TarotPattern {
  id: string;
  kind: TarotPatternKind;
  statement: string;
  cardIds: string[];
  /** Concept ids implicated (e.g. "sign:virgo", "element:fire"). */
  conceptIds: string[];
  /** Raw signal strength in resonance base-score units (spec §13.1). */
  weight: number;
}

export interface CardConcepts {
  card: TarotCardDefinition;
  orientation: DrawnCard["orientation"];
  positionIndex: number;
  signs: string[];
  planets: string[];
  elements: string[];
  decans: string[];
}

const OPPOSING_TENSIONS: Array<[TensionTag, TensionTag, string]> = [
  ["expansion", "restriction", "expansion and restriction"],
  ["beginning", "ending", "beginning and ending"],
  ["holding_on", "letting_go", "holding on and letting go"],
  ["outward", "inward", "outward movement and inward turning"],
];

const ELEMENT_LABEL: Record<Element, string> = {
  fire: "Fire",
  water: "Water",
  air: "Air",
  earth: "Earth",
};

const SUIT_LABEL: Record<Suit, string> = {
  wands: "Wands",
  cups: "Cups",
  swords: "Swords",
  pentacles: "Pentacles",
};

function conceptLabel(conceptId: string): string {
  const [, raw = conceptId] = conceptId.split(":");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Resolve the astrological/elemental concepts of one drawn card. */
export function resolveCardConcepts(drawn: DrawnCard): CardConcepts {
  const card = getCard(drawn.cardId);
  const signs = new Set<string>();
  const planets = new Set<string>();
  const elements = new Set<string>();
  const decans = new Set<string>();

  if (card.element) elements.add(`element:${card.element}`);

  for (const rec of correspondencesFor(`card:${card.id}`)) {
    const target = rec.targetConceptId;
    switch (rec.relationshipType) {
      case "attributed_to":
        if (target.startsWith("sign:")) signs.add(target);
        else if (target.startsWith("planet:")) planets.add(target);
        else if (target.startsWith("element:")) elements.add(target);
        break;
      case "court_sign":
        signs.add(target);
        break;
      case "decan_of": {
        decans.add(target);
        for (const decanRec of correspondencesFor(target)) {
          if (decanRec.relationshipType === "decan_sign") signs.add(decanRec.targetConceptId);
          if (decanRec.relationshipType === "decan_ruler") planets.add(decanRec.targetConceptId);
        }
        break;
      }
    }
  }

  // Zodiacal majors/courts inherit their sign's element for balance counting.
  for (const sign of signs) {
    for (const signRec of correspondencesFor(sign)) {
      if (signRec.relationshipType === "sign_element") {
        elements.add(signRec.targetConceptId);
      }
    }
  }

  return {
    card,
    orientation: drawn.orientation,
    positionIndex: drawn.drawIndex,
    signs: [...signs],
    planets: [...planets],
    elements: [...elements],
    decans: [...decans],
  };
}

function numberFamily(card: TarotCardDefinition): number | null {
  if (card.numerologyNumber === null) return null;
  if (card.arcana === "minor") return card.numerologyNumber;
  let n = card.numerologyNumber;
  if (n === 0) return null; // The Fool stands outside the pip families.
  while (n > 10) {
    n = n
      .toString()
      .split("")
      .reduce((a, d) => a + Number(d), 0);
  }
  return n;
}

export function extractPatterns(
  drawnCards: DrawnCard[],
  spread: SpreadDefinition,
): { patterns: TarotPattern[]; cardConcepts: CardConcepts[] } {
  const concepts = drawnCards.map(resolveCardConcepts);
  const n = drawnCards.length;
  const patterns: TarotPattern[] = [];
  const nameOf = (c: CardConcepts) => c.card.canonicalName;

  // --- Major/minor emphasis -------------------------------------------------
  const majors = concepts.filter((c) => c.card.arcana === "major");
  if (majors.length >= 2 && majors.length / n >= 0.5) {
    patterns.push({
      id: "pat_major_emphasis",
      kind: "major_emphasis",
      statement: `${majors.length} of the ${n} cards are Major Arcana: ${majors
        .map(nameOf)
        .join(", ")}. That puts the weight on big life currents, not small daily events.`,
      cardIds: majors.map((c) => c.card.id),
      conceptIds: [],
      weight: 5,
    });
  }

  // --- Suit emphasis --------------------------------------------------------
  const suitCounts = new Map<Suit, CardConcepts[]>();
  for (const c of concepts) {
    if (c.card.suit) {
      const list = suitCounts.get(c.card.suit) ?? [];
      list.push(c);
      suitCounts.set(c.card.suit, list);
    }
  }
  const suitThreshold = Math.max(2, Math.ceil(n * 0.4));
  for (const [suit, cards] of suitCounts) {
    if (cards.length >= suitThreshold) {
      patterns.push({
        id: `pat_suit_${suit}`,
        kind: "suit_emphasis",
        statement: `${SUIT_LABEL[suit]} appears ${cards.length} times here: ${cards
          .map(nameOf)
          .join(", ")}. One suit this strong sets the tone of the whole spread.`,
        cardIds: cards.map((c) => c.card.id),
        conceptIds: [`suit:${suit}`],
        weight: 5,
      });
    }
  }

  // --- Element emphasis / absence ------------------------------------------
  const elementCounts = new Map<Element, CardConcepts[]>();
  for (const c of concepts) {
    for (const el of c.elements) {
      const key = el.replace("element:", "") as Element;
      const list = elementCounts.get(key) ?? [];
      list.push(c);
      elementCounts.set(key, list);
    }
  }
  const elementThreshold = n <= 3 ? 2 : 3;
  for (const [element, cards] of elementCounts) {
    if (cards.length >= elementThreshold && cards.length / n >= 0.5) {
      patterns.push({
        id: `pat_element_${element}`,
        kind: "element_emphasis",
        statement: `${ELEMENT_LABEL[element]} runs through ${cards.length} of the ${n} cards (${cards
          .map(nameOf)
          .join(", ")}).`,
        cardIds: cards.map((c) => c.card.id),
        conceptIds: [`element:${element}`],
        weight: 5,
      });
    }
  }
  if (n >= 5) {
    for (const element of ["fire", "water", "air", "earth"] as Element[]) {
      if (!elementCounts.has(element)) {
        patterns.push({
          id: `pat_element_absent_${element}`,
          kind: "element_absence",
          statement: `There is no ${ELEMENT_LABEL[element]} in this spread. What ${ELEMENT_LABEL[element]} stands for is not part of this picture right now.`,
          cardIds: [],
          conceptIds: [`element:${element}`],
          weight: 3,
        });
      }
    }
  }

  // --- Court emphasis -------------------------------------------------------
  const courts = concepts.filter(
    (c) => c.card.rank && ["page", "knight", "queen", "king"].includes(c.card.rank),
  );
  if (courts.length >= 2) {
    patterns.push({
      id: "pat_court_emphasis",
      kind: "court_emphasis",
      statement: `${courts.length} court cards appear here: ${courts
        .map(nameOf)
        .join(", ")}. Court cards often stand for people or roles, so several voices may be active in this situation.`,
      cardIds: courts.map((c) => c.card.id),
      conceptIds: [],
      weight: 4,
    });
  }

  // --- Number repetition ----------------------------------------------------
  const familyMap = new Map<number, CardConcepts[]>();
  for (const c of concepts) {
    const family = numberFamily(c.card);
    if (family !== null) {
      const list = familyMap.get(family) ?? [];
      list.push(c);
      familyMap.set(family, list);
    }
  }
  for (const [family, cards] of familyMap) {
    if (cards.length >= 2) {
      const exactPips = cards.filter((c) => c.card.arcana === "minor").length;
      patterns.push({
        id: `pat_number_${family}`,
        kind: "number_repetition",
        statement: `The number ${family} repeats across ${cards
          .map(nameOf)
          .join(" and ")}.`,
        cardIds: cards.map((c) => c.card.id),
        conceptIds: [`number:${family}`],
        weight: exactPips >= 2 ? 4 : 3,
      });
    }
  }

  // --- Sequences ------------------------------------------------------------
  const pipNumbers = [
    ...new Set(
      concepts
        .filter((c) => c.card.arcana === "minor" && c.card.numerologyNumber !== null && c.card.numerologyNumber <= 10)
        .map((c) => c.card.numerologyNumber as number),
    ),
  ].sort((a, b) => a - b);
  let run: number[] = [];
  const flushRun = () => {
    if (run.length >= 3) {
      const cards = concepts.filter(
        (c) => c.card.arcana === "minor" && run.includes(c.card.numerologyNumber ?? -1),
      );
      patterns.push({
        id: `pat_sequence_${run[0]}_${run[run.length - 1]}`,
        kind: "sequence",
        statement: `The numbers ${run[0]} through ${run[run.length - 1]} appear in order across ${cards
          .map(nameOf)
          .join(", ")}. That looks like a process in motion, moving step by step.`,
        cardIds: cards.map((c) => c.card.id),
        conceptIds: run.map((x) => `number:${x}`),
        weight: 4,
      });
    }
    run = [];
  };
  for (const num of pipNumbers) {
    if (run.length === 0 || num === run[run.length - 1]! + 1) run.push(num);
    else {
      flushRun();
      run = [num];
    }
  }
  flushRun();

  // --- Repeated astrological attributions ----------------------------------
  const attributionMap = new Map<string, Set<string>>(); // concept -> cardIds
  for (const c of concepts) {
    for (const concept of [...c.signs, ...c.planets]) {
      const set = attributionMap.get(concept) ?? new Set();
      set.add(c.card.id);
      attributionMap.set(concept, set);
    }
  }
  for (const [concept, cardIds] of attributionMap) {
    if (cardIds.size >= 2) {
      const names = [...cardIds].map((id) => getCard(id).canonicalName);
      patterns.push({
        id: `pat_attr_${concept.replace(":", "_")}`,
        kind: "attribution_repetition",
        statement: `${conceptLabel(concept)} is tied to more than one card here: ${names.join(
          ", ",
        )}. That doubles its presence in the spread.`,
        cardIds: [...cardIds],
        conceptIds: [concept],
        weight: 7,
      });
    }
  }

  // --- Orientation patterns -------------------------------------------------
  const reversed = concepts.filter((c) => c.orientation === "reversed");
  if (n >= 3 && reversed.length === 0) {
    patterns.push({
      id: "pat_all_upright",
      kind: "orientation_pattern",
      statement:
        "Every card fell upright. The energy here moves in the open, with little held back.",
      cardIds: concepts.map((c) => c.card.id),
      conceptIds: [],
      weight: 3,
    });
  } else if (n >= 3 && reversed.length / n > 0.5) {
    patterns.push({
      id: "pat_reversal_majority",
      kind: "orientation_pattern",
      statement: `${reversed.length} of the ${n} cards fell reversed: ${reversed
        .map(nameOf)
        .join(", ")}. Much of this spread's energy turns inward, runs late, or pushes against itself.`,
      cardIds: reversed.map((c) => c.card.id),
      conceptIds: [],
      weight: 4,
    });
  }

  // --- Opposing tension pairs ----------------------------------------------
  for (const [tagA, tagB, label] of OPPOSING_TENSIONS) {
    const sideA = concepts.filter((c) => c.card.tensionTags.includes(tagA));
    const sideB = concepts.filter((c) => c.card.tensionTags.includes(tagB));
    if (sideA.length > 0 && sideB.length > 0) {
      patterns.push({
        id: `pat_tension_${tagA}_${tagB}`,
        kind: "tension_pair",
        statement: `The spread holds both ${label}. On one side: ${sideA
          .map(nameOf)
          .join(", ")}. On the other: ${sideB.map(nameOf).join(", ")}.`,
        cardIds: [...sideA, ...sideB].map((c) => c.card.id),
        conceptIds: [`tension:${tagA}`, `tension:${tagB}`],
        weight: 5,
      });
    }
  }

  // Bind position indices onto spread for downstream use.
  void spread;

  return { patterns, cardConcepts: concepts };
}
