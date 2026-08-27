import type { TarotCardDefinition } from "@/domain/tarot/types";
import { MAJOR_CARDS } from "./majors";
import { WANDS_CARDS } from "./wands";
import { CUPS_CARDS } from "./cups";
import { SWORDS_CARDS } from "./swords";
import { PENTACLES_CARDS } from "./pentacles";

export const DECK_VERSION = "canonical-1.0";

/** The complete 78-card canonical deck. Order: majors 0–21, then suits. */
export const ALL_CARDS: readonly TarotCardDefinition[] = [
  ...MAJOR_CARDS,
  ...WANDS_CARDS,
  ...CUPS_CARDS,
  ...SWORDS_CARDS,
  ...PENTACLES_CARDS,
];

const byId = new Map(ALL_CARDS.map((c) => [c.id, c]));

export function getCard(id: string): TarotCardDefinition {
  const card = byId.get(id);
  if (!card) {
    throw new Error(`Unknown card id: ${id}`);
  }
  return card;
}

export function hasCard(id: string): boolean {
  return byId.has(id);
}

export const ALL_CARD_IDS: readonly string[] = ALL_CARDS.map((c) => c.id);

/** Major arcana indexed by number 0–21 (birth-card lookups). */
export function majorByNumber(num: number): TarotCardDefinition {
  const card = MAJOR_CARDS.find((c) => c.number === num);
  if (!card) {
    throw new Error(`No major arcana with number ${num}`);
  }
  return card;
}
