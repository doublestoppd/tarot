import { writeFileSync } from "node:fs";
import * as argon2 from "argon2";
import { startTestCluster } from "@/tests/integration/helpers/pg-cluster";
import { runMigrations } from "@/lib/db/migrate";
import { seedPlacesIfEmpty } from "@/lib/places/places";

/**
 * Development stack helper: boots a disposable local PostgreSQL cluster,
 * applies migrations, seeds the gazetteer, and writes a ready-to-source env
 * file with bootstrap credential hashes. Used by local development and the
 * Playwright/E2E smoke flow; never in production.
 *
 *   npx tsx scripts/dev-stack.ts [outEnvPath] [accessCode] [adminSecret]
 */
async function main(): Promise<void> {
  const outPath = process.argv[2] ?? ".dev-stack.env";
  const accessCode = process.argv[3] ?? "TEST-ACCESS-CODE";
  const adminSecret = process.argv[4] ?? "TEST-ADMIN-SECRET";

  const cluster = await startTestCluster();
  await runMigrations(cluster.pool);
  const seeded = await seedPlacesIfEmpty(cluster.pool);

  const accessHash = await argon2.hash(accessCode, { type: argon2.argon2id });
  const adminHash = await argon2.hash(adminSecret, { type: argon2.argon2id });

  writeFileSync(
    outPath,
    [
      `DATABASE_URL=${cluster.connectionString}`,
      `BOOTSTRAP_ACCESS_CODE_HASH='${accessHash}'`,
      `BOOTSTRAP_ADMIN_SECRET_HASH='${adminHash}'`,
      `AUTH_SIGNING_SECRET=dev-signing-secret-0123456789abcdef0123456789`,
      `READING_TICKET_KEY_CURRENT=${Buffer.alloc(32, 9).toString("base64")}`,
      `RATE_LIMIT_PEPPER=dev-pepper-0123456789abcdef0123456789abcdef`,
      `AI_ENABLED=true`,
      "",
    ].join("\n"),
  );

  console.log(`postgres: ${cluster.connectionString}`);
  console.log(`seeded places: ${seeded}`);
  console.log(`env written: ${outPath}`);
  console.log("Press Ctrl+C to stop the cluster.");

  const shutdown = async () => {
    await cluster.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  setInterval(() => {}, 60_000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
