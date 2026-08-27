import type { ReadingDisplay } from "@/lib/reading/display";
import type { ReadingSynthesis } from "@/domain/reading-compiler/types";

/**
 * Active reading state — browser memory only (spec §19.2). Never written to
 * localStorage, sessionStorage, IndexedDB, or cookies; a refresh ends the
 * reading, which is the documented behavior.
 */

export interface ActiveReadingResult {
  kind: "ai" | "deterministic";
  reason?: string;
  synthesis: ReadingSynthesis;
}

export interface ActiveReading {
  ticket: string;
  expiresAt: string;
  display: ReadingDisplay;
  result: ActiveReadingResult | null;
}

let active: ActiveReading | null = null;

export const readingSession = {
  set(reading: ActiveReading): void {
    active = reading;
  },
  get(): ActiveReading | null {
    return active;
  },
  setResult(result: ActiveReadingResult): void {
    if (active) active.result = result;
  },
  clear(): void {
    active = null;
  },
};
