import { normalizeDegrees, signOf, SIGNS_IN_ORDER } from "./zodiac";
import type { Angles, HouseSet } from "./types";

/**
 * House and angle mathematics (spec §10.2/§10.4) from the standard published
 * formulae (reference: src_meeus_1998; Placidus semi-arc iteration as used
 * across the astrological literature). Placidus is primary; Whole Sign is
 * the documented fallback where Placidus is undefined at extreme latitudes.
 */

const DEG = Math.PI / 180;

export class PlacidusUndefinedError extends Error {
  constructor(latitude: number) {
    super(`Placidus houses are not reliably defined at latitude ${latitude}`);
    this.name = "PlacidusUndefinedError";
  }
}

/** Mean obliquity of the ecliptic (IAU 2006 series), degrees. */
export function meanObliquity(utc: Date): number {
  const jd = utc.getTime() / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545.0) / 36_525;
  return (
    23.439279444444445 -
    0.013010213611111 * t -
    5.0861e-8 * t * t +
    5.565e-7 * t * t * t
  );
}

/** Ecliptic longitude of the point on the ecliptic with right ascension ra. */
function eclipticFromRa(raDeg: number, epsilon: number): number {
  const ra = raDeg * DEG;
  return normalizeDegrees(
    Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsilon * DEG)) / DEG,
  );
}

/** Declination of the ecliptic point at longitude lambda. */
function declinationOf(lambdaDeg: number, epsilon: number): number {
  return (
    Math.asin(Math.sin(epsilon * DEG) * Math.sin(lambdaDeg * DEG)) / DEG
  );
}

export interface AngleInputs {
  /** Greenwich apparent sidereal time in hours. */
  gastHours: number;
  /** Geographic longitude, degrees east positive. */
  longitude: number;
  /** Geographic latitude, degrees north positive. */
  latitude: number;
  /** Obliquity of the ecliptic, degrees. */
  epsilon: number;
}

export function ramcOf(inputs: AngleInputs): number {
  return normalizeDegrees(inputs.gastHours * 15 + inputs.longitude);
}

export function computeAngles(inputs: AngleInputs): Angles {
  const { latitude, epsilon } = inputs;
  const ramc = ramcOf(inputs);
  const mc = eclipticFromRa(ramc, epsilon);

  const ramcRad = ramc * DEG;
  const epsRad = epsilon * DEG;
  const latRad = latitude * DEG;

  let asc = normalizeDegrees(
    Math.atan2(
      Math.cos(ramcRad),
      -(Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad)),
    ) / DEG,
  );
  // The ascendant always lies in the half-circle zodiacally after the MC.
  const arcFromMc = normalizeDegrees(asc - mc);
  if (arcFromMc === 0 || arcFromMc >= 180) {
    asc = normalizeDegrees(asc + 180);
  }

  return {
    asc,
    mc,
    dsc: normalizeDegrees(asc + 180),
    ic: normalizeDegrees(mc + 180),
  };
}

/**
 * Placidus intermediate cusps via the classical semi-arc iteration.
 * Throws PlacidusUndefinedError when an ecliptic point in the iteration is
 * circumpolar (|tan φ · tan δ| > 1), which happens beyond the polar circles.
 */
export function placidusHouses(inputs: AngleInputs): HouseSet {
  const { latitude, epsilon } = inputs;
  if (Math.abs(latitude) > 89.5) {
    throw new PlacidusUndefinedError(latitude);
  }
  const ramc = ramcOf(inputs);
  const angles = computeAngles(inputs);
  const tanLat = Math.tan(latitude * DEG);

  const ascensionalDifference = (raDeg: number): number => {
    const lambda = eclipticFromRa(raDeg, epsilon);
    const delta = declinationOf(lambda, epsilon);
    const x = tanLat * Math.tan(delta * DEG);
    if (Math.abs(x) >= 1) {
      throw new PlacidusUndefinedError(latitude);
    }
    return Math.asin(x) / DEG;
  };

  const iterate = (
    initialOffset: number,
    next: (ad: number) => number,
  ): number => {
    let ra = normalizeDegrees(ramc + initialOffset);
    for (let i = 0; i < 40; i++) {
      const updated = normalizeDegrees(ramc + next(ascensionalDifference(ra)));
      if (Math.abs(updated - ra) < 1e-9) {
        ra = updated;
        break;
      }
      ra = updated;
    }
    return eclipticFromRa(ra, epsilon);
  };

  // Diurnal semi-arc = 90 + AD; nocturnal = 90 − AD.
  const cusp11 = iterate(30, (ad) => (90 + ad) / 3);
  const cusp12 = iterate(60, (ad) => (2 * (90 + ad)) / 3);
  const cusp2 = iterate(120, (ad) => 180 - (2 * (90 - ad)) / 3);
  const cusp3 = iterate(150, (ad) => 180 - (90 - ad) / 3);

  const cusps = [
    angles.asc,
    cusp2,
    cusp3,
    angles.ic,
    normalizeDegrees(cusp11 + 180),
    normalizeDegrees(cusp12 + 180),
    angles.dsc,
    normalizeDegrees(cusp2 + 180),
    normalizeDegrees(cusp3 + 180),
    angles.mc,
    cusp11,
    cusp12,
  ];

  return { system: "placidus", cusps };
}

export function wholeSignHouses(ascLongitude: number): HouseSet {
  const ascSignIndex = SIGNS_IN_ORDER.indexOf(signOf(ascLongitude));
  const cusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    cusps.push(normalizeDegrees(((ascSignIndex + i) % 12) * 30));
  }
  return {
    system: "whole_sign",
    cusps,
    fallbackReason:
      "Whole Sign houses were used because Placidus houses are not defined reliably at this latitude.",
  };
}

/** Compute houses with the documented Placidus → Whole Sign fallback. */
export function housesWithFallback(inputs: AngleInputs): {
  houses: HouseSet;
  angles: Angles;
} {
  const angles = computeAngles(inputs);
  try {
    return { houses: placidusHouses(inputs), angles };
  } catch (error) {
    if (error instanceof PlacidusUndefinedError) {
      return { houses: wholeSignHouses(angles.asc), angles };
    }
    throw error;
  }
}

/** 1-based house index containing the given ecliptic longitude. */
export function houseOf(longitude: number, houses: HouseSet): number {
  const lon = normalizeDegrees(longitude);
  for (let i = 0; i < 12; i++) {
    const a = houses.cusps[i]!;
    const b = houses.cusps[(i + 1) % 12]!;
    const span = normalizeDegrees(b - a);
    const offset = normalizeDegrees(lon - a);
    if (span === 0) continue;
    if (offset < span) return i + 1;
  }
  return 12;
}
