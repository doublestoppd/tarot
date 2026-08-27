import { createHmac, randomBytes } from "node:crypto";

/** Cryptographically random share id, ≥128 bits (spec §20.2 step 6). */
export function newShareId(): string {
  return randomBytes(18).toString("base64url"); // 144 bits
}

export function isPlausibleShareId(id: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(id);
}

/**
 * Abuse/rate-limit key derivation (spec §21.3): only the HMAC-derived key is
 * stored; no fingerprinting of any kind.
 */
export function deriveRateKey(installationId: string, pepper: string): string {
  return createHmac("sha256", pepper).update(installationId).digest("hex");
}

/** Same derivation for transient unlock throttling keyed by remote address. */
export function deriveIpKey(remoteAddress: string, pepper: string): string {
  return createHmac("sha256", pepper).update(`ip:${remoteAddress}`).digest("hex");
}
