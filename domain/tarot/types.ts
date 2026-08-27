/**
 * Canonical tarot identity model (spec §9.1).
 *
 * Interpretation code references card IDs only; presentation/deck artwork is
 * a separate layer (components/tarot). This module is pure data typing — no
 * framework, SDK, or database imports are permitted anywhere in domain/.
 */

export type Arcana = "major" | "minor";
export type Suit = "wands" | "cups" | "swords" | "pentacles";
export type Element = "fire" | "water" | "air" | "earth";
export type Orientation = "upright" | "reversed";

export type MinorRank =
  | "ace"
  | "two"
  | "three"
  | "four"
  | "five"
  | "six"
  | "seven"
  | "eight"
  | "nine"
  | "ten"
  | "page"
  | "knight"
  | "queen"
  | "king";

/** Controlled interpretive vocabulary used by pattern/tension analysis. */
export type ThemeTag =
  | "beginnings"
  | "endings"
  | "movement"
  | "restraint"
  | "structure"
  | "release"
  | "insight"
  | "illusion"
  | "material"
  | "emotional"
  | "mental"
  | "action"
  | "stability"
  | "change"
  | "authority"
  | "surrender"
  | "solitude"
  | "connection"
  | "conflict"
  | "harmony"
  | "risk"
  | "caution"
  | "renewal"
  | "cycles"
  | "power"
  | "vulnerability"
  | "clarity"
  | "mystery"
  | "discipline"
  | "freedom"
  | "growth"
  | "loss"
  | "hope"
  | "fear"
  | "balance"
  | "excess"
  | "truth"
  | "healing"
  | "transformation"
  | "communication"
  | "intuition"
  | "work"
  | "abundance"
  | "scarcity"
  | "justice"
  | "choice"
  | "waiting"
  | "completion";

export interface TarotCardDefinition {
  /** Stable id, e.g. "major_09_hermit" or "wands_05". */
  id: string;
  arcana: Arcana;
  /** Majors 0–21; minors 1–14 where page=11, knight=12, queen=13, king=14. */
  number: number;
  canonicalName: string;
  suit: Suit | null;
  rank: MinorRank | null;
  /**
   * Elemental association. Minors carry their suit element; majors carry an
   * element only where the Golden Dawn attribution is elemental (Fool,
   * Hanged Man, Judgement); planetary/zodiacal majors resolve element via the
   * correspondence graph.
   */
  element: Element | null;
  coreKeywords: string[];
  /** Original normalized interpretive summary — never guidebook prose. */
  uprightMeaning: string;
  reversedMeaning: string;
  /** Number family used for repetition analysis; null for court cards. */
  numerologyNumber: number | null;
  themeTags: ThemeTag[];
  /** Opposing-current tags used by contradiction detection. */
  tensionTags: TensionTag[];
  /** SourceReference ids grounding the structural meaning. */
  sourceRefs: string[];
}

export type TensionTag =
  | "expansion"
  | "restriction"
  | "beginning"
  | "ending"
  | "holding_on"
  | "letting_go"
  | "outward"
  | "inward";

export interface DrawnCard {
  cardId: string;
  orientation: Orientation;
  /** 0-based order of selection, bound to spread positions by index. */
  drawIndex: number;
}

export interface TarotDraw {
  cards: DrawnCard[];
  reversalsEnabled: boolean;
}

export interface SpreadPositionDefinition {
  index: number;
  id: string;
  label: string;
  purpose: string;
  /**
   * Interpretive weight of the position (central/primary positions get 1.2
   * multipliers in resonance scoring, spec §13.2).
   */
  emphasis: "primary" | "standard" | "background";
  /** Insight-lens ids this position directly serves (spec §13.1 +4 rule). */
  insightAffinity: string[];
}

export interface SpreadDefinition {
  id: string;
  name: string;
  cardCount: number;
  depth: "focused" | "deep" | "comprehensive";
  description: string;
  positions: SpreadPositionDefinition[];
  /** Domain ids this spread is designed for; empty = general purpose. */
  domainAffinity: string[];
}
