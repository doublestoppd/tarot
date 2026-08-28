import {
  SynthesisProviderError,
  type ReadingSynthesizer,
  type SynthesisSuccess,
  type SynthesizeOptions,
} from "@/domain/reading-compiler/synthesizer";
import type {
  ReadingContext,
  ReadingSynthesis,
} from "@/domain/reading-compiler/types";
import { DEPTH_TARGETS } from "@/domain/reading-compiler/types";
import { computeQualityFlags } from "@/domain/safety/validate";

/**
 * The in-house reading composer (spec §14.1's local synthesizer slot).
 * Deterministically composes a contract-valid synthesis — evidence-cited,
 * depth-length compliant, style-safe — purely from the compiled context, so
 * no external provider is involved. Three roles:
 *   1. the `internal` provider (settings.aiProvider = "internal"),
 *   2. the keyless development/E2E engine,
 *   3. the test double (behaviors "fail"/"invalid").
 * It is never a silent substitute when OpenAI is configured and selected.
 *
 * Voice (ADR 0009): a reader talking to one person about their question —
 * second person, concrete, plain. Position-aware notes apply each card to
 * its seat instead of abstract commentary.
 */
export class FakeReadingSynthesizer implements ReadingSynthesizer {
  constructor(private readonly behavior: "ok" | "fail" | "invalid" = "ok") {}

  async synthesize(
    context: ReadingContext,
    _options: SynthesizeOptions,
  ): Promise<SynthesisSuccess> {
    if (this.behavior === "fail") {
      throw new SynthesisProviderError("interrupted", "fake provider outage");
    }
    const synthesis = composeFromContext(context);
    if (this.behavior === "invalid") {
      synthesis.paragraphs[0]!.evidenceIds = ["ev_invented_999"];
    }
    synthesis.qualityFlags = computeQualityFlags(synthesis);
    return {
      synthesis,
      usage: { inputTokens: 4000, outputTokens: 900, cachedInputTokens: 0 },
    };
  }
}

/** "Habits & patterns" → "habits and patterns" for use mid-sentence. */
function humanize(label: string): string {
  return label.toLowerCase().replace(/\s*&\s*/g, " and ");
}

/** Lowercase only the leading article of a theme label ("A Saturn tone"). */
function lcFirst(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function lcPurpose(purpose: string): string {
  return purpose.charAt(0).toLowerCase() + purpose.slice(1).replace(/\.$/, "");
}

/**
 * One applied sentence per card, chosen by what its seat is for. `seen`
 * counts uses per category so repeated seat-kinds alternate variants
 * instead of repeating a sentence verbatim.
 */
function positionNote(
  positionId: string,
  positionLabel: string,
  seen: Map<string, number>,
): string {
  const key = `${positionId} ${positionLabel}`.toLowerCase();
  const pick = (a: string, b: string) => {
    const category = a.slice(0, 24);
    const count = seen.get(category) ?? 0;
    seen.set(category, count + 1);
    return count % 2 === 0 ? a : b;
  };
  if (/hidden|blind|unseen|less_visible|root|foundation|hopes_fears/.test(key)) {
    return pick(
      "That is the part of the story working out of sight. Give it a slower second look.",
      "You may not have put words to this part yet. The card just did it for you.",
    );
  }
  if (/support|resource|strength|remains/.test(key)) {
    return pick(
      "Whatever else this spread stirs up, this is the steady thing. Lean on it.",
      "When the rest of the reading wobbles, come back to this card. It is already in your hands.",
    );
  }
  if (/resistance|constraint|tension|crossing|caution|waning/.test(key)) {
    return pick(
      "In this seat, that is the thing pressing on you. Even a good thing can act as a wall, and naming it loosens it.",
      "Do not read it as doom. It is friction, and friction can be worked with.",
    );
  }
  if (/direction|outcome|next|near_development|emerging|ripening|trajectory/.test(key)) {
    return pick(
      "Read this as the lean of things, not a locked result. Your hands are still on it.",
      "It shows where the current drifts if nothing changes. Changing something is still allowed.",
    );
  }
  if (/past|ending|recent/.test(key)) {
    return pick(
      "This piece is on its way out. Let it finish leaving.",
      "It shaped where you are, but it is not in charge anymore.",
    );
  }
  if (/pull_/.test(key)) {
    return pick(
      "That is one of the two tugs in your choice. Feel it honestly before you answer it.",
      "Do not rush to silence this pull. It knows something the other one does not.",
    );
  }
  if (/integrat|adjustment|to_develop|repetition/.test(key)) {
    return pick(
      "This is the working part of the reading: something to practice, not just notice.",
      "Small moves here change the whole picture. Start smaller than feels serious.",
    );
  }
  if (/expressed|environment|influence|aim|opportunity/.test(key)) {
    return pick(
      "This one is out in the open, shaping the room whether or not anyone names it.",
      "Everyone involved can feel this part, even if nobody has said it yet.",
    );
  }
  if (/present|surface|atmosphere|orientation|self|cycle_now|pattern/.test(key)) {
    return pick(
      "Start here. This is the ground you are actually standing on.",
      "Whatever else the cards say, they are saying it about this.",
    );
  }
  return pick(
    "Let it sit beside its neighbors. The cards explain each other.",
    "Hold it lightly and watch what it touches in the seats around it.",
  );
}

function cardIntro(
  name: string,
  reversed: boolean,
  positionLabel: string,
  purpose: string,
  index: number,
  total: number,
): string {
  // Object form ends the name phrase; subject form re-closes the comma so
  // "The Star, reversed, sits …" stays grammatical.
  const objectForm = `${name}${reversed ? ", reversed" : ""}`;
  const subjectForm = `${name}${reversed ? ", reversed," : ""}`;
  const seat = `"${positionLabel.toLowerCase()}"`;
  const why = lcPurpose(purpose);
  if (index === 0) {
    return `The first card out was ${objectForm}, in the ${seat} seat: ${why}.`;
  }
  if (index === total - 1) {
    return `The last card, ${objectForm}, landed on ${seat}: ${why}.`;
  }
  const middles = [
    `Next comes ${objectForm}, holding ${seat}: ${why}.`,
    `In the ${seat} seat, ${why}, you drew ${objectForm}.`,
    `Then ${subjectForm} turned up in ${seat}: ${why}.`,
    `For ${seat}, ${why}, the deck gave you ${objectForm}.`,
    `${subjectForm} sits in ${seat}: ${why}.`,
  ];
  return middles[(index - 1) % middles.length]!;
}

function composeFromContext(context: ReadingContext): ReadingSynthesis {
  const { cards } = context.reading;
  const paragraphs: Array<{ text: string; evidenceIds: string[] }> = [];
  // The model only ever sees providerEvidence — cite nothing outside it.
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

  const focusPhrase = humanize(context.reading.focus.label);
  const insightPhrase = humanize(context.reading.insight.label);

  const opening: string[] = [
    `You asked the cards about ${focusPhrase}, with an eye out for ${insightPhrase}.`,
  ];
  if (topTheme) {
    opening.push(
      `Before anything else, notice this: ${lcFirst(topTheme.label)} runs through the whole spread. More than one signal points the same way, so keep it in mind as you read.`,
    );
  }
  if (tension) {
    opening.push(
      `The cards are also pulling in two directions at once, toward ${tension.themeA.toLowerCase()} and toward ${tension.themeB.toLowerCase()}. That tug is not a flaw in the reading. It is the reading.`,
    );
  }
  opening.push("Here is what came up, seat by seat.");
  paragraphs.push({
    text: opening.join(" "),
    evidenceIds: themeIds.length > 0 ? themeIds.slice(0, 2) : [cards[0]!.evidenceId],
  });

  // Group cards in pairs for wide spreads to respect paragraph ceilings.
  const groupSize = cards.length > 7 ? 2 : 1;
  const noteCategoriesSeen = new Map<string, number>();
  for (let i = 0; i < cards.length; i += groupSize) {
    const group = cards.slice(i, i + groupSize);
    const sentences = group.flatMap((card, j) => [
      cardIntro(
        card.name,
        card.orientation === "reversed",
        card.positionLabel,
        card.positionPurpose,
        i + j,
        cards.length,
      ),
      card.canonicalMeaningSummary,
      positionNote(card.positionId, card.positionLabel, noteCategoriesSeen),
    ]);
    paragraphs.push({
      text: sentences.join(" "),
      evidenceIds: group.map((c) => c.evidenceId),
    });
  }

  const patternNodes = context.tarotPatterns
    .filter((p) => citable.has(p.id))
    .slice(0, 3);
  if (patternNodes.length > 0) {
    paragraphs.push({
      text:
        "A few shapes in the deal itself are worth naming. " +
        patternNodes.map((p) => p.statement).join(" ") +
        " When the same note arrives through different doors like that, it earns extra weight.",
      evidenceIds: patternNodes.map((p) => p.id),
    });
  }

  const personal = context.resonances
    .filter((r) => r.category === "personal" && citable.has(r.id))
    .slice(0, 2);
  if (personal.length > 0) {
    paragraphs.push({
      text:
        personal.map((p) => p.statement).join(" ") +
        " These threads are personal to you: your own numbers and chart happening to repeat what the shuffle drew. The cards would stand without them, but they add weight exactly where they land.",
      evidenceIds: personal.map((p) => p.id),
    });
  }

  if (tension) {
    paragraphs.push({
      text: `The strongest tug-of-war in this spread runs between ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()}. Both sides have real cards behind them, so do not force a winner. Ask instead which parts of your situation each one lives in. They are probably not in the same room.`,
      evidenceIds: [...tension.evidenceAIds.slice(0, 2), ...tension.evidenceBIds.slice(0, 2)],
    });
  }

  // Adaptive framing paragraph keeps sparse spreads inside depth targets.
  const wordCount = () =>
    paragraphs.map((p) => p.text).join(" ").split(/\s+/).length;
  if (wordCount() < DEPTH_TARGETS[context.reading.depth].minWords - 40) {
    paragraphs.push({
      text: `One note on reading the ${context.reading.spread.name} as a whole. It is built as a sequence: the early seats describe ground already under you, and the later seats describe movement growing out of that ground. Held in the "${context.reading.timePerspective.label.toLowerCase()}" frame, it reads as one connected gesture, not ${cards.length} separate answers. The quieter cards are doing connective work between the louder ones.`,
      evidenceIds: [cards[Math.floor(cards.length / 2)]!.evidenceId],
    });
  }

  const lastCard = cards[cards.length - 1]!;
  const firstCard = cards[0]!;
  const closingSentences = [
    `That is the whole spread. It opens with ${firstCard.name} and closes with ${lastCard.name}, and between them it has named what repeats, what pulls against what, and what you have to work with.`,
    `None of this is a verdict: the cards frame the question, and you still hold the answer.`,
    `If one card stopped you as you read, trust that pause. It is usually pointing at the part that matters.`,
  ];
  // Final stretch for very sparse spreads: extend the closing (never the
  // paragraph count) until the depth floor is met.
  const stretchPool = [
    "A reading like this works best when it is carried lightly. Let the strong threads name what you already sense, and let the strange ones raise a question you had not asked. Come back to the spread in a few days and notice which parts still speak.",
    "You do not have to act on any of this today. Notice where a card made you pause, and start your own thinking there. The pause is usually pointing at something real.",
    "If one image stays with you, keep it close. A single card, sat with honestly, often does more work than a whole spread read in a hurry.",
    "None of this is a command. The cards describe weather, not orders. You stay the one who decides how to walk in it.",
  ];
  const closingWords = () => closingSentences.join(" ").split(/\s+/).length;
  for (const stretch of stretchPool) {
    if (wordCount() + closingWords() >= DEPTH_TARGETS[context.reading.depth].minWords) {
      break;
    }
    closingSentences.push(stretch);
  }
  paragraphs.push({
    text: closingSentences.join(" "),
    evidenceIds: [lastCard.evidenceId, firstCard.evidenceId],
  });

  return {
    title: topTheme
      ? topTheme.label.replace(/^A repeated /, "The Repeating ").replace(/^A /, "The ").replace(/^The current of /, "Under ")
      : `From ${firstCard.name} to ${lastCard.name}`,
    paragraphs,
    usedEvidenceIds: [...new Set(paragraphs.flatMap((p) => p.evidenceIds))],
    qualityFlags: {
      containsDirectPrediction: false,
      containsUnsupportedBiography: false,
      containsUnsupportedCorrespondence: false,
    },
  };
}

/** Provider-facing name for the in-house composer. */
export { FakeReadingSynthesizer as InternalReadingSynthesizer };
