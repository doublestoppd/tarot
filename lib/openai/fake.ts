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
    `This ${context.reading.spread.name} was laid for ${context.reading.domain.label.toLowerCase()}, with attention on ${context.reading.focus.label.toLowerCase()} and the question of ${context.reading.insight.label.toLowerCase()}.`,
  ];
  if (topTheme) {
    opening.push(
      `${topTheme.label} gathers early and holds: several independent signals lean the same way, and the reading keeps returning to it.`,
    );
  }
  if (tension) {
    opening.push(
      `At the same time the spread holds ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()} together, and neither agrees to leave.`,
    );
  }
  opening.push(
    "What follows works through the cards in their positions, letting the stronger currents carry the emphasis they earned, and treating each position's purpose as the question the card is answering rather than a label beside it.",
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
    (p) =>
      `Standing first, it sets the register the rest of the spread answers to: whatever follows is read against the ground laid down in "${p.toLowerCase()}".`,
    () =>
      `In practice this is what the situation can actually lean on while ${focus} is being worked out — the resource on hand rather than the one wished for.`,
    () =>
      `The reading treats this less as an obstacle than as pressure with information in it: where the pattern strains says as much as where it flows.`,
    () =>
      `For ${focus}, the invitation here is concrete rather than abstract, and it is present tense — something already standing in the pattern, waiting on attention.`,
    () =>
      `What this position asks to be developed is already present in the spread, undergrown rather than absent, and the surrounding cards suggest the conditions it would need.`,
    () =>
      `Read as direction, it describes the bend of the current rather than a promised destination; the pattern points, and the pointing is the information.`,
    (p) =>
      `Its weight comes less from drama than from placement: sitting in "${p.toLowerCase()}", the card's register colors everything that passes through this part of the question.`,
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
        " Taken together these repetitions give the spread its grain: the same register keeps arriving by different doors, which is what earns it weight in this reading, and which is why the interpretation returns to it rather than treating each appearance as a separate remark.",
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
        " These are quieter threads than the cards themselves, and they are read that way — as reinforcement of what the spread already says rather than a second voice above it, present because they genuinely repeat the pattern and not because a reading is expected to include them.",
      evidenceIds: personal.map((p) => p.id),
    });
  }

  if (tension) {
    paragraphs.push({
      text: `The reading's central strain runs between ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()}. Both sides are materially supported, so the honest reading keeps them both: the pattern is not asking which one wins but how much of each the present situation can hold at once.`,
      evidenceIds: [...tension.evidenceAIds.slice(0, 2), ...tension.evidenceBIds.slice(0, 2)],
    });
  }

  // Adaptive framing paragraph keeps sparse spreads inside depth targets.
  const wordsSoFar = paragraphs.map((p) => p.text).join(" ").split(/\s+/).length;
  if (wordsSoFar < DEPTH_TARGETS[context.reading.depth].minWords - 40) {
    const positionList = context.reading.spread.positions
      .map((p) => `"${p.label.toLowerCase()}"`)
      .join(", ");
    paragraphs.push({
      text: `The ${context.reading.spread.name} arranges the reading across ${context.reading.spread.positions.length} stations — ${positionList} — and the sequence matters as much as any single card: earlier positions describe the ground already in place, later ones the movement gathering out of it. Held in the "${context.reading.timePerspective.label.toLowerCase()}" frame, the spread reads as one connected gesture rather than a row of separate answers, and its quieter cards do the connective work between the louder ones.`,
      evidenceIds: [cards[Math.floor(cards.length / 2)]!.evidenceId],
    });
  }

  const lastCard = cards[cards.length - 1]!;
  const firstCard = cards[0]!;
  paragraphs.push({
    text: `Taken whole, the spread describes a pattern rather than a verdict. It opens where ${firstCard.name} set the register and closes where the "${lastCard.positionLabel}" position, carried by ${lastCard.name}, marks the direction the symbolism currently points. Between those two poles the reading has named what repeats, what strains against what, and what stays quietly in reserve; how far any of it maps onto your circumstances is a judgment the reading deliberately leaves in your hands, with the cards as the frame rather than the answer.`,
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
