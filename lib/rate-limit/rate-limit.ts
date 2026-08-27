import type { Pool } from "pg";

/**
 * Fixed-window rate limiting over HMAC-derived anonymous keys
 * (spec §21.3, §29.1). Only derived key hashes and counts are stored,
 * with short TTLs cleaned opportunistically.
 */

export interface RateCheck {
  allowed: boolean;
  count: number;
  limit: number;
}

export async function checkAndIncrement(
  pool: Pool,
  rateKeyHash: string,
  bucketType: string,
  windowSeconds: number,
  limit: number,
  now: Date = new Date(),
): Promise<RateCheck> {
  const windowMs = windowSeconds * 1000;
  const bucketStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const expiresAt = new Date(bucketStart.getTime() + 2 * windowMs);
  const result = await pool.query<{ count: number }>(
    `INSERT INTO rate_limit_buckets (rate_key_hash, bucket_type, bucket_start, count, expires_at)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (rate_key_hash, bucket_type, bucket_start)
       DO UPDATE SET count = rate_limit_buckets.count + 1
     RETURNING count`,
    [rateKeyHash, bucketType, bucketStart, expiresAt],
  );
  const count = result.rows[0]!.count;
  return { allowed: count <= limit, count, limit };
}

/** Read-only check (used to decide before doing work that might not happen). */
export async function peekCount(
  pool: Pool,
  rateKeyHash: string,
  bucketType: string,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<number> {
  const windowMs = windowSeconds * 1000;
  const bucketStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const result = await pool.query<{ count: number }>(
    `SELECT count FROM rate_limit_buckets
      WHERE rate_key_hash = $1 AND bucket_type = $2 AND bucket_start = $3`,
    [rateKeyHash, bucketType, bucketStart],
  );
  return result.rows[0]?.count ?? 0;
}

export async function cleanupExpiredBuckets(pool: Pool, now: Date = new Date()): Promise<number> {
  const result = await pool.query(
    "DELETE FROM rate_limit_buckets WHERE expires_at < $1",
    [now],
  );
  return result.rowCount ?? 0;
}
