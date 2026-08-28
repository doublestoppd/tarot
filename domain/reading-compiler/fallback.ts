import type { ReadingContext, ReadingSynthesis } from "./types";

/**
 * Deterministic fallback reading (spec §29.1, §49.3): shown when the full
 * interpretation is unavailable (AI disabled, budget closed, provider down).
 * Assembled entirely from the compiled context — cards, positions, canonical
 * meanings, themes, and tensions — in the same warm, plain voice as the full
 * reading, without any technical or mystical excuse language.
 */
export function renderDeterministicReading(context: ReadingContext): ReadingSynthesis {
  const paragraphs: Array<{ text: string; evidenceIds: string[] }> = [];
  const { cards } = context.reading;
  const humanize = (label: string): string =>
    label.toLowerCase().replace(/\s*&\s*/g, " and ");

  // Opening: the question in human terms, plus the dominant theme if present.
  const topTheme = context.themes[0];
  const openingParts = [
    `You asked the cards about ${humanize(context.reading.focus.label)}, reading for ${humanize(context.reading.insight.label)}. Here is what the ${context.reading.spread.name} laid out.`,
  ];
  if (topTheme) {
    openingParts.push(topTheme.shortThesis);
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
        `${c.name}${c.orientation === "reversed" ? ", reversed," : ""} holds the "${c.positionLabel.toLowerCase()}" seat, ${c.positionPurpose.charAt(0).toLowerCase()}${c.positionPurpose.slice(1).replace(/\.$/, "")}. ${c.canonicalMeaningSummary}`,
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
      text: `The spread holds ${tension.themeA.toLowerCase()} and ${tension.themeB.toLowerCase()} at the same time. Both are real, so do not force a winner. Give each its place while things develop.`,
      evidenceIds: [...tension.evidenceAIds, ...tension.evidenceBIds].slice(0, 4),
    });
  }

  // Closing: symbolic frame left to the reader.
  const lastCard = cards[cards.length - 1]!;
  paragraphs.push({
    text: `Taken together, the cards frame a pattern, not a verdict. ${lastCard.name} in the "${lastCard.positionLabel.toLowerCase()}" seat marks where things point right now. How that fits your life stays your call.`,
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
