import { describe, expect, it } from "vitest";
import { drawCards } from "@/domain/tarot/draw";
import { uniformInt, type RandomSource } from "@/domain/tarot/random";
import { ALL_CARD_IDS } from "@/data/tarot/cards";

function fakeSource(byteGroups: number[][]): RandomSource {
  let i = 0;
  return {
    bytes(n: number): Uint8Array {
      const group = byteGroups[i++];
      if (!group || group.length !== n) {
        throw new Error(`fakeSource exhausted or wrong size at call ${i}`);
      }
      return Uint8Array.from(group);
    },
  };
}

describe("uniformInt rejection sampling", () => {
  // 2^32 % 78 = 22, so limit = 4294967274 (0xFFFFFFEA); values at or above
  // the limit must be rejected rather than folded into the low residues.
  it("rejects values at the biased tail and resamples", () => {
    const src = fakeSource([
      [0xff, 0xff, 0xff, 0xea], // 4294967274 — rejected
      [0x00, 0x00, 0x00, 0x05],
    ]);
    expect(uniformInt(78, src)).toBe(5);
  });

  it("accepts the last unbiased value", () => {
    const src = fakeSource([[0xff, 0xff, 0xff, 0xe9]]); // 4294967273 → mod 78 = 77
    expect(uniformInt(78, src)).toBe(77);
  });

  it("validates bounds", () => {
    const src = fakeSource([]);
    expect(() => uniformInt(0, src)).toThrow();
    expect(() => uniformInt(1.5, src)).toThrow();
    expect(uniformInt(1, src)).toBe(0);
  });
});

describe("drawCards", () => {
  it("draws unique cards bound to ordered positions", () => {
    for (let trial = 0; trial < 200; trial++) {
      const draw = drawCards(10, true);
      const ids = draw.cards.map((c) => c.cardId);
      expect(new Set(ids).size).toBe(10);
      expect(draw.cards.map((c) => c.drawIndex)).toEqual([...Array(10).keys()]);
      for (const id of ids) expect(ALL_CARD_IDS).toContain(id);
    }
  });

  it("never reverses cards when reversals are disabled", () => {
    for (let trial = 0; trial < 100; trial++) {
      const draw = drawCards(5, false);
      expect(draw.cards.every((c) => c.orientation === "upright")).toBe(true);
    }
  });

  it("rejects invalid card counts", () => {
    expect(() => drawCards(0, true)).toThrow();
    expect(() => drawCards(79, true)).toThrow();
    expect(() => drawCards(2.5, true)).toThrow();
  });

  it("produces approximately uniform card frequencies", () => {
    const counts = new Map<string, number>();
    const trials = 20000;
    for (let t = 0; t < trials; t++) {
      for (const card of drawCards(5, false).cards) {
        counts.set(card.cardId, (counts.get(card.cardId) ?? 0) + 1);
      }
    }
    const expected = (trials * 5) / 78; // ≈ 1282
    for (const id of ALL_CARD_IDS) {
      const c = counts.get(id) ?? 0;
      // ±15% ≈ 5.5σ — effectively cannot flake while catching real bias.
      expect(c).toBeGreaterThan(expected * 0.85);
      expect(c).toBeLessThan(expected * 1.15);
    }
  });

  it("produces approximately 50/50 orientations with reversals enabled", () => {
    let reversed = 0;
    const trials = 20000;
    for (let t = 0; t < trials; t++) {
      if (drawCards(1, true).cards[0]!.orientation === "reversed") reversed++;
    }
    expect(reversed).toBeGreaterThan(trials * 0.475); // ±2.5pp ≈ 7σ
    expect(reversed).toBeLessThan(trials * 0.525);
  });
});
