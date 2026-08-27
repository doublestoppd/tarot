import { describe, expect, it } from "vitest";
import {
  allowedOrb,
  aspectBetween,
  findAspects,
  type AspectParticipant,
} from "@/domain/astrology/aspects";

const p = (
  id: AspectParticipant["id"],
  longitude: number,
  speed?: number,
): AspectParticipant => (speed === undefined ? { id, longitude } : { id, longitude, speed });

describe("orb tables (§10.3)", () => {
  it("uses base orbs per context", () => {
    expect(allowedOrb("natal", "trine", p("mars", 0), p("venus", 0))).toBe(6);
    expect(allowedOrb("current", "trine", p("mars", 0), p("venus", 0))).toBe(4);
    expect(allowedOrb("transit", "trine", p("mars", 0), p("venus", 0))).toBe(3);
  });

  it("widens natal orbs for luminaries and angles", () => {
    expect(allowedOrb("natal", "conjunction", p("sun", 0), p("venus", 0))).toBe(9.5);
    expect(allowedOrb("natal", "conjunction", p("mars", 0), p("asc", 0))).toBe(9);
    // Modifiers do not apply outside natal context.
    expect(allowedOrb("current", "conjunction", p("sun", 0), p("venus", 0))).toBe(4);
  });

  it("caps fast Moon transits at 1.5°", () => {
    expect(
      allowedOrb("transit", "conjunction", p("moon", 0), p("sun", 0), {
        transitingIsMoon: true,
      }),
    ).toBe(1.5);
  });
});

describe("aspectBetween", () => {
  it("detects aspects inside orb and rejects outside", () => {
    expect(aspectBetween(p("mars", 10), p("venus", 128), "natal")?.type).toBe("trine"); // 118° vs 120, orb 2
    expect(aspectBetween(p("mars", 10), p("venus", 137), "natal")).toBeNull(); // 127°, 7 > 6
    expect(aspectBetween(p("sun", 0), p("moon", 189), "natal")?.type).toBe("opposition"); // 9 ≤ 9.5
  });

  it("blocks a 2° moon transit but accepts 1.2°", () => {
    expect(
      aspectBetween(p("moon", 0, 13), p("sun", 2), "transit", { transitingIsMoon: true }),
    ).toBeNull();
    const hit = aspectBetween(p("moon", 0, 13), p("sun", 1.2), "transit", {
      transitingIsMoon: true,
    });
    expect(hit?.type).toBe("conjunction");
  });

  it("classifies applying vs separating from speeds", () => {
    // Mars at 100 moving +0.5/day toward Venus at 104 moving +0.1/day: gap closes.
    const applying = aspectBetween(p("mars", 100, 0.5), p("venus", 104, 0.1), "natal");
    expect(applying?.type).toBe("conjunction");
    expect(applying?.applying).toBe(true);
    // Mars past Venus and pulling away.
    const separating = aspectBetween(p("mars", 104, 0.5), p("venus", 100, 0.1), "natal");
    expect(separating?.applying).toBe(false);
    // Angles have no speed → null.
    const noSpeed = aspectBetween(p("mars", 100, 0.5), p("asc", 104), "natal");
    expect(noSpeed?.applying).toBeNull();
  });

  it("picks the closest aspect when two are theoretically in range", () => {
    // 176° separation: opposition (orb 4) wins over quincunx (orb 26, out of range anyway).
    const hit = aspectBetween(p("sun", 0), p("moon", 176), "natal");
    expect(hit?.type).toBe("opposition");
  });
});

describe("findAspects", () => {
  it("returns pairwise hits sorted by orb", () => {
    const hits = findAspects(
      [p("sun", 0, 1), p("moon", 90.2, 13), p("mars", 180.5, 0.5)],
      "current",
    );
    expect(hits.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i]!.orb).toBeGreaterThanOrEqual(hits[i - 1]!.orb);
    }
  });
});
