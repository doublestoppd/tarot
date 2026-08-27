import type { Pool } from "pg";
import { drawCards } from "@/domain/tarot/draw";
import {
  isSpreadAllowed,
  selectSpread,
  validateSelections,
} from "@/domain/tarot/spread-selection";
import { getSpread } from "@/data/spreads/spreads";
import {
  computeConservativeDateOnly,
  computeCurrentSky,
  computeNatalChart,
  computePartialBetween,
  computeTransits,
} from "@/domain/astrology/engine";
import { resolveLocalTime } from "@/domain/astrology/timezone";
import type { NatalInformation, TransitHit } from "@/domain/astrology/types";
import {
  assertValidBirthDate,
  numerologyProfile,
  type NumerologyProfile,
} from "@/domain/numerology/engine";
import type { ReadingSelections } from "@/domain/intake/types";
import { compileReadingContext } from "@/domain/reading-compiler/compile";
import type { ReadingContext } from "@/domain/reading-compiler/types";
import { renderDeterministicReading } from "@/domain/reading-compiler/fallback";
import { getEnv } from "@/lib/config/env";
import { newReadingNonce, sealTicket } from "@/lib/crypto/ticket";
import { getPlace } from "@/lib/places/places";

/**
 * Reading preparation orchestration (spec §5, §24.1–24.2): authoritative
 * server timestamp, independent secure draw, deterministic calculation,
 * evidence compilation, encrypted short-lived ticket. Nothing here persists
 * a single byte of reading or birth data.
 */

export interface BirthInput {
  date?: { year: number; month: number; day: number };
  time?: { hour: number; minute: number };
  placeId?: string;
  dstAmbiguityChoice?: "first" | "second" | "not_sure";
}

export interface PrepareRequest {
  selections: ReadingSelections;
  spreadOverrideId?: string;
  birth?: BirthInput;
}

export class PrepareError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "PLACE_AMBIGUOUS"
      | "BIRTH_TIME_NONEXISTENT"
      | "BIRTH_TIME_AMBIGUOUS",
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "PrepareError";
  }
}

export interface PrepareOutcome {
  ticket: string;
  expiresAt: string;
  context: ReadingContext;
  deterministicFallback: ReturnType<typeof renderDeterministicReading>;
}

export async function prepareReading(
  pool: Pool,
  request: PrepareRequest,
  now: Date = new Date(),
): Promise<PrepareOutcome> {
  const env = getEnv();
  const problems = validateSelections(request.selections);
  if (problems.length > 0) {
    throw new PrepareError("INVALID_INPUT", problems.join("; "));
  }

  let spread = selectSpread(request.selections);
  if (request.spreadOverrideId && request.spreadOverrideId !== spread.id) {
    if (!isSpreadAllowed(request.spreadOverrideId, request.selections)) {
      throw new PrepareError("INVALID_INPUT", "spread override not allowed for these selections");
    }
    spread = getSpread(request.spreadOverrideId);
  }

  // Authoritative draw moment + independent draw, frozen before anything else.
  const momentUtc = now.toISOString();
  const draw = drawCards(spread.cardCount, request.selections.reversalsEnabled);

  const currentSky = computeCurrentSky(now);

  // Birth layers — strictly optional, computed only from what is provided.
  let natal: NatalInformation = { kind: "none" };
  let numerology: NumerologyProfile | null = null;
  let transits: TransitHit[] = [];
  const birth = request.birth;
  const birthProvided = {
    date: Boolean(birth?.date),
    time: Boolean(birth?.date && birth?.time),
    place: Boolean(birth?.date && birth?.placeId),
  };

  if (birth?.date) {
    try {
      assertValidBirthDate(birth.date);
    } catch (error) {
      throw new PrepareError("INVALID_INPUT", String((error as Error).message));
    }
    numerology = numerologyProfile(birth.date, now);

    const place = birth.placeId ? await getPlace(pool, birth.placeId) : null;
    if (birth.placeId && !place) {
      throw new PrepareError("INVALID_INPUT", "unknown birthplace id");
    }

    if (place && birth.time) {
      const resolution = resolveLocalTime(
        birth.date.year,
        birth.date.month,
        birth.date.day,
        birth.time.hour,
        birth.time.minute,
        place.timezone,
      );
      if (resolution.kind === "gap") {
        throw new PrepareError(
          "BIRTH_TIME_NONEXISTENT",
          "That local time did not occur on this date because of a clock change.",
        );
      }
      if (resolution.kind === "ambiguous") {
        const choice = birth.dstAmbiguityChoice;
        if (choice === "first" || choice === "second") {
          const instant = choice === "first" ? resolution.first : resolution.second;
          const chart = computeNatalChart(instant, { lat: place.lat, lon: place.lon });
          natal = { kind: "exact", chart };
          transits = computeTransits(currentSky, chart);
        } else if (choice === "not_sure") {
          // Cover both instants; suppress anything that differs (spec §10.4).
          natal = {
            kind: "partial",
            profile: computePartialBetween(
              resolution.first,
              resolution.second,
              "date_and_place",
            ),
          };
        } else {
          throw new PrepareError(
            "BIRTH_TIME_AMBIGUOUS",
            "That local time occurred twice on this date because of a clock change.",
          );
        }
      } else {
        const chart = computeNatalChart(resolution.utc, { lat: place.lat, lon: place.lon });
        natal = { kind: "exact", chart };
        transits = computeTransits(currentSky, chart);
      }
    } else if (place) {
      natal = {
        kind: "partial",
        profile: computeConservativeDateOnly(
          birth.date.year,
          birth.date.month,
          birth.date.day,
          place.timezone,
        ),
      };
    } else {
      // Birth time without a birthplace cannot be located in a timezone;
      // the calculation narrows to the date-only envelope (spec §10.4).
      natal = {
        kind: "partial",
        profile: computeConservativeDateOnly(
          birth.date.year,
          birth.date.month,
          birth.date.day,
        ),
      };
    }
  }

  const context = compileReadingContext({
    momentUtc,
    selections: request.selections,
    spread,
    draw,
    currentSky,
    natal,
    transits,
    numerology,
    birthProvided,
  });

  const issuedAt = now.getTime();
  const expiresAt = issuedAt + env.readingTicketTtlMinutes * 60_000;
  const ticket = sealTicket(
    {
      v: 1,
      nonce: newReadingNonce(),
      issuedAt,
      expiresAt,
      context,
    },
    env.ticketKeyCurrent,
  );

  return {
    ticket,
    expiresAt: new Date(expiresAt).toISOString(),
    context,
    deterministicFallback: renderDeterministicReading(context),
  };
}
