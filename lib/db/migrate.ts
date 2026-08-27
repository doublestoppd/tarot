import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

/**
 * Minimal forward-only migration runner over hand-written SQL files in
 * db/migrations/, tracked in schema_migrations (spec §23.1).
 */
export async function runMigrations(
  pool: Pool,
  migrationsDir: string = path.resolve(process.cwd(), "db/migrations"),
): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedResult = await pool.query<{ version: string }>(
    "SELECT version FROM schema_migrations",
  );
  const applied = new Set(appliedResult.rows.map((r) => r.version));

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await client.query("COMMIT");
      newlyApplied.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${String(error)}`);
    } finally {
      client.release();
    }
  }
  return newlyApplied;
}
