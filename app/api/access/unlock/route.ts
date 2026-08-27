import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiJson,
  checkOrigin,
  isSecureOrigin,
  readStrictBody,
  requestIpKey,
  withRoute,
} from "@/lib/http/api";
import { getEnv } from "@/lib/config/env";
import { getPool } from "@/lib/db/client";
import { loadSettings } from "@/lib/db/settings";
import { verifySecret } from "@/lib/auth/hash";
import {
  issueSessionToken,
  newInstallationId,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  sessionCookieAttributes,
} from "@/lib/auth/session";
import { checkAndIncrement } from "@/lib/rate-limit/rate-limit";

const bodySchema = z
  .strictObject({
    accessCode: z.string().min(1).max(256),
  });

/**
 * POST /api/access/unlock (spec §21): verify the shared access code, issue
 * the anonymous authorization cookie. Generic failure copy; per-IP and
 * global throttling; never logs the submitted code.
 */
export const POST = withRoute("access/unlock", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;

  const pool = getPool();
  const env = getEnv();

  const ipKey = requestIpKey(request);
  const perIp = await checkAndIncrement(pool, ipKey, "unlock_ip", 600, 8);
  const global = await checkAndIncrement(pool, "global", "unlock_global", 600, 120);
  if (!perIp.allowed || !global.allowed) {
    return apiError("RATE_TEMPORARILY_UNAVAILABLE");
  }

  const body = await readStrictBody(request, bodySchema, 4 * 1024);
  if (body instanceof NextResponse) return body;

  const settings = await loadSettings(pool);
  if (!settings.unlockEnabled) {
    return apiError("ACCESS_DENIED");
  }
  const hash = settings.accessCodeHash ?? env.bootstrapAccessCodeHash;
  const valid = await verifySecret(hash, body.accessCode.trim());
  if (!valid) {
    return apiError("ACCESS_DENIED");
  }

  const token = issueSessionToken(
    { iid: newInstallationId(), epo: settings.sessionEpoch, aud: "session" },
    env.authSigningSecret,
  );
  const response = apiJson({ ok: true });
  response.headers.append(
    "Set-Cookie",
    sessionCookieAttributes({
      name: SESSION_COOKIE,
      value: token,
      maxAgeSeconds: SESSION_TTL_SECONDS,
      secure: isSecureOrigin(),
    }),
  );
  return response;
});
