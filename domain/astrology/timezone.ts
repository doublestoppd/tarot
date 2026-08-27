import type { LocalTimeResolution } from "./types";

/**
 * Historical IANA time-zone conversion built on the runtime's full ICU/tz
 * database (spec §10.4). Detects DST gaps (nonexistent local times) and
 * ambiguities (repeated local times) instead of guessing.
 */

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      era: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function wallClockAt(timeZone: string, utc: Date): WallClock {
  const parts = formatterFor(timeZone).formatToParts(utc);
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Zone offset in minutes east of UTC at the given instant. */
export function tzOffsetMinutes(timeZone: string, utc: Date): number {
  const wall = wallClockAt(timeZone, utc);
  const wallAsUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    utc.getUTCSeconds(),
  );
  return Math.round((wallAsUtc - utc.getTime()) / 60000);
}

function matchesWall(
  timeZone: string,
  utc: Date,
  expected: WallClock,
): boolean {
  const wall = wallClockAt(timeZone, utc);
  return (
    wall.year === expected.year &&
    wall.month === expected.month &&
    wall.day === expected.day &&
    wall.hour === expected.hour &&
    wall.minute === expected.minute
  );
}

/**
 * Resolve a local civil date+time in an IANA zone to UTC instants,
 * classifying DST gaps and ambiguities. Never silently assumes an offset.
 */
export function resolveLocalTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): LocalTimeResolution {
  const requested: WallClock = { year, month, day, hour, minute };
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Probe offsets around the naive instant; DST transitions shift the wall
  // clock by the offset difference, so candidates are naive − offset.
  const probeOffsets = new Set<number>();
  for (const deltaHours of [-30, -12, 0, 12, 30]) {
    probeOffsets.add(
      tzOffsetMinutes(timeZone, new Date(naive + deltaHours * 3_600_000)),
    );
  }

  const candidates = new Set<number>();
  for (const offset of probeOffsets) {
    candidates.add(naive - offset * 60_000);
  }

  const valid = [...candidates]
    .filter((ms) => matchesWall(timeZone, new Date(ms), requested))
    .sort((a, b) => a - b);

  if (valid.length === 0) {
    return { kind: "gap" };
  }
  if (valid.length === 1) {
    return { kind: "unique", utc: new Date(valid[0]!) };
  }
  return {
    kind: "ambiguous",
    first: new Date(valid[0]!),
    second: new Date(valid[valid.length - 1]!),
  };
}

/**
 * UTC bounds of a local calendar day (used for date+birthplace uncertainty
 * envelopes). Gaps/ambiguities at midnight resolve conservatively outward.
 */
export function localDayUtcRange(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): { start: Date; end: Date } {
  const startRes = resolveLocalTime(year, month, day, 0, 0, timeZone);
  let start: Date;
  switch (startRes.kind) {
    case "unique":
      start = startRes.utc;
      break;
    case "ambiguous":
      start = startRes.first;
      break;
    case "gap": {
      // Midnight was skipped: the day began at the post-transition instant.
      const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
      const offsetAfter = tzOffsetMinutes(timeZone, new Date(naive + 12 * 3_600_000));
      start = new Date(naive - offsetAfter * 60_000);
      break;
    }
  }

  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const endRes = resolveLocalTime(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
    0,
    0,
    timeZone,
  );
  let end: Date;
  switch (endRes.kind) {
    case "unique":
      end = endRes.utc;
      break;
    case "ambiguous":
      end = endRes.second;
      break;
    case "gap": {
      const naive = nextDay.getTime();
      const offsetBefore = tzOffsetMinutes(timeZone, new Date(naive - 12 * 3_600_000));
      end = new Date(naive - offsetBefore * 60_000);
      break;
    }
  }

  return { start, end };
}
