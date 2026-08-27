import type { Pool, PoolClient } from "pg";
import { withTransaction } from "@/lib/db/client";
import type { AppSettings } from "@/lib/db/settings";

/**
 * Atomic application-side AI budget enforcement in integer micro-USD
 * (spec §29.2, ADR 0004). Reservation before the provider call, finalization
 * from actual usage after, all under row locks on the daily and monthly
 * budget rows — a concurrency test proves overspend is impossible. If the
 * database is unavailable, callers fail closed and never call the provider.
 */

export type ReserveRefusal =
  | "budget_daily"
  | "budget_monthly"
  | "global_concurrency"
  | "install_concurrency"
  | "duplicate";

export type ReserveResult =
  | { ok: true; reservationId: string }
  | { ok: false; reason: ReserveRefusal };

export interface ReserveOptions {
  kind: "normal" | "repair";
  ticketNonceHash: string;
  rateKeyHash: string;
  reserveMicro: number;
  ttlSeconds?: number;
}

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthStartString(d: Date): string {
  return `${d.toISOString().slice(0, 7)}-01`;
}

async function lockBudgetRows(
  client: PoolClient,
  now: Date,
): Promise<{ daily: BudgetRow; monthly: BudgetRow }> {
  const day = utcDateString(now);
  const month = monthStartString(now);
  await client.query(
    `INSERT INTO budget_state (period_type, period_start_utc) VALUES
       ('daily', $1), ('monthly', $2)
     ON CONFLICT (period_type, period_start_utc) DO NOTHING`,
    [day, month],
  );
  const result = await client.query<BudgetRowRaw>(
    `SELECT period_type, committed_microusd, reserved_microusd
       FROM budget_state
      WHERE (period_type = 'daily' AND period_start_utc = $1)
         OR (period_type = 'monthly' AND period_start_utc = $2)
      ORDER BY period_type
      FOR UPDATE`,
    [day, month],
  );
  const rows = result.rows.map((r) => ({
    periodType: r.period_type,
    committed: Number(r.committed_microusd),
    reserved: Number(r.reserved_microusd),
  }));
  const daily = rows.find((r) => r.periodType === "daily");
  const monthly = rows.find((r) => r.periodType === "monthly");
  if (!daily || !monthly) throw new Error("budget rows missing under lock");
  return { daily, monthly };
}

interface BudgetRowRaw {
  period_type: string;
  committed_microusd: string;
  reserved_microusd: string;
}
interface BudgetRow {
  periodType: string;
  committed: number;
  reserved: number;
}

async function expireStaleReservations(client: PoolClient, now: Date): Promise<void> {
  const stale = await client.query<{ reserved_microusd: string }>(
    `UPDATE budget_reservations
        SET status = 'expired'
      WHERE status = 'reserved' AND expires_at < $1
      RETURNING reserved_microusd`,
    [now],
  );
  const total = stale.rows.reduce((sum, r) => sum + Number(r.reserved_microusd), 0);
  if (total > 0) {
    await client.query(
      `UPDATE budget_state
          SET reserved_microusd = GREATEST(reserved_microusd - $1, 0), updated_at = now()
        WHERE (period_type = 'daily' AND period_start_utc = $2)
           OR (period_type = 'monthly' AND period_start_utc = $3)`,
      [total, utcDateString(now), monthStartString(now)],
    );
  }
}

export async function reserveBudget(
  pool: Pool,
  settings: AppSettings,
  options: ReserveOptions,
  now: Date = new Date(),
): Promise<ReserveResult> {
  const ttl = options.ttlSeconds ?? 120;
  try {
    return await withTransaction(pool, async (client) => {
      // Serialize all reservations behind the budget-row locks.
      const { daily, monthly } = await lockBudgetRows(client, now);
      await expireStaleReservations(client, now);

      const proposed = options.reserveMicro;
      if (daily.committed + daily.reserved + proposed > settings.dailyBudgetMicro) {
        return { ok: false, reason: "budget_daily" as const };
      }
      if (
        monthly.committed + monthly.reserved + proposed >
        settings.monthlyBudgetMicro
      ) {
        return { ok: false, reason: "budget_monthly" as const };
      }

      const activeCount = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM budget_reservations WHERE status = 'reserved'`,
      );
      if (Number(activeCount.rows[0]!.n) >= settings.globalAiConcurrency) {
        return { ok: false, reason: "global_concurrency" as const };
      }

      const installActive = await client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM budget_reservations
          WHERE status = 'reserved' AND rate_key_hash = $1`,
        [options.rateKeyHash],
      );
      if (Number(installActive.rows[0]!.n) >= 1) {
        return { ok: false, reason: "install_concurrency" as const };
      }

      const expiresAt = new Date(now.getTime() + ttl * 1000);
      let reservationId: string;
      try {
        const inserted = await client.query<{ reservation_id: string }>(
          `INSERT INTO budget_reservations
             (expires_at, reserved_microusd, status, kind, ticket_nonce_hash, rate_key_hash)
           VALUES ($1, $2, 'reserved', $3, $4, $5)
           RETURNING reservation_id`,
          [expiresAt, proposed, options.kind, options.ticketNonceHash, options.rateKeyHash],
        );
        reservationId = inserted.rows[0]!.reservation_id;
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          // Unique nonce/kind violation — this reading already consumed its call.
          return { ok: false, reason: "duplicate" as const };
        }
        throw error;
      }

      await client.query(
        `UPDATE budget_state
            SET reserved_microusd = reserved_microusd + $1, updated_at = now()
          WHERE (period_type = 'daily' AND period_start_utc = $2)
             OR (period_type = 'monthly' AND period_start_utc = $3)`,
        [proposed, utcDateString(now), monthStartString(now)],
      );

      return { ok: true, reservationId };
    });
  } catch (error) {
    // The unique-violation can also abort the transaction before our catch in
    // some drivers; normalize to duplicate when that is the cause.
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, reason: "duplicate" };
    }
    throw error;
  }
}

export interface UsageReport {
  inputTokens: number;
  outputTokens: number;
  actualMicro: number;
  kind: "normal" | "repair";
}

export async function finalizeReservation(
  pool: Pool,
  reservationId: string,
  usage: UsageReport,
  now: Date = new Date(),
): Promise<void> {
  await withTransaction(pool, async (client) => {
    await lockBudgetRows(client, now);
    const result = await client.query<{ reserved_microusd: string }>(
      `UPDATE budget_reservations
          SET status = 'finalized', finalized_microusd = $2
        WHERE reservation_id = $1 AND status = 'reserved'
        RETURNING reserved_microusd`,
      [reservationId, usage.actualMicro],
    );
    const row = result.rows[0];
    if (!row) return; // already finalized/expired — usage counters still apply below
    const reserved = Number(row.reserved_microusd);
    await client.query(
      `UPDATE budget_state
          SET reserved_microusd = GREATEST(reserved_microusd - $1, 0),
              committed_microusd = committed_microusd + $2,
              updated_at = now()
        WHERE (period_type = 'daily' AND period_start_utc = $3)
           OR (period_type = 'monthly' AND period_start_utc = $4)`,
      [reserved, usage.actualMicro, utcDateString(now), monthStartString(now)],
    );
    await client.query(
      `INSERT INTO usage_daily (usage_date_utc, ai_requests, repair_requests, input_tokens, output_tokens, estimated_cost_microusd)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usage_date_utc) DO UPDATE SET
         ai_requests = usage_daily.ai_requests + EXCLUDED.ai_requests,
         repair_requests = usage_daily.repair_requests + EXCLUDED.repair_requests,
         input_tokens = usage_daily.input_tokens + EXCLUDED.input_tokens,
         output_tokens = usage_daily.output_tokens + EXCLUDED.output_tokens,
         estimated_cost_microusd = usage_daily.estimated_cost_microusd + EXCLUDED.estimated_cost_microusd`,
      [
        utcDateString(now),
        usage.kind === "normal" ? 1 : 0,
        usage.kind === "repair" ? 1 : 0,
        usage.inputTokens,
        usage.outputTokens,
        usage.actualMicro,
      ],
    );
  });
}

/** Release after provider failure — retry becomes possible again. */
export async function releaseReservation(
  pool: Pool,
  reservationId: string,
  now: Date = new Date(),
): Promise<void> {
  await withTransaction(pool, async (client) => {
    await lockBudgetRows(client, now);
    const result = await client.query<{ reserved_microusd: string }>(
      `UPDATE budget_reservations
          SET status = 'released'
        WHERE reservation_id = $1 AND status = 'reserved'
        RETURNING reserved_microusd`,
      [reservationId],
    );
    const row = result.rows[0];
    if (!row) return;
    await client.query(
      `UPDATE budget_state
          SET reserved_microusd = GREATEST(reserved_microusd - $1, 0), updated_at = now()
        WHERE (period_type = 'daily' AND period_start_utc = $2)
           OR (period_type = 'monthly' AND period_start_utc = $3)`,
      [Number(row.reserved_microusd), utcDateString(now), monthStartString(now)],
    );
  });
}

export async function recordProviderError(pool: Pool, now: Date = new Date()): Promise<void> {
  await pool.query(
    `INSERT INTO usage_daily (usage_date_utc, provider_errors) VALUES ($1, 1)
     ON CONFLICT (usage_date_utc) DO UPDATE
       SET provider_errors = usage_daily.provider_errors + 1`,
    [utcDateString(now)],
  );
}

export async function recordValidationFailure(pool: Pool, now: Date = new Date()): Promise<void> {
  await pool.query(
    `INSERT INTO usage_daily (usage_date_utc, validation_failures) VALUES ($1, 1)
     ON CONFLICT (usage_date_utc) DO UPDATE
       SET validation_failures = usage_daily.validation_failures + 1`,
    [utcDateString(now)],
  );
}
