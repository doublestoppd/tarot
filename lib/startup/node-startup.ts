import { getEnv } from "@/lib/config/env";
import { getPool } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { ensureSettingsRow } from "@/lib/db/settings";
import { seedPlacesIfEmpty } from "@/lib/places/places";
import { cleanupExpiredBuckets } from "@/lib/rate-limit/rate-limit";
import { logger } from "@/lib/logging/logger";

/**
 * Node-runtime startup (loaded only from instrumentation.ts under the
 * nodejs runtime): fail-fast config validation (spec §50 Phase 0), automatic
 * migrations + reference seeding, and the daily maintenance schedule
 * (spec §20.4). Set AUTO_MIGRATE=false to manage migrations manually
 * (scripts/db-migrate.mjs).
 */
export async function nodeStartup(): Promise<void> {
  // Throws (and stops the server) on invalid secrets/budgets — deliberate.
  const env = getEnv();

  if (process.env.AUTO_MIGRATE !== "false") {
    try {
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
      logger.error("startup migration/seed failed; continuing fail-closed", {
        errorClass: (error as Error).name,
      });
    }
  }

  startMaintenanceSchedule();
}

let maintenanceStarted = false;

/**
 * Scheduled maintenance (spec §20.4): expired share ciphertext is deleted
 * daily; expired rate-limit buckets and long-settled budget reservations are
 * swept with it. First run shortly after boot, then every 24 hours.
 */
function startMaintenanceSchedule(): void {
  if (maintenanceStarted) return;
  maintenanceStarted = true;

  const run = async () => {
    try {
      const pool = getPool();
      const shares = await pool.query(
        "DELETE FROM share_artifacts WHERE expires_at <= now()",
      );
      const buckets = await cleanupExpiredBuckets(pool);
      await pool.query(
        `DELETE FROM budget_reservations
          WHERE status IN ('released', 'expired')
            AND created_at < now() - interval '7 days'`,
      );
      logger.info("maintenance sweep", {
        sharesRemoved: shares.rowCount ?? 0,
        bucketsRemoved: buckets,
      });
    } catch {
      // Database unavailable — the next scheduled run retries.
    }
  };

  const firstRun = setTimeout(() => void run(), 60_000);
  firstRun.unref?.();
  const daily = setInterval(() => void run(), 24 * 3600 * 1000);
  daily.unref?.();
}
