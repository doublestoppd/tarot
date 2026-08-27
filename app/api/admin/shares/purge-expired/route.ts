import { NextResponse, type NextRequest } from "next/server";
import {
  apiJson,
  checkOrigin,
  requireAdmin,
  withRoute,
} from "@/lib/http/api";
import { cleanupExpiredBuckets } from "@/lib/rate-limit/rate-limit";

/**
 * POST /api/admin/shares/purge-expired (spec §20.4, §28): deletes expired
 * share ciphertext (and sweeps expired rate-limit buckets). Returns counts
 * only — never content.
 */
export const POST = withRoute("admin/purge-expired", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const purged = await auth.pool.query(
    "DELETE FROM share_artifacts WHERE expires_at <= now()",
  );
  const buckets = await cleanupExpiredBuckets(auth.pool);
  await auth.pool.query(
    `DELETE FROM budget_reservations
      WHERE status IN ('released', 'expired') AND created_at < now() - interval '7 days'`,
  );
  return apiJson({ sharesRemoved: purged.rowCount ?? 0, bucketsRemoved: buckets });
});
