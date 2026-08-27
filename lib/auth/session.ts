import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Anonymous browser authorization (spec §21.2): an HMAC-signed, HttpOnly,
 * Secure, SameSite=Strict cookie holding an opaque installation id, the
 * session epoch, and validity instants. No name, email, birth information,
 * reading choice, or history — ever.
 */

export const SESSION_COOKIE = "pt_session";
export const ADMIN_COOKIE = "pt_admin";

export const SESSION_TTL_SECONDS = 180 * 24 * 3600; // 180 days
export const ADMIN_TTL_SECONDS = 2 * 3600; // 2 hours

export interface SessionPayload {
  /** Opaque random installation id (base64url of 32 bytes). */
  iid: string;
  /** Session epoch the cookie was issued under. */
  epo: number;
  iat: number;
  exp: number;
  /** Audience: user session or admin console. */
  aud: "session" | "admin";
}

function b64url(data: Buffer): string {
  return data.toString("base64url");
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

export function newInstallationId(): string {
  return b64url(randomBytes(32));
}

export function issueSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp"> & { ttlSeconds?: number },
  secret: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl =
    payload.ttlSeconds ??
    (payload.aud === "admin" ? ADMIN_TTL_SECONDS : SESSION_TTL_SECONDS);
  const full: SessionPayload = {
    iid: payload.iid,
    epo: payload.epo,
    aud: payload.aud,
    iat: now,
    exp: now + ttl,
  };
  const body = b64url(Buffer.from(JSON.stringify(full), "utf-8"));
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  expected: { aud: "session" | "admin"; currentEpoch: number },
): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const givenSig = token.slice(dot + 1);
  const wantSig = sign(body, secret);
  const a = Buffer.from(givenSig);
  const b = Buffer.from(wantSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (payload.aud !== expected.aud) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  // Epoch bump invalidates all previously authorized browsers (spec §21.1).
  if (payload.epo !== expected.currentEpoch) return null;
  if (typeof payload.iid !== "string" || payload.iid.length < 16) return null;
  return payload;
}

export function sessionCookieAttributes(options: {
  name: string;
  value: string;
  maxAgeSeconds: number;
  secure: boolean;
}): string {
  const parts = [
    `${options.name}=${options.value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${options.maxAgeSeconds}`,
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookieAttributes(name: string, secure: boolean): string {
  const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
