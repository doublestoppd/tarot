import {
  Body,
  Ecliptic,
  GeoVector,
  GeoMoonState,
  Illumination,
  MakeTime,
  MoonPhase,
  Rotation_EQJ_ECT,
  RotateState,
  SiderealTime,
} from "astronomy-engine";
import type { Element } from "@/domain/tarot/types";
import {
  decanOf,
  degreeInSign,
  normalizeDegrees,
  SIGN_ELEMENT,
  SIGN_MODALITY,
  signOf,
} from "./zodiac";
import { housesWithFallback, houseOf, meanObliquity } from "./houses";
import { aspectBetween, findAspects, type AspectParticipant } from "./aspects";
import { localDayUtcRange } from "./timezone";
import type {
  AstrologyProvider,
  BodyId,
  BodyPosition,
  CurrentSky,
  GeoCoordinates,
  LunarPhaseName,
  Modality,
  NatalChart,
  PartialNatalProfile,
  TransitHit,
} from "./types";

/**
 * AstrologyProvider adapter over Astronomy Engine (ADR 0006).
 *
 * Everything is normalized to tropical, geocentric, true-ecliptic-of-date
 * longitudes. Chiron is not available from this ephemeris source and is
 * deliberately omitted in v1 rather than approximated (spec §10.4: missing
 * information narrows the calculation; it never becomes guessed information).
 */

const PLANET_BODIES: Array<{ id: BodyId; body: Body }> = [
  { id: "sun", body: Body.Sun },
  { id: "moon", body: Body.Moon },
  { id: "mercury", body: Body.Mercury },
  { id: "venus", body: Body.Venus },
  { id: "mars", body: Body.Mars },
  { id: "jupiter", body: Body.Jupiter },
  { id: "saturn", body: Body.Saturn },
  { id: "uranus", body: Body.Uranus },
  { id: "neptune", body: Body.Neptune },
  { id: "pluto", body: Body.Pluto },
];

/** Planets counted for element/modality balance (node excluded). */
const BALANCE_BODIES = new Set<BodyId>(PLANET_BODIES.map((p) => p.id));

function eclipticLongitude(body: Body, utc: Date): number {
  const time = MakeTime(utc);
  return normalizeDegrees(Ecliptic(GeoVector(body, time, true)).elon);
}

/** True lunar node from the Moon's instantaneous orbital plane (§10.2). */
export function trueNodeLongitude(utc: Date): number {
  const time = MakeTime(utc);
  const state = RotateState(Rotation_EQJ_ECT(time), GeoMoonState(time));
  // Angular momentum h = r × v in the ecliptic frame; the ascending node
  // direction is ẑ × h.
  const hx = state.y * state.vz - state.z * state.vy;
  const hy = state.z * state.vx - state.x * state.vz;
  return normalizeDegrees(Math.atan2(hx, -hy) / (Math.PI / 180));
}

const SPEED_DT_DAYS = 0.0625;

function longitudeOf(id: BodyId, utc: Date): number {
  if (id === "north_node") return trueNodeLongitude(utc);
  const planet = PLANET_BODIES.find((p) => p.id === id);
  if (!planet) throw new Error(`Unknown body: ${id}`);
  return eclipticLongitude(planet.body, utc);
}

function positionOf(id: BodyId, utc: Date): BodyPosition {
  const lon = longitudeOf(id, utc);
  const before = longitudeOf(id, new Date(utc.getTime() - SPEED_DT_DAYS * 86_400_000));
  const after = longitudeOf(id, new Date(utc.getTime() + SPEED_DT_DAYS * 86_400_000));
  let arc = after - before;
  while (arc > 180) arc -= 360;
  while (arc < -180) arc += 360;
  const speed = arc / (2 * SPEED_DT_DAYS);
  return {
    body: id,
    longitude: lon,
    sign: signOf(lon),
    degreeInSign: degreeInSign(lon),
    decan: decanOf(lon),
    retrograde: speed < 0,
    speed,
  };
}

function allPositions(utc: Date): BodyPosition[] {
  const positions = PLANET_BODIES.map((p) => positionOf(p.id, utc));
  positions.push(positionOf("north_node", utc));
  return positions;
}

function phaseNameOf(angle: number): LunarPhaseName {
  if (angle < 22.5) return "new";
  if (angle < 67.5) return "waxing_crescent";
  if (angle < 112.5) return "first_quarter";
  if (angle < 157.5) return "waxing_gibbous";
  if (angle < 202.5) return "full";
  if (angle < 247.5) return "waning_gibbous";
  if (angle < 292.5) return "last_quarter";
  if (angle < 337.5) return "waning_crescent";
  return "new";
}

function balances(positions: BodyPosition[]): {
  elementBalance: Record<Element, number>;
  modalityBalance: Record<Modality, number>;
} {
  const elementBalance: Record<Element, number> = { fire: 0, water: 0, air: 0, earth: 0 };
  const modalityBalance: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of positions) {
    if (!BALANCE_BODIES.has(p.body)) continue;
    elementBalance[SIGN_ELEMENT[p.sign]] += 1;
    modalityBalance[SIGN_MODALITY[p.sign]] += 1;
  }
  return { elementBalance, modalityBalance };
}

function asParticipants(positions: BodyPosition[]): AspectParticipant[] {
  return positions.map((p) => ({ id: p.body, longitude: p.longitude, speed: p.speed }));
}

export function computeCurrentSky(utc: Date): CurrentSky {
  const positions = allPositions(utc);
  const time = MakeTime(utc);
  const phaseAngle = MoonPhase(time);
  const illumination = Illumination(Body.Moon, time);
  const sun = positions.find((p) => p.body === "sun")!;
  return {
    instantUtc: utc.toISOString(),
    bodies: positions,
    lunar: {
      phaseAngle,
      phaseName: phaseNameOf(phaseAngle),
      illuminationFraction: Math.round(illumination.phase_fraction * 1000) / 1000,
      waxing: phaseAngle < 180,
    },
    sunSeason: { sign: sun.sign, decan: sun.decan },
    aspects: findAspects(asParticipants(positions), "current"),
    ...balances(positions),
  };
}

export function computeNatalChart(
  utc: Date,
  coordinates: GeoCoordinates,
): NatalChart {
  const positions = allPositions(utc);
  const gastHours = SiderealTime(MakeTime(utc));
  const { houses, angles } = housesWithFallback({
    gastHours,
    latitude: coordinates.lat,
    longitude: coordinates.lon,
    epsilon: meanObliquity(utc),
  });

  const participants: AspectParticipant[] = [
    ...asParticipants(positions),
    { id: "asc", longitude: angles.asc },
    { id: "mc", longitude: angles.mc },
  ];

  return {
    kind: "exact",
    instantUtc: utc.toISOString(),
    bodies: positions,
    angles,
    houses,
    aspects: findAspects(participants, "natal"),
    ...balances(positions),
    chartRulerSign: signOf(angles.asc),
    housePlacements: positions.map((p) => ({
      body: p.body,
      house: houseOf(p.longitude, houses),
    })),
  };
}

const ENVELOPE_SAMPLE_HOURS = 4;

function stabilityProfile(
  kind: PartialNatalProfile["kind"],
  start: Date,
  end: Date,
): PartialNatalProfile {
  const stable: PartialNatalProfile["stablePlacements"] = [];
  const omitted: BodyId[] = [];
  const bodies: BodyId[] = [...PLANET_BODIES.map((p) => p.id), "north_node"];
  for (const id of bodies) {
    const firstSign = signOf(longitudeOf(id, start));
    let isStable = signOf(longitudeOf(id, end)) === firstSign;
    if (isStable) {
      for (
        let t = start.getTime() + ENVELOPE_SAMPLE_HOURS * 3_600_000;
        t < end.getTime();
        t += ENVELOPE_SAMPLE_HOURS * 3_600_000
      ) {
        if (signOf(longitudeOf(id, new Date(t))) !== firstSign) {
          isStable = false;
          break;
        }
      }
    }
    if (isStable) stable.push({ body: id, sign: firstSign });
    else omitted.push(id);
  }
  return {
    kind,
    stablePlacements: stable,
    omittedBodies: omitted,
    envelope: { startUtc: start.toISOString(), endUtc: end.toISOString() },
  };
}

/**
 * Stability profile over an arbitrary UTC interval — used for the
 * ambiguous-DST "not sure" case (spec §10.4): both possible instants are
 * covered and any factor that differs between them is suppressed.
 */
export function computePartialBetween(
  start: Date,
  end: Date,
  kind: PartialNatalProfile["kind"],
): PartialNatalProfile {
  return stabilityProfile(kind, start, end);
}

export function computeConservativeDateOnly(
  year: number,
  month: number,
  day: number,
  timeZone?: string,
): PartialNatalProfile {
  if (timeZone) {
    const { start, end } = localDayUtcRange(year, month, day, timeZone);
    return stabilityProfile("date_and_place", start, end);
  }
  // Cover every civil instant that can carry this calendar date anywhere on
  // Earth (UTC−14 through UTC+14, spec §10.4).
  const midnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const start = new Date(midnight - 14 * 3_600_000);
  const end = new Date(midnight + 24 * 3_600_000 + 14 * 3_600_000);
  return stabilityProfile("date_only", start, end);
}

export function computeTransits(sky: CurrentSky, natal: NatalChart): TransitHit[] {
  const hits: TransitHit[] = [];
  const natalTargets: AspectParticipant[] = [
    ...natal.bodies.map((p) => ({ id: p.body, longitude: p.longitude })),
    { id: "asc" as const, longitude: natal.angles.asc },
    { id: "mc" as const, longitude: natal.angles.mc },
  ];
  for (const transiting of sky.bodies) {
    for (const target of natalTargets) {
      const hit = aspectBetween(
        { id: transiting.body, longitude: transiting.longitude, speed: transiting.speed },
        // Natal points are fixed: zero speed for applying/separating logic.
        { id: target.id, longitude: target.longitude, speed: 0 },
        "transit",
        { transitingIsMoon: transiting.body === "moon" },
      );
      if (hit) {
        hits.push({
          transitingBody: transiting.body,
          natalBody: target.id,
          type: hit.type,
          orb: hit.orb,
          applying: hit.applying,
        });
      }
    }
  }
  return hits.sort((a, b) => a.orb - b.orb);
}

export const astronomyEngineProvider: AstrologyProvider = {
  currentSky: computeCurrentSky,
  natalFromExactBirth: computeNatalChart,
  conservativeDateOnly: computeConservativeDateOnly,
  transits: computeTransits,
};
