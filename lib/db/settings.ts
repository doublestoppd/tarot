import type { Pool } from "pg";
import { getEnv } from "@/lib/config/env";

/**
 * Runtime application settings (app_settings singleton row). Seeded from the
 * environment on first boot; admin PATCHes update the row. A short cache
 * keeps epoch/budget checks cheap without hiding admin changes for long.
 */

export interface AppSettings {
  accessCodeHash: string | null;
  adminSecretHash: string | null;
  sessionEpoch: number;
  aiEnabled: boolean;
  unlockEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  dailyBudgetMicro: number;
  monthlyBudgetMicro: number;
  maxReadingCostMicro: number;
  maxRepairCostMicro: number;
  perInstallHourly: number;
  perInstallDaily: number;
  globalAiConcurrency: number;
  shareTtlDays: number;
}

const CACHE_TTL_MS = 5_000;
let cache: { value: AppSettings; at: number } | null = null;

export function invalidateSettingsCache(): void {
  cache = null;
}

export async function ensureSettingsRow(pool: Pool): Promise<void> {
  const env = getEnv();
  await pool.query(
    `INSERT INTO app_settings (
       id, access_code_hash, admin_secret_hash, ai_enabled, ai_model,
       daily_budget_microusd, monthly_budget_microusd,
       max_reading_cost_microusd, max_repair_cost_microusd,
       per_install_hourly_limit, per_install_daily_limit,
       global_ai_concurrency, share_ttl_days
     ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO NOTHING`,
    [
      env.bootstrapAccessCodeHash,
      env.bootstrapAdminSecretHash,
      env.budgetDefaults.aiEnabled,
      env.openai.model,
      env.budgetDefaults.dailyBudgetMicro,
      env.budgetDefaults.monthlyBudgetMicro,
      env.budgetDefaults.maxNormalReadingMicro,
      env.budgetDefaults.maxRepairMicro,
      env.budgetDefaults.perInstallHourly,
      env.budgetDefaults.perInstallDaily,
      env.budgetDefaults.globalConcurrency,
      env.shareTtlDays,
    ],
  );
}

interface SettingsRow {
  access_code_hash: string | null;
  admin_secret_hash: string | null;
  session_epoch: number;
  ai_enabled: boolean;
  unlock_enabled: boolean;
  ai_provider: string;
  ai_model: string;
  daily_budget_microusd: string;
  monthly_budget_microusd: string;
  max_reading_cost_microusd: string;
  max_repair_cost_microusd: string;
  per_install_hourly_limit: number;
  per_install_daily_limit: number;
  global_ai_concurrency: number;
  share_ttl_days: number;
}

export async function loadSettings(pool: Pool, options: { fresh?: boolean } = {}): Promise<AppSettings> {
  if (!options.fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }
  await ensureSettingsRow(pool);
  const result = await pool.query<SettingsRow>("SELECT * FROM app_settings WHERE id = 1");
  const row = result.rows[0];
  if (!row) {
    throw new Error("app_settings row missing after ensure");
  }
  const value: AppSettings = {
    accessCodeHash: row.access_code_hash,
    adminSecretHash: row.admin_secret_hash,
    sessionEpoch: row.session_epoch,
    aiEnabled: row.ai_enabled,
    unlockEnabled: row.unlock_enabled,
    aiProvider: row.ai_provider,
    aiModel: row.ai_model,
    dailyBudgetMicro: Number(row.daily_budget_microusd),
    monthlyBudgetMicro: Number(row.monthly_budget_microusd),
    maxReadingCostMicro: Number(row.max_reading_cost_microusd),
    maxRepairCostMicro: Number(row.max_repair_cost_microusd),
    perInstallHourly: row.per_install_hourly_limit,
    perInstallDaily: row.per_install_daily_limit,
    globalAiConcurrency: row.global_ai_concurrency,
    shareTtlDays: row.share_ttl_days,
  };
  cache = { value, at: Date.now() };
  return value;
}

const UPDATABLE_COLUMNS: Record<string, string> = {
  aiEnabled: "ai_enabled",
  unlockEnabled: "unlock_enabled",
  aiProvider: "ai_provider",
  aiModel: "ai_model",
  dailyBudgetMicro: "daily_budget_microusd",
  monthlyBudgetMicro: "monthly_budget_microusd",
  maxReadingCostMicro: "max_reading_cost_microusd",
  maxRepairCostMicro: "max_repair_cost_microusd",
  perInstallHourly: "per_install_hourly_limit",
  perInstallDaily: "per_install_daily_limit",
  globalAiConcurrency: "global_ai_concurrency",
  shareTtlDays: "share_ttl_days",
};

export async function updateSettings(
  pool: Pool,
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    }
  }
  if (sets.length > 0) {
    await pool.query(
      `UPDATE app_settings SET ${sets.join(", ")}, updated_at = now() WHERE id = 1`,
      values,
    );
  }
  invalidateSettingsCache();
  return loadSettings(pool, { fresh: true });
}

export async function rotateAccessCodeHash(pool: Pool, hash: string): Promise<void> {
  await pool.query(
    "UPDATE app_settings SET access_code_hash = $1, updated_at = now() WHERE id = 1",
    [hash],
  );
  invalidateSettingsCache();
}

export async function setAdminSecretHash(pool: Pool, hash: string): Promise<void> {
  await pool.query(
    "UPDATE app_settings SET admin_secret_hash = $1, updated_at = now() WHERE id = 1",
    [hash],
  );
  invalidateSettingsCache();
}

export async function incrementSessionEpoch(pool: Pool): Promise<number> {
  const result = await pool.query<{ session_epoch: number }>(
    "UPDATE app_settings SET session_epoch = session_epoch + 1, updated_at = now() WHERE id = 1 RETURNING session_epoch",
  );
  invalidateSettingsCache();
  return result.rows[0]!.session_epoch;
}
