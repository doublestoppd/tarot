import type { Pool } from "pg";
import type { ReadingContext, ReadingSynthesis } from "@/domain/reading-compiler/types";
import {
  SynthesisProviderError,
  type ReadingSynthesizer,
} from "@/domain/reading-compiler/synthesizer";
import {
  computeQualityFlags,
  repairInstruction,
  validateSynthesis,
} from "@/domain/safety/validate";
import { renderDeterministicReading } from "@/domain/reading-compiler/fallback";
import { minimizeForProvider } from "@/domain/reading-compiler/compile";
import { getEnv } from "@/lib/config/env";
import type { AppSettings } from "@/lib/db/settings";
import {
  finalizeReservation,
  recordProviderError,
  recordValidationFailure,
  releaseReservation,
  reserveBudget,
} from "@/lib/budget/budget";
import { checkAndIncrement } from "@/lib/rate-limit/rate-limit";
import { nonceHash, openTicket, TicketError } from "@/lib/crypto/ticket";
import { actualCostMicro } from "@/lib/openai/cost";
import { OpenAIReadingSynthesizer } from "@/lib/openai/synthesizer";
import { FakeReadingSynthesizer } from "@/lib/openai/fake";
import { logger } from "@/lib/logging/logger";

/**
 * Interpretation orchestration (spec §14.3, §24, §29): validate ticket,
 * enforce rate ceilings, atomically reserve worst-case budget, exactly one
 * synthesis call, deterministic validation, at most one repair call, graceful
 * deterministic fallback, finalize/release. Fails closed without the
 * database; never retries in a loop.
 */

export type InterpretOutcome =
  | { kind: "ai"; synthesis: ReadingSynthesis }
  | { kind: "deterministic"; synthesis: ReadingSynthesis; reason: "ai_disabled" | "budget" | "validation" }
  | { kind: "error"; code: "READING_TICKET_EXPIRED" | "RATE_TEMPORARILY_UNAVAILABLE" | "AI_PROVIDER_INTERRUPTED" | "AI_CAPACITY_UNAVAILABLE" };

export function buildSynthesizer(settings: AppSettings): ReadingSynthesizer | null {
  const env = getEnv();
  // Explicitly configured in-house composer (spec §14.1 local synthesizer).
  if (settings.aiProvider === "internal") {
    return new FakeReadingSynthesizer("ok");
  }
  if (env.openai.apiKey) {
    return new OpenAIReadingSynthesizer({
      apiKey: env.openai.apiKey,
      model: settings.aiModel,
      reasoningEffort: env.openai.reasoningEffort,
      store: env.openai.store,
    });
  }
  if (env.nodeEnv !== "production") {
    // Keyless development/E2E runs use the in-house composer.
    return new FakeReadingSynthesizer("ok");
  }
  return null;
}

export interface InterpretRequest {
  ticket: string;
  rateKeyHash: string;
  synthesizerOverride?: ReadingSynthesizer;
}

export async function interpretReading(
  pool: Pool,
  settings: AppSettings,
  request: InterpretRequest,
  now: Date = new Date(),
): Promise<InterpretOutcome> {
  const env = getEnv();

  let context: ReadingContext;
  let readingNonce: string;
  try {
    const payload = openTicket(
      request.ticket,
      env.ticketKeyCurrent,
      env.ticketKeysPrevious,
      now,
    );
    context = payload.context;
    readingNonce = payload.nonce;
  } catch (error) {
    if (error instanceof TicketError) {
      return { kind: "error", code: "READING_TICKET_EXPIRED" };
    }
    throw error;
  }

  const fallback = () => renderDeterministicReading(context);

  const synthesizer = request.synthesizerOverride ?? buildSynthesizer(settings);
  if (!settings.aiEnabled || !synthesizer) {
    return { kind: "deterministic", synthesis: fallback(), reason: "ai_disabled" };
  }

  // Per-install ceilings (spec §29.1) — counted per attempt window.
  const hourly = await checkAndIncrement(
    pool,
    request.rateKeyHash,
    "ai_hourly",
    3600,
    settings.perInstallHourly,
    now,
  );
  if (!hourly.allowed) {
    return { kind: "error", code: "RATE_TEMPORARILY_UNAVAILABLE" };
  }
  const daily = await checkAndIncrement(
    pool,
    request.rateKeyHash,
    "ai_daily",
    24 * 3600,
    settings.perInstallDaily,
    now,
  );
  if (!daily.allowed) {
    return { kind: "error", code: "RATE_TEMPORARILY_UNAVAILABLE" };
  }

  const reservation = await reserveBudget(
    pool,
    settings,
    {
      kind: "normal",
      ticketNonceHash: nonceHash(readingNonce),
      rateKeyHash: request.rateKeyHash,
      reserveMicro: settings.maxReadingCostMicro,
      ttlSeconds: 180,
    },
    now,
  );
  if (!reservation.ok) {
    switch (reservation.reason) {
      case "duplicate":
        // This reading already consumed its one call.
        return { kind: "error", code: "READING_TICKET_EXPIRED" };
      case "install_concurrency":
        return { kind: "error", code: "RATE_TEMPORARILY_UNAVAILABLE" };
      default:
        return { kind: "deterministic", synthesis: fallback(), reason: "budget" };
    }
  }

  const maxOutputTokens = env.openai.maxOutputTokens[context.reading.depth];

  let result;
  try {
    result = await synthesizer.synthesize(context, { maxOutputTokens });
  } catch (error) {
    await releaseReservation(pool, reservation.reservationId, now);
    await recordProviderError(pool, now);
    if (error instanceof SynthesisProviderError && error.kind === "capacity") {
      return { kind: "error", code: "AI_CAPACITY_UNAVAILABLE" };
    }
    logger.warn("synthesis provider interrupted", { errorClass: (error as Error).name });
    return { kind: "error", code: "AI_PROVIDER_INTERRUPTED" };
  }

  await finalizeReservation(
    pool,
    reservation.reservationId,
    {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      actualMicro: actualCostMicro(env, result.usage),
      kind: "normal",
    },
    now,
  );

  let synthesis = result.synthesis;
  let validation = validateSynthesis(synthesis, context);

  if (!validation.ok && validation.repairable) {
    await recordValidationFailure(pool, now);
    const repairReservation = await reserveBudget(
      pool,
      settings,
      {
        kind: "repair",
        ticketNonceHash: nonceHash(readingNonce),
        rateKeyHash: request.rateKeyHash,
        reserveMicro: settings.maxRepairCostMicro,
        ttlSeconds: 180,
      },
      now,
    );
    if (repairReservation.ok) {
      try {
        const repaired = await synthesizer.synthesize(context, {
          maxOutputTokens,
          repairInstruction: repairInstruction(validation.problems),
        });
        await finalizeReservation(
          pool,
          repairReservation.reservationId,
          {
            inputTokens: repaired.usage.inputTokens,
            outputTokens: repaired.usage.outputTokens,
            actualMicro: actualCostMicro(env, repaired.usage),
            kind: "repair",
          },
          now,
        );
        synthesis = repaired.synthesis;
        validation = validateSynthesis(synthesis, context);
      } catch {
        await releaseReservation(pool, repairReservation.reservationId, now);
        await recordProviderError(pool, now);
      }
    }
  }

  if (!validation.ok) {
    await recordValidationFailure(pool, now);
    logger.warn("synthesis unusable after repair ceiling; serving deterministic reading", {
      problemCodes: validation.problems.map((p) => p.code).join(","),
    });
    return { kind: "deterministic", synthesis: fallback(), reason: "validation" };
  }

  // Quality flags are computed deterministically, never trusted from the model.
  synthesis = { ...synthesis, qualityFlags: computeQualityFlags(synthesis) };
  return { kind: "ai", synthesis };
}

/** Serialized context size estimate used for worst-case budget checks. */
export function serializedContextBytes(context: ReadingContext): number {
  return Buffer.byteLength(JSON.stringify(minimizeForProvider(context)), "utf-8");
}
