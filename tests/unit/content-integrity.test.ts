import { describe, expect, it } from "vitest";
import { ALL_CARDS, ALL_CARD_IDS, getCard } from "@/data/tarot/cards";
import { CORRESPONDENCES } from "@/data/correspondences/graph";
import { SOURCES, SOURCE_IDS } from "@/data/sources/manifest";
import { SPREADS } from "@/data/spreads/spreads";
import {
  DOMAINS,
  INSIGHT_LENSES,
  TIME_PERSPECTIVES,
} from "@/data/intake/taxonomy";
import { SEED_PLACES } from "@/data/places/seed-places";

describe("deck completeness", () => {
  it("contains exactly 78 unique cards: 22 majors, 14 per suit", () => {
    expect(ALL_CARDS.length).toBe(78);
    expect(new Set(ALL_CARD_IDS).size).toBe(78);
    expect(ALL_CARDS.filter((c) => c.arcana === "major").length).toBe(22);
    for (const suit of ["wands", "cups", "swords", "pentacles"]) {
      expect(ALL_CARDS.filter((c) => c.suit === suit).length).toBe(14);
    }
  });

  it("majors are numbered 0–21 without gaps", () => {
    const numbers = ALL_CARDS.filter((c) => c.arcana === "major")
      .map((c) => c.number)
      .sort((a, b) => a - b);
    expect(numbers).toEqual([...Array(22).keys()]);
  });

  it("every card has meanings, keywords, and valid source refs", () => {
    for (const card of ALL_CARDS) {
      expect(card.uprightMeaning.length).toBeGreaterThan(40);
      expect(card.reversedMeaning.length).toBeGreaterThan(40);
      expect(card.coreKeywords.length).toBeGreaterThanOrEqual(3);
      expect(card.sourceRefs.length).toBeGreaterThan(0);
      for (const ref of card.sourceRefs) {
        expect(SOURCE_IDS.has(ref), `${card.id} → ${ref}`).toBe(true);
      }
    }
  });
});

describe("correspondence graph integrity", () => {
  it("has unique record ids and valid source references", () => {
    const ids = CORRESPONDENCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const record of CORRESPONDENCES) {
      expect(record.sourceRefs.length).toBeGreaterThan(0);
      for (const ref of record.sourceRefs) {
        expect(SOURCE_IDS.has(ref), `${record.id} → ${ref}`).toBe(true);
      }
      expect(record.baseWeight).toBeGreaterThan(0);
    }
  });

  it("every card concept in the graph resolves to a real card", () => {
    for (const record of CORRESPONDENCES) {
      for (const concept of [record.sourceConceptId, record.targetConceptId]) {
        if (concept.startsWith("card:")) {
          expect(() => getCard(concept.slice(5))).not.toThrow();
        }
      }
    }
  });

  it("all 36 pip decan attributions exist, each decan with sign and ruler", () => {
    const decanOf = CORRESPONDENCES.filter((r) => r.relationshipType === "decan_of");
    expect(decanOf.length).toBe(36);
    const decans = new Set(decanOf.map((r) => r.targetConceptId));
    expect(decans.size).toBe(36);
    for (const decan of decans) {
      const signRecs = CORRESPONDENCES.filter(
        (r) => r.sourceConceptId === decan && r.relationshipType === "decan_sign",
      );
      const rulerRecs = CORRESPONDENCES.filter(
        (r) => r.sourceConceptId === decan && r.relationshipType === "decan_ruler",
      );
      expect(signRecs.length, decan).toBe(1);
      expect(rulerRecs.length, decan).toBe(1);
    }
  });

  it("all 22 majors carry attribution, hebrew letter, and tree path", () => {
    for (const card of ALL_CARDS.filter((c) => c.arcana === "major")) {
      const recs = CORRESPONDENCES.filter(
        (r) => r.sourceConceptId === `card:${card.id}` && r.active,
      );
      expect(recs.some((r) => r.relationshipType === "attributed_to"), card.id).toBe(true);
      expect(recs.some((r) => r.relationshipType === "hebrew_letter"), card.id).toBe(true);
      expect(recs.some((r) => r.relationshipType === "tree_path"), card.id).toBe(true);
    }
  });

  it("class X records preserve conflict lineage", () => {
    const xRecords = CORRESPONDENCES.filter((r) => r.acceptanceClass === "X");
    expect(xRecords.length).toBeGreaterThan(0);
    for (const record of xRecords) {
      expect(record.conflictsWith?.length ?? 0).toBeGreaterThan(0);
      for (const conflictId of record.conflictsWith ?? []) {
        expect(
          CORRESPONDENCES.some((r) => r.id === conflictId),
          `${record.id} conflictsWith ${conflictId}`,
        ).toBe(true);
      }
    }
  });

  it("zodiac structure is complete", () => {
    const elements = CORRESPONDENCES.filter((r) => r.relationshipType === "sign_element");
    const modalities = CORRESPONDENCES.filter((r) => r.relationshipType === "sign_modality");
    const rulers = CORRESPONDENCES.filter((r) => r.relationshipType === "sign_ruler");
    expect(elements.length).toBe(12);
    expect(modalities.length).toBe(12);
    expect(rulers.length).toBe(12);
    const byModality = new Map<string, number>();
    for (const m of modalities) {
      byModality.set(m.targetConceptId, (byModality.get(m.targetConceptId) ?? 0) + 1);
    }
    expect(byModality.get("modality:cardinal")).toBe(4);
    expect(byModality.get("modality:fixed")).toBe(4);
    expect(byModality.get("modality:mutable")).toBe(4);
  });
});

describe("spreads and intake", () => {
  it("spread positions are contiguous and unique per spread", () => {
    for (const spread of SPREADS) {
      expect(spread.positions.length).toBe(spread.cardCount);
      expect(spread.positions.map((p) => p.index)).toEqual([
        ...Array(spread.cardCount).keys(),
      ]);
      expect(new Set(spread.positions.map((p) => p.id)).size).toBe(spread.cardCount);
    }
  });

  it("insight affinities reference real lens ids", () => {
    const lensIds = new Set(INSIGHT_LENSES.map((l) => l.id));
    for (const spread of SPREADS) {
      for (const position of spread.positions) {
        for (const lens of position.insightAffinity) {
          expect(lensIds.has(lens), `${spread.id}/${position.id} → ${lens}`).toBe(true);
        }
      }
    }
  });

  it("taxonomy matches the specification counts", () => {
    expect(DOMAINS.length).toBe(12);
    expect(INSIGHT_LENSES.length).toBe(10);
    expect(TIME_PERSPECTIVES.length).toBe(5);
    for (const domain of DOMAINS) {
      expect(domain.focuses.length).toBeGreaterThanOrEqual(5);
      // Focus ids unique within a domain.
      expect(new Set(domain.focuses.map((f) => f.id)).size).toBe(domain.focuses.length);
    }
  });
});

describe("seed gazetteer", () => {
  it("has unique ids and plausible coordinates/timezones", () => {
    expect(new Set(SEED_PLACES.map((p) => p.id)).size).toBe(SEED_PLACES.length);
    for (const place of SEED_PLACES) {
      expect(Math.abs(place.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(place.lon)).toBeLessThanOrEqual(180);
      // Every timezone must resolve in the runtime's IANA database.
      expect(
        () => new Intl.DateTimeFormat("en-US", { timeZone: place.timezone }),
        `${place.id}: ${place.timezone}`,
      ).not.toThrow();
    }
  });
});

describe("source manifest", () => {
  it("every source has license status and verification date", () => {
    for (const source of SOURCES) {
      expect(source.copyrightOrLicenseStatus.length).toBeGreaterThan(0);
      expect(source.verificationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
