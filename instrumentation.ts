/**
 * Server startup hook: validate configuration (fail fast, spec §50 Phase 0),
 * apply pending migrations, and seed reference data. Set AUTO_MIGRATE=false
 * to manage migrations manually (scripts/db-migrate.mjs).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getEnv } = await import("@/lib/config/env");
  // Throws (and stops the server) on invalid secrets/budgets — deliberate.
  const env = getEnv();

  if (process.env.AUTO_MIGRATE === "false") return;
  try {
    const { getPool } = await import("@/lib/db/client");
    const { runMigrations } = await import("@/lib/db/migrate");
    const { ensureSettingsRow } = await import("@/lib/db/settings");
    const { seedPlacesIfEmpty } = await import("@/lib/places/places");
    const { logger } = await import("@/lib/logging/logger");
    const pool = getPool();
    const applied = await runMigrations(pool);
    await ensureSettingsRow(pool);
    const seeded = await seedPlacesIfEmpty(pool);
    logger.info("startup complete", {
      migrationsApplied: applied.length,
      gazetteerRowsSeeded: seeded,
      nodeEnv: env.nodeEnv,
    });
  } catch (error) {
    // Database may still be starting (compose healthcheck gates this in
    // production); requests fail closed until it is reachable.
    const { logger } = await import("@/lib/logging/logger");
    logger.error("startup migration/seed failed; continuing fail-closed", {
      errorClass: (error as Error).name,
    });
  }
}
