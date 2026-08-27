import { randomBytes } from "node:crypto";

/**
 * Shared access-code generation (spec §21.1): Crockford base32, grouped for
 * humans. 32 symbols × 5 bits = 160 bits of entropy (≥128 required); 32
 * divides 256 exactly, so the modulo is unbiased. No tarot words, dates, or
 * memorable phrases — ever.
 */
export function generateAccessCode(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const symbols = randomBytes(32);
  const code = [...symbols].map((b) => alphabet[b % 32]).join("");
  return code.match(/.{4}/g)!.join("-");
}

/** High-entropy admin secret, distinct from the shared access code. */
export function generateAdminSecret(): string {
  return randomBytes(36).toString("base64url");
}
