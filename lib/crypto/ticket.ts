import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { TicketKey } from "@/lib/config/env";
import type { ReadingContext } from "@/domain/reading-compiler/types";

/**
 * Stateless encrypted reading ticket (spec §19, ADR 0005).
 * Format: pt1.<keyId>.<b64url iv>.<b64url ciphertext>.<b64url gcm tag>
 * AES-256-GCM with the key id as additional authenticated data.
 */

export const TICKET_VERSION = "pt1";

export interface ReadingTicketPayload {
  v: 1;
  /** Random per-reading nonce — the idempotency/one-call anchor. */
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  context: ReadingContext;
}

export class TicketError extends Error {
  constructor(
    public readonly reason: "malformed" | "unknown_key" | "tampered" | "expired",
  ) {
    super(`Reading ticket ${reason}`);
    this.name = "TicketError";
  }
}

export function newReadingNonce(): string {
  return randomBytes(16).toString("base64url");
}

/** Hash stored in budget_reservations — the raw nonce never touches the DB. */
export function nonceHash(nonce: string): string {
  return createHash("sha256").update(nonce).digest("hex");
}

export function sealTicket(
  payload: ReadingTicketPayload,
  key: TicketKey,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key.key, iv);
  cipher.setAAD(Buffer.from(`${TICKET_VERSION}:${key.id}`, "utf-8"));
  const plaintext = Buffer.from(JSON.stringify(payload), "utf-8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    TICKET_VERSION,
    key.id,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function openTicket(
  token: string,
  currentKey: TicketKey,
  previousKeys: TicketKey[] = [],
  now: Date = new Date(),
): ReadingTicketPayload {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== TICKET_VERSION) {
    throw new TicketError("malformed");
  }
  const [, keyId, ivB64, ctB64, tagB64] = parts as [string, string, string, string, string];
  const key =
    currentKey.id === keyId
      ? currentKey
      : previousKeys.find((k) => k.id === keyId);
  if (!key) throw new TicketError("unknown_key");

  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key.key,
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAAD(Buffer.from(`${TICKET_VERSION}:${key.id}`, "utf-8"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64url")),
      decipher.final(),
    ]);
  } catch {
    throw new TicketError("tampered");
  }

  let payload: ReadingTicketPayload;
  try {
    payload = JSON.parse(plaintext.toString("utf-8"));
  } catch {
    throw new TicketError("tampered");
  }
  if (payload.v !== 1 || typeof payload.nonce !== "string") {
    throw new TicketError("malformed");
  }
  if (payload.expiresAt <= now.getTime()) {
    throw new TicketError("expired");
  }
  return payload;
}
