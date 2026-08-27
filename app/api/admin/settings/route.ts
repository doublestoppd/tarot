import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  apiJson,
  checkOrigin,
  readStrictBody,
  requireAdmin,
  withRoute,
} from "@/lib/http/api";
import { updateSettings } from "@/lib/db/settings";
import { microToUsdString, usdToMicro } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";

const usd = z.string().regex(/^\d+(\.\d{1,6})?$/);

const bodySchema = z.strictObject({
  aiEnabled: z.boolean().optional(),
  unlockEnabled: z.boolean().optional(),
  aiModel: z.string().min(1).max(80).optional(),
  dailyBudgetUsd: usd.optional(),
  monthlyBudgetUsd: usd.optional(),
  maxReadingCostUsd: usd.optional(),
  maxRepairCostUsd: usd.optional(),
  perInstallHourly: z.number().int().min(1).max(1000).optional(),
  perInstallDaily: z.number().int().min(1).max(10000).optional(),
  globalAiConcurrency: z.number().int().min(1).max(64).optional(),
  shareTtlDays: z.number().int().min(1).max(365).optional(),
});

/** PATCH /api/admin/settings (spec §24): validated config subset. */
export const PATCH = withRoute("admin/settings", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await readStrictBody(request, bodySchema, 8 * 1024);
  if (body instanceof NextResponse) return body;

  const updated = await updateSettings(auth.pool, {
    ...(body.aiEnabled !== undefined ? { aiEnabled: body.aiEnabled } : {}),
    ...(body.unlockEnabled !== undefined ? { unlockEnabled: body.unlockEnabled } : {}),
    ...(body.aiModel !== undefined ? { aiModel: body.aiModel } : {}),
    ...(body.dailyBudgetUsd !== undefined
      ? { dailyBudgetMicro: usdToMicro(body.dailyBudgetUsd) }
      : {}),
    ...(body.monthlyBudgetUsd !== undefined
      ? { monthlyBudgetMicro: usdToMicro(body.monthlyBudgetUsd) }
      : {}),
    ...(body.maxReadingCostUsd !== undefined
      ? { maxReadingCostMicro: usdToMicro(body.maxReadingCostUsd) }
      : {}),
    ...(body.maxRepairCostUsd !== undefined
      ? { maxRepairCostMicro: usdToMicro(body.maxRepairCostUsd) }
      : {}),
    ...(body.perInstallHourly !== undefined ? { perInstallHourly: body.perInstallHourly } : {}),
    ...(body.perInstallDaily !== undefined ? { perInstallDaily: body.perInstallDaily } : {}),
    ...(body.globalAiConcurrency !== undefined
      ? { globalAiConcurrency: body.globalAiConcurrency }
      : {}),
    ...(body.shareTtlDays !== undefined ? { shareTtlDays: body.shareTtlDays } : {}),
  });

  // Audit the change without secret plaintext (spec §24).
  logger.info("admin settings updated", {
    changedFields: Object.keys(body).join(","),
  });

  return apiJson({
    aiEnabled: updated.aiEnabled,
    unlockEnabled: updated.unlockEnabled,
    aiModel: updated.aiModel,
    dailyBudgetUsd: microToUsdString(updated.dailyBudgetMicro),
    monthlyBudgetUsd: microToUsdString(updated.monthlyBudgetMicro),
    maxReadingCostUsd: microToUsdString(updated.maxReadingCostMicro),
    maxRepairCostUsd: microToUsdString(updated.maxRepairCostMicro),
    perInstallHourly: updated.perInstallHourly,
    perInstallDaily: updated.perInstallDaily,
    globalAiConcurrency: updated.globalAiConcurrency,
    shareTtlDays: updated.shareTtlDays,
  });
});
