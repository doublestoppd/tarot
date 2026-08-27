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
import { interpretReading } from "@/lib/reading/interpret-service";

const bodySchema = z.strictObject({
  ticket: z.string().min(16).max(262_144),
});

/**
 * POST /api/readings/interpret (spec §24): validate the encrypted ticket,
 * reserve worst-case budget, one model call (+ at most one repair), return
 * the validated synthesis or the deterministic reading. The same cards are
 * preserved for retry within the ticket TTL; a redraw never happens here.
 */
export const POST = withRoute("readings/interpret", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;

  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const body = await readStrictBody(request, bodySchema, 300 * 1024);
  if (body instanceof NextResponse) return body;

  const outcome = await interpretReading(auth.pool, auth.settings, {
    ticket: body.ticket,
    rateKeyHash: auth.rateKeyHash,
  });

  switch (outcome.kind) {
    case "ai":
      return apiJson({ kind: "ai", synthesis: outcome.synthesis });
    case "deterministic":
      return apiJson({
        kind: "deterministic",
        reason: outcome.reason,
        synthesis: outcome.synthesis,
      });
    case "error":
      return apiError(outcome.code);
  }
});
