import type { Depth } from "@/domain/intake/types";
import type { Orientation } from "@/domain/tarot/types";
import type {
  CompiledTension,
  CompiledTheme,
  EvidenceNode,
} from "@/domain/resonance/types";

/**
 * ReadingContext (spec Appendix A) — the single deterministic artifact handed
 * to the synthesis layer, and ReadingSynthesis (spec §15.1) — the structured
 * output contract every provider must satisfy.
 */

export interface ReadingContextCard {
  evidenceId: string;
  cardId: string;
  name: string;
  orientation: Orientation;
  positionId: string;
  positionLabel: string;
  positionPurpose: string;
  canonicalMeaningSummary: string;
  activeCorrespondenceIds: string[];
}

export interface CapabilityFlags {
  tarot: true;
  currentAstrology: true;
  birthDateProvided: boolean;
  birthTimeProvided: boolean;
  birthplaceProvided: boolean;
  stableDateAstrology: boolean;
  fullNatalChart: boolean;
  natalHouses: boolean;
  natalAngles: boolean;
  numerology: boolean;
}

export interface PersonalFactor {
  evidenceId: string;
  type: string;
  displayFact: string;
  precision: "exact" | "stable-sign" | "derived-date";
  provenanceIds: string[];
}

export interface CurrentSkyFactor {
  evidenceId: string;
  type: string;
  displayFact: string;
  relevance: number;
  provenanceIds: string[];
}

export interface UnavailableFactor {
  factor: string;
  reasonCode: string;
  userFacingExplanation: string;
}

export interface ProviderEvidenceItem {
  id: string;
  statement: string;
  category: string;
  significance: "supporting" | "strong" | "dominant";
  provenanceLabel?: string;
  rootIds: string[];
}

export interface ReadingContext {
  schemaVersion: "1.0";
  reading: {
    momentUtc: string;
    domain: { id: string; label: string };
    focus: { id: string; label: string };
    insight: { id: string; label: string };
    timePerspective: { id: string; label: string };
    /**
     * Optional note in the asker's own words (ADR 0011). Lives only inside
     * the encrypted ticket and the one provider call; never stored, never
     * part of share artifacts.
     */
    situation?: string;
    depth: Depth;
    spread: {
      id: string;
      name: string;
      positions: Array<{
        index: number;
        id: string;
        label: string;
        purpose: string;
      }>;
    };
    cards: ReadingContextCard[];
  };
  capability: CapabilityFlags;
  personalFactors: PersonalFactor[];
  currentSky: CurrentSkyFactor[];
  tarotPatterns: EvidenceNode[];
  resonances: EvidenceNode[];
  themes: CompiledTheme[];
  tensions: CompiledTension[];
  unavailable: UnavailableFactor[];
  providerEvidence: ProviderEvidenceItem[];
}

/** Structured synthesis output (spec §15.1). */
export interface ReadingSynthesis {
  title: string;
  paragraphs: Array<{
    text: string;
    evidenceIds: string[];
  }>;
  usedEvidenceIds: string[];
  qualityFlags: {
    containsDirectPrediction: boolean;
    containsUnsupportedBiography: boolean;
    containsUnsupportedCorrespondence?: boolean;
  };
}

/** Word/paragraph targets by depth (spec §14.5). */
export const DEPTH_TARGETS: Record<
  Depth,
  { minWords: number; maxWords: number; minParagraphs: number; maxParagraphs: number }
> = {
  focused: { minWords: 300, maxWords: 750, minParagraphs: 3, maxParagraphs: 7 },
  deep: { minWords: 550, maxWords: 1150, minParagraphs: 5, maxParagraphs: 9 },
  comprehensive: { minWords: 800, maxWords: 1600, minParagraphs: 7, maxParagraphs: 11 },
};
