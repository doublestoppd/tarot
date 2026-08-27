import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  apiJson,
  checkOrigin,
  readStrictBody,
  requireAdmin,
  withRoute,
} from "@/lib/http/api";
import { hashSecret } from "@/lib/auth/hash";
import { generateAccessCode } from "@/lib/auth/access-code";
import { rotateAccessCodeHash } from "@/lib/db/settings";

const bodySchema = z.strictObject({ confirm: z.literal(true) });

/**
 * POST /api/admin/access-code/rotate (spec §21.1, §28): generates a fresh
 * shared access code, stores only its Argon2id hash, and returns the
 * plaintext exactly once. Existing authorized browsers keep working unless
 * the session epoch is bumped separately.
 */
export const POST = withRoute("admin/access-rotate", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await readStrictBody(request, bodySchema, 1024);
  if (body instanceof NextResponse) return body;

  const plaintext = generateAccessCode();
  const hash = await hashSecret(plaintext);
  await rotateAccessCodeHash(auth.pool, hash);

  return apiJson({
    accessCode: plaintext,
    note: "Shown once. Store it in a password manager and distribute out-of-band.",
  });
});
