import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  apiJson,
  checkOrigin,
  readStrictBody,
  requireAdmin,
  withRoute,
} from "@/lib/http/api";
import { incrementSessionEpoch } from "@/lib/db/settings";

const bodySchema = z.strictObject({ confirm: z.literal(true) });

/**
 * POST /api/admin/sessions/invalidate (spec §21.1, §28): bumps the session
 * epoch, invalidating every authorized browser (including the admin's own
 * console session) with explicit confirmation.
 */
export const POST = withRoute("admin/invalidate", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await readStrictBody(request, bodySchema, 1024);
  if (body instanceof NextResponse) return body;

  const epoch = await incrementSessionEpoch(auth.pool);
  return apiJson({ ok: true, sessionEpoch: epoch });
});
