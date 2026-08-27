import { SPREADS, getSpread } from "@/data/spreads/spreads";
import { findDomain } from "@/data/intake/taxonomy";
import type { ReadingSelections } from "@/domain/intake/types";
import type { SpreadDefinition } from "./types";

/**
 * Automatic spread selection (spec §8.1). Users never need tarot expertise;
 * the engine recommends from domain + focus + insight + depth. A compatible
 * list supports the optional "choose another spread" override.
 */

const BALANCE_FOCUSES = new Set([
  "balance_integration",
  "work_life_balance",
  "compatibility_reciprocity",
  "competing_priorities",
]);

const SHADOW_PATTERN_FOCUSES = new Set([
  "shadow_work",
  "habits_patterns",
  "shadow_integration",
  "recurring_pattern",
  "personal_relationship_patterns",
]);

export function selectSpread(selections: ReadingSelections): SpreadDefinition {
  const { depth, domainId, focusId } = selections;

  if (depth === "focused") return getSpread("threefold_clarity");
  if (depth === "comprehensive") return getSpread("celtic_cross");

  // Deep.
  if (BALANCE_FOCUSES.has(focusId)) return getSpread("elemental_balance");

  switch (domainId) {
    case "decision":
      return getSpread("crossroads");
    case "career":
      // Balance/conflict focuses route to a better-scoring general spread.
      if (focusId === "conflict_obstacles") return getSpread("fivefold_insight");
      return getSpread("career_path");
    case "love":
      return getSpread("connection_dynamics");
    case "change":
      return getSpread("threshold");
    case "growth":
    case "spiritual":
      if (SHADOW_PATTERN_FOCUSES.has(focusId)) return getSpread("deep_pattern");
      break;
    case "timing":
      return getSpread("cycle_lens");
  }

  return getSpread("fivefold_insight");
}

/** Spreads a user may switch to for the same selections (same depth). */
export function compatibleSpreads(selections: ReadingSelections): SpreadDefinition[] {
  return SPREADS.filter((s) => s.depth === selections.depth);
}

/** Guard used by the API layer: chosen override must be compatible. */
export function isSpreadAllowed(
  spreadId: string,
  selections: ReadingSelections,
): boolean {
  return compatibleSpreads(selections).some((s) => s.id === spreadId);
}

/** Validate that a selections object references real taxonomy ids. */
export function validateSelections(selections: ReadingSelections): string[] {
  const problems: string[] = [];
  const domain = findDomain(selections.domainId);
  if (!domain) {
    problems.push(`unknown domain: ${selections.domainId}`);
  } else if (!domain.focuses.some((f) => f.id === selections.focusId)) {
    problems.push(`unknown focus for ${selections.domainId}: ${selections.focusId}`);
  }
  return problems;
}
