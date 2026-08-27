/**
 * Evidence graph types (spec §13). Every candidate observation becomes an
 * EvidenceNode with root lineage so false synchronicity (one lineage counted
 * as many confirmations) is structurally impossible.
 */

export type EvidenceCategory =
  | "tarot_card"
  | "tarot_pattern"
  | "personal"
  | "current_sky"
  | "hermetic"
  | "tension";

export type SignificanceBand =
  | "ignore"
  | "background"
  | "supporting"
  | "strong"
  | "dominant";

export interface EvidenceNode {
  id: string;
  statement: string;
  category: EvidenceCategory;
  /**
   * Canonical independent roots, e.g. "draw:major_09_hermit",
   * "natal:sun", "numerology:life_path", "current:moon".
   * Nodes resolving to identical root sets are combined, never summed.
   */
  rootSourceIds: string[];
  lineageParentIds: string[];
  /** Correspondence-record / source ids grounding the statement. */
  provenanceIds: string[];
  baseScore: number;
  adjustedScore: number;
  significanceBand: SignificanceBand;
  domainTags: string[];
  insightTags: string[];
  timeTags: Array<"near" | "developing" | "longer">;
  cardIds: string[];
  conceptIds: string[];
  active: boolean;
}

export interface CompiledTheme {
  id: string;
  label: string;
  shortThesis: string;
  significance: "dominant" | "strong" | "supporting";
  evidenceIds: string[];
  independentRootCount: number;
  domainRelevance: boolean;
  cautions: string[];
  contradictions: string[];
}

export interface CompiledTension {
  id: string;
  themeA: string;
  evidenceAIds: string[];
  themeB: string;
  evidenceBIds: string[];
  strength: number;
  instruction: string;
}

export function bandOf(score: number): SignificanceBand {
  if (score < 5) return "ignore";
  if (score < 9) return "background";
  if (score < 14) return "supporting";
  if (score < 20) return "strong";
  return "dominant";
}

/** Maximum evidence per class sent to the model (spec §13.6). */
export const EVIDENCE_CAPS: Record<EvidenceCategory, number> = {
  tarot_card: 8,
  tarot_pattern: 5,
  personal: 5,
  current_sky: 4,
  hermetic: 4,
  tension: 3,
};

export const EVIDENCE_HARD_CAP = 30;
