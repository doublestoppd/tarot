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
  ADMIN_COOKIE,
  ADMIN_TTL_SECONDS,
  issueSessionToken,
  newInstallationId,
  sessionCookieAttributes,
} from "@/lib/auth/session";
import { checkAndIncrement } from "@/lib/rate-limit/rate-limit";

const bodySchema = z.strictObject({ adminSecret: z.string().min(1).max(256) });

/** POST /api/admin/login: separate high-entropy admin secret (spec §28). */
export const POST = withRoute("admin/login", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;

  const pool = getPool();
  const env = getEnv();
  const perIp = await checkAndIncrement(pool, requestIpKey(request), "admin_login_ip", 900, 5);
  if (!perIp.allowed) return apiError("RATE_TEMPORARILY_UNAVAILABLE");

  const body = await readStrictBody(request, bodySchema, 4 * 1024);
  if (body instanceof NextResponse) return body;

  const settings = await loadSettings(pool);
  const hash = settings.adminSecretHash ?? env.bootstrapAdminSecretHash;
  const valid = await verifySecret(hash, body.adminSecret.trim());
  if (!valid) return apiError("ACCESS_DENIED");

  const token = issueSessionToken(
    { iid: newInstallationId(), epo: settings.sessionEpoch, aud: "admin" },
    env.authSigningSecret,
  );
  const response = apiJson({ ok: true });
  response.headers.append(
    "Set-Cookie",
    sessionCookieAttributes({
      name: ADMIN_COOKIE,
      value: token,
      maxAgeSeconds: ADMIN_TTL_SECONDS,
      secure: isSecureOrigin(),
    }),
  );
  return response;
});
