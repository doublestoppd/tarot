import type {
  ReadingContext,
  ReadingSynthesis,
} from "@/domain/reading-compiler/types";
import { DEPTH_TARGETS } from "@/domain/reading-compiler/types";
import {
  fleschKincaidGrade,
  MAX_USER_FACING_GRADE,
} from "./readability";

/**
 * Deterministic post-generation validation (spec §17.1). The model's own
 * quality flags are never trusted alone — every check here is phrase/pattern
 * or structural. Problems are classified so the caller can decide between a
 * local repair, one repair model call, or the deterministic fallback.
 */

export type ProblemSeverity = "fatal" | "repairable" | "minor";

export interface ValidationProblem {
  code: string;
  severity: ProblemSeverity;
  detail: string;
}

export interface ValidationResult {
  ok: boolean;
  problems: ValidationProblem[];
  /** True when a single repair model call could plausibly fix the output. */
  repairable: boolean;
}

/** Every evidence id the model may legitimately cite. */
export function validEvidenceIds(context: ReadingContext): Set<string> {
  const ids = new Set<string>();
  for (const e of context.providerEvidence) ids.add(e.id);
  for (const c of context.reading.cards) ids.add(c.evidenceId);
  for (const t of context.tensions) ids.add(t.id);
  return ids;
}

/** Evidence ids rooted in actual drawn cards. */
function cardRootedIds(context: ReadingContext): Set<string> {
  const ids = new Set<string>();
  for (const e of context.providerEvidence) {
    if (e.rootIds.some((r) => r.startsWith("draw:"))) ids.add(e.id);
  }
  for (const c of context.reading.cards) ids.add(c.evidenceId);
  return ids;
}

const TECHNICAL_LANGUAGE: Array<[RegExp, string]> = [
  [/\bAPI\b/, "API"],
  [/\btokens?\b/i, "token"],
  [/\bquota\b/i, "quota"],
  [/\b(language |A\.?I\.? )?model\b/i, "model"],
  [/\bOpenAI\b/i, "OpenAI"],
  [/\bHTTP\b/i, "HTTP"],
  [/\bdatabase\b/i, "database"],
  [/\bJSON\b/i, "JSON"],
  [/\balgorithm/i, "algorithm"],
  [/\bas an AI\b/i, "as an AI"],
  [/\bthe system (detected|calculated|generated)/i, "the system detected"],
  [/\bbased on the data you entered\b/i, "based on the data you entered"],
  [/\bprompt\b/i, "prompt"],
  [/\bserver\b/i, "server"],
];

const MYSTICAL_FILLER: Array<[RegExp, string]> = [
  [/the universe (wants|is calling|has a plan)/i, "the universe wants"],
  [/a? ?portal is opening/i, "a portal is opening"],
  [/trust the journey/i, "trust the journey"],
  [/the spirits are quiet/i, "the spirits are quiet"],
  [/the cards refuse/i, "the cards refuse"],
  [/mercury (interfered|is to blame)/i, "Mercury interfered"],
  [/leap of faith/i, "leap of faith"],
];

const UNSUPPORTED_ESOTERICA: Array<[RegExp, string]> = [
  [/\bcrystals?\b/i, "crystal"],
  [/\bchakras?\b/i, "chakra"],
  [/\bauras?\b/i, "aura"],
  [/\bspirit animal\b/i, "spirit animal"],
  [/\bangel numbers?\b/i, "angel number"],
  [/\bstarseeds?\b/i, "starseed"],
  [/\btwin flames?\b/i, "twin flame"],
];

const DIRECT_PREDICTION: Array<[RegExp, string]> = [
  // Hedged or perceptual futures ("you will probably…", "you will notice…")
  // are a reader's normal register and allowed (ADR 0010); what is barred
  // is promising concrete outcomes.
  [
    /\byou will(?! probably| likely| often| sometimes| may| might| find| notice| feel| want| know| recognize| see| hear| catch| keep| still| have to decide)\b/i,
    "you will …",
  ],
  [/\bis going to happen\b/i, "is going to happen"],
  [/\bguaranteed\b/i, "guaranteed"],
  [/\bwill certainly\b/i, "will certainly"],
  [/\bdestined to\b/i, "destined to"],
  [/\binevitabl/i, "inevitable"],
];

const PROHIBITED_TOPICS: Array<[RegExp, string]> = [
  [/\bpregnan/i, "pregnancy prediction"],
  [/\bdiagnos/i, "diagnosis"],
  [/\byou (will|may|might) die\b/i, "death prediction"],
  [/\bterminal illness\b/i, "illness prediction"],
  [/\b(buy|sell|invest in) (stocks?|crypto|bitcoin|shares)\b/i, "investment directive"],
  [/\bplace (a |the )?bets?\b/i, "gambling directive"],
  [/\blawsuit\b/i, "legal directive"],
  [/\b(cheating|is unfaithful|having an affair)\b/i, "third-party accusation"],
];

// Each entry names the role/event words that, when the asker themself
// mentioned them in the situation note (ADR 0011), make the reference
// grounded rather than invented.
const BIOGRAPHY_INVENTION: Array<[RegExp, string, string[]]> = [
  [/\byour (boss|manager|coworker|colleague)\b/i, "invented workplace figure", ["boss", "manager", "coworker", "colleague", "work"]],
  [/\byour (husband|wife|boyfriend|girlfriend|partner('s)? name)\b/i, "invented relationship fact", ["husband", "wife", "boyfriend", "girlfriend", "partner"]],
  [/\byour (divorce|breakup|childhood trauma|illness)\b/i, "invented life event", ["divorce", "breakup", "childhood", "trauma", "illness", "sick"]],
  [/\byour (mother|father|parents) (did|said|left|never)\b/i, "invented family fact", ["mother", "father", "parent", "mom", "dad"]],
];

/** Biography references are invented only if the asker never mentioned the figure. */
function scanBiography(text: string, situation: string | undefined): string[] {
  const situationLower = (situation ?? "").toLowerCase();
  const hits: string[] = [];
  for (const [pattern, label, groundingWords] of BIOGRAPHY_INVENTION) {
    if (!pattern.test(text)) continue;
    const grounded =
      situationLower.length > 0 &&
      groundingWords.some((word) => situationLower.includes(word));
    if (!grounded) hits.push(label);
  }
  return hits;
}

function scanPatterns(
  text: string,
  patterns: Array<[RegExp, string]>,
): string[] {
  const hits: string[] = [];
  for (const [pattern, label] of patterns) {
    if (pattern.test(text)) hits.push(label);
  }
  return hits;
}

/** Sign/planet vocabulary that must be grounded in supplied context text. */
const CORRESPONDENCE_VOCAB = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces",
  "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
];

function contextVocabulary(context: ReadingContext): string {
  return [
    ...context.providerEvidence.map((e) => e.statement),
    ...context.reading.cards.map((c) => `${c.name} ${c.canonicalMeaningSummary}`),
    ...context.themes.map((t) => `${t.label} ${t.shortThesis}`),
    ...context.currentSky.map((s) => s.displayFact),
    ...context.personalFactors.map((p) => p.displayFact),
    context.reading.situation ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function validateSynthesis(
  synthesis: ReadingSynthesis,
  context: ReadingContext,
): ValidationResult {
  const problems: ValidationProblem[] = [];
  const valid = validEvidenceIds(context);
  const fullText = synthesis.paragraphs.map((p) => p.text).join("\n\n");
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const targets = DEPTH_TARGETS[context.reading.depth];

  if (!synthesis.title || synthesis.title.trim().length === 0) {
    problems.push({ code: "MISSING_TITLE", severity: "repairable", detail: "empty title" });
  }
  if (synthesis.title.length > 90) {
    problems.push({ code: "TITLE_TOO_LONG", severity: "minor", detail: `${synthesis.title.length} chars` });
  }

  // Evidence integrity — invented ids are fatal (spec §15.2).
  for (const [index, paragraph] of synthesis.paragraphs.entries()) {
    if (paragraph.evidenceIds.length === 0) {
      problems.push({
        code: "PARAGRAPH_WITHOUT_EVIDENCE",
        severity: "repairable",
        detail: `paragraph ${index + 1}`,
      });
    }
    for (const id of paragraph.evidenceIds) {
      if (!valid.has(id)) {
        problems.push({
          code: "INVENTED_EVIDENCE_ID",
          severity: "fatal",
          detail: `paragraph ${index + 1}: ${id}`,
        });
      }
    }
  }
  for (const id of synthesis.usedEvidenceIds) {
    if (!valid.has(id)) {
      problems.push({ code: "INVENTED_USED_ID", severity: "fatal", detail: id });
    }
  }

  // Card-rooted paragraph floor for deep/comprehensive (spec §15.2).
  if (context.reading.depth !== "focused") {
    const rooted = cardRootedIds(context);
    const cardParagraphs = synthesis.paragraphs.filter((p) =>
      p.evidenceIds.some((id) => rooted.has(id)),
    ).length;
    if (cardParagraphs < 4) {
      problems.push({
        code: "INSUFFICIENT_CARD_GROUNDING",
        severity: "repairable",
        detail: `${cardParagraphs} paragraphs cite drawn-card evidence; need 4`,
      });
    }
  }

  // Length envelope.
  if (synthesis.paragraphs.length < targets.minParagraphs) {
    problems.push({
      code: "TOO_FEW_PARAGRAPHS",
      severity: "repairable",
      detail: `${synthesis.paragraphs.length} < ${targets.minParagraphs}`,
    });
  }
  if (synthesis.paragraphs.length > targets.maxParagraphs) {
    problems.push({
      code: "TOO_MANY_PARAGRAPHS",
      severity: "minor",
      detail: `${synthesis.paragraphs.length} > ${targets.maxParagraphs}`,
    });
  }
  // Depth floors are guidance for the provider; the gate only fires when a
  // reading is badly under target (ADR 0010 loosening).
  const shortFloor = Math.round(targets.minWords * 0.85);
  if (wordCount < shortFloor) {
    problems.push({
      code: "TOO_SHORT",
      severity: "repairable",
      detail: `${wordCount} words < ${shortFloor}`,
    });
  }
  if (wordCount > targets.maxWords * 1.25) {
    problems.push({
      code: "TOO_LONG",
      severity: "minor",
      detail: `${wordCount} words > ${Math.round(targets.maxWords * 1.25)}`,
    });
  }

  // Plain-language rule (ADR 0009): user-facing prose reads at or below an
  // 8th-grade level, scored with esoteric names normalized out.
  const readability = fleschKincaidGrade(fullText);
  if (readability.grade > MAX_USER_FACING_GRADE) {
    problems.push({
      code: "READING_LEVEL_TOO_HIGH",
      severity: "repairable",
      detail: `grade ${readability.grade} > ${MAX_USER_FACING_GRADE}`,
    });
  }

  // Prohibited language classes.
  for (const hit of scanPatterns(fullText, TECHNICAL_LANGUAGE)) {
    problems.push({ code: "TECHNICAL_LANGUAGE", severity: "repairable", detail: hit });
  }
  for (const hit of scanPatterns(fullText, MYSTICAL_FILLER)) {
    problems.push({ code: "MYSTICAL_FILLER", severity: "repairable", detail: hit });
  }
  for (const hit of scanPatterns(fullText, UNSUPPORTED_ESOTERICA)) {
    problems.push({ code: "UNSUPPORTED_ESOTERICA", severity: "fatal", detail: hit });
  }
  for (const hit of scanPatterns(fullText, DIRECT_PREDICTION)) {
    problems.push({ code: "DIRECT_PREDICTION", severity: "repairable", detail: hit });
  }
  for (const hit of scanPatterns(fullText, PROHIBITED_TOPICS)) {
    problems.push({ code: "PROHIBITED_TOPIC", severity: "fatal", detail: hit });
  }
  for (const hit of scanBiography(fullText, context.reading.situation)) {
    problems.push({ code: "UNSUPPORTED_BIOGRAPHY", severity: "fatal", detail: hit });
  }

  // Chat framing / ending question (spec §15.4).
  const lastParagraph = synthesis.paragraphs[synthesis.paragraphs.length - 1];
  if (lastParagraph && /\?\s*$/.test(lastParagraph.text.trim())) {
    problems.push({
      code: "ENDS_WITH_QUESTION",
      severity: "repairable",
      detail: "final paragraph ends with a question",
    });
  }
  if (/would you like me to|let me know if|ask me anything|how can i help/i.test(fullText)) {
    problems.push({ code: "CHAT_FRAMING", severity: "repairable", detail: "conversational close" });
  }

  // Unavailable-factor references (spec §17.1).
  if (!context.capability.natalHouses) {
    if (
      /\b(ascendant|rising sign|midheaven|natal houses?)\b/i.test(fullText) ||
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d{1,2}(?:st|nd|rd|th))\s+house\b/i.test(fullText)
    ) {
      problems.push({
        code: "UNAVAILABLE_FACTOR",
        severity: "fatal",
        detail: "references houses/angles without exact birth data",
      });
    }
  }
  if (!context.capability.numerology && /\blife path\b/i.test(fullText)) {
    problems.push({
      code: "UNAVAILABLE_FACTOR",
      severity: "fatal",
      detail: "references numerology without a birth date",
    });
  }
  if (!context.capability.birthDateProvided && /\byour natal\b/i.test(fullText)) {
    problems.push({
      code: "UNAVAILABLE_FACTOR",
      severity: "fatal",
      detail: "references natal factors without birth data",
    });
  }

  // Correspondence grounding heuristic (spec §17.1): astrological vocabulary
  // in the prose must exist somewhere in the supplied context.
  const vocabulary = contextVocabulary(context);
  const lowerText = fullText.toLowerCase();
  for (const term of CORRESPONDENCE_VOCAB) {
    if (new RegExp(`\\b${term}\\b`).test(lowerText) && !vocabulary.includes(term)) {
      problems.push({
        code: "UNSUPPORTED_CORRESPONDENCE",
        severity: "fatal",
        detail: term,
      });
    }
  }

  const fatal = problems.some((p) => p.severity === "fatal");
  const repairNeeded = problems.some((p) => p.severity === "repairable");
  return {
    ok: !fatal && !repairNeeded,
    problems,
    // Any non-minor problem warrants the single repair attempt (spec §17.1).
    repairable: fatal || repairNeeded,
  };
}

/** Deterministic quality flags — computed, never taken from the model. */
export function computeQualityFlags(
  synthesis: ReadingSynthesis,
): ReadingSynthesis["qualityFlags"] {
  const text = synthesis.paragraphs.map((p) => p.text).join("\n");
  return {
    containsDirectPrediction: scanPatterns(text, DIRECT_PREDICTION).length > 0,
    containsUnsupportedBiography: scanBiography(text, undefined).length > 0,
    containsUnsupportedCorrespondence:
      scanPatterns(text, UNSUPPORTED_ESOTERICA).length > 0,
  };
}

/** Build the narrow correction instruction for the single repair call. */
export function repairInstruction(problems: ValidationProblem[]): string {
  const lines = problems
    .filter((p) => p.severity !== "minor")
    .map((p) => `- ${p.code}: ${p.detail}`)
    .slice(0, 12);
  const extras: string[] = [];
  if (problems.some((p) => p.code === "READING_LEVEL_TOO_HIGH")) {
    extras.push(
      "Rewrite in plainer language: short sentences (most under 18 words), common words, one idea per sentence. Keep the card, sign, and planet names.",
    );
  }
  return [
    "Your previous output violated the reading contract. Rewrite it using the same evidence and the same JSON schema, correcting exactly these problems:",
    ...lines,
    ...extras,
    "Do not introduce new evidence ids, new correspondences, or new personal facts.",
  ].join("\n");
}
