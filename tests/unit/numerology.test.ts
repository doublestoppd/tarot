import { describe, expect, it } from "vitest";
import {
  assertValidBirthDate,
  attitudeNumber,
  birthCardTrumpNumber,
  birthCardTrumps,
  birthdayNumber,
  challenges,
  digitSum,
  lifePath,
  numerologyProfile,
  personalDay,
  personalMonth,
  personalYear,
  pinnacles,
  reduceFull,
  reduceKeepMasters,
} from "@/domain/numerology/engine";

describe("reduction helpers", () => {
  it("sums digits and reduces with master preservation", () => {
    expect(digitSum(1992)).toBe(21);
    expect(reduceKeepMasters(1992)).toBe(3);
    expect(reduceKeepMasters(2009)).toBe(11); // 2+0+0+9 = 11, master
    expect(reduceKeepMasters(1975)).toBe(22); // 1+9+7+5 = 22, master
    expect(reduceKeepMasters(33)).toBe(33);
    expect(reduceFull(1975)).toBe(4);
    expect(reduceFull(11)).toBe(2);
  });
});

describe("core numbers (fixture: 17 May 1992)", () => {
  const d = { year: 1992, month: 5, day: 17 };
  it("life path preserves masters at component and final stage", () => {
    // month 5, day 17→8, year 1992→21→3; 5+8+3 = 16 → 7
    expect(lifePath(d)).toBe(7);
  });
  it("birthday and attitude", () => {
    expect(birthdayNumber(d)).toBe(8);
    expect(attitudeNumber(d)).toBe(22); // 5+17 = 22, master preserved
  });
  it("pinnacles and challenges", () => {
    const p = pinnacles(d);
    expect(p.values).toEqual([4, 11, 6, 8]); // P2 = 8+3 = 11 master
    expect(p.firstPinnacleEndAge).toBe(29); // 36 − 7
    expect(challenges(d)).toEqual([3, 5, 2, 2]);
  });
  it("personal cycles for a reading in August 2026", () => {
    const py = personalYear(d, 2026); // 5 + 8 + reduce(2026)=1 → 14 → 5
    expect(py).toBe(5);
    const pm = personalMonth(py, 8); // 13 → 4
    expect(pm).toBe(4);
    expect(personalDay(pm, 27)).toBe(4); // 31 → 4
  });
  it("birth cards: 5+17+19+92 = 133 → 7 (single card)", () => {
    expect(birthCardTrumps(d)).toEqual([7]);
  });
});

describe("master-number and boundary fixtures", () => {
  it("11/11 births keep masters through life path", () => {
    // 11 + 11 + (1988→26→8) = 30 → 3
    expect(lifePath({ year: 1988, month: 11, day: 11 })).toBe(3);
    expect(birthdayNumber({ year: 1988, month: 11, day: 11 })).toBe(11);
  });
  it("29th birthday reduces to master 11", () => {
    expect(birthdayNumber({ year: 1975, month: 12, day: 29 })).toBe(11);
  });
  it("master year component: 12/29/1975 → 3 + 11 + 22 = 36 → 9", () => {
    expect(lifePath({ year: 1975, month: 12, day: 29 })).toBe(9);
  });
  it("leap dates validate correctly", () => {
    expect(() => assertValidBirthDate({ year: 2000, month: 2, day: 29 })).not.toThrow();
    expect(() => assertValidBirthDate({ year: 1900, month: 2, day: 29 })).toThrow();
    expect(() => assertValidBirthDate({ year: 1992, month: 13, day: 1 })).toThrow();
    expect(() => assertValidBirthDate({ year: 1992, month: 4, day: 31 })).toThrow();
  });
  it("birth cards: 22 maps to the Fool with Emperor companion", () => {
    // 1 + 1 + 20 + 0 = 22 → chain [22, 4] → trumps 0 and 4
    const chain = birthCardTrumps({ year: 2000, month: 1, day: 1 });
    expect(chain).toEqual([22, 4]);
    expect(chain.map(birthCardTrumpNumber)).toEqual([0, 4]);
  });
  it("birth cards: multi-step chains resolve fully", () => {
    // 5+5+19+80 = 109 → 10 → chain [10, 1]
    expect(birthCardTrumps({ year: 1980, month: 5, day: 5 })).toEqual([10, 1]);
    // 12+9+19+79 = 119 → 11 → chain [11, 2]
    expect(birthCardTrumps({ year: 1979, month: 12, day: 9 })).toEqual([11, 2]);
    // 1+1+17+0 = 19 → chain [19, 10, 1] — the Sun/Wheel/Magician triple
    expect(birthCardTrumps({ year: 1700, month: 1, day: 1 })).toEqual([19, 10, 1]);
  });

  it("personal year rolls at the calendar year boundary", () => {
    const d = { year: 1992, month: 5, day: 17 };
    expect(personalYear(d, 2025)).not.toBe(personalYear(d, 2026));
  });
});

describe("numerologyProfile", () => {
  it("assembles a full profile for a reading moment", () => {
    const profile = numerologyProfile(
      { year: 1992, month: 5, day: 17 },
      new Date(Date.UTC(2026, 7, 27, 12, 0, 0)),
    );
    expect(profile.version).toBe("pythagorean-1.0");
    expect(profile.lifePath).toBe(7);
    expect(profile.personalYear).toBe(5);
    expect(profile.personalMonth).toBe(4);
    expect(profile.personalDay).toBe(4);
    expect(profile.birthCards.trumps).toEqual([7]);
  });
});
