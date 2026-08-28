import { ESSENCES } from "@/data/tarot/essences";
import { TEXTURES } from "@/data/tarot/textures";
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

/** Concrete daily-life image, framed by the caller as possibility. */
function textureOf(card: ReadingContextCard): string | null {
  const entry = TEXTURES[card.cardId];
  if (!entry) return null;
  return card.orientation === "reversed" ? entry.reversed : entry.upright;
}

/** "Death, reversed," — subject form, safe mid-sentence before a verb/prep. */
function nameRev(card: ReadingContextCard): string {
  return `${card.name}${card.orientation === "reversed" ? ", reversed," : ""}`;
}

/** "Death, reversed" — object form for slots followed by punctuation. */
function nameRevEnd(card: ReadingContextCard): string {
  return `${card.name}${card.orientation === "reversed" ? ", reversed" : ""}`;
}

/** "the hidden factor seat" — spoken naturally, never scare-quoted. */
function seatOf(card: ReadingContextCard): string {
  return `the ${card.positionLabel.toLowerCase().replace(/\s*\/\s*/g, " and ")} seat`;
}

/** The chosen lens as a natural intent clause, not a pasted menu label. */
const INSIGHT_INTENT: Record<string, string> = {
  broader_picture: "reading for the whole picture",
  not_obvious: "asking for the part that is easy to miss",
  influence: "asking what is driving things",
  support: "asking what you can lean on",
  resistance: "asking what is in the way",
  change: "asking what is shifting",
  caution: "asking where to be careful",
  potential: "asking what is opening up",
  integration: "asking how to hold it all together",
  direction: "asking which way things are leaning",
};

/** Domains that are about people, so the reading should say so. */
const RELATIONAL_DOMAINS = new Set(["love", "home", "conflict"]);

const TITLE_SMALL_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "at", "to", "on", "for",
  "with", "without", "from", "that", "its", "your", "own", "not",
]);

/** "a load being set down" → "A Load Being Set Down". */
function titleCase(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((word, i) =>
      i > 0 && TITLE_SMALL_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ")
    .replace(/[.,]$/, "");
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

/**
 * Deterministic per-reading phrasing variation (ADR 0010): the same draw
 * always renders identically, but two different readings pick different
 * variants of every connective sentence, so no stock phrase repeats
 * verbatim across readings. xorshift32 seeded from the draw itself.
 */
function seededChooser(seedText: string): <T>(...options: T[]) => T {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  if (h === 0) h = 0x9e3779b9;
  return <T>(...options: T[]): T => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5;
    h >>>= 0;
    return options[h % options.length]!;
  };
}

interface Paragraph {
  text: string;
  evidenceIds: string[];
}

export function composeNarrativeReading(context: ReadingContext): ReadingSynthesis {
  const { cards } = context.reading;
  const paragraphs: Paragraph[] = [];
  const v = seededChooser(
    cards.map((c) => `${c.cardId}:${c.orientation}`).join("|") +
      context.reading.spread.id,
  );

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
  const intent =
    INSIGHT_INTENT[context.reading.insight.id] ??
    `reading for ${humanize(context.reading.insight.label)}`;

  // ---- Opening: the question, then the arc of the whole spread. ----------
  const opening: string[] = [
    v(
      `You asked the cards about ${focusPhrase}, ${intent}.`,
      `You brought the cards a question about ${focusPhrase}, ${intent} above all.`,
      `The question on the table is ${focusPhrase}, and you came ${intent}.`,
      `You came in with ${focusPhrase} on your mind, ${intent}.`,
    ),
  ];
  if (RELATIONAL_DOMAINS.has(context.reading.domain.id)) {
    opening.push(
      v(
        `Because this is a question about people, read what follows as things moving between you and them, not only inside you.`,
        `A question like this always has more than one person in it, so read these cards as the space between people, not just your own interior.`,
      ),
    );
  }
  const thesisParts: string[] = [];
  if (groundCard) thesisParts.push(`${essenceOf(groundCard)} in plain view`);
  if (depthCard) thesisParts.push(`${essenceOf(depthCard)} underneath it`);
  if (outcomeCard) thesisParts.push(`a road that leans toward ${essenceOf(outcomeCard)}`);
  if (thesisParts.length >= 2) {
    opening.push(
      v(
        `Read together, they tell one story: ${listJoin(thesisParts)}.`,
        `Laid side by side, the cards agree on a shape: ${listJoin(thesisParts)}.`,
        `Taken as one picture, it looks like this: ${listJoin(thesisParts)}.`,
      ),
    );
  } else if (thesisParts.length === 1) {
    opening.push(
      v(
        `Read together, they tell one story, and it starts with ${thesisParts[0]}.`,
        `Taken as one picture, the story starts with ${thesisParts[0]}.`,
      ),
    );
  }
  if (topTheme) {
    opening.push(
      v(
        `Running under all of it, ${lcFirst(topTheme.label)} keeps sounding from more than one direction.`,
        `One note repeats beneath everything here: ${lcFirst(topTheme.label)}, arriving from more than one direction.`,
        `And underneath it all, ${lcFirst(topTheme.label)} hums along steadily.`,
      ),
    );
  }
  if (tension) {
    const ta = tension.themeA.toLowerCase();
    const tb = tension.themeB.toLowerCase();
    opening.push(
      v(
        `And the whole spread is strung between ${ta} and ${tb}. That strain is not a flaw in the reading. It is the reading.`,
        `The spread also pulls two ways at once, toward ${ta} and toward ${tb}. Both pulls are earned, and the cards below show exactly where each one lives.`,
        `There is a live wire running through it too: ${ta} at one end, ${tb} at the other. The reading happens between them.`,
      ),
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
      const groundTexture = textureOf(first!);
      const groundOpen = v(
        "Start with where you are standing.",
        "Begin with the ground under your feet.",
        "First, the part you can already see.",
      );
      const textureLead = v(
        "In daily life, that often looks like",
        "Day to day, this tends to look like",
        "You would know it in the wild as",
      );
      const parts = [
        `${groundOpen} ${nameRev(first!)} holds ${seatOf(first!)}, ${lcPurpose(first!.positionPurpose)}. ${first!.canonicalMeaningSummary}${groundTexture ? ` ${textureLead} ${groundTexture}.` : ""}`,
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
      const depthTexture = textureOf(first!);
      const reveal = groundCard
        ? v(
            `Now the part ${groundCard.name} does not show. Underneath the surface sits ${nameRev(first!)} in ${seatOf(first!)}.`,
            `But ${groundCard.name} is only the visible half. Below it, ${nameRev(first!)} holds ${seatOf(first!)}.`,
            `The spread then reaches under that surface. In ${seatOf(first!)} sits ${nameRev(first!)}.`,
          )
        : v(
            `Down at the base of this sits ${nameRev(first!)} in ${seatOf(first!)}.`,
            `Underneath everything else, ${nameRev(first!)} holds ${seatOf(first!)}.`,
          );
      const recognize = v(
        "You may recognize it as",
        "In practice it can look like",
        "It tends to wear a familiar costume:",
      );
      // A hidden-factor claim about behavior is offered as a hypothesis,
      // never a charge — the reading cannot know it fits.
      const hypothesis =
        first!.orientation === "reversed"
          ? " " +
            v(
              `If that does not sound like you, set it down gently, but test it against your actual week first. Hidden factors earn the name by being easy to deny.`,
              `Hold that as a hypothesis to try on, not a verdict to accept. If it fits nothing you recognize, let it go.`,
            )
          : "";
      const parts = [
        `${reveal} ${first!.canonicalMeaningSummary}${depthTexture ? ` ${recognize} ${depthTexture}.` : ""}${hypothesis}`,
      ];
      if (groundCard) {
        parts.push(
          v(
            `Hold the two layers together and the pattern starts to explain itself: ${essenceOf(groundCard)} on top, ${essenceOf(first!)} below. The one keeps producing the other.`,
            `Put the layers together and you can see the mechanism: ${essenceOf(first!)} underneath keeps feeding ${essenceOf(groundCard)} above.`,
            `Seen as one system, it clicks: ${essenceOf(groundCard)} up top, ${essenceOf(first!)} at the base, each maintaining the other.`,
          ),
        );
      }
      for (const card of rest) {
        parts.push(
          v(
            `Deeper still, ${nameRev(card)} waits in ${seatOf(card)}. ${card.canonicalMeaningSummary}`,
            `Further down, ${nameRev(card)} holds ${seatOf(card)}. ${card.canonicalMeaningSummary}`,
          ),
        );
      }
      emit(parts.join(" "), beatCards);
    }

    if (beat === "past") {
      const [first, ...rest] = beatCards;
      const parts = [
        v(
          `Part of this story is already leaving. ${nameRev(first!)} in ${seatOf(first!)} marks it: ${first!.canonicalMeaningSummary}`,
          `Some of this is already on its way out. ${nameRev(first!)} in ${seatOf(first!)} names it: ${first!.canonicalMeaningSummary}`,
        ),
      ];
      for (const card of rest) {
        parts.push(`So is ${nameRev(card)} in ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
      }
      parts.push(
        v(
          `Let that part finish going. What comes next is not built on it.`,
          `Give that part permission to finish leaving. The next chapter does not rest on it.`,
        ),
      );
      emit(parts.join(" "), beatCards);
    }

    if (beat === "help") {
      // Help and drag render together as the spread's contest.
      const dragCards = byBeat.get("drag") ?? [];
      const parts: string[] = [];
      if (dragCards.length > 0) {
        parts.push(
          v(
            `Now the push and the pull inside ${focusPhrase}.`,
            `Every real question has a push and a pull, and this one shows both.`,
            `Here is the contest at the middle of it.`,
          ),
        );
      }
      const cornerLead = v("In your corner", "On your side of the table", "Working for you");
      for (const card of beatCards) {
        parts.push(
          `${parts.length <= 1 ? cornerLead : "Also in your corner"}, ${nameRev(card)} holds ${seatOf(card)}. ${card.canonicalMeaningSummary}`,
        );
      }
      const againstLead = v("Pressing the other way", "Leaning against it", "As the counterweight");
      const dragTextureLead = v(
        "That side of it tends to show up as",
        "In real weeks, that side looks like",
        "Its everyday face is",
      );
      for (const [dragIndex, card] of dragCards.entries()) {
        const dragTexture = dragIndex === 0 ? textureOf(card) : null;
        parts.push(
          `${againstLead}, ${nameRev(card)} sits in ${seatOf(card)}. ${card.canonicalMeaningSummary}${dragTexture ? ` ${dragTextureLead} ${dragTexture}.` : ""}`,
        );
      }
      if (dragCards.length > 0) {
        const helpEss = essenceOf(beatCards[0]!);
        const dragEss = essenceOf(dragCards[0]!);
        parts.push(
          v(
            `Put side by side, the real contest here is ${helpEss} against ${dragEss}. On a hard day, ask which one is steering.`,
            `Strip it to one line and the match-up reads: ${helpEss} versus ${dragEss}. Notice, day to day, which one has the wheel.`,
            `That is the actual fight, ${helpEss} on one side and ${dragEss} on the other. When things feel stuck, check which one is winning that hour.`,
          ),
        );
      } else {
        parts.push(
          v(
            `Whatever else moves in this reading, that part stays available to you.`,
            `However the rest shifts, that piece stays in your hands.`,
            `Everything else here can wobble; that part holds.`,
          ),
        );
      }
      emit(parts.join(" "), [...beatCards, ...dragCards]);
    }

    if (beat === "drag") {
      const remaining = beatCards.filter((c) => !emitted.has(c));
      if (remaining.length > 0) {
        const parts = [
          v(
            `The pushback in this story lives with ${nameRev(remaining[0]!)} in ${seatOf(remaining[0]!)}. ${remaining[0]!.canonicalMeaningSummary}`,
            `What resists you here is ${nameRevEnd(remaining[0]!)}, in ${seatOf(remaining[0]!)}. ${remaining[0]!.canonicalMeaningSummary}`,
          ),
        ];
        for (const card of remaining.slice(1)) {
          parts.push(`Alongside it, ${nameRev(card)} in ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
        }
        parts.push(
          v(
            `That is the friction in the plot. It is workable once it is named.`,
            `Name that friction plainly and it loses some of its size.`,
          ),
        );
        emit(parts.join(" "), remaining);
      }
    }

    if (beat === "open") {
      const [first, ...rest] = beatCards;
      const parts = [
        v(
          `Out in the open, where everyone involved can feel it, ${nameRev(first!)} stands in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
          `In plain air, felt by everyone in the room, ${nameRev(first!)} holds ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
          `The visible weather here is ${nameRev(first!)} in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
        ),
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
      const isPulls = beatCards.every((c) => c.positionId.startsWith("pull_"));
      const parts: string[] = [];
      if (isPulls && beatCards.length >= 2) {
        // A choice's two pulls each speak through their own card.
        for (const card of beatCards) {
          const pullName = humanize(card.positionLabel); // "pull toward change"
          parts.push(
            `The ${pullName} speaks through ${nameRevEnd(card)}. ${card.canonicalMeaningSummary}`,
          );
        }
        parts.push(
          v(
            `Those are the two voices in this choice, each with a real case. Notice which one your body already leans toward when nobody is watching; that lean is information.`,
            `Both pulls are speaking in good faith here. Before you argue with either one, notice which of these two descriptions made your shoulders drop; that is usually the honest one.`,
          ),
        );
      } else {
        parts.push(
          v(
            `The moving part is ${nameRev(first!)} in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
            `What is actually in motion here: ${nameRevEnd(first!)}, in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
            `${nameRev(first!)} is where things are moving, from ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
          ),
        );
        for (const card of rest) {
          parts.push(`The other moving part: ${nameRev(card)} in ${seatOf(card)}. ${card.canonicalMeaningSummary}`);
        }
        parts.push(
          rest.length > 0
            ? v(
                `Between those motions is where your actual next step lives.`,
                `Your next real step sits somewhere between those two motions.`,
                `Work those two together and the next step names itself.`,
              )
            : v(
                `That is the practice this spread hands you.`,
                `Treat it as this stretch's assignment.`,
                `That is the lever you can actually reach.`,
              ),
        );
      }
      emit(parts.join(" "), beatCards);
    }

    if (beat === "outcome") {
      const [first, ...rest] = beatCards;
      const parts = [
        v(
          `All of it leans toward ${nameRev(first!)} in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
          `Everything above tilts toward ${nameRevEnd(first!)}, sitting in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
          `Follow the grain of the spread and it ends at ${nameRevEnd(first!)}, in ${seatOf(first!)}. ${first!.canonicalMeaningSummary}`,
        ),
      ];
      for (const card of rest) {
        parts.push(`Alongside it, ${nameRev(card)} in ${seatOf(card)}: ${card.canonicalMeaningSummary}`);
      }
      // A reversed direction card is the hazard on the road, not a promised
      // destination — say so, or the recommended direction reads as doom.
      if (first!.orientation === "reversed") {
        parts.push(
          v(
            `Read that as the hazard sign on this road, not the destination you are owed. Left alone, things drift toward ${essenceOf(first!)}; catching the drift early is exactly what steering is for.`,
            `That is where the current runs if nothing changes, which is precisely why the spread shows it: ${essenceOf(first!)} is the thing to steer against, and there is still plenty of road.`,
          ),
        );
      } else if (groundCard) {
        parts.push(
          v(
            `Set that against ${groundCard.name} at the start and the whole arc shows itself, leaning toward ${essenceOf(first!)}. A direction like that is a current, not a verdict. You can steer inside it.`,
            `Hold it next to where ${groundCard.name} opened and the arc is plain, bending toward ${essenceOf(first!)}. That is a drift, not a sentence passed on you, and drift answers to hands.`,
            `Look back at ${groundCard.name} and the line draws itself, ending in ${essenceOf(first!)}. Nothing about it is sealed; it is the direction things lean while nothing changes.`,
          ),
        );
      } else {
        parts.push(
          v(
            `A direction like that is a current, not a verdict. You can steer inside it.`,
            `Read it as a lean, not a locked door. Your hands are still on this.`,
          ),
        );
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
  // Two natal placements can echo the same card+sign; keep one voice each.
  const personalTails = new Set<string>();
  const personal = context.resonances
    .filter((r) => r.category === "personal" && citable.has(r.id))
    .filter((r) => {
      const tail = r.statement.split(". ").slice(1).join(". ");
      if (personalTails.has(tail)) return false;
      personalTails.add(tail);
      return true;
    })
    .slice(0, 2);
  // One citable current-sky echo, so the celestial layer the app computes
  // is visible in the prose, not only claimed in the basis panel.
  const skyEcho = context.resonances.find(
    (r) => r.category === "current_sky" && citable.has(r.id),
  );
  // When birth details were given but nothing resonated with this draw, say
  // so plainly — the data was used, honestly, even when it stays quiet.
  const birthQuiet =
    context.capability.birthDateProvided && personal.length === 0;
  if (patternNodes.length > 0 || personal.length > 0 || skyEcho || birthQuiet) {
    const parts: string[] = [];
    if (patternNodes.length > 0) {
      parts.push(
        v(
          `The deck backed this story up in its own mechanics.`,
          `The deal itself repeated the point.`,
          `Even the mechanics of the draw leaned the same way.`,
        ),
      );
      parts.push(patternNodes.map((p) => p.statement).join(" "));
    }
    if (personal.length > 0) {
      parts.push(
        patternNodes.length > 0
          ? v(`And it got personal.`, `It also reached into your own numbers.`, `Then it got specific to you.`)
          : v(`The deck also got personal.`, `The draw also reached into your own numbers.`),
      );
      parts.push(personal.map((p) => p.statement).join(" "));
      parts.push(
        v(
          `Those threads are yours specifically: your own dates and chart repeating what the shuffle drew.`,
          `Those lines belong to you alone, your chart and dates echoing this exact draw.`,
          `That part could not belong to anyone else: your own dates, repeating in the cards.`,
        ),
      );
    }
    if (skyEcho) {
      parts.push(
        v(
          `The sky over the draw added its own note. ${skyEcho.statement}`,
          `And the sky at the moment of the shuffle agreed. ${skyEcho.statement}`,
        ),
      );
    }
    if (birthQuiet) {
      parts.push(
        v(
          `Your birth details were checked against this draw too. Nothing in them repeated strongly enough to lean on, so this reading rests on the cards alone, and says so instead of pretending.`,
          `The draw was also held up against your own dates and chart. This time nothing echoed loudly, and an honest reading leaves it at that rather than inventing a connection.`,
        ),
      );
    }
    const signalIds = [
      ...patternNodes.map((p) => p.id),
      ...personal.map((p) => p.id),
      ...(skyEcho ? [skyEcho.id] : []),
    ];
    paragraphs.push({
      text: parts.join(" "),
      evidenceIds:
        signalIds.length > 0 ? signalIds : [(groundCard ?? cards[0]!).evidenceId],
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
    const ta = tension.themeA.toLowerCase();
    const tb = tension.themeB.toLowerCase();
    const text =
      sideA.length > 0 && sideB.length > 0
        ? v(
            `You can see the spread's central strain in the cards themselves: ${listJoin(sideA)} pull${sideA.length === 1 ? "s" : ""} toward ${ta}, while ${listJoin(sideB)} hold${sideB.length === 1 ? "s" : ""} the line for ${tb}. Do not force a winner. Ask which rooms of your life each side lives in, because they are rarely the same room.`,
            `The spread's deepest argument is visible in the cards: ${listJoin(sideA)} on the side of ${ta}, ${listJoin(sideB)} answering for ${tb}. Neither list cancels the other. Let each claim the part of your life where it is telling the truth.`,
            `Watch where the cards line up: ${listJoin(sideA)} speaking for ${ta}, ${listJoin(sideB)} for ${tb}. The reading does not pick a winner, and you do not have to yet. They are usually about different corners of the same life.`,
          )
        : v(
            `The central strain runs between ${ta} and ${tb}. Both sides have real cards behind them, so the honest reading keeps both.`,
            `Underneath it all, ${ta} and ${tb} keep answering each other. Both are earned, so the reading holds both.`,
          );
    paragraphs.push({
      text,
      evidenceIds: [...tension.evidenceAIds.slice(0, 2), ...tension.evidenceBIds.slice(0, 2)],
    });
  }

  // ---- Closing, stretched from a pool until the depth floor is met. ------
  const wordCount = () =>
    paragraphs.map((p) => p.text).join(" ").split(/\s+/).length;
  // The takeaway: one line that reframes the question, built from the
  // spread's own structure (root feeds surface > contest > arc).
  const helpFirst = byBeat.get("help")?.[0];
  const dragFirst = byBeat.get("drag")?.[0];
  let takeaway: string;
  if (groundCard && depthCard) {
    takeaway = v(
      `what shows up as ${essenceOf(groundCard)} is being fed by ${essenceOf(depthCard)}. Tend the root and the surface follows`,
      `${essenceOf(groundCard)} is the symptom; ${essenceOf(depthCard)} is the source. Work at the source`,
      `underneath ${essenceOf(groundCard)} sits ${essenceOf(depthCard)}, and that lower layer is where change actually happens`,
    );
  } else if (helpFirst && dragFirst) {
    takeaway = v(
      `the day-to-day question is which one is steering, ${essenceOf(helpFirst)} or ${essenceOf(dragFirst)}`,
      `each day quietly chooses between ${essenceOf(helpFirst)} and ${essenceOf(dragFirst)}. Start choosing on purpose`,
    );
  } else if (groundCard && outcomeCard && outcomeCard.orientation === "reversed") {
    takeaway = v(
      `left to itself, this drifts toward ${essenceOf(outcomeCard)}. Catching that drift early is the whole game`,
      `the drift toward ${essenceOf(outcomeCard)} is visible now, which means it is refusable now`,
    );
  } else if (groundCard && outcomeCard) {
    takeaway = v(
      `the move from ${essenceOf(groundCard)} toward ${essenceOf(outcomeCard)} has already begun; your part is to stop interrupting it`,
      `${essenceOf(outcomeCard)} is not a prize at the end of this. It is a direction you can start walking today`,
    );
  } else {
    takeaway = v(
      `keep ${essenceOf(cards[0]!)} where you can see it this week`,
      `let ${essenceOf(cards[0]!)} stay in view for a while before you decide anything`,
    );
  }
  const closeAnchorA = outcomeCard ?? cards[cards.length - 1]!;
  const closeAnchorB = groundCard ?? cards[0]!;
  const closingSentences = [
    v(
      `That is the story these ${numWord(cards.length)} cards tell together.`,
      `That is what the hand that opened with ${closeAnchorB.name} has to say.`,
      `So runs the story, ${closeAnchorB.name} to ${closeAnchorA.name}.`,
      `That is the whole of it, ${numWord(cards.length)} cards speaking as one.`,
      `And there ${closeAnchorA.name} rests the case.`,
    ),
    v(
      `If you take one line out of this room, take this one: ${takeaway}.`,
      `If only one sentence survives this reading, let it be this: ${takeaway}.`,
      `Carry one thing out with you: ${takeaway}.`,
    ),
    v(
      `None of it is a verdict: the cards frame the question, and you still hold the answer.`,
      `${closeAnchorA.name} points; it does not push. The deciding stays with you.`,
      `Take it as a map drawn in ${numWord(cards.length)} cards, not a mandate. You are still the one walking.`,
    ),
  ];
  // Stretch, when the depth floor needs it, comes from the spread itself —
  // never a stack of aftercare boilerplate (at most two additions).
  const quietCard =
    cards.find((c) => c !== closeAnchorA && c !== closeAnchorB && c !== depthCard) ??
    cards[Math.floor(cards.length / 2)]!;
  const stretchPool = [
    v(
      `On a later pass, give ${quietCard.name} a second look. Quiet cards often ripen a few days after the loud ones.`,
      `${quietCard.name} said the least today, which is sometimes the card worth revisiting once the rest has settled.`,
    ),
    v(
      `It can help to say the reading back in your own words, out loud or on paper. The parts you reach for first are the parts that already landed.`,
      `Try retelling this in one breath to no one. Whatever survives the retelling is the reading.`,
    ),
    v(
      `And if the spread feels heavier than your actual life does, trust your life. The cards sketch one moment's weather, and moments move.`,
      `If any of this weighs more than your week actually does, side with your week. Cards describe a moment, and moments move.`,
    ),
  ];
  const closingWords = () => closingSentences.join(" ").split(/\s+/).length;
  const wordFloor = Math.round(DEPTH_TARGETS[context.reading.depth].minWords * 0.85) + 20;
  let stretches = 0;
  for (const stretch of stretchPool) {
    if (stretches >= 2 || wordCount() + closingWords() >= wordFloor) {
      break;
    }
    closingSentences.push(stretch);
    stretches += 1;
  }
  paragraphs.push({
    text: closingSentences.join(" "),
    evidenceIds: [
      ...new Set([closeAnchorA.evidenceId, closeAnchorB.evidenceId]),
    ],
  });

  // Title: the reading's emotional center, not a filing label — the essence
  // of the card the whole spread leans on (outcome, else depth, else ground).
  const titleCard = outcomeCard ?? depthCard ?? groundCard ?? cards[0]!;
  return {
    title: titleCase(essenceOf(titleCard)),
    paragraphs,
    usedEvidenceIds: [...new Set(paragraphs.flatMap((p) => p.evidenceIds))],
    qualityFlags: {
      containsDirectPrediction: false,
      containsUnsupportedBiography: false,
      containsUnsupportedCorrespondence: false,
    },
  };
}
