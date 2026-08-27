import { NextResponse, type NextRequest } from "next/server";
import { apiJson, requireSession, withRoute } from "@/lib/http/api";
import { getEnv } from "@/lib/config/env";
import { buildSynthesizer } from "@/lib/reading/interpret-service";

/**
 * GET /api/config/public: sanitized UI defaults for authorized browsers.
 * No secrets, budgets, or dollar values (spec §24, §29.1).
 */
export const GET = withRoute("config/public", async (request: NextRequest): Promise<NextResponse> => {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;
  const env = getEnv();
  return apiJson({
    fullInterpretationAvailable:
      auth.settings.aiEnabled && buildSynthesizer(auth.settings) !== null,
    readingTicketTtlMinutes: env.readingTicketTtlMinutes,
    shareTtlDays: auth.settings.shareTtlDays,
    shareMaxCiphertextBytes: env.shareMaxCiphertextBytes,
  });
});
