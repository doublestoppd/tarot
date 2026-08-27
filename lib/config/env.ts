import { z } from "zod";

/**
 * Environment configuration — validated once, fail fast (§50 Phase 0).
 *
 * Secrets and budgets are refused, not defaulted, in production. Every value
 * is normalized into application-owned types here so nothing else in the
 * codebase reads process.env directly.
 */

const MICRO_PER_USD = 1_000_000;

/** Parse a decimal USD string into integer micro-USD without float drift. */
export function usdToMicro(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid USD amount: ${JSON.stringify(value)}`);
  }
  const whole = Number(match[1]);
  const fracRaw = match[2] ?? "";
  const frac = Number((fracRaw + "000000").slice(0, 6));
  const micro = whole * MICRO_PER_USD + frac;
  if (!Number.isSafeInteger(micro)) {
    throw new Error(`USD amount out of range: ${value}`);
  }
  return micro;
}

export function microToUsdString(micro: number): string {
  const whole = Math.floor(micro / MICRO_PER_USD);
  const frac = Math.abs(micro % MICRO_PER_USD)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : `${whole}.00`;
}

const usdString = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, "expected a decimal USD amount");

const secretString = (minLength: number) =>
  z.string().min(minLength, `secret must be at least ${minLength} characters`);

const boolString = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_DOMAIN: z.string().default("localhost"),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),

  AUTH_SIGNING_SECRET: secretString(32),
  READING_TICKET_KEY_CURRENT: z.string().min(1),
  READING_TICKET_KEY_ID: z.string().min(1).default("v1"),
  READING_TICKET_KEYS_PREVIOUS: z.string().optional(),
  RATE_LIMIT_PEPPER: secretString(32),

  BOOTSTRAP_ACCESS_CODE_HASH: z.string().optional(),
  BOOTSTRAP_ADMIN_SECRET_HASH: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.6-luna"),
  OPENAI_REASONING_EFFORT: z
    .enum(["minimal", "low", "medium", "high"])
    .default("low"),
  OPENAI_MAX_OUTPUT_TOKENS_FOCUSED: z.coerce.number().int().positive().default(1400),
  OPENAI_MAX_OUTPUT_TOKENS_DEEP: z.coerce.number().int().positive().default(2200),
  OPENAI_MAX_OUTPUT_TOKENS_COMPREHENSIVE: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),
  OPENAI_STORE: boolString.default(false),
  OPENAI_INPUT_USD_PER_MILLION: usdString.default("0.20"),
  OPENAI_CACHED_INPUT_USD_PER_MILLION: usdString.default("0.02"),
  OPENAI_OUTPUT_USD_PER_MILLION: usdString.default("1.20"),

  AI_ENABLED: boolString.default(true),
  AI_DAILY_BUDGET_USD: usdString.default("2.00"),
  AI_MONTHLY_BUDGET_USD: usdString.default("30.00"),
  AI_MAX_NORMAL_READING_USD: usdString.default("0.05"),
  AI_MAX_REPAIR_USD: usdString.default("0.05"),
  AI_PER_INSTALL_HOURLY: z.coerce.number().int().positive().default(6),
  AI_PER_INSTALL_DAILY: z.coerce.number().int().positive().default(20),
  AI_GLOBAL_CONCURRENCY: z.coerce.number().int().positive().default(3),

  READING_TICKET_TTL_MINUTES: z.coerce.number().int().min(5).max(30).default(15),

  SHARE_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(90),
  SHARE_MAX_CIPHERTEXT_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(1_048_576)
    .default(65536),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  REQUEST_BODY_LOGGING: boolString.default(false),
});

export interface TicketKey {
  id: string;
  key: Buffer;
}

export interface AppEnv {
  nodeEnv: "development" | "test" | "production";
  appDomain: string;
  appOrigin: string;
  databaseUrl: string;
  authSigningSecret: string;
  ticketKeyCurrent: TicketKey;
  ticketKeysPrevious: TicketKey[];
  rateLimitPepper: string;
  bootstrapAccessCodeHash: string | null;
  bootstrapAdminSecretHash: string | null;
  openai: {
    apiKey: string | null;
    model: string;
    reasoningEffort: "minimal" | "low" | "medium" | "high";
    maxOutputTokens: { focused: number; deep: number; comprehensive: number };
    store: boolean;
    inputMicroUsdPerMillion: number;
    cachedInputMicroUsdPerMillion: number;
    outputMicroUsdPerMillion: number;
  };
  budgetDefaults: {
    aiEnabled: boolean;
    dailyBudgetMicro: number;
    monthlyBudgetMicro: number;
    maxNormalReadingMicro: number;
    maxRepairMicro: number;
    perInstallHourly: number;
    perInstallDaily: number;
    globalConcurrency: number;
  };
  readingTicketTtlMinutes: number;
  shareTtlDays: number;
  shareMaxCiphertextBytes: number;
  logLevel: "debug" | "info" | "warn" | "error";
  requestBodyLogging: boolean;
}

function decodeTicketKey(id: string, encoded: string): TicketKey {
  let key: Buffer;
  try {
    key = Buffer.from(encoded, "base64");
  } catch {
    throw new Error(`Reading ticket key ${id} is not valid base64`);
  }
  if (key.length !== 32) {
    throw new Error(
      `Reading ticket key ${id} must decode to exactly 32 bytes (got ${key.length})`,
    );
  }
  return { id, key };
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${details}`);
  }
  const env = parsed.data;

  const previous: TicketKey[] = [];
  if (env.READING_TICKET_KEYS_PREVIOUS) {
    for (const pair of env.READING_TICKET_KEYS_PREVIOUS.split(",")) {
      const idx = pair.indexOf(":");
      if (idx <= 0) {
        throw new Error(
          "READING_TICKET_KEYS_PREVIOUS entries must look like keyId:base64key",
        );
      }
      previous.push(decodeTicketKey(pair.slice(0, idx), pair.slice(idx + 1)));
    }
  }

  return {
    nodeEnv: env.NODE_ENV,
    appDomain: env.APP_DOMAIN,
    appOrigin: env.APP_ORIGIN,
    databaseUrl: env.DATABASE_URL,
    authSigningSecret: env.AUTH_SIGNING_SECRET,
    ticketKeyCurrent: decodeTicketKey(
      env.READING_TICKET_KEY_ID,
      env.READING_TICKET_KEY_CURRENT,
    ),
    ticketKeysPrevious: previous,
    rateLimitPepper: env.RATE_LIMIT_PEPPER,
    bootstrapAccessCodeHash: env.BOOTSTRAP_ACCESS_CODE_HASH ?? null,
    bootstrapAdminSecretHash: env.BOOTSTRAP_ADMIN_SECRET_HASH ?? null,
    openai: {
      apiKey: env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 0 ? env.OPENAI_API_KEY : null,
      model: env.OPENAI_MODEL,
      reasoningEffort: env.OPENAI_REASONING_EFFORT,
      maxOutputTokens: {
        focused: env.OPENAI_MAX_OUTPUT_TOKENS_FOCUSED,
        deep: env.OPENAI_MAX_OUTPUT_TOKENS_DEEP,
        comprehensive: env.OPENAI_MAX_OUTPUT_TOKENS_COMPREHENSIVE,
      },
      store: env.OPENAI_STORE,
      inputMicroUsdPerMillion: usdToMicro(env.OPENAI_INPUT_USD_PER_MILLION),
      cachedInputMicroUsdPerMillion: usdToMicro(
        env.OPENAI_CACHED_INPUT_USD_PER_MILLION,
      ),
      outputMicroUsdPerMillion: usdToMicro(env.OPENAI_OUTPUT_USD_PER_MILLION),
    },
    budgetDefaults: {
      aiEnabled: env.AI_ENABLED,
      dailyBudgetMicro: usdToMicro(env.AI_DAILY_BUDGET_USD),
      monthlyBudgetMicro: usdToMicro(env.AI_MONTHLY_BUDGET_USD),
      maxNormalReadingMicro: usdToMicro(env.AI_MAX_NORMAL_READING_USD),
      maxRepairMicro: usdToMicro(env.AI_MAX_REPAIR_USD),
      perInstallHourly: env.AI_PER_INSTALL_HOURLY,
      perInstallDaily: env.AI_PER_INSTALL_DAILY,
      globalConcurrency: env.AI_GLOBAL_CONCURRENCY,
    },
    readingTicketTtlMinutes: env.READING_TICKET_TTL_MINUTES,
    shareTtlDays: env.SHARE_TTL_DAYS,
    shareMaxCiphertextBytes: env.SHARE_MAX_CIPHERTEXT_BYTES,
    logLevel: env.LOG_LEVEL,
    requestBodyLogging: env.REQUEST_BODY_LOGGING,
  };
}

let cached: AppEnv | null = null;

/** Runtime accessor. Throws (fails startup of the calling route) on invalid config. */
export function getEnv(): AppEnv {
  if (cached === null) {
    cached = loadEnv();
  }
  return cached;
}

/** Test seam only. */
export function resetEnvCacheForTests(): void {
  cached = null;
}
