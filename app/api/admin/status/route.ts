import { NextResponse, type NextRequest } from "next/server";
import { apiJson, requireAdmin, withRoute } from "@/lib/http/api";
import { getEnv, microToUsdString } from "@/lib/config/env";

/**
 * GET /api/admin/status (spec §28): aggregate operations data only — never
 * reading content, which does not exist to show.
 */
export const GET = withRoute("admin/status", async (request: NextRequest): Promise<NextResponse> => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { pool, settings } = auth;
  const env = getEnv();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [usageToday, usageMonth, budgetRows, shares] = await Promise.all([
    pool.query(
      `SELECT ai_requests, repair_requests, input_tokens, output_tokens,
              estimated_cost_microusd, provider_errors, validation_failures
         FROM usage_daily WHERE usage_date_utc = $1`,
      [today],
    ),
    pool.query(
      `SELECT COALESCE(SUM(ai_requests),0)::bigint AS ai_requests,
              COALESCE(SUM(repair_requests),0)::bigint AS repair_requests,
              COALESCE(SUM(input_tokens),0)::bigint AS input_tokens,
              COALESCE(SUM(output_tokens),0)::bigint AS output_tokens,
              COALESCE(SUM(estimated_cost_microusd),0)::bigint AS estimated_cost_microusd,
              COALESCE(SUM(provider_errors),0)::bigint AS provider_errors,
              COALESCE(SUM(validation_failures),0)::bigint AS validation_failures
         FROM usage_daily WHERE usage_date_utc >= $1`,
      [monthStart],
    ),
    pool.query(
      `SELECT period_type, committed_microusd, reserved_microusd
         FROM budget_state
        WHERE (period_type = 'daily' AND period_start_utc = $1)
           OR (period_type = 'monthly' AND period_start_utc = $2)`,
      [today, monthStart],
    ),
    pool.query(
      `SELECT count(*)::bigint AS count,
              COALESCE(SUM(byte_size),0)::bigint AS bytes,
              MIN(expires_at) AS next_expiry
         FROM share_artifacts WHERE expires_at > now()`,
    ),
  ]);

  const usdRow = (row: Record<string, unknown> | undefined) =>
    row
      ? {
          aiRequests: Number(row.ai_requests ?? 0),
          repairRequests: Number(row.repair_requests ?? 0),
          inputTokens: Number(row.input_tokens ?? 0),
          outputTokens: Number(row.output_tokens ?? 0),
          estimatedCostUsd: microToUsdString(Number(row.estimated_cost_microusd ?? 0)),
          providerErrors: Number(row.provider_errors ?? 0),
          validationFailures: Number(row.validation_failures ?? 0),
        }
      : null;

  const budget: Record<string, unknown> = {};
  for (const row of budgetRows.rows) {
    budget[row.period_type] = {
      committedUsd: microToUsdString(Number(row.committed_microusd)),
      reservedUsd: microToUsdString(Number(row.reserved_microusd)),
    };
  }

  return apiJson({
    settings: {
      aiEnabled: settings.aiEnabled,
      unlockEnabled: settings.unlockEnabled,
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      dailyBudgetUsd: microToUsdString(settings.dailyBudgetMicro),
      monthlyBudgetUsd: microToUsdString(settings.monthlyBudgetMicro),
      maxReadingCostUsd: microToUsdString(settings.maxReadingCostMicro),
      maxRepairCostUsd: microToUsdString(settings.maxRepairCostMicro),
      perInstallHourly: settings.perInstallHourly,
      perInstallDaily: settings.perInstallDaily,
      globalAiConcurrency: settings.globalAiConcurrency,
      shareTtlDays: settings.shareTtlDays,
      sessionEpoch: settings.sessionEpoch,
    },
    usage: {
      today: usdRow(usageToday.rows[0]),
      month: usdRow(usageMonth.rows[0]),
    },
    budget,
    shares: {
      activeCount: Number(shares.rows[0]?.count ?? 0),
      totalBytes: Number(shares.rows[0]?.bytes ?? 0),
      nextExpiry: shares.rows[0]?.next_expiry ?? null,
    },
    health: {
      database: "ok",
      providerConfigured: env.openai.apiKey !== null,
      buildSha: process.env.BUILD_SHA ?? "dev",
      nodeEnv: env.nodeEnv,
    },
  });
});
