import type { ReadingContext, ReadingSynthesis } from "./types";

/**
 * Deterministic fallback reading (spec §29.1, §49.3): shown when the full
 * interpretation is unavailable (AI disabled, budget closed, provider down).
 * Assembled entirely from the compiled context — cards, positions, canonical
 * meanings, themes, and tensions — in the same calm register, without any
 * technical or mystical excuse language.
 */
export function renderDeterministicReading(context: ReadingContext): ReadingSynthesis {
  const paragraphs: Array<{ text: string; evidenceIds: string[] }> = [];
  const { cards } = context.reading;

  // Opening: spread, domain, dominant theme if present.
  const topTheme = context.themes[0];
  const openingParts = [
    `This ${context.reading.spread.name} reading was drawn for ${context.reading.domain.label.toLowerCase()} — ${context.reading.focus.label.toLowerCase()} — through the lens of "${context.reading.insight.label.toLowerCase()}."`,
  ];
  if (topTheme) {
    const gloss = topTheme.shortThesis.split("—")[1]?.trim();
    openingParts.push(
      `${topTheme.label} stands out across the spread${gloss ? ` — ${gloss}` : ""}.`,
    );
  }
  paragraphs.push({
    text: openingParts.join(" "),
    evidenceIds: topTheme
      ? topTheme.evidenceIds.slice(0, 2)
      : cards.slice(0, 1).map((c) => c.evidenceId),
  });

  // Card-by-position paragraphs, grouped in twos to avoid a list feel.
  for (let i = 0; i < cards.length; i += 2) {
    const group = cards.slice(i, i + 2);
    const sentences = group.map(
      (c) =>
        `${c.name}${c.orientation === "reversed" ? ", reversed," : ""} holds the "${c.positionLabel}" position (${c.positionPurpose.toLowerCase().replace(/\.$/, "")}). ${c.canonicalMeaningSummary}`,
    );
    paragraphs.push({
      text: sentences.join(" "),
      evidenceIds: group.map((c) => c.evidenceId),
    });
  }

  // Pattern paragraph.
  const patterns = context.tarotPatterns.slice(0, 3);
  if (patterns.length > 0) {
    paragraphs.push({
      text: patterns.map((p) => p.statement).join(" "),
      evidenceIds: patterns.map((p) => p.id),
    });
  }

  // Tension paragraph — preserved, not resolved.
  const tension = context.tensions[0];
  if (tension) {
    paragraphs.push({
      text: `The spread holds ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()} at once. Neither cancels the other; the reading asks that both be given their place while the pattern develops.`,
      evidenceIds: [...tension.evidenceAIds, ...tension.evidenceBIds].slice(0, 4),
    });
  }

  // Closing: symbolic frame left to the reader.
  const lastCard = cards[cards.length - 1]!;
  paragraphs.push({
    text: `Taken together, the cards describe a pattern rather than a verdict. The position "${lastCard.positionLabel}" — carried here by ${lastCard.name} — marks where the symbolism currently points, and how it applies to your circumstances remains yours to weigh.`,
    evidenceIds: [lastCard.evidenceId],
  });

  const title = topTheme
    ? titleFromTheme(topTheme.label)
    : `The ${context.reading.spread.name}`;

  return {
    title,
    paragraphs,
    usedEvidenceIds: [...new Set(paragraphs.flatMap((p) => p.evidenceIds))],
    qualityFlags: {
      containsDirectPrediction: false,
      containsUnsupportedBiography: false,
      containsUnsupportedCorrespondence: false,
    },
  };
}

function titleFromTheme(label: string): string {
  return label
    .replace(/^A repeated /, "The ")
    .replace(/^A /, "The ")
    .replace(/^The current of /, "Under the Sign of ")
    .replace(/ tone$/, " Undertone");
}
