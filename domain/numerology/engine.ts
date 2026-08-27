/**
 * Western/Pythagorean numerology — version pythagorean-1.0.
 *
 * The exact rules are documented in docs/numerology-v1.md (source
 * src_pythagorean_numerology_v1). Deterministic only; never delegated to the
 * language model (spec §11.1).
 */

export const NUMEROLOGY_VERSION = "pythagorean-1.0";
export const BIRTH_CARDS_METHOD = "birth-cards-1.0";

export interface BirthDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface NumerologyProfile {
  version: typeof NUMEROLOGY_VERSION;
  lifePath: number;
  birthday: number;
  attitude: number;
  personalYear: number;
  personalMonth: number;
  personalDay: number;
  pinnacles: {
    values: [number, number, number, number];
    firstPinnacleEndAge: number;
  };
  challenges: [number, number, number, number];
  birthCards: {
    method: typeof BIRTH_CARDS_METHOD;
    /** Chain of trump numbers, e.g. [16, 7] or [19, 10, 1]; 22 → 0 (Fool). */
    trumps: number[];
  };
}

const MASTERS = new Set([11, 22, 33]);

export function digitSum(n: number): number {
  let sum = 0;
  let v = Math.abs(n);
  while (v > 0) {
    sum += v % 10;
    v = Math.floor(v / 10);
  }
  return sum;
}

/** Reduce to a single digit, stopping at master numbers 11/22/33. */
export function reduceKeepMasters(n: number, masters: ReadonlySet<number> = MASTERS): number {
  let v = Math.abs(n);
  while (v > 9 && !masters.has(v)) {
    v = digitSum(v);
  }
  return v;
}

/** Reduce fully to a single digit (no masters). */
export function reduceFull(n: number): number {
  let v = Math.abs(n);
  while (v > 9) v = digitSum(v);
  return v;
}

export function assertValidBirthDate(date: BirthDate): void {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new Error(`Invalid birth year: ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid birth month: ${month}`);
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth) {
    throw new Error(`Invalid birth day: ${year}-${month}-${day}`);
  }
}

export function lifePath(date: BirthDate): number {
  const rm = reduceKeepMasters(date.month);
  const rd = reduceKeepMasters(date.day);
  const ry = reduceKeepMasters(date.year);
  return reduceKeepMasters(rm + rd + ry);
}

const BIRTHDAY_MASTERS = new Set([11, 22]);

export function birthdayNumber(date: BirthDate): number {
  return reduceKeepMasters(date.day, BIRTHDAY_MASTERS);
}

export function attitudeNumber(date: BirthDate): number {
  return reduceKeepMasters(date.month + date.day);
}

export function personalYear(date: BirthDate, calendarYear: number): number {
  const universal = reduceKeepMasters(calendarYear);
  return reduceKeepMasters(
    reduceKeepMasters(date.month) + reduceKeepMasters(date.day) + universal,
  );
}

export function personalMonth(personalYearValue: number, calendarMonth: number): number {
  return reduceKeepMasters(personalYearValue + calendarMonth);
}

export function personalDay(personalMonthValue: number, calendarDay: number): number {
  return reduceKeepMasters(personalMonthValue + calendarDay);
}

export function pinnacles(date: BirthDate): {
  values: [number, number, number, number];
  firstPinnacleEndAge: number;
} {
  const rm = reduceKeepMasters(date.month);
  const rd = reduceKeepMasters(date.day);
  const ry = reduceKeepMasters(date.year);
  const p1 = reduceKeepMasters(rm + rd);
  const p2 = reduceKeepMasters(rd + ry);
  const p3 = reduceKeepMasters(p1 + p2);
  const p4 = reduceKeepMasters(rm + ry);
  return {
    values: [p1, p2, p3, p4],
    firstPinnacleEndAge: 36 - reduceFull(lifePath(date)),
  };
}

export function challenges(date: BirthDate): [number, number, number, number] {
  const rm = reduceFull(date.month);
  const rd = reduceFull(date.day);
  const ry = reduceFull(date.year);
  const c1 = reduceFull(Math.abs(rm - rd));
  const c2 = reduceFull(Math.abs(rd - ry));
  const c3 = reduceFull(Math.abs(c1 - c2));
  const c4 = reduceFull(Math.abs(rm - ry));
  return [c1, c2, c3, c4];
}

/**
 * Modern tarot birth-card convention birth-cards-1.0
 * (docs/numerology-v1.md): month + day + century pair + year pair, digit-sum
 * while above 22, then chain digit sums; trump 22 renders as 0 (The Fool).
 */
export function birthCardTrumps(date: BirthDate): number[] {
  let sum =
    date.month + date.day + Math.floor(date.year / 100) + (date.year % 100);
  while (sum > 22) {
    sum = digitSum(sum);
  }
  const chain: number[] = [sum];
  let current = sum;
  while (current > 9) {
    current = digitSum(current);
    chain.push(current);
  }
  return chain;
}

/** Trump number as displayed (22 counts as 0, The Fool). */
export function birthCardTrumpNumber(chainValue: number): number {
  return chainValue === 22 ? 0 : chainValue;
}

export function numerologyProfile(
  date: BirthDate,
  readingMomentUtc: Date,
): NumerologyProfile {
  assertValidBirthDate(date);
  const py = personalYear(date, readingMomentUtc.getUTCFullYear());
  const pm = personalMonth(py, readingMomentUtc.getUTCMonth() + 1);
  const pd = personalDay(pm, readingMomentUtc.getUTCDate());
  return {
    version: NUMEROLOGY_VERSION,
    lifePath: lifePath(date),
    birthday: birthdayNumber(date),
    attitude: attitudeNumber(date),
    personalYear: py,
    personalMonth: pm,
    personalDay: pd,
    pinnacles: pinnacles(date),
    challenges: challenges(date),
    birthCards: {
      method: BIRTH_CARDS_METHOD,
      trumps: birthCardTrumps(date),
    },
  };
}
