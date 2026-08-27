import type { Element } from "@/domain/tarot/types";
import type { Modality, SignId } from "./types";

export const SIGNS_IN_ORDER: SignId[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

export const SIGN_LABELS: Record<SignId, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

export const SIGN_ELEMENT: Record<SignId, Element> = {
  aries: "fire",
  taurus: "earth",
  gemini: "air",
  cancer: "water",
  leo: "fire",
  virgo: "earth",
  libra: "air",
  scorpio: "water",
  sagittarius: "fire",
  capricorn: "earth",
  aquarius: "air",
  pisces: "water",
};

export const SIGN_MODALITY: Record<SignId, Modality> = {
  aries: "cardinal",
  taurus: "fixed",
  gemini: "mutable",
  cancer: "cardinal",
  leo: "fixed",
  virgo: "mutable",
  libra: "cardinal",
  scorpio: "fixed",
  sagittarius: "mutable",
  capricorn: "cardinal",
  aquarius: "fixed",
  pisces: "mutable",
};

/** Traditional seven-planet rulership (spec §10.2 primary). */
export const SIGN_RULER: Record<SignId, string> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

export function normalizeDegrees(longitude: number): number {
  const wrapped = longitude % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function signOf(longitude: number): SignId {
  const index = Math.floor(normalizeDegrees(longitude) / 30);
  return SIGNS_IN_ORDER[index]!;
}

export function degreeInSign(longitude: number): number {
  return normalizeDegrees(longitude) % 30;
}

export function decanOf(longitude: number): 1 | 2 | 3 {
  return (Math.floor(degreeInSign(longitude) / 10) + 1) as 1 | 2 | 3;
}

/** Smallest angular separation between two longitudes, in [0, 180]. */
export function separation(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b)) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Signed shortest arc from a to b in (−180, 180]. */
export function signedArc(a: number, b: number): number {
  let diff = (normalizeDegrees(b) - normalizeDegrees(a)) % 360;
  if (diff > 180) diff -= 360;
  if (diff <= -180) diff += 360;
  return diff;
}

export function formatDegree(longitude: number): string {
  const deg = Math.floor(degreeInSign(longitude));
  const minutes = Math.round((degreeInSign(longitude) - deg) * 60);
  return `${deg}°${minutes.toString().padStart(2, "0")}′ ${SIGN_LABELS[signOf(longitude)]}`;
}
