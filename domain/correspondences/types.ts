/**
 * Versioned esoteric knowledge base with provenance (spec §12).
 *
 * Every correspondence is a record with a named tradition, an acceptance
 * class, and source references. "Commonly accepted" always means accepted
 * within the named tradition — the application never implies that all
 * traditions agree (class X preserves documented disagreement).
 */

export type AcceptanceClass = "A" | "B" | "C" | "D" | "X";

export type TraditionId =
  | "rws"
  | "golden_dawn"
  | "hermetic_qabalah"
  | "western_astrology"
  | "pythagorean_numerology"
  | "classical_elements"
  | "planetary_symbolism"
  | "modern_eclectic";

/**
 * Concept ids are namespaced strings:
 *   card:wands_05     planet:mars      sign:aries      element:fire
 *   decan:aries_2     number:5         hebrew:teth     path:19
 *   sephira:5         phase:full_moon
 */
export type ConceptId = string;

export type RelationshipType =
  | "attributed_to" // card -> planet | sign | element (Golden Dawn trump/ace attributions)
  | "decan_of" // card -> decan (minor 2..10)
  | "decan_ruler" // decan -> planet
  | "decan_sign" // decan -> sign
  | "hebrew_letter" // card -> hebrew letter (majors)
  | "tree_path" // card -> Tree of Life path number (majors)
  | "sephira" // pip rank -> sephira number
  | "court_element" // court card -> sub-element pairing
  | "court_sign" // court card -> primary zodiacal span (school-specific)
  | "suit_element" // suit -> element
  | "number_affinity" // card -> number
  | "sign_ruler" // sign -> ruling planet (traditional)
  | "sign_element" // sign -> element
  | "sign_modality"; // sign -> modality

export interface CorrespondenceRecord {
  id: string;
  sourceConceptId: ConceptId;
  targetConceptId: ConceptId;
  relationshipType: RelationshipType;
  traditionId: TraditionId;
  acceptanceClass: AcceptanceClass;
  sourceRefs: string[];
  historicalPeriod?: string;
  notes?: string;
  /** Ids of records this one disagrees with (class X preservation). */
  conflictsWith?: string[];
  /** Default interpretive weight before resonance adjustment. */
  baseWeight: number;
  version: string;
  active: boolean;
}

export interface SourceReference {
  id: string;
  title: string;
  authorOrEditor: string;
  year: string;
  edition?: string;
  sectionOrPage?: string;
  sourceType: "primary" | "secondary" | "reference";
  tradition: TraditionId | "general";
  copyrightOrLicenseStatus: string;
  jurisdictionNotes?: string;
  url?: string;
  verificationDate: string;
  reviewerNotes?: string;
}
