import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiJson,
  checkOrigin,
  readStrictBody,
  requireSession,
  withRoute,
} from "@/lib/http/api";
import { prepareReading, PrepareError } from "@/lib/reading/prepare-service";
import { buildReadingDisplay } from "@/lib/reading/display";
import { checkAndIncrement } from "@/lib/rate-limit/rate-limit";
import { createHash } from "node:crypto";

const bodySchema = z.strictObject({
  idempotencyKey: z.string().uuid(),
  domainId: z.string().min(1).max(40),
  focusId: z.string().min(1).max(60),
  insightId: z.string().min(1).max(40),
  timePerspectiveId: z.string().min(1).max(40),
  depth: z.enum(["focused", "deep", "comprehensive"]),
  reversalsEnabled: z.boolean(),
  spreadOverrideId: z.string().min(1).max(40).optional(),
  situation: z.string().max(500).optional(),
  birth: z
    .strictObject({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
      time: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .nullable()
        .optional(),
      placeId: z.string().min(1).max(120).nullable().optional(),
      dstAmbiguityChoice: z.enum(["first", "second", "not_sure"]).nullable().optional(),
    })
    .optional(),
});

/**
 * POST /api/readings/prepare (spec §24.1–24.2): authoritative server
 * timestamp, secure draw, deterministic calculation, evidence compilation,
 * encrypted short-lived reading ticket. No arbitrary text fields; unknown
 * properties are rejected; nothing is persisted.
 */
export const POST = withRoute("readings/prepare", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;

  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const body = await readStrictBody(request, bodySchema, 8 * 1024);
  if (body instanceof NextResponse) return body;

  // Duplicate-submission guard: the same idempotency key prepares once
  // within its validity window (spec §6.2, §31.1).
  const idemHash = createHash("sha256").update(body.idempotencyKey).digest("hex");
  const idem = await checkAndIncrement(auth.pool, idemHash, "prepare_idem", 120, 1);
  if (!idem.allowed) {
    return apiError("DUPLICATE_REQUEST");
  }

  // Basic preparation pacing per browser (non-AI, generous).
  const pace = await checkAndIncrement(auth.pool, auth.rateKeyHash, "prepare_pace", 3600, 60);
  if (!pace.allowed) {
    return apiError("RATE_TEMPORARILY_UNAVAILABLE");
  }

  let birth;
  if (body.birth?.date) {
    const [year, month, day] = body.birth.date.split("-").map(Number) as [number, number, number];
    const time = body.birth.time
      ? {
          hour: Number(body.birth.time.slice(0, 2)),
          minute: Number(body.birth.time.slice(3, 5)),
        }
      : undefined;
    birth = {
      date: { year, month, day },
      ...(time ? { time } : {}),
      ...(body.birth.placeId ? { placeId: body.birth.placeId } : {}),
      ...(body.birth.dstAmbiguityChoice
        ? { dstAmbiguityChoice: body.birth.dstAmbiguityChoice }
        : {}),
    };
  }

  try {
    const prepared = await prepareReading(auth.pool, {
      selections: {
        domainId: body.domainId,
        focusId: body.focusId,
        insightId: body.insightId,
        timePerspectiveId: body.timePerspectiveId,
        depth: body.depth,
        reversalsEnabled: body.reversalsEnabled,
      },
      ...(body.spreadOverrideId ? { spreadOverrideId: body.spreadOverrideId } : {}),
      ...(birth ? { birth } : {}),
      ...(body.situation ? { situation: body.situation } : {}),
      sessionRateKeyHash: auth.rateKeyHash,
    });

    return apiJson({
      readingTicket: prepared.ticket,
      expiresAt: prepared.expiresAt,
      display: buildReadingDisplay(prepared.context, prepared.deterministicFallback),
    });
  } catch (error) {
    if (error instanceof PrepareError) {
      switch (error.code) {
        case "BIRTH_TIME_NONEXISTENT":
          return apiError("INVALID_INPUT", {
            reason: "BIRTH_TIME_NONEXISTENT",
            message:
              "That local time did not occur on this date because of a clock change. Check the time, or leave birth time open.",
          });
        case "BIRTH_TIME_AMBIGUOUS":
          return apiError("INVALID_INPUT", {
            reason: "BIRTH_TIME_AMBIGUOUS",
            message:
              "That local time occurred twice on this date because of a clock change. Choose which occurrence to use, or select “not sure.”",
          });
        case "PLACE_AMBIGUOUS":
          return apiError("PLACE_AMBIGUOUS", { message: error.detail });
        default:
          return apiError("INVALID_INPUT", { message: error.detail });
      }
    }
    throw error;
  }
});
