import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request Content-Security-Policy with a cryptographic nonce (§22.1).
 *
 * The nonce is attached to the request's CSP header so the framework applies
 * it to its own inline bootstrap scripts; the response carries the same
 * policy. `strict-dynamic` lets nonce-approved scripts load framework chunks
 * while everything else stays locked to 'self'. Styles keep 'unsafe-inline'
 * only because the framework injects inline style tags; there are no remote
 * fonts, analytics, or CDN scripts anywhere in this application.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
    "base64url",
  );

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Static assets do not execute scripts; skip them for performance.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
    },
  ],
};
