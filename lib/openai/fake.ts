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
 * All template prose follows the plain-language rule (ADR 0009).
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

  const opening: string[] = [
    `This ${context.reading.spread.name} was laid for ${context.reading.domain.label.toLowerCase()}. The focus is ${context.reading.focus.label.toLowerCase()}, seen through the lens of "${context.reading.insight.label.toLowerCase()}."`,
  ];
  if (topTheme) {
    opening.push(
      `${topTheme.label} is the strongest thread here. Several separate signals point the same way, and the reading keeps returning to it.`,
    );
  }
  if (tension) {
    opening.push(
      `At the same time, the spread holds both ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()}. Neither one agrees to leave.`,
    );
  }
  opening.push(
    "The reading below moves card by card. Each position is a question, and each card is its answer.",
  );
  paragraphs.push({
    text: opening.join(" "),
    evidenceIds: themeIds.length > 0 ? themeIds.slice(0, 2) : [cards[0]!.evidenceId],
  });

  // Group cards in pairs for wide spreads to respect paragraph ceilings.
  const focus = context.reading.focus.label.toLowerCase();
  // Varied, deterministic per-card closers — chosen by draw order so the
  // composition never repeats a sentence verbatim across positions.
  const closers: Array<(positionLabel: string) => string> = [
    () =>
      `It stands first, so it sets the tone. Everything after it is read against this ground.`,
    () =>
      `While ${focus} is being worked out, this is the thing to lean on. It is the resource at hand, not the one you wish you had.`,
    () =>
      `Read this as pressure with information in it, not just a wall. Where the pattern strains tells you as much as where it flows.`,
    () =>
      `For ${focus}, the invitation here is concrete. It is already standing in the pattern, waiting on your attention.`,
    () =>
      `What this position asks for is already present, just small. The cards around it hint at what it needs to grow.`,
    () =>
      `Read as direction, this shows the bend of the current, not a promised end point. The pointing itself is the information.`,
    (p) =>
      `Its weight comes from where it sits. In "${p.toLowerCase()}", this card colors everything that passes through this part of the question.`,
  ];
  const groupSize = cards.length > 7 ? 2 : 1;
  for (let i = 0; i < cards.length; i += groupSize) {
    const group = cards.slice(i, i + groupSize);
    const sentences = group.flatMap((card, j) => [
      `${card.name}${card.orientation === "reversed" ? ", reversed," : ""} takes the "${card.positionLabel}" position, ${card.positionPurpose.toLowerCase().replace(/\.$/, "")}.`,
      card.canonicalMeaningSummary,
      closers[(i + j) % closers.length]!(card.positionLabel),
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
        patternNodes.map((p) => p.statement).join(" ") +
        " The same note keeps arriving through different doors. That repetition is what earns it weight in this reading.",
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
        " These threads are quieter than the cards, and they are read that way. They back up what the spread already says. They are here because they truly repeat the pattern, not to pad the reading.",
      evidenceIds: personal.map((p) => p.id),
    });
  }

  if (tension) {
    paragraphs.push({
      text: `The main strain in this reading runs between ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()}. Both sides have real support in the cards, so the honest reading keeps both. The question is not which side wins. It is how much of each your present situation can hold.`,
      evidenceIds: [...tension.evidenceAIds.slice(0, 2), ...tension.evidenceBIds.slice(0, 2)],
    });
  }

  // Adaptive framing paragraph keeps sparse spreads inside depth targets.
  const wordCount = () =>
    paragraphs.map((p) => p.text).join(" ").split(/\s+/).length;
  if (wordCount() < DEPTH_TARGETS[context.reading.depth].minWords - 40) {
    const positionList = context.reading.spread.positions
      .map((p) => `"${p.label.toLowerCase()}"`)
      .join(", ");
    paragraphs.push({
      text: `The ${context.reading.spread.name} lays the reading across ${context.reading.spread.positions.length} stations: ${positionList}. The order matters as much as any single card. Early positions describe the ground already in place. Later ones describe the movement growing out of it. Held in the "${context.reading.timePerspective.label.toLowerCase()}" frame, the spread reads as one connected motion, not a row of separate answers. The quieter cards do the connecting work between the louder ones.`,
      evidenceIds: [cards[Math.floor(cards.length / 2)]!.evidenceId],
    });
  }

  const lastCard = cards[cards.length - 1]!;
  const firstCard = cards[0]!;
  const closingSentences = [
    `Taken whole, the spread describes a pattern, not a verdict.`,
    `It opens where ${firstCard.name} set the tone. It closes where ${lastCard.name}, in the "${lastCard.positionLabel}" position, marks the direction things point.`,
    `Between those poles, the reading has named what repeats, what strains against what, and what waits in reserve. How far any of it maps onto your life stays in your hands. The cards are the frame, not the answer.`,
  ];
  // Final stretch for very sparse spreads: extend the closing (never the
  // paragraph count) until the depth floor is met.
  const stretchPool = [
    "A reading like this works best when it is carried lightly. Let the strong threads name what you already sense. Let the strange ones raise a question you had not asked. Come back to the spread in a few days and notice which parts still speak.",
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
      : `Between the Positions`,
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
