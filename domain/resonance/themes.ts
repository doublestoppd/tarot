import { getCard } from "@/data/tarot/cards";
import type { TarotPattern } from "@/domain/tarot/patterns";
import type { ReadingSelections } from "@/domain/intake/types";
import type {
  CompiledTension,
  CompiledTheme,
  EvidenceNode,
} from "./types";

/**
 * Theme compiler (spec §13.7) and contradiction preservation (§13.5).
 * 2–4 theme candidates plus 0–2 explicit tensions. A dominant theme needs at
 * least two meaningful signals and preferably two independent root systems.
 */

const CONCEPT_THEME_LABELS: Record<string, { label: string; gloss: string }> = {
  "element:fire": { label: "The current of Fire", gloss: "drive, and the push to act" },
  "element:water": { label: "The current of Water", gloss: "feeling, closeness, and imagination" },
  "element:air": { label: "The current of Air", gloss: "thought, words, and judgment" },
  "element:earth": { label: "The current of Earth", gloss: "body, work, and money matters" },
  "planet:saturn": { label: "A Saturn tone", gloss: "structure, limits, and what choices cost" },
  "planet:jupiter": { label: "A Jupiter tone", gloss: "growth, confidence, and reach" },
  "planet:mars": { label: "A Mars tone", gloss: "drive, friction, and force" },
  "planet:venus": { label: "A Venus tone", gloss: "love, value, and attraction" },
  "planet:mercury": { label: "A Mercury tone", gloss: "talk, thought, and exchange" },
  "planet:moon": { label: "A lunar tone", gloss: "tides, moods, and inner weather" },
  "planet:sun": { label: "A solar tone", gloss: "identity, life force, and being seen" },
  "number:1": { label: "The pattern of One", gloss: "starts and single focus" },
  "number:2": { label: "The pattern of Two", gloss: "pairs, choices, and balance" },
  "number:3": { label: "The pattern of Three", gloss: "growth and first results" },
  "number:4": { label: "The pattern of Four", gloss: "stability and holding steady" },
  "number:5": { label: "The pattern of Five", gloss: "shake-ups and course corrections" },
  "number:6": { label: "The pattern of Six", gloss: "repair, giving, and harmony" },
  "number:7": { label: "The pattern of Seven", gloss: "weighing and searching" },
  "number:8": { label: "The pattern of Eight", gloss: "mastery and steady effort" },
  "number:9": { label: "The pattern of Nine", gloss: "fullness and near-completion" },
  "number:10": { label: "The pattern of Ten", gloss: "completion and turnover" },
};

function signThemeLabel(concept: string): { label: string; gloss: string } {
  const sign = concept.replace("sign:", "");
  const name = sign.charAt(0).toUpperCase() + sign.slice(1);
  return { label: `A repeated ${name} emphasis`, gloss: `the ${name} note sounding from more than one direction` };
}

function themeMeta(concept: string): { label: string; gloss: string } | null {
  if (CONCEPT_THEME_LABELS[concept]) return CONCEPT_THEME_LABELS[concept];
  if (concept.startsWith("sign:")) return signThemeLabel(concept);
  return null;
}

export function compileThemes(
  evidence: EvidenceNode[],
  selections: ReadingSelections,
): CompiledTheme[] {
  const byConcept = new Map<string, EvidenceNode[]>();
  for (const node of evidence) {
    for (const concept of node.conceptIds) {
      if (!themeMeta(concept)) continue;
      const list = byConcept.get(concept) ?? [];
      list.push(node);
      byConcept.set(concept, list);
    }
  }

  const candidates: CompiledTheme[] = [];
  for (const [concept, nodes] of byConcept) {
    const meaningful = nodes.filter((n) => n.adjustedScore >= 9);
    if (meaningful.length < 2) continue;
    const roots = new Set(nodes.flatMap((n) => n.rootSourceIds));
    const rootSystems = new Set(
      [...roots].map((r) => r.split(":")[0] ?? r),
    );
    const total = nodes.reduce((sum, n) => sum + n.adjustedScore, 0);
    const meta = themeMeta(concept)!;
    const significance: CompiledTheme["significance"] =
      meaningful.length >= 2 && roots.size >= 3 && rootSystems.size >= 2 && total >= 30
        ? "dominant"
        : total >= 20
          ? "strong"
          : "supporting";
    const domainRelevance = nodes.some((n) =>
      n.domainTags.includes(selections.domainId),
    );
    candidates.push({
      id: `theme_${concept.replace(":", "_")}`,
      label: meta.label,
      shortThesis: `${meta.label}: ${meta.gloss}. ${nodes.length} separate signals point the same way.`,
      significance,
      evidenceIds: nodes.map((n) => n.id),
      independentRootCount: roots.size,
      domainRelevance,
      cautions: [],
      contradictions: [],
    });
  }

  candidates.sort((a, b) => {
    const rank = { dominant: 2, strong: 1, supporting: 0 };
    if (rank[a.significance] !== rank[b.significance]) {
      return rank[b.significance] - rank[a.significance];
    }
    return b.independentRootCount - a.independentRootCount;
  });

  return candidates.slice(0, 4);
}

const TENSION_LABELS: Record<string, [string, string]> = {
  pat_tension_expansion_restriction: ["Expansion", "Restriction"],
  pat_tension_beginning_ending: ["Beginning", "Ending"],
  pat_tension_holding_on_letting_go: ["Holding on", "Letting go"],
  pat_tension_outward_inward: ["Outward movement", "Inward turning"],
};

export function compileTensions(
  patterns: TarotPattern[],
  evidence: EvidenceNode[],
  themes: CompiledTheme[],
): CompiledTension[] {
  const tensions: CompiledTension[] = [];
  const cardNodeByCardId = new Map<string, EvidenceNode>();
  for (const node of evidence) {
    if (node.category === "tarot_card" && node.cardIds.length === 1) {
      cardNodeByCardId.set(node.cardIds[0]!, node);
    }
  }

  for (const pattern of patterns) {
    if (pattern.kind !== "tension_pair") continue;
    const labels = TENSION_LABELS[pattern.id];
    if (!labels) continue;
    const [tagA, tagB] = pattern.conceptIds.map((c) => c.replace("tension:", ""));
    const sideA: string[] = [];
    const sideB: string[] = [];
    for (const cardId of pattern.cardIds) {
      const card = getCard(cardId);
      const node = cardNodeByCardId.get(cardId);
      if (!node) continue;
      if (card.tensionTags.includes(tagA as never)) sideA.push(node.id);
      if (card.tensionTags.includes(tagB as never)) sideB.push(node.id);
    }
    if (sideA.length === 0 || sideB.length === 0) continue;
    const strength = Math.min(
      10,
      sideA.length + sideB.length + (pattern.weight ?? 0) / 2,
    );
    tensions.push({
      id: `ten_${pattern.id}`,
      themeA: labels[0],
      evidenceAIds: sideA,
      themeB: labels[1],
      evidenceBIds: sideB,
      strength: Math.round(strength * 10) / 10,
      instruction: "Preserve both sides; do not collapse to yes/no.",
    });
  }

  tensions.sort((a, b) => b.strength - a.strength);
  const kept = tensions.slice(0, 2);

  // Annotate contradictions onto involved themes (spec §13.5).
  for (const tension of kept) {
    for (const theme of themes) {
      const overlapA = tension.evidenceAIds.some((id) => theme.evidenceIds.includes(id));
      const overlapB = tension.evidenceBIds.some((id) => theme.evidenceIds.includes(id));
      if (overlapA || overlapB) {
        theme.contradictions.push(tension.id);
      }
    }
  }
  return kept;
}
