import { Pool } from "pg";
import { getEnv } from "@/lib/config/env";

/**
 * PostgreSQL pool singleton. Route handlers share one pool per process;
 * integration tests construct their own pools against disposable clusters.
 */

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getEnv().databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Run a callback inside a transaction with automatic rollback on throw. */
export async function withTransaction<T>(
  poolOrUndefined: Pool | undefined,
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const p = poolOrUndefined ?? getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // connection-level failure; surface the original error
    }
    throw error;
  } finally {
    client.release();
  }
}
