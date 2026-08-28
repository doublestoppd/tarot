import { ESSENCES } from "@/data/tarot/essences";
import type {
  ReadingContextCard,
  ReadingContext,
  ReadingSynthesis,
} from "./types";
import { DEPTH_TARGETS } from "./types";

/**
 * Narrative reading composer (ADR 0009). Deterministically writes ONE story
 * from the whole spread instead of a card-by-card catalog: positions are
 * classified into story beats (ground, what's underneath, what's leaving,
 * the push and the pull, what's in the open, the moving parts, where it
 * leans), each beat weaves its cards together, and the opening states the
 * arc of the entire spread in a sentence. Used by both the internal
 * synthesizer and the deterministic fallback, so the two never diverge in
 * quality. Every paragraph cites the evidence ids of the cards it draws on.
 */

type Beat =
  | "ground"
  | "depth"
  | "past"
  | "drag"
  | "help"
  | "open"
  | "motion"
  | "outcome";

const BEAT_ORDER: Beat[] = [
  "ground",
  "depth",
  "past",
  "help", // when drag also exists, help+drag render as one "forces" paragraph
  "drag", // only reached when no help beat consumed it
  "open",
  "motion",
  "outcome",
];

function beatFor(positionId: string, positionLabel: string): Beat {
  const key = `${positionId} ${positionLabel}`.toLowerCase();
  if (/hidden|blind|unseen|less_visible|root|foundation|hopes_fears/.test(key)) return "depth";
  if (/past|ending|recent|waning/.test(key)) return "past";
  if (/resistance|constraint|tension|crossing|caution/.test(key)) return "drag";
  if (/support|resource|strength|remains/.test(key)) return "help";
  if (/direction|outcome|next_phase|trajectory|developing_dynamic/.test(key)) return "outcome";
  if (/pull_|integrat|adjustment|to_develop|repetition|emerging|ripening|near_development/.test(key)) return "motion";
  if (/expressed|environment|influence|aim|opportunity/.test(key)) return "open";
  if (/present|surface|atmosphere|orientation|self|cycle_now|pattern|action|feeling|thought|material|heart/.test(key)) return "ground";
  return "open";
}

/** Short handle with its article: "a fresh spark", "the grip of a habit". */
function essenceOf(card: ReadingContextCard): string {
  const entry = ESSENCES[card.cardId];
  if (!entry) return `what ${card.name} names`;
  return card.orientation === "reversed" ? entry.reversed : entry.upright;
}

/** "Death, reversed," — subject form, safe mid-sentence before a verb/prep. */
function nameRev(card: ReadingContextCard): string {
  return `${card.name}${card.orientation === "reversed" ? ", reversed," : ""}`;
}

function seatOf(card: ReadingContextCard): string {
  return `"${card.positionLabel.toLowerCase().replace(/\s*\/\s*/g, " and ")}"`;
}

const NUM_WORDS = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten",
];
function numWord(n: number): string {
  return NUM_WORDS[n] ?? String(n);
}

function lcPurpose(purpose: string): string {
  return purpose.charAt(0).toLowerCase() + purpose.slice(1).replace(/\.$/, "");
}

/** "Habits & patterns" → "habits and patterns" for use mid-sentence. */
function humanize(label: string): string {
  return label.toLowerCase().replace(/\s*&\s*/g, " and ");
}

/** Lowercase only the leading article of a theme label ("A Saturn tone"). */
function lcFirst(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

interface Paragraph {
  text: string;
  evidenceIds: string[];
}

export function composeNarrativeReading(context: ReadingContext): ReadingSynthesis {
  const { cards } = context.reading;
  const paragraphs: Paragraph[] = [];

  // The provider only ever sees providerEvidence — cite nothing outside it.
  const citable = new Set([
    ...context.providerEvidence.map((e) => e.id),
    ...cards.map((c) => c.evidenceId),
    ...context.tensions.map((t) => t.id),
  ]);
  const topTheme = context.themes[0];
  const themeIds = topTheme
    ? topTheme.evidenceIds.filter((id) => citable.has(id))
    : [];
  const tension = context.tensions[0];

  const byBeat = new Map<Beat, ReadingContextCard[]>();
  for (const card of cards) {
    const beat = beatFor(card.positionId, card.positionLabel);
    const list = byBeat.get(beat) ?? [];
    list.push(card);
    byBeat.set(beat, list);
  }
  const groundCard = byBeat.get("ground")?.[0];
  const depthCard = byBeat.get("depth")?.[0];
  const outcomeCard = byBeat.get("outcome")?.[0];

  const focusPhrase = humanize(context.reading.focus.label);
  const insightPhrase = humanize(context.reading.insight.label);

  // ---- Opening: the question, then the arc of the whole spread. ----------
  const opening: string[] = [
    `You asked the cards about ${focusPhrase}, with an eye out for ${insightPhrase}.`,
  ];
  const thesisParts: string[] = [];
  if (groundCard) thesisParts.push(`${essenceOf(groundCard)} in plain view`);
  if (depthCard) thesisParts.push(`${essenceOf(depthCard)} underneath it`);
  if (outcomeCard) thesisParts.push(`a road that leans toward ${essenceOf(outcomeCard)}`);
  if (thesisParts.length >= 2) {
    opening.push(`Read together, they tell one story: ${listJoin(thesisParts)}.`);
  } else if (thesisParts.length === 1) {
    opening.push(`Read together, they tell one story, and it starts with ${thesisParts[0]}.`);
  }
  if (topTheme) {
    opening.push(
      `Running under all of it, ${lcFirst(topTheme.label)} keeps sounding from more than one direction.`,
    );
  }
  if (tension) {
    opening.push(
      `And the whole spread is strung between ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()}. That strain is not a flaw in the reading. It is the reading.`,
    );
  }
  paragraphs.push({
    text: opening.join(" "),
    evidenceIds:
      themeIds.length > 0
        ? themeIds.slice(0, 2)
        : [(groundCard ?? cards[0]!).evidenceId],
  });

  // ---- Story beats. ------------------------------------------------------
  const emitted = new Set<ReadingContextCard>();
  const emit = (text: string, beatCards: ReadingContextCard[]) => {
    paragraphs.push({ text, evidenceIds: beatCards.map((c) => c.evidenceId) });
    for (const c of beatCards) emitted.add(c);
  };

  for (const beat of BEAT_ORDER) {
    const beatCards = byBeat.get(beat) ?? [];
    if (beatCards.length === 0) continue;

    if (beat === "ground") {
      const [first, ...rest] = beatCards;
      const parts = [
        `Start with where you are standing. ${nameRev(first!)} holds the ${seatOf(first!)} seat, ${lcPurpose(first!.positionPurpose)}. ${first!.canonicalMeaningSummary}`,
      ];
      for (const card of rest) {
        parts.push(`${nameRev(card)} widens that ground from ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
      }
      if (rest.length >= 2) {
        parts.push(
          `These are not separate verdicts. They are one situation described from ${numWord(beatCards.length)} sides.`,
        );
      }
      emit(parts.join(" "), beatCards);
    }

    if (beat === "depth") {
      const [first, ...rest] = beatCards;
      const parts = [
        `${groundCard ? `Now the part ${groundCard.name} does not show. ` : ""}Underneath the surface sits ${nameRev(first!)} in the ${seatOf(first!)} seat. ${first!.canonicalMeaningSummary}`,
      ];
      if (groundCard) {
        parts.push(
          `Hold the two layers together and the pattern starts to explain itself: ${essenceOf(groundCard)} on top, ${essenceOf(first!)} below. The one keeps producing the other.`,
        );
      }
      for (const card of rest) {
        parts.push(`Deeper still, ${nameRev(card)} waits in ${seatOf(card)}. ${card.canonicalMeaningSummary}`);
      }
      emit(parts.join(" "), beatCards);
    }

    if (beat === "past") {
      const [first, ...rest] = beatCards;
      const parts = [
        `Part of this story is already leaving. ${nameRev(first!)} in ${seatOf(first!)} marks it: ${first!.canonicalMeaningSummary}`,
      ];
      for (const card of rest) {
        parts.push(`So is ${nameRev(card)} in ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
      }
      parts.push(`Let that part finish going. What comes next is not built on it.`);
      emit(parts.join(" "), beatCards);
    }

    if (beat === "help") {
      // Help and drag render together as the spread's contest.
      const dragCards = byBeat.get("drag") ?? [];
      const parts: string[] = [];
      if (dragCards.length > 0) {
        parts.push(`Now the push and the pull inside ${focusPhrase}.`);
      }
      for (const card of beatCards) {
        parts.push(
          `${parts.length <= 1 ? "In your corner" : "Also in your corner"}, ${nameRev(card)} holds ${seatOf(card)}. ${card.canonicalMeaningSummary}`,
        );
      }
      for (const card of dragCards) {
        parts.push(
          `Pressing the other way, ${nameRev(card)} sits in ${seatOf(card)}. ${card.canonicalMeaningSummary}`,
        );
      }
      if (dragCards.length > 0) {
        const helpEss = essenceOf(beatCards[0]!);
        const dragEss = essenceOf(dragCards[0]!);
        parts.push(
          `Put side by side, the real contest here is ${helpEss} against ${dragEss}. On a hard day, ask which one is steering.`,
        );
      } else {
        parts.push(`Whatever else moves in this reading, that part stays available to you.`);
      }
      emit(parts.join(" "), [...beatCards, ...dragCards]);
    }

    if (beat === "drag") {
      const remaining = beatCards.filter((c) => !emitted.has(c));
      if (remaining.length > 0) {
        const parts = [
          `The pushback in this story lives with ${nameRev(remaining[0]!)} in ${seatOf(remaining[0]!)}. ${remaining[0]!.canonicalMeaningSummary}`,
        ];
        for (const card of remaining.slice(1)) {
          parts.push(`Alongside it, ${nameRev(card)} in ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
        }
        parts.push(`That is the friction in the plot. It is workable once it is named.`);
        emit(parts.join(" "), remaining);
      }
    }

    if (beat === "open") {
      const [first, ...rest] = beatCards;
      const parts = [
        `Out in the open, where everyone involved can feel it, ${nameRev(first!)} stands in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
      ];
      for (const card of rest) {
        parts.push(`Beside it, ${nameRev(card)} holds ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
      }
      if (rest.length >= 2) {
        parts.push(
          `Read side by side, these are one situation looked at from ${numWord(beatCards.length)} angles, not ${numWord(beatCards.length)} separate answers.`,
        );
      }
      emit(parts.join(" "), beatCards);
    }

    if (beat === "motion") {
      const [first, ...rest] = beatCards;
      const parts = [
        `The moving part is ${nameRev(first!)} in the ${seatOf(first!)} seat. ${first!.canonicalMeaningSummary}`,
      ];
      for (const card of rest) {
        parts.push(`The other moving part: ${nameRev(card)} in ${seatOf(card)}. ${card.canonicalMeaningSummary}`);
      }
      parts.push(
        rest.length > 0
          ? `Between those motions is where your actual next step lives.`
          : `That is the practice this spread hands you.`,
      );
      emit(parts.join(" "), beatCards);
    }

    if (beat === "outcome") {
      const [first, ...rest] = beatCards;
      const parts = [
        `All of it leans toward ${nameRev(first!)} in the ${seatOf(first!)} seat. ${first!.canonicalMeaningSummary}`,
      ];
      for (const card of rest) {
        parts.push(`Alongside it, ${nameRev(card)} in ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
      }
      if (groundCard) {
        parts.push(
          `Set that against the opening and the whole arc shows itself: this reading runs from ${essenceOf(groundCard)} toward ${essenceOf(first!)}. A direction like that is a current, not a verdict. You can steer inside it.`,
        );
      } else {
        parts.push(`A direction like that is a current, not a verdict. You can steer inside it.`);
      }
      emit(parts.join(" "), beatCards);
    }
  }

  // Safety net: any card the beats somehow missed still gets voiced.
  const missed = cards.filter((c) => !emitted.has(c));
  if (missed.length > 0) {
    const parts = missed.map(
      (c) => `${nameRev(c)} in ${seatOf(c)} adds its note: ${c.canonicalMeaningSummary}`,
    );
    paragraphs.push({ text: parts.join(" "), evidenceIds: missed.map((c) => c.evidenceId) });
  }

  // ---- Corroborating signals: deck mechanics + personal echoes. ----------
  const patternNodes = context.tarotPatterns.filter((p) => citable.has(p.id)).slice(0, 2);
  const personal = context.resonances
    .filter((r) => r.category === "personal" && citable.has(r.id))
    .slice(0, 2);
  if (patternNodes.length > 0 || personal.length > 0) {
    const parts: string[] = [];
    if (patternNodes.length > 0) {
      parts.push(`The deck backed this story up in its own mechanics.`);
      parts.push(patternNodes.map((p) => p.statement).join(" "));
    }
    if (personal.length > 0) {
      parts.push(patternNodes.length > 0 ? `And it got personal.` : `The deck also got personal.`);
      parts.push(personal.map((p) => p.statement).join(" "));
      parts.push(`Those threads are yours specifically: your own dates and chart repeating what the shuffle drew.`);
    }
    paragraphs.push({
      text: parts.join(" "),
      evidenceIds: [...patternNodes.map((p) => p.id), ...personal.map((p) => p.id)],
    });
  }

  // ---- Tension, with the cards named on each side. -----------------------
  if (tension) {
    const nameByEvidence = new Map(cards.map((c) => [c.evidenceId, c.name]));
    const sideA = tension.evidenceAIds
      .map((id) => nameByEvidence.get(id))
      .filter((n): n is string => Boolean(n));
    const sideB = tension.evidenceBIds
      .map((id) => nameByEvidence.get(id))
      .filter((n): n is string => Boolean(n));
    const text =
      sideA.length > 0 && sideB.length > 0
        ? `You can see the spread's central strain in the cards themselves: ${listJoin(sideA)} pull${sideA.length === 1 ? "s" : ""} toward ${tension.themeA.toLowerCase()}, while ${listJoin(sideB)} hold${sideB.length === 1 ? "s" : ""} the line for ${tension.themeB.toLowerCase()}. Do not force a winner. Ask which rooms of your life each side lives in, because they are rarely the same room.`
        : `The central strain runs between ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()}. Both sides have real cards behind them, so the honest reading keeps both.`;
    paragraphs.push({
      text,
      evidenceIds: [...tension.evidenceAIds.slice(0, 2), ...tension.evidenceBIds.slice(0, 2)],
    });
  }

  // ---- Closing, stretched from a pool until the depth floor is met. ------
  const wordCount = () =>
    paragraphs.map((p) => p.text).join(" ").split(/\s+/).length;
  const closingSentences = [
    `That is the story these ${numWord(cards.length)} cards tell together.`,
    `None of it is a verdict: the cards frame the question, and you still hold the answer.`,
    `If one line of it stopped you as you read, trust that pause. It is usually pointing at the part that matters.`,
  ];
  const stretchPool = [
    "A reading like this works best when it is carried lightly. Let the strong threads name what you already sense, and let the strange ones raise a question you had not asked. Come back to the spread in a few days and notice which parts still speak.",
    "You do not have to act on any of this today. Notice where a card made you pause, and start your own thinking there. The pause is usually pointing at something real.",
    "If one image stays with you, keep it close. A single card, sat with honestly, often does more work than a whole spread read in a hurry.",
    "None of this is a command. The cards describe weather, not orders. You stay the one who decides how to walk in it.",
    "It can help to say the reading back in your own words, out loud or on paper. The parts you reach for first are the parts that already landed.",
    "And if the spread feels heavier than your actual life does, trust your life. The cards sketch the weather of one moment, and moments move.",
  ];
  const closingWords = () => closingSentences.join(" ").split(/\s+/).length;
  for (const stretch of stretchPool) {
    if (wordCount() + closingWords() >= DEPTH_TARGETS[context.reading.depth].minWords) {
      break;
    }
    closingSentences.push(stretch);
  }
  const closeAnchorA = outcomeCard ?? cards[cards.length - 1]!;
  const closeAnchorB = groundCard ?? cards[0]!;
  paragraphs.push({
    text: closingSentences.join(" "),
    evidenceIds: [
      ...new Set([closeAnchorA.evidenceId, closeAnchorB.evidenceId]),
    ],
  });

  return {
    title: topTheme
      ? topTheme.label
          .replace(/^A repeated /, "The Repeating ")
          .replace(/^A /, "The ")
          .replace(/^The current of /, "Under ")
      : `From ${closeAnchorB.name} to ${closeAnchorA.name}`,
    paragraphs,
    usedEvidenceIds: [...new Set(paragraphs.flatMap((p) => p.evidenceIds))],
    qualityFlags: {
      containsDirectPrediction: false,
      containsUnsupportedBiography: false,
      containsUnsupportedCorrespondence: false,
    },
  };
}
