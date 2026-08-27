import { describe, expect, it } from "vitest";
import { extractPatterns, resolveCardConcepts } from "@/domain/tarot/patterns";
import { selectSpread, compatibleSpreads, isSpreadAllowed } from "@/domain/tarot/spread-selection";
import { getSpread } from "@/data/spreads/spreads";
import type { DrawnCard } from "@/domain/tarot/types";
import type { ReadingSelections } from "@/domain/intake/types";

const drawn = (ids: string[], reversedIdx: number[] = []): DrawnCard[] =>
  ids.map((cardId, drawIndex) => ({
    cardId,
    drawIndex,
    orientation: reversedIdx.includes(drawIndex) ? "reversed" : "upright",
  }));

describe("resolveCardConcepts", () => {
  it("resolves the Hermit to Virgo (and Virgo to earth)", () => {
    const c = resolveCardConcepts({ cardId: "major_09_hermit", orientation: "upright", drawIndex: 0 });
    expect(c.signs).toContain("sign:virgo");
    expect(c.elements).toContain("element:earth");
  });

  it("resolves a pip through its decan to sign and ruler", () => {
    const c = resolveCardConcepts({ cardId: "wands_03", orientation: "upright", drawIndex: 0 });
    expect(c.signs).toContain("sign:aries");
    expect(c.planets).toContain("planet:sun");
    expect(c.decans).toContain("decan:aries_2");
    expect(c.elements).toContain("element:fire");
  });

  it("resolves court sign attributions", () => {
    const c = resolveCardConcepts({ cardId: "pentacles_queen", orientation: "upright", drawIndex: 0 });
    expect(c.signs).toContain("sign:capricorn");
  });
});

describe("extractPatterns", () => {
  const spread5 = getSpread("fivefold_insight");

  it("finds repeated sign attributions with independent card roots", () => {
    // Hermit (Virgo) + 8 of Pentacles (Sun in Virgo decan) + 9 of Pentacles (Venus in Virgo).
    const { patterns } = extractPatterns(
      drawn(["major_09_hermit", "pentacles_08", "pentacles_09", "cups_02", "wands_05"]),
      spread5,
    );
    const virgo = patterns.find((p) => p.id === "pat_attr_sign_virgo");
    expect(virgo).toBeDefined();
    expect(virgo!.cardIds.length).toBe(3);
  });

  it("finds suit emphasis and element emphasis", () => {
    const { patterns } = extractPatterns(
      drawn(["wands_02", "wands_05", "wands_09", "cups_03", "major_02_high_priestess"]),
      spread5,
    );
    expect(patterns.some((p) => p.id === "pat_suit_wands")).toBe(true);
    expect(patterns.some((p) => p.id === "pat_element_fire")).toBe(true);
  });

  it("reports absent elements in larger spreads", () => {
    const { patterns } = extractPatterns(
      drawn(["wands_02", "wands_05", "cups_03", "cups_06", "swords_04"]),
      spread5,
    );
    expect(patterns.some((p) => p.id === "pat_element_absent_earth")).toBe(true);
  });

  it("detects number repetition and sequences", () => {
    const { patterns } = extractPatterns(
      drawn(["wands_05", "cups_05", "swords_03", "pentacles_04", "major_00_fool"]),
      spread5,
    );
    expect(patterns.some((p) => p.id === "pat_number_5")).toBe(true);
    expect(patterns.some((p) => p.id === "pat_sequence_3_5")).toBe(true);
  });

  it("detects reversal-heavy spreads", () => {
    const { patterns } = extractPatterns(
      drawn(
        ["wands_02", "cups_03", "swords_04", "pentacles_06", "major_19_sun"],
        [0, 1, 2],
      ),
      spread5,
    );
    expect(patterns.some((p) => p.id === "pat_reversal_majority")).toBe(true);
  });

  it("detects opposing tension pairs (expansion vs restriction)", () => {
    const { patterns } = extractPatterns(
      drawn(["major_10_wheel", "pentacles_04", "cups_03", "swords_04", "major_02_high_priestess"]),
      spread5,
    );
    const tension = patterns.find((p) => p.id === "pat_tension_expansion_restriction");
    expect(tension).toBeDefined();
    expect(tension!.cardIds).toContain("major_10_wheel");
    expect(tension!.cardIds).toContain("pentacles_04");
  });

  it("detects major emphasis", () => {
    const { patterns } = extractPatterns(
      drawn(["major_00_fool", "major_13_death", "major_19_sun", "cups_02", "wands_02"]),
      spread5,
    );
    expect(patterns.some((p) => p.kind === "major_emphasis")).toBe(true);
  });
});

describe("selectSpread", () => {
  const base: ReadingSelections = {
    domainId: "general",
    focusId: "general_overview",
    insightId: "broader_picture",
    timePerspectiveId: "present_developing",
    depth: "deep",
    reversalsEnabled: true,
  };

  it("follows the specification's selection rules", () => {
    expect(selectSpread({ ...base, depth: "focused" }).id).toBe("threefold_clarity");
    expect(selectSpread({ ...base, depth: "comprehensive" }).id).toBe("celtic_cross");
    expect(selectSpread({ ...base, domainId: "decision", focusId: "crossroads" }).id).toBe("crossroads");
    expect(selectSpread({ ...base, domainId: "career", focusId: "new_direction" }).id).toBe("career_path");
    expect(selectSpread({ ...base, domainId: "career", focusId: "conflict_obstacles" }).id).toBe("fivefold_insight");
    expect(selectSpread({ ...base, domainId: "career", focusId: "work_life_balance" }).id).toBe("elemental_balance");
    expect(selectSpread({ ...base, domainId: "love", focusId: "communication" }).id).toBe("connection_dynamics");
    expect(selectSpread({ ...base, domainId: "change", focusId: "beginning" }).id).toBe("threshold");
    expect(selectSpread({ ...base, domainId: "growth", focusId: "shadow_work" }).id).toBe("deep_pattern");
    expect(selectSpread({ ...base, domainId: "timing", focusId: "current_cycle" }).id).toBe("cycle_lens");
    expect(selectSpread({ ...base, domainId: "general", focusId: "balance_integration" }).id).toBe("elemental_balance");
    expect(selectSpread(base).id).toBe("fivefold_insight");
  });

  it("offers only same-depth spreads as overrides", () => {
    const options = compatibleSpreads(base);
    expect(options.every((s) => s.depth === "deep")).toBe(true);
    expect(isSpreadAllowed("crossroads", base)).toBe(true);
    expect(isSpreadAllowed("celtic_cross", base)).toBe(false);
  });
});
