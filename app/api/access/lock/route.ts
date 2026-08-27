import { NextResponse, type NextRequest } from "next/server";
import {
  apiJson,
  checkOrigin,
  isSecureOrigin,
  withRoute,
} from "@/lib/http/api";
import { clearCookieAttributes, SESSION_COOKIE } from "@/lib/auth/session";

/** POST /api/access/lock: clear the authorization cookie ("Lock this browser"). */
export const POST = withRoute("access/lock", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;
  const response = apiJson({ ok: true });
  response.headers.append(
    "Set-Cookie",
    clearCookieAttributes(SESSION_COOKIE, isSecureOrigin()),
  );
  return response;
});
