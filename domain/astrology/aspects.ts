import { separation } from "./zodiac";
import type { AngleId, AspectHit, AspectType, BodyId } from "./types";

/**
 * Aspect detection with the specification's orb tables (§10.3).
 */

export const ASPECT_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  quincunx: 150,
  opposition: 180,
};

export type OrbContext = "natal" | "current" | "transit";

const ORB_TABLES: Record<OrbContext, Record<AspectType, number>> = {
  natal: {
    conjunction: 8,
    opposition: 8,
    trine: 6,
    square: 6,
    sextile: 4,
    quincunx: 3,
  },
  current: {
    conjunction: 4,
    opposition: 4,
    trine: 4,
    square: 4,
    sextile: 3,
    quincunx: 2,
  },
  transit: {
    conjunction: 3,
    opposition: 3,
    trine: 3,
    square: 3,
    sextile: 2,
    quincunx: 2,
  },
};

const LUMINARIES = new Set<string>(["sun", "moon"]);
const ANGLES = new Set<string>(["asc", "mc", "dsc", "ic"]);

export interface AspectParticipant {
  id: BodyId | AngleId;
  longitude: number;
  /** Degrees/day; undefined for angles. */
  speed?: number;
}

export function allowedOrb(
  context: OrbContext,
  type: AspectType,
  a: AspectParticipant,
  b: AspectParticipant,
  options: { transitingIsMoon?: boolean } = {},
): number {
  let orb = ORB_TABLES[context][type];
  if (context === "natal") {
    if (LUMINARIES.has(a.id) || LUMINARIES.has(b.id)) orb += 1.5;
    if (ANGLES.has(a.id) || ANGLES.has(b.id)) orb += 1;
  }
  if (context === "transit" && options.transitingIsMoon) {
    // Fast Moon transits stay relevant only very close to exact (§10.3).
    orb = Math.min(orb, 1.5);
  }
  return orb;
}

function applyingState(
  a: AspectParticipant,
  b: AspectParticipant,
  target: number,
  currentDelta: number,
): boolean | null {
  if (a.speed === undefined || b.speed === undefined) return null;
  const dtDays = 0.05;
  const nextSeparation = separation(
    a.longitude + a.speed * dtDays,
    b.longitude + b.speed * dtDays,
  );
  const nextDelta = Math.abs(nextSeparation - target);
  if (Math.abs(nextDelta - currentDelta) < 1e-9) return null;
  return nextDelta < currentDelta;
}

/** All aspects among the given participants for one orb context. */
export function findAspects(
  participants: AspectParticipant[],
  context: OrbContext,
): AspectHit[] {
  const hits: AspectHit[] = [];
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const a = participants[i]!;
      const b = participants[j]!;
      const hit = aspectBetween(a, b, context);
      if (hit) hits.push(hit);
    }
  }
  return hits.sort((x, y) => x.orb - y.orb);
}

/** Closest in-orb aspect between two participants, if any. */
export function aspectBetween(
  a: AspectParticipant,
  b: AspectParticipant,
  context: OrbContext,
  options: { transitingIsMoon?: boolean } = {},
): AspectHit | null {
  const sep = separation(a.longitude, b.longitude);
  let best: AspectHit | null = null;
  for (const [type, target] of Object.entries(ASPECT_ANGLES) as Array<
    [AspectType, number]
  >) {
    const delta = Math.abs(sep - target);
    if (delta <= allowedOrb(context, type, a, b, options)) {
      if (!best || delta < best.orb) {
        best = {
          a: a.id,
          b: b.id,
          type,
          orb: Math.round(delta * 100) / 100,
          applying: applyingState(a, b, target, delta),
        };
      }
    }
  }
  return best;
}
