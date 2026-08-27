/**
 * Structured intake taxonomy types (spec §7). The taxonomy is part of the
 * semantic engine: stable internal ids are separate from display text so
 * wording can change without changing logic or tests.
 */

export type Depth = "focused" | "deep" | "comprehensive";

export interface FocusDefinition {
  id: string;
  label: string;
  /** Theme hints used by spread selection and resonance domain-relevance. */
  hints: string[];
}

export interface DomainDefinition {
  id: string;
  label: string;
  /** First focus is the broad "General …" default. */
  focuses: FocusDefinition[];
}

export interface InsightLensDefinition {
  id: string;
  label: string;
  /** Deterministic interpretive effect encoded for the compiler. */
  effect:
    | "balanced"
    | "hidden"
    | "influence"
    | "support"
    | "resistance"
    | "change"
    | "caution"
    | "potential"
    | "integration"
    | "direction";
  description: string;
}

export interface TimePerspectiveDefinition {
  id: string;
  label: string;
  weighting: "balanced" | "near" | "developing" | "longer" | "none";
  description: string;
}

export interface ReadingSelections {
  domainId: string;
  focusId: string;
  insightId: string;
  timePerspectiveId: string;
  depth: Depth;
  reversalsEnabled: boolean;
}
