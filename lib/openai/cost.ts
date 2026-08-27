import type { AppEnv } from "@/lib/config/env";
import type { SynthesisUsage } from "@/domain/reading-compiler/synthesizer";
import type { Depth } from "@/domain/intake/types";

/**
 * Application-side cost estimation (spec §42.2). The provider invoice is the
 * source of truth; these estimates power hard local budget control.
 */

/** Conservative prompt-token estimate: context bytes / 3 + prompt overhead. */
export function estimatePromptTokens(serializedContextBytes: number): number {
  return Math.ceil(serializedContextBytes / 3) + 1_800;
}

export function worstCaseCostMicro(
  env: AppEnv,
  depth: Depth,
  serializedContextBytes: number,
): number {
  const inputTokens = estimatePromptTokens(serializedContextBytes);
  const outputTokens = env.openai.maxOutputTokens[depth];
  const micro =
    (inputTokens / 1_000_000) * env.openai.inputMicroUsdPerMillion +
    (outputTokens / 1_000_000) * env.openai.outputMicroUsdPerMillion;
  return Math.ceil(micro);
}

export function actualCostMicro(env: AppEnv, usage: SynthesisUsage): number {
  const uncached = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);
  const micro =
    (uncached / 1_000_000) * env.openai.inputMicroUsdPerMillion +
    (usage.cachedInputTokens / 1_000_000) * env.openai.cachedInputMicroUsdPerMillion +
    (usage.outputTokens / 1_000_000) * env.openai.outputMicroUsdPerMillion;
  return Math.ceil(micro);
}
