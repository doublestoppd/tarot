import { findDomain } from "@/data/intake/taxonomy";
import type { ReadingSelections } from "@/domain/intake/types";
import type { SpreadDefinition, DrawnCard } from "@/domain/tarot/types";
import type { TarotPattern, CardConcepts } from "@/domain/tarot/patterns";
import type {
  CurrentSky,
  NatalInformation,
  TransitHit,
} from "@/domain/astrology/types";
import type { NumerologyProfile } from "@/domain/numerology/engine";
import {
  cardEvidence,
  currentSkyEvidence,
  hermeticEvidence,
  patternEvidence,
  personalResonanceEvidence,
} from "./candidates";
import {
  bandOf,
  EVIDENCE_CAPS,
  EVIDENCE_HARD_CAP,
  type EvidenceCategory,
  type EvidenceNode,
} from "./types";

/**
 * Resonance scoring pipeline (spec §13.2–§13.6): multipliers, lineage
 * collapse, significance bands, and per-category caps. Calculate broadly,
 * interpret selectively — the model never sees the discarded background.
 */

export interface ResonanceInputs {
  selections: ReadingSelections;
  spread: SpreadDefinition;
  draw: DrawnCard[];
  patterns: TarotPattern[];
  cardConcepts: CardConcepts[];
  currentSky: CurrentSky;
  natal: NatalInformation;
  transits: TransitHit[];
  numerology: NumerologyProfile | null;
}

export interface ResonanceResult {
  /** Active evidence after multipliers, collapse, bands, and caps. */
  selected: EvidenceNode[];
  /** Every candidate (session-only detailed basis; never persisted). */
  candidates: EvidenceNode[];
}

const TIME_MULTIPLIERS: Record<
  string,
  Partial<Record<"near" | "developing" | "longer", number>>
> = {
  present_developing: {},
  near_term: { near: 1.15, longer: 0.85 },
  developing: { developing: 1.15 },
  longer: { longer: 1.15, near: 0.85 },
  none: {},
};

function applyMultipliers(
  node: EvidenceNode,
  inputs: ResonanceInputs,
  primaryCardIds: Set<string>,
): void {
  let score = node.baseScore;
  const { selections } = inputs;

  // Domain relevance ×1.30–×1.45; tangential ×0.60.
  if (node.domainTags.length > 0) {
    if (node.domainTags.includes(selections.domainId)) {
      const focus = findDomain(selections.domainId)?.focuses.find(
        (f) => f.id === selections.focusId,
      );
      const focusHit = focus?.hints.some(
        (hint) => node.insightTags.includes(hint) || node.domainTags.includes(hint),
      );
      score *= focusHit ? 1.45 : 1.3;
    } else if (node.category !== "tarot_card") {
      // Cards themselves are never "tangential" — they are the reading.
      score *= 0.6;
    }
  }

  // Insight lens relevance ×1.20.
  const lens = selections.insightId;
  const lensEffect: Record<string, string> = {
    broader_picture: "balanced",
    not_obvious: "hidden",
    influence: "influence",
    support: "support",
    resistance: "resistance",
    change: "change",
    caution: "caution",
    potential: "potential",
    integration: "integration",
    direction: "direction",
  };
  const effect = lensEffect[lens];
  if (effect && effect !== "balanced" && node.insightTags.includes(effect)) {
    score *= 1.2;
  }

  // Central/primary spread position ×1.20.
  if (node.cardIds.some((id) => primaryCardIds.has(id))) {
    score *= 1.2;
  }

  // 3+ independent roots ×1.20.
  if (node.rootSourceIds.length >= 3) {
    score *= 1.2;
  }

  // Time-perspective weighting.
  const timeRules = TIME_MULTIPLIERS[selections.timePerspectiveId] ?? {};
  let timeFactor = 1;
  for (const tag of node.timeTags) {
    const rule = timeRules[tag];
    if (rule !== undefined) timeFactor = Math.max(timeFactor === 1 ? 0 : timeFactor, rule);
  }
  if (timeFactor !== 1 && timeFactor !== 0) score *= timeFactor;
  if (selections.timePerspectiveId === "none" && node.category === "current_sky") {
    score *= 0.85;
  }

  node.adjustedScore = Math.round(score * 100) / 100;
  node.significanceBand = bandOf(node.adjustedScore);
}

/**
 * Lineage collapse (spec §13.4): nodes resolving to the same root set within
 * a category are combined rather than counted as independent confirmations.
 * Cross-category chains keep the strongest node as lineage parent.
 */
function collapseLineage(nodes: EvidenceNode[]): void {
  const byRoots = new Map<string, EvidenceNode[]>();
  for (const node of nodes) {
    if (!node.active) continue;
    const key = `${node.category}|${node.rootSourceIds.join(",")}`;
    const list = byRoots.get(key) ?? [];
    list.push(node);
    byRoots.set(key, list);
  }
  for (const group of byRoots.values()) {
    if (group.length <= 1) continue;
    group.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const keeper = group[0]!;
    for (const duplicate of group.slice(1)) {
      duplicate.active = false;
      keeper.lineageParentIds.push(duplicate.id);
      for (const p of duplicate.provenanceIds) {
        if (!keeper.provenanceIds.includes(p)) keeper.provenanceIds.push(p);
      }
    }
  }

  // Cross-category: a single-root derivative annotates its parent lineage.
  const singleRoot = new Map<string, EvidenceNode>();
  for (const node of nodes) {
    if (!node.active || node.rootSourceIds.length !== 1) continue;
    const root = node.rootSourceIds[0]!;
    const existing = singleRoot.get(root);
    if (existing && existing.id !== node.id) {
      const child = existing.adjustedScore >= node.adjustedScore ? node : existing;
      const parent = child === node ? existing : node;
      if (!child.lineageParentIds.includes(parent.id)) {
        child.lineageParentIds.push(parent.id);
      }
      singleRoot.set(root, parent);
    } else {
      singleRoot.set(root, node);
    }
  }
}

function applyCaps(nodes: EvidenceNode[]): EvidenceNode[] {
  const active = nodes.filter((n) => n.active && n.significanceBand !== "ignore");

  // Background evidence survives only when it supports a stronger node's
  // concepts (spec §13.3).
  const strongConcepts = new Set<string>();
  for (const node of active) {
    if (node.significanceBand === "strong" || node.significanceBand === "dominant" || node.significanceBand === "supporting") {
      for (const c of node.conceptIds) strongConcepts.add(c);
    }
  }
  const eligible = active.filter(
    (n) =>
      n.significanceBand !== "background" ||
      n.conceptIds.some((c) => strongConcepts.has(c)),
  );

  const byCategory = new Map<EvidenceCategory, EvidenceNode[]>();
  for (const node of eligible) {
    const list = byCategory.get(node.category) ?? [];
    list.push(node);
    byCategory.set(node.category, list);
  }

  const selected: EvidenceNode[] = [];
  for (const [category, list] of byCategory) {
    list.sort((a, b) => b.adjustedScore - a.adjustedScore);
    selected.push(...list.slice(0, EVIDENCE_CAPS[category]));
  }

  selected.sort((a, b) => b.adjustedScore - a.adjustedScore);
  const capped = selected.slice(0, EVIDENCE_HARD_CAP);

  // Never drop primary card observations to the hard cap: cards are the
  // reading. (Caps above already limit them to 8.)
  const cards = selected.filter((n) => n.category === "tarot_card");
  for (const card of cards) {
    if (!capped.includes(card)) {
      capped.pop();
      capped.push(card);
    }
  }
  return capped;
}

export function scoreResonance(inputs: ResonanceInputs): ResonanceResult {
  const primaryCardIds = new Set<string>();
  for (const drawn of inputs.draw) {
    const position = inputs.spread.positions[drawn.drawIndex];
    if (position?.emphasis === "primary") primaryCardIds.add(drawn.cardId);
  }

  const candidates: EvidenceNode[] = [
    ...cardEvidence(inputs.draw, inputs.spread, inputs.selections),
    ...patternEvidence(inputs.patterns),
    ...personalResonanceEvidence(inputs.draw, inputs.natal, inputs.numerology),
    ...currentSkyEvidence(inputs.draw, inputs.currentSky, inputs.transits),
    ...hermeticEvidence(inputs.draw, inputs.cardConcepts),
  ];

  for (const node of candidates) {
    applyMultipliers(node, inputs, primaryCardIds);
  }
  collapseLineage(candidates);
  const selected = applyCaps(candidates);

  return { selected, candidates };
}
