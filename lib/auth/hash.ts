import * as argon2 from "argon2";

/**
 * Argon2id hashing for the shared access code and the admin secret
 * (spec §21.1). OWASP-recommended interactive parameters.
 */

const OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashSecret(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, OPTIONS);
}

export async function verifySecret(
  hash: string | null,
  plaintext: string,
): Promise<boolean> {
  if (!hash) return false;
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}
