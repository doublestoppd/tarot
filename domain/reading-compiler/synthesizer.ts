import type { ReadingContext, ReadingSynthesis } from "./types";

/**
 * Provider-agnostic synthesis contract (spec §14.1). Adapters live in lib/
 * (OpenAI today; other providers later); the rest of the application never
 * sees provider-specific request or response shapes.
 */

export interface SynthesisUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export interface SynthesisSuccess {
  synthesis: ReadingSynthesis;
  usage: SynthesisUsage;
}

export type SynthesisFailureKind =
  | "capacity" // rate/overload — try again later
  | "interrupted" // network/5xx/timeout — retry may work
  | "invalid_output"; // response arrived but cannot be parsed at all

export class SynthesisProviderError extends Error {
  constructor(
    public readonly kind: SynthesisFailureKind,
    message?: string,
  ) {
    super(message ?? `synthesis provider failure: ${kind}`);
    this.name = "SynthesisProviderError";
  }
}

export interface SynthesizeOptions {
  maxOutputTokens: number;
  /** Present only on the single permitted repair call (spec §14.3). */
  repairInstruction?: string;
}

export interface ReadingSynthesizer {
  synthesize(
    context: ReadingContext,
    options: SynthesizeOptions,
  ): Promise<SynthesisSuccess>;
}
