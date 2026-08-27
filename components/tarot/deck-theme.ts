import type { ComponentType } from "react";
import type { TarotCardDefinition } from "@/domain/tarot/types";
import { CardArt, CardBack, DECK_THEME_ID, DECK_THEME_VERSION } from "./CardArt";

/**
 * DeckTheme abstraction (spec §27.2, ADR 0007): presentation is a swappable
 * layer over stable canonical card identity. Interpretation code references
 * card ids only; a commissioned or licensed deck replaces the entries here
 * without touching any engine, meaning, or correspondence.
 */

export interface DeckTheme {
  id: string;
  version: string;
  /** Renders the face for a canonical card id. */
  CardFace: ComponentType<{ cardId: string }>;
  CardBack: ComponentType;
  /** Concise alt text naming card, orientation, and position (spec §27.3). */
  altText: (
    card: Pick<TarotCardDefinition, "canonicalName">,
    orientation: "upright" | "reversed",
    positionLabel: string,
  ) => string;
  attribution: string;
  license: string;
}

export const celestialPrototypeTheme: DeckTheme = {
  id: DECK_THEME_ID,
  version: DECK_THEME_VERSION,
  CardFace: CardArt,
  CardBack,
  altText: (card, orientation, positionLabel) =>
    `${card.canonicalName}, ${orientation}, in the ${positionLabel} position`,
  attribution:
    "Celestial Prototype — deterministic SVG generated in-application from canonical card definitions",
  license: "Original work of this repository; no third-party artwork",
};

/** The active theme for v1. Future decks register here. */
export const activeDeckTheme: DeckTheme = celestialPrototypeTheme;
