import { NextResponse, type NextRequest } from "next/server";
import type { Pool } from "pg";
import type { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { getPool } from "@/lib/db/client";
import { loadSettings, type AppSettings } from "@/lib/db/settings";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/session";
import { deriveIpKey, deriveRateKey } from "@/lib/crypto/tokens";
import { logger, newRequestId } from "@/lib/logging/logger";

/**
 * Route-handler plumbing (spec §22, §24): no-store responses, stable
 * semantic error codes, same-origin enforcement for mutating routes, strict
 * body parsing with size ceilings, cookie-based anonymous authorization.
 * Request bodies are never logged.
 */

export const API_ERROR_STATUS: Record<string, number> = {
  ACCESS_DENIED: 401,
  RATE_TEMPORARILY_UNAVAILABLE: 429,
  AI_CAPACITY_UNAVAILABLE: 503,
  AI_PROVIDER_INTERRUPTED: 502,
  READING_TICKET_EXPIRED: 410,
  CELESTIAL_CONTEXT_PARTIAL: 200,
  PLACE_AMBIGUOUS: 422,
  SHARE_UNAVAILABLE: 410,
  SHARE_NOT_FOUND: 404,
  INVALID_INPUT: 422,
  DUPLICATE_REQUEST: 409,
  SERVICE_UNAVAILABLE: 503,
};

export function apiJson(data: unknown, init: ResponseInit = {}): NextResponse {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function apiError(
  code: keyof typeof API_ERROR_STATUS | string,
  extra: Record<string, unknown> = {},
): NextResponse {
  const status = API_ERROR_STATUS[code] ?? 500;
  return apiJson({ error: code, ...extra }, { status });
}

export function isSecureOrigin(): boolean {
  return getEnv().appOrigin.startsWith("https://");
}

/** Same-origin enforcement for mutating routes (CSRF second layer). */
export function checkOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null; // same-origin non-CORS requests may omit it
  const env = getEnv();
  const host = request.headers.get("host");
  const allowed = new Set(
    [env.appOrigin, host ? `https://${host}` : null, host ? `http://${host}` : null].filter(
      Boolean,
    ),
  );
  if (!allowed.has(origin)) {
    return apiError("ACCESS_DENIED");
  }
  return null;
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export async function readStrictBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<T | NextResponse> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return apiError("INVALID_INPUT", { detail: "unreadable body" });
  }
  if (Buffer.byteLength(text, "utf-8") > maxBytes) {
    return apiError("INVALID_INPUT", { detail: "body too large" });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return apiError("INVALID_INPUT", { detail: "expected JSON" });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", {
      fields: parsed.error.issues.slice(0, 5).map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

export interface AuthedContext {
  pool: Pool;
  settings: AppSettings;
  session: SessionPayload;
  rateKeyHash: string;
}

export async function requireSession(
  request: NextRequest,
): Promise<AuthedContext | NextResponse> {
  const env = getEnv();
  const pool = getPool();
  let settings: AppSettings;
  try {
    settings = await loadSettings(pool);
  } catch {
    return apiError("SERVICE_UNAVAILABLE");
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token, env.authSigningSecret, {
    aud: "session",
    currentEpoch: settings.sessionEpoch,
  });
  if (!session) return apiError("ACCESS_DENIED");
  return {
    pool,
    settings,
    session,
    rateKeyHash: deriveRateKey(session.iid, env.rateLimitPepper),
  };
}

export async function requireAdmin(
  request: NextRequest,
): Promise<AuthedContext | NextResponse> {
  const env = getEnv();
  const pool = getPool();
  let settings: AppSettings;
  try {
    settings = await loadSettings(pool);
  } catch {
    return apiError("SERVICE_UNAVAILABLE");
  }
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = verifySessionToken(token, env.authSigningSecret, {
    aud: "admin",
    currentEpoch: settings.sessionEpoch,
  });
  if (!session) return apiError("ACCESS_DENIED");
  return {
    pool,
    settings,
    session,
    rateKeyHash: deriveRateKey(session.iid, env.rateLimitPepper),
  };
}

/** Transient per-IP key for unlock throttling; the raw address is not kept. */
export function requestIpKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : "direct";
  return deriveIpKey(ip, getEnv().rateLimitPepper);
}

type Handler = (request: NextRequest) => Promise<NextResponse>;

/** Wrap a route with correlation id + scrubbed timing/error logging. */
export function withRoute(route: string, handler: Handler): Handler {
  return async (request: NextRequest) => {
    const requestId = newRequestId();
    const startedAt = Date.now();
    try {
      const response = await handler(request);
      logger.info("request", {
        requestId,
        route,
        status: response.status,
        ms: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      logger.error("request failed", {
        requestId,
        route,
        errorClass: (error as Error).name,
        ms: Date.now() - startedAt,
      });
      return apiError("SERVICE_UNAVAILABLE");
    }
  };
}
