/**
 * Cryptographically secure randomness helpers (spec §9.2).
 *
 * Uses the runtime WebCrypto CSPRNG (`globalThis.crypto`), available in
 * Node ≥ 19 and all target browsers. Tests may inject a deterministic
 * RandomSource; production code never does.
 */

export interface RandomSource {
  /** Fill and return n cryptographically secure random bytes. */
  bytes(n: number): Uint8Array;
}

export const secureRandomSource: RandomSource = {
  bytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    globalThis.crypto.getRandomValues(out);
    return out;
  },
};

const UINT32_RANGE = 0x1_0000_0000;

/**
 * Unbiased uniform integer in [0, maxExclusive) via rejection sampling —
 * values at or above the largest multiple of maxExclusive that fits in
 * 32 bits are rejected so the modulo cannot bias low results.
 */
export function uniformInt(maxExclusive: number, source: RandomSource): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new Error(`uniformInt bound out of range: ${maxExclusive}`);
  }
  if (maxExclusive === 1) return 0;
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  // The rejection probability is < 0.5 per draw; the loop terminates with
  // probability 1 and in practice within a couple of iterations.
  for (;;) {
    const b = source.bytes(4);
    const value =
      ((b[0]! << 24) >>> 0) + ((b[1]! << 16) >>> 0) + ((b[2]! << 8) >>> 0) + b[3]!;
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

/** One cryptographically secure random bit. */
export function randomBit(source: RandomSource): 0 | 1 {
  return (source.bytes(1)[0]! & 1) as 0 | 1;
}

/** Unbiased in-place Fisher–Yates shuffle. */
export function secureShuffle<T>(items: T[], source: RandomSource): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = uniformInt(i + 1, source);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}
