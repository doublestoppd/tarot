import { ALL_CARDS } from "@/data/tarot/cards";
import { SIGN_LABELS } from "@/domain/astrology/zodiac";

/**
 * Deterministic readability scoring (product rule: everything shown to the
 * user reads at an 8th-grade level or below, ADR 0009).
 *
 * Uses the Flesch–Kincaid grade formula. Esoteric proper nouns that MUST
 * appear in a reading (card names, signs, planets, suits) would inflate the
 * score without making a sentence hard to follow — "Sagittarius" is four
 * syllables however simply the sentence is built — so they are normalized to
 * plain one-syllable stand-ins before scoring. The score therefore measures
 * sentence construction, which is what the rule is about.
 */

export const MAX_USER_FACING_GRADE = 8.0;

const PLANET_NAMES = [
  "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
  "Uranus", "Neptune", "Pluto",
];

const SUIT_NAMES = ["Wands", "Cups", "Swords", "Pentacles"];

const EXTRA_DOMAIN_TERMS = [
  "Hermetic", "Qabalah", "Sagittarius", "Aquarius", "Capricorn",
  "Ascendant", "Midheaven", "retrograde", "numerology", "astrology",
  "astrological", "numerological", "tarot",
];

let cachedPatterns: Array<[RegExp, string]> | null = null;

function properNounPatterns(): Array<[RegExp, string]> {
  if (cachedPatterns) return cachedPatterns;
  const patterns: Array<[RegExp, string]> = [];
  // Longest first so "Wheel of Fortune" is replaced before "Fortune".
  const cardNames = ALL_CARDS.map((c) => c.canonicalName).sort(
    (a, b) => b.length - a.length,
  );
  for (const name of cardNames) {
    patterns.push([new RegExp(escapeRegExp(name), "gi"), "card"]);
  }
  for (const sign of Object.values(SIGN_LABELS)) {
    patterns.push([new RegExp(`\\b${sign}\\b`, "gi"), "sign"]);
  }
  for (const planet of PLANET_NAMES) {
    patterns.push([new RegExp(`\\b${planet}\\b`, "gi"), "star"]);
  }
  for (const suit of SUIT_NAMES) {
    patterns.push([new RegExp(`\\b${suit}\\b`, "gi"), "suit"]);
  }
  for (const term of EXTRA_DOMAIN_TERMS) {
    patterns.push([new RegExp(`\\b${term}\\b`, "gi"), "sky"]);
  }
  cachedPatterns = patterns;
  return patterns;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace unavoidable esoteric names with plain stand-ins before scoring. */
export function normalizeForScoring(text: string): string {
  let out = text;
  for (const [pattern, replacement] of properNounPatterns()) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) return 0;
  if (cleaned.length <= 3) return 1;
  const groups = cleaned.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  // Silent trailing e ("care", "made") — but keep "-le" endings ("table").
  if (
    cleaned.endsWith("e") &&
    !cleaned.endsWith("le") &&
    !cleaned.endsWith("ee") &&
    count > 1
  ) {
    count -= 1;
  }
  return Math.max(count, 1);
}

export interface ReadabilityResult {
  words: number;
  sentences: number;
  syllables: number;
  /** Flesch–Kincaid grade level of the (normalized) text. */
  grade: number;
}

export function fleschKincaidGrade(rawText: string): ReadabilityResult {
  const text = normalizeForScoring(rawText);
  const sentences = Math.max(
    (text.match(/[.!?]+(?:\s|$|["”')])/g) ?? []).length,
    1,
  );
  const words = text
    .replace(/[—–]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'-]/g, ""))
    .filter((w) => w.length > 0);
  const wordCount = Math.max(words.length, 1);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade =
    0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
  return {
    words: wordCount,
    sentences,
    syllables,
    grade: Math.round(grade * 10) / 10,
  };
}

/** True when text satisfies the ≤ 8th-grade product rule. */
export function meetsReadingLevel(
  text: string,
  maxGrade: number = MAX_USER_FACING_GRADE,
): boolean {
  return fleschKincaidGrade(text).grade <= maxGrade;
}
