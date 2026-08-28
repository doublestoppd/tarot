import {
  SynthesisProviderError,
  type ReadingSynthesizer,
  type SynthesisSuccess,
  type SynthesizeOptions,
} from "@/domain/reading-compiler/synthesizer";
import type { ReadingContext } from "@/domain/reading-compiler/types";
import { composeNarrativeReading } from "@/domain/reading-compiler/compose";
import { computeQualityFlags } from "@/domain/safety/validate";

/**
 * The in-house reading composer (spec §14.1's local synthesizer slot).
 * Deterministically produces a contract-valid synthesis — evidence-cited,
 * depth-length compliant, style-safe — purely from the compiled context via
 * the shared narrative composer (domain/reading-compiler/compose.ts), so no
 * external provider is involved. Three roles:
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
    const synthesis = composeNarrativeReading(context);
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

/** Provider-facing name for the in-house composer. */
export { FakeReadingSynthesizer as InternalReadingSynthesizer };
