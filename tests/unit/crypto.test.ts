import { describe, expect, it } from "vitest";
import {
  newReadingNonce,
  nonceHash,
  openTicket,
  sealTicket,
  TicketError,
  type ReadingTicketPayload,
} from "@/lib/crypto/ticket";
import { deriveRateKey, newShareId, isPlausibleShareId } from "@/lib/crypto/tokens";
import {
  issueSessionToken,
  newInstallationId,
  verifySessionToken,
} from "@/lib/auth/session";
import { usdToMicro, microToUsdString } from "@/lib/config/env";

const KEY = { id: "v1", key: Buffer.alloc(32, 42) };
const KEY2 = { id: "v2", key: Buffer.alloc(32, 43) };

function payload(overrides: Partial<ReadingTicketPayload> = {}): ReadingTicketPayload {
  return {
    v: 1,
    nonce: newReadingNonce(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + 15 * 60_000,
    context: { schemaVersion: "1.0" } as ReadingTicketPayload["context"],
    ...overrides,
  };
}

describe("reading ticket (ADR 0005)", () => {
  it("round-trips through seal/open", () => {
    const original = payload();
    const token = sealTicket(original, KEY);
    expect(token.startsWith("pt1.v1.")).toBe(true);
    const opened = openTicket(token, KEY);
    expect(opened.nonce).toBe(original.nonce);
  });

  it("rejects tampered ciphertext", () => {
    const token = sealTicket(payload(), KEY);
    const parts = token.split(".");
    const ct = Buffer.from(parts[3]!, "base64url");
    ct[0] = ct[0]! ^ 0xff;
    parts[3] = ct.toString("base64url");
    expect(() => openTicket(parts.join("."), KEY)).toThrow(TicketError);
    try {
      openTicket(parts.join("."), KEY);
    } catch (e) {
      expect((e as TicketError).reason).toBe("tampered");
    }
  });

  it("rejects expired tickets", () => {
    const token = sealTicket(payload({ expiresAt: Date.now() - 1000 }), KEY);
    try {
      openTicket(token, KEY);
      expect.unreachable();
    } catch (e) {
      expect((e as TicketError).reason).toBe("expired");
    }
  });

  it("supports key rotation via previous keys", () => {
    const token = sealTicket(payload(), KEY);
    const opened = openTicket(token, KEY2, [KEY]);
    expect(opened.v).toBe(1);
    expect(() => openTicket(token, KEY2, [])).toThrow(TicketError);
  });

  it("wrong key of same id fails authentication", () => {
    const token = sealTicket(payload(), KEY);
    expect(() => openTicket(token, { id: "v1", key: Buffer.alloc(32, 99) })).toThrow(
      TicketError,
    );
  });

  it("nonce hash is stable and never the raw nonce", () => {
    const nonce = newReadingNonce();
    expect(nonceHash(nonce)).toBe(nonceHash(nonce));
    expect(nonceHash(nonce)).not.toContain(nonce);
    expect(nonceHash(nonce)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("session tokens (spec §21.2)", () => {
  const SECRET = "session-secret-0123456789abcdef0123456789abcdef";

  it("issues and verifies a session cookie value", () => {
    const iid = newInstallationId();
    const token = issueSessionToken({ iid, epo: 3, aud: "session" }, SECRET);
    const verified = verifySessionToken(token, SECRET, { aud: "session", currentEpoch: 3 });
    expect(verified?.iid).toBe(iid);
  });

  it("rejects epoch mismatches (mass invalidation)", () => {
    const token = issueSessionToken(
      { iid: newInstallationId(), epo: 3, aud: "session" },
      SECRET,
    );
    expect(
      verifySessionToken(token, SECRET, { aud: "session", currentEpoch: 4 }),
    ).toBeNull();
  });

  it("rejects signature tampering and audience confusion", () => {
    const token = issueSessionToken(
      { iid: newInstallationId(), epo: 1, aud: "session" },
      SECRET,
    );
    expect(
      verifySessionToken(token + "x", SECRET, { aud: "session", currentEpoch: 1 }),
    ).toBeNull();
    expect(
      verifySessionToken(token, SECRET, { aud: "admin", currentEpoch: 1 }),
    ).toBeNull();
    expect(
      verifySessionToken(token, "different-secret-0123456789abcdef012345", {
        aud: "session",
        currentEpoch: 1,
      }),
    ).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = issueSessionToken(
      { iid: newInstallationId(), epo: 1, aud: "session", ttlSeconds: -10 },
      SECRET,
    );
    expect(
      verifySessionToken(token, SECRET, { aud: "session", currentEpoch: 1 }),
    ).toBeNull();
  });
});

describe("tokens and money", () => {
  it("share ids carry ≥128 bits and validate shape", () => {
    const id = newShareId();
    expect(id.length).toBeGreaterThanOrEqual(22);
    expect(isPlausibleShareId(id)).toBe(true);
    expect(isPlausibleShareId("../etc/passwd")).toBe(false);
  });

  it("rate keys are HMAC-derived and pepper-dependent", () => {
    const a = deriveRateKey("install-1", "pepper-a");
    const b = deriveRateKey("install-1", "pepper-b");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("micro-USD conversion is exact", () => {
    expect(usdToMicro("2.00")).toBe(2_000_000);
    expect(usdToMicro("0.05")).toBe(50_000);
    expect(usdToMicro("30")).toBe(30_000_000);
    expect(usdToMicro("0.000001")).toBe(1);
    expect(() => usdToMicro("1.2.3")).toThrow();
    expect(microToUsdString(3_400)).toBe("0.0034");
    expect(microToUsdString(2_000_000)).toBe("2.00");
  });
});
