// Dependency-light migration runner for the production container
// (`node scripts/db-migrate.mjs`), reusing the pg package already present in
// the standalone bundle. Equivalent to lib/db/migrate.ts.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dir = path.resolve(process.cwd(), "db/migrations");

await pool.query(
  `CREATE TABLE IF NOT EXISTS schema_migrations (
     version TEXT PRIMARY KEY,
     applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
);
const appliedRows = await pool.query("SELECT version FROM schema_migrations");
const applied = new Set(appliedRows.rows.map((r) => r.version));

for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(file)) continue;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(readFileSync(path.join(dir, file), "utf-8"));
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`applied ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`migration ${file} failed: ${error}`);
    process.exit(1);
  } finally {
    client.release();
  }
}
console.log("migrations up to date");
await pool.end();
