import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { findPgBin, startTestCluster, type TestCluster } from "./helpers/pg-cluster";
import { runMigrations } from "@/lib/db/migrate";
import {
  ensureSettingsRow,
  incrementSessionEpoch,
  invalidateSettingsCache,
  loadSettings,
  updateSettings,
  type AppSettings,
} from "@/lib/db/settings";
import {
  finalizeReservation,
  releaseReservation,
  reserveBudget,
} from "@/lib/budget/budget";
import { checkAndIncrement, cleanupExpiredBuckets } from "@/lib/rate-limit/rate-limit";

const pgAvailable = findPgBin() !== null;
const suite = pgAvailable ? describe : describe.skip;

// Minimal environment for lib/config consumption inside settings seeding.
process.env.DATABASE_URL ??= "postgresql://unused/unused";
process.env.AUTH_SIGNING_SECRET ??= "test-signing-secret-0123456789abcdef0123456789";
process.env.READING_TICKET_KEY_CURRENT ??= Buffer.alloc(32, 7).toString("base64");
process.env.RATE_LIMIT_PEPPER ??= "test-pepper-0123456789abcdef0123456789abcdef";

suite("database integration (disposable PostgreSQL cluster)", () => {
  let cluster: TestCluster;
  let pool: Pool;

  beforeAll(async () => {
    cluster = await startTestCluster();
    pool = cluster.pool;
    const applied = await runMigrations(pool);
    expect(applied.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await cluster?.stop();
  });

  describe("schema privacy (spec §31.1)", () => {
    it("contains no user/profile/reading/prompt/output tables", async () => {
      const result = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
      );
      const tables = result.rows.map((r) => r.table_name);
      const forbidden = [
        /user/i,
        /profile/i,
        /reading/i,
        /natal/i,
        /prompt/i,
        /output/i,
        /history/i,
        /birth/i,
      ];
      for (const table of tables) {
        for (const pattern of forbidden) {
          expect(pattern.test(table), `forbidden table ${table}`).toBe(false);
        }
      }
      expect(tables.sort()).toEqual([
        "app_settings",
        "budget_reservations",
        "budget_state",
        "places",
        "rate_limit_buckets",
        "schema_migrations",
        "share_artifacts",
        "usage_daily",
      ]);
    });

    it("migrations are idempotent", async () => {
      const applied = await runMigrations(pool);
      expect(applied).toEqual([]);
    });
  });

  describe("app settings", () => {
    it("seeds once, loads, updates, bumps epoch", async () => {
      await ensureSettingsRow(pool);
      invalidateSettingsCache();
      const settings = await loadSettings(pool, { fresh: true });
      expect(settings.sessionEpoch).toBe(1);
      expect(settings.dailyBudgetMicro).toBe(2_000_000);

      const updated = await updateSettings(pool, { aiEnabled: true, dailyBudgetMicro: 5_000_000 });
      expect(updated.aiEnabled).toBe(true);
      expect(updated.dailyBudgetMicro).toBe(5_000_000);

      const epoch = await incrementSessionEpoch(pool);
      expect(epoch).toBe(2);
    });
  });

  const testSettings = (over: Partial<AppSettings> = {}): AppSettings => ({
    accessCodeHash: null,
    adminSecretHash: null,
    sessionEpoch: 1,
    aiEnabled: true,
    unlockEnabled: true,
    aiProvider: "openai",
    aiModel: "gpt-5.6-luna",
    dailyBudgetMicro: 200_000, // $0.20 → four 5-cent reservations
    monthlyBudgetMicro: 30_000_000,
    maxReadingCostMicro: 50_000,
    maxRepairCostMicro: 50_000,
    perInstallHourly: 6,
    perInstallDaily: 20,
    globalAiConcurrency: 100,
    shareTtlDays: 90,
    ...over,
  });

  describe("atomic budget reservations (spec §29.2)", () => {
    it("a concurrency storm cannot exceed the configured budget", async () => {
      const settings = testSettings();
      const results = await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          reserveBudget(pool, settings, {
            kind: "normal",
            ticketNonceHash: `race_nonce_${i}`,
            rateKeyHash: `race_key_${i}`,
            reserveMicro: 50_000,
          }),
        ),
      );
      const succeeded = results.filter((r) => r.ok);
      expect(succeeded.length).toBe(4); // exactly $0.20 / $0.05

      const state = await pool.query<{ reserved_microusd: string; committed_microusd: string }>(
        `SELECT reserved_microusd, committed_microusd FROM budget_state WHERE period_type = 'daily'`,
      );
      const total =
        Number(state.rows[0]!.reserved_microusd) + Number(state.rows[0]!.committed_microusd);
      expect(total).toBeLessThanOrEqual(200_000);

      // Clean up for following tests.
      for (const r of succeeded) {
        if (r.ok) await releaseReservation(pool, r.reservationId);
      }
    });

    it("finalization moves reserved to committed with actual usage", async () => {
      const settings = testSettings({ dailyBudgetMicro: 10_000_000 });
      const reserved = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "finalize_nonce",
        rateKeyHash: "finalize_key",
        reserveMicro: 50_000,
      });
      expect(reserved.ok).toBe(true);
      if (!reserved.ok) return;
      await finalizeReservation(pool, reserved.reservationId, {
        inputTokens: 8000,
        outputTokens: 1500,
        actualMicro: 3_400,
        kind: "normal",
      });
      const usage = await pool.query<{ ai_requests: number; estimated_cost_microusd: string }>(
        "SELECT ai_requests, estimated_cost_microusd FROM usage_daily",
      );
      expect(usage.rows[0]!.ai_requests).toBeGreaterThanOrEqual(1);
      const reservation = await pool.query<{ status: string; finalized_microusd: string }>(
        "SELECT status, finalized_microusd FROM budget_reservations WHERE reservation_id = $1",
        [reserved.reservationId],
      );
      expect(reservation.rows[0]!.status).toBe("finalized");
      expect(Number(reservation.rows[0]!.finalized_microusd)).toBe(3_400);
    });

    it("enforces the one-call rule per reading nonce (idempotency)", async () => {
      const settings = testSettings({ dailyBudgetMicro: 10_000_000 });
      const first = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "dup_nonce",
        rateKeyHash: "dup_key_1",
        reserveMicro: 50_000,
      });
      expect(first.ok).toBe(true);
      if (first.ok) {
        await finalizeReservation(pool, first.reservationId, {
          inputTokens: 1,
          outputTokens: 1,
          actualMicro: 100,
          kind: "normal",
        });
      }
      const second = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "dup_nonce",
        rateKeyHash: "dup_key_2",
        reserveMicro: 50_000,
      });
      expect(second).toEqual({ ok: false, reason: "duplicate" });
      // A repair reservation for the same nonce is still allowed exactly once.
      const repair = await reserveBudget(pool, settings, {
        kind: "repair",
        ticketNonceHash: "dup_nonce",
        rateKeyHash: "dup_key_3",
        reserveMicro: 50_000,
      });
      expect(repair.ok).toBe(true);
      if (repair.ok) await releaseReservation(pool, repair.reservationId);
    });

    it("released reservations allow a retry with the same nonce", async () => {
      const settings = testSettings({ dailyBudgetMicro: 10_000_000 });
      const first = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "retry_nonce",
        rateKeyHash: "retry_key",
        reserveMicro: 50_000,
      });
      expect(first.ok).toBe(true);
      if (first.ok) await releaseReservation(pool, first.reservationId);
      const second = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "retry_nonce",
        rateKeyHash: "retry_key",
        reserveMicro: 50_000,
      });
      expect(second.ok).toBe(true);
      if (second.ok) await releaseReservation(pool, second.reservationId);
    });

    it("enforces per-install concurrency of one", async () => {
      const settings = testSettings({ dailyBudgetMicro: 10_000_000 });
      const first = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "conc_nonce_1",
        rateKeyHash: "same_install",
        reserveMicro: 50_000,
      });
      expect(first.ok).toBe(true);
      const second = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "conc_nonce_2",
        rateKeyHash: "same_install",
        reserveMicro: 50_000,
      });
      expect(second).toEqual({ ok: false, reason: "install_concurrency" });
      if (first.ok) await releaseReservation(pool, first.reservationId);
    });

    it("enforces global concurrency", async () => {
      const settings = testSettings({
        dailyBudgetMicro: 10_000_000,
        globalAiConcurrency: 2,
      });
      const a = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "glob_1",
        rateKeyHash: "glob_key_1",
        reserveMicro: 50_000,
      });
      const b = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "glob_2",
        rateKeyHash: "glob_key_2",
        reserveMicro: 50_000,
      });
      const c = await reserveBudget(pool, settings, {
        kind: "normal",
        ticketNonceHash: "glob_3",
        rateKeyHash: "glob_key_3",
        reserveMicro: 50_000,
      });
      expect(a.ok && b.ok).toBe(true);
      expect(c).toEqual({ ok: false, reason: "global_concurrency" });
      for (const r of [a, b]) {
        if (r.ok) await releaseReservation(pool, r.reservationId);
      }
    });

    it("expires stale reservations and returns their budget", async () => {
      const settings = testSettings({ dailyBudgetMicro: 10_000_000 });
      const stale = await reserveBudget(
        pool,
        settings,
        {
          kind: "normal",
          ticketNonceHash: "stale_nonce",
          rateKeyHash: "stale_key",
          reserveMicro: 50_000,
          ttlSeconds: 1,
        },
      );
      expect(stale.ok).toBe(true);
      // A later reservation (with now > expiry) sweeps the stale one.
      const later = new Date(Date.now() + 5_000);
      const next = await reserveBudget(
        pool,
        settings,
        {
          kind: "normal",
          ticketNonceHash: "stale_nonce_2",
          rateKeyHash: "stale_key_2",
          reserveMicro: 50_000,
        },
        later,
      );
      expect(next.ok).toBe(true);
      const staleRow = await pool.query<{ status: string }>(
        "SELECT status FROM budget_reservations WHERE ticket_nonce_hash = 'stale_nonce'",
      );
      expect(staleRow.rows[0]!.status).toBe("expired");
      if (next.ok) await releaseReservation(pool, next.reservationId, later);
    });
  });

  describe("rate limiting", () => {
    it("counts within a window and resets in the next", async () => {
      const key = "rl_test_key";
      for (let i = 1; i <= 6; i++) {
        const result = await checkAndIncrement(pool, key, "ai_hourly", 3600, 6);
        expect(result.allowed).toBe(true);
        expect(result.count).toBe(i);
      }
      const seventh = await checkAndIncrement(pool, key, "ai_hourly", 3600, 6);
      expect(seventh.allowed).toBe(false);

      const nextWindow = new Date(Date.now() + 3700 * 1000);
      const fresh = await checkAndIncrement(pool, key, "ai_hourly", 3600, 6, nextWindow);
      expect(fresh.allowed).toBe(true);
      expect(fresh.count).toBe(1);
    });

    it("cleans up expired buckets", async () => {
      await checkAndIncrement(pool, "cleanup_key", "unlock_ip", 60, 5);
      const removed = await cleanupExpiredBuckets(pool, new Date(Date.now() + 10 * 60_000));
      expect(removed).toBeGreaterThanOrEqual(1);
    });
  });

  describe("share artifacts", () => {
    it("stores ciphertext-only rows and purges expired ones", async () => {
      await pool.query(
        `INSERT INTO share_artifacts (share_id, ciphertext, iv, algorithm, schema_version, byte_size, expires_at)
         VALUES ('test_share_1', $1, $2, 'AES-256-GCM', 1, 5, now() + interval '90 days'),
                ('test_share_expired', $1, $2, 'AES-256-GCM', 1, 5, now() - interval '1 day')`,
        [Buffer.from([1, 2, 3, 4, 5]), Buffer.from([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])],
      );
      const purge = await pool.query(
        "DELETE FROM share_artifacts WHERE expires_at < now()",
      );
      expect(purge.rowCount).toBe(1);
      const remaining = await pool.query("SELECT share_id FROM share_artifacts");
      expect(remaining.rows.map((r) => r.share_id)).toContain("test_share_1");
    });
  });
});
