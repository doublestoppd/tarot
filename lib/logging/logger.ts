import { randomBytes } from "node:crypto";

/**
 * Privacy-first structured logger (spec §18.3). Request bodies are never
 * passed here; as defense in depth every metadata object is scrubbed of key
 * names that could carry sensitive material before serialization.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const SENSITIVE_KEY_PATTERN =
  /(code|token|secret|birth|card|prompt|cookie|authorization|ticket|password|key|body|prose|paragraph|place|query|q)/i;

export function scrubMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = "[scrubbed]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      out[key] = scrubMeta(value as Record<string, unknown>);
    } else if (typeof value === "string" && value.length > 200) {
      out[key] = `[truncated ${value.length} chars]`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function configuredLevel(): Level {
  const raw = process.env.LOG_LEVEL;
  return raw === "debug" || raw === "info" || raw === "warn" || raw === "error"
    ? raw
    : "info";
}

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[configuredLevel()]) return;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };
  if (meta) Object.assign(entry, scrubMeta(meta));
  const line = JSON.stringify(entry);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};

/** Opaque per-request correlation id (never derived from credentials). */
export function newRequestId(): string {
  return randomBytes(8).toString("hex");
}
