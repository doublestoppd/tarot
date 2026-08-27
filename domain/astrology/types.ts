import type { Element } from "@/domain/tarot/types";

/**
 * Application-owned astrology types (spec §10.1). Every provider result is
 * normalized into these; nothing outside the adapter sees library types.
 */

export type BodyId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "north_node";

export type SignId =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type Modality = "cardinal" | "fixed" | "mutable";

export type AngleId = "asc" | "mc" | "dsc" | "ic";

export type AspectType =
  | "conjunction"
  | "opposition"
  | "trine"
  | "square"
  | "sextile"
  | "quincunx";

export interface BodyPosition {
  body: BodyId;
  /** Tropical geocentric ecliptic longitude of date, [0, 360). */
  longitude: number;
  sign: SignId;
  degreeInSign: number;
  decan: 1 | 2 | 3;
  retrograde: boolean;
  /** Degrees per day along the ecliptic (negative = retrograde). */
  speed: number;
}

export type LunarPhaseName =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export interface LunarState {
  /** Sun→Moon elongation in degrees: 0 = new, 180 = full. */
  phaseAngle: number;
  phaseName: LunarPhaseName;
  illuminationFraction: number;
  waxing: boolean;
}

export interface AspectHit {
  a: BodyId | AngleId;
  b: BodyId | AngleId;
  type: AspectType;
  /** Distance from exactness in degrees (0 = exact). */
  orb: number;
  /** null when speeds are unavailable (angles). */
  applying: boolean | null;
}

export interface CurrentSky {
  instantUtc: string;
  bodies: BodyPosition[];
  lunar: LunarState;
  sunSeason: { sign: SignId; decan: 1 | 2 | 3 };
  aspects: AspectHit[];
  elementBalance: Record<Element, number>;
  modalityBalance: Record<Modality, number>;
}

export interface HouseSet {
  system: "placidus" | "whole_sign";
  /** 12 cusp longitudes, index 0 = 1st house cusp. */
  cusps: number[];
  fallbackReason?: string;
}

export interface Angles {
  asc: number;
  mc: number;
  dsc: number;
  ic: number;
}

export interface NatalChart {
  kind: "exact";
  instantUtc: string;
  bodies: BodyPosition[];
  angles: Angles;
  houses: HouseSet;
  aspects: AspectHit[];
  elementBalance: Record<Element, number>;
  modalityBalance: Record<Modality, number>;
  chartRulerSign: SignId;
  /** House index (1-12) for each body, aligned with `bodies`. */
  housePlacements: Array<{ body: BodyId; house: number }>;
}

export interface StablePlacement {
  body: BodyId;
  sign: SignId;
}

export interface PartialNatalProfile {
  kind: "date_only" | "date_and_place";
  /** Bodies whose sign holds throughout the uncertainty envelope. */
  stablePlacements: StablePlacement[];
  /** Bodies omitted because they change sign within the envelope. */
  omittedBodies: BodyId[];
  envelope: { startUtc: string; endUtc: string };
}

export type NatalInformation =
  | { kind: "none" }
  | ({ kind: "partial" } & { profile: PartialNatalProfile })
  | ({ kind: "exact" } & { chart: NatalChart });

export interface TransitHit {
  transitingBody: BodyId;
  natalBody: BodyId | AngleId;
  type: AspectType;
  orb: number;
  applying: boolean | null;
}

export interface GeoCoordinates {
  lat: number;
  lon: number;
}

/** Result of interpreting a local civil time in a historical IANA zone. */
export type LocalTimeResolution =
  | { kind: "unique"; utc: Date }
  | { kind: "gap" }
  | { kind: "ambiguous"; first: Date; second: Date };

export interface AstrologyProvider {
  currentSky(utcInstant: Date): CurrentSky;
  natalFromExactBirth(
    utcInstant: Date,
    coordinates: GeoCoordinates,
  ): NatalChart;
  conservativeDateOnly(
    year: number,
    month: number,
    day: number,
    timeZone?: string,
  ): PartialNatalProfile;
  transits(sky: CurrentSky, natal: NatalChart): TransitHit[];
}
