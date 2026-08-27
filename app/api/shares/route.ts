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
import { getEnv } from "@/lib/config/env";
import { newShareId } from "@/lib/crypto/tokens";
import { checkAndIncrement } from "@/lib/rate-limit/rate-limit";

const bodySchema = z.strictObject({
  ciphertext: z.string().min(24).max(120_000), // base64 of ≤ configured bytes
  iv: z.string().min(12).max(64),
  algorithm: z.literal("AES-256-GCM"),
  schemaVersion: z.literal(1),
});

/**
 * POST /api/shares (spec §20): stores only client-encrypted ciphertext.
 * The AES key never reaches the server — it lives in the URL fragment the
 * browser constructs. Size and TTL are enforced server-side.
 */
export const POST = withRoute("shares/create", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;

  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const pace = await checkAndIncrement(auth.pool, auth.rateKeyHash, "share_daily", 24 * 3600, 10);
  if (!pace.allowed) {
    return apiError("RATE_TEMPORARILY_UNAVAILABLE");
  }

  const body = await readStrictBody(request, bodySchema, 200 * 1024);
  if (body instanceof NextResponse) return body;

  let ciphertext: Buffer;
  let iv: Buffer;
  try {
    ciphertext = Buffer.from(body.ciphertext, "base64");
    iv = Buffer.from(body.iv, "base64");
  } catch {
    return apiError("INVALID_INPUT", { detail: "invalid encoding" });
  }
  const env = getEnv();
  if (ciphertext.length < 32 || ciphertext.length > env.shareMaxCiphertextBytes) {
    return apiError("INVALID_INPUT", { detail: "ciphertext size" });
  }
  if (iv.length !== 12) {
    return apiError("INVALID_INPUT", { detail: "iv size" });
  }

  const shareId = newShareId();
  const expiresAt = new Date(
    Date.now() + auth.settings.shareTtlDays * 24 * 3600 * 1000,
  );
  await auth.pool.query(
    `INSERT INTO share_artifacts (share_id, ciphertext, iv, algorithm, schema_version, byte_size, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [shareId, ciphertext, iv, body.algorithm, body.schemaVersion, ciphertext.length, expiresAt],
  );

  return apiJson({ shareId, expiresAt: expiresAt.toISOString() });
});
