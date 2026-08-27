import { describe, expect, it } from "vitest";
import {
  isValidTimeZone,
  localDayUtcRange,
  resolveLocalTime,
  tzOffsetMinutes,
} from "@/domain/astrology/timezone";

describe("tzOffsetMinutes", () => {
  it("resolves historical standard/daylight offsets", () => {
    expect(tzOffsetMinutes("America/New_York", new Date("2021-01-15T12:00:00Z"))).toBe(-300);
    expect(tzOffsetMinutes("America/New_York", new Date("2021-07-15T12:00:00Z"))).toBe(-240);
    expect(tzOffsetMinutes("Asia/Kathmandu", new Date("2021-07-15T12:00:00Z"))).toBe(345);
    expect(tzOffsetMinutes("Europe/Paris", new Date("1992-05-17T12:00:00Z"))).toBe(120);
  });
});

describe("resolveLocalTime — DST edge handling (§10.4)", () => {
  it("returns unique instants for normal local times", () => {
    const result = resolveLocalTime(2021, 6, 15, 12, 0, "America/New_York");
    expect(result.kind).toBe("unique");
    if (result.kind === "unique") {
      expect(result.utc.toISOString()).toBe("2021-06-15T16:00:00.000Z");
    }
  });

  it("classifies spring-forward gaps as nonexistent", () => {
    // 2021-03-14 02:30 never occurred in New York.
    expect(resolveLocalTime(2021, 3, 14, 2, 30, "America/New_York").kind).toBe("gap");
  });

  it("classifies fall-back repeats as ambiguous, ordered first/second", () => {
    // 2021-11-07 01:30 occurred twice: 05:30Z (EDT) then 06:30Z (EST).
    const result = resolveLocalTime(2021, 11, 7, 1, 30, "America/New_York");
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.first.toISOString()).toBe("2021-11-07T05:30:00.000Z");
      expect(result.second.toISOString()).toBe("2021-11-07T06:30:00.000Z");
    }
  });

  it("handles 45-minute offset zones", () => {
    const result = resolveLocalTime(2000, 1, 1, 0, 0, "Asia/Kathmandu");
    expect(result.kind).toBe("unique");
    if (result.kind === "unique") {
      expect(result.utc.toISOString()).toBe("1999-12-31T18:15:00.000Z");
    }
  });

  it("handles southern-hemisphere DST", () => {
    // Sydney DST (AEDT, +11) in January.
    const result = resolveLocalTime(2022, 1, 10, 9, 0, "Australia/Sydney");
    expect(result.kind).toBe("unique");
    if (result.kind === "unique") {
      expect(result.utc.toISOString()).toBe("2022-01-09T22:00:00.000Z");
    }
  });
});

describe("localDayUtcRange", () => {
  it("covers a normal 24h local day", () => {
    const { start, end } = localDayUtcRange(1992, 5, 17, "Europe/Paris");
    expect(start.toISOString()).toBe("1992-05-16T22:00:00.000Z");
    expect(end.toISOString()).toBe("1992-05-17T22:00:00.000Z");
  });

  it("produces a 23h day across spring-forward", () => {
    const { start, end } = localDayUtcRange(2021, 3, 14, "America/New_York");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it("produces a 25h day across fall-back", () => {
    const { start, end } = localDayUtcRange(2021, 11, 7, "America/New_York");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA ids and rejects junk", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
