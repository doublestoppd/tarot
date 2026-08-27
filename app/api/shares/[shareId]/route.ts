import { NextResponse, type NextRequest } from "next/server";
import { apiError, apiJson, requireSession, withRoute } from "@/lib/http/api";
import { isPlausibleShareId } from "@/lib/crypto/tokens";

/**
 * GET /api/shares/{shareId} (spec §20.2 step 9): returns ciphertext + IV +
 * metadata to an authorized browser. Decryption happens client-side with
 * the fragment key the server never sees. Expired rows answer 410 and are
 * removed opportunistically.
 */
async function handler(
  request: NextRequest,
  shareId: string,
): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  if (!isPlausibleShareId(shareId)) {
    return apiError("SHARE_NOT_FOUND");
  }

  const result = await auth.pool.query<{
    ciphertext: Buffer;
    iv: Buffer;
    algorithm: string;
    schema_version: number;
    created_at: Date;
    expires_at: Date;
  }>(
    `SELECT ciphertext, iv, algorithm, schema_version, created_at, expires_at
       FROM share_artifacts WHERE share_id = $1`,
    [shareId],
  );
  const row = result.rows[0];
  if (!row) {
    return apiError("SHARE_NOT_FOUND");
  }
  if (row.expires_at.getTime() <= Date.now()) {
    await auth.pool.query("DELETE FROM share_artifacts WHERE share_id = $1", [shareId]);
    return apiError("SHARE_UNAVAILABLE");
  }
  return apiJson({
    ciphertext: row.ciphertext.toString("base64"),
    iv: row.iv.toString("base64"),
    algorithm: row.algorithm,
    schemaVersion: row.schema_version,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shareId: string }> },
): Promise<NextResponse> {
  const { shareId } = await context.params;
  return withRoute("shares/get", (req) => handler(req, shareId))(request);
}
