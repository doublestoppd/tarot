import type { ReadingContext, ReadingSynthesis } from "./types";
import { composeNarrativeReading } from "./compose";

/**
 * Deterministic fallback reading (spec §29.1, §49.3): shown when the full
 * interpretation is unavailable (AI disabled, budget closed, provider down).
 * Delegates to the shared narrative composer, so the fallback reads exactly
 * as well as the internal engine — assembled entirely from the compiled
 * context, with no technical or mystical excuse language.
 */
export function renderDeterministicReading(context: ReadingContext): ReadingSynthesis {
  return composeNarrativeReading(context);
}
