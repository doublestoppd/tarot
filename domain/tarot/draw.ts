import { ALL_CARD_IDS } from "@/data/tarot/cards";
import type { TarotDraw } from "./types";
import {
  randomBit,
  secureRandomSource,
  secureShuffle,
  type RandomSource,
} from "./random";

/**
 * The independent secure draw (spec §9.2, ADR 0003).
 *
 * THE DRAW FUNCTION MUST NOT ACCEPT: birth data, reading domain, focus,
 * astrology, numerology, resonance results, AI model output, or prior
 * readings. Its inputs are the spread card count, the reversal flag, and an
 * injectable randomness source used only by tests. An architecture test
 * enforces this contract.
 */
export function drawCards(
  cardCount: number,
  reversalsEnabled: boolean,
  random: RandomSource = secureRandomSource,
): TarotDraw {
  if (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > ALL_CARD_IDS.length) {
    throw new Error(`Invalid spread card count: ${cardCount}`);
  }

  const deck = [...ALL_CARD_IDS];
  secureShuffle(deck, random);

  const cards = deck.slice(0, cardCount).map((cardId, drawIndex) => ({
    cardId,
    orientation:
      reversalsEnabled && randomBit(random) === 1
        ? ("reversed" as const)
        : ("upright" as const),
    drawIndex,
  }));

  return { cards, reversalsEnabled };
}
