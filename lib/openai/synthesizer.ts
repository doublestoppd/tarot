import OpenAI from "openai";
import { z } from "zod";
import type {
  ReadingSynthesizer,
  SynthesisSuccess,
  SynthesizeOptions,
} from "@/domain/reading-compiler/synthesizer";
import { SynthesisProviderError } from "@/domain/reading-compiler/synthesizer";
import type { ReadingContext, ReadingSynthesis } from "@/domain/reading-compiler/types";
import { minimizeForProvider } from "@/domain/reading-compiler/compile";
import { SYSTEM_PROMPT } from "./prompt";

/**
 * OpenAIReadingSynthesizer (spec §14.2, §42.1): Responses API, store:false,
 * strict JSON-schema structured output, hard output-token ceiling, no tools,
 * no conversations, no provider persistence. Requests and raw responses are
 * never logged.
 */

const READING_SYNTHESIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "paragraphs", "usedEvidenceIds", "qualityFlags"],
  properties: {
    title: { type: "string" },
    paragraphs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "evidenceIds"],
        properties: {
          text: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    usedEvidenceIds: { type: "array", items: { type: "string" } },
    qualityFlags: {
      type: "object",
      additionalProperties: false,
      required: [
        "containsDirectPrediction",
        "containsUnsupportedBiography",
        "containsUnsupportedCorrespondence",
      ],
      properties: {
        containsDirectPrediction: { type: "boolean" },
        containsUnsupportedBiography: { type: "boolean" },
        containsUnsupportedCorrespondence: { type: "boolean" },
      },
    },
  },
} as const;

const synthesisZod = z.object({
  title: z.string(),
  paragraphs: z.array(
    z.object({ text: z.string(), evidenceIds: z.array(z.string()) }),
  ),
  usedEvidenceIds: z.array(z.string()),
  qualityFlags: z.object({
    containsDirectPrediction: z.boolean(),
    containsUnsupportedBiography: z.boolean(),
    containsUnsupportedCorrespondence: z.boolean().optional(),
  }),
});

export function parseStrictSynthesis(outputText: string): ReadingSynthesis {
  let raw: unknown;
  try {
    raw = JSON.parse(outputText);
  } catch {
    throw new SynthesisProviderError("invalid_output", "response is not JSON");
  }
  const parsed = synthesisZod.safeParse(raw);
  if (!parsed.success) {
    throw new SynthesisProviderError("invalid_output", "response fails schema");
  }
  return parsed.data;
}

export interface OpenAISynthesizerConfig {
  apiKey: string;
  model: string;
  reasoningEffort: "minimal" | "low" | "medium" | "high";
  store: boolean;
  timeoutMs?: number;
}

export class OpenAIReadingSynthesizer implements ReadingSynthesizer {
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAISynthesizerConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 90_000,
      maxRetries: 0, // retries are governed by the application, not the SDK
    });
  }

  async synthesize(
    context: ReadingContext,
    options: SynthesizeOptions,
  ): Promise<SynthesisSuccess> {
    const input = [
      JSON.stringify(minimizeForProvider(context)),
      options.repairInstruction ? `\n\nREPAIR INSTRUCTION:\n${options.repairInstruction}` : "",
    ].join("");

    let response: OpenAI.Responses.Response;
    try {
      response = await this.client.responses.create({
        model: this.config.model,
        store: this.config.store,
        reasoning: { effort: this.config.reasoningEffort },
        instructions: SYSTEM_PROMPT,
        input,
        text: {
          format: {
            type: "json_schema",
            name: "reading_synthesis",
            strict: true,
            schema: READING_SYNTHESIS_JSON_SCHEMA as unknown as Record<string, unknown>,
          },
        },
        max_output_tokens: options.maxOutputTokens,
      });
    } catch (error) {
      throw mapProviderError(error);
    }

    const synthesis = parseStrictSynthesis(response.output_text ?? "");
    const usage = response.usage;
    return {
      synthesis,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
      },
    };
  }
}

function mapProviderError(error: unknown): SynthesisProviderError {
  if (error instanceof SynthesisProviderError) return error;
  const status = (error as { status?: number }).status;
  if (status === 429) {
    return new SynthesisProviderError("capacity", "provider rate limited");
  }
  if (status !== undefined && status >= 500) {
    return new SynthesisProviderError("interrupted", `provider ${status}`);
  }
  if (status !== undefined && status >= 400) {
    return new SynthesisProviderError("invalid_output", `provider ${status}`);
  }
  return new SynthesisProviderError("interrupted", "provider unreachable");
}
