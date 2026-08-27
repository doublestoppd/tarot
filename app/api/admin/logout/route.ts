import { NextResponse, type NextRequest } from "next/server";
import {
  apiJson,
  checkOrigin,
  isSecureOrigin,
  withRoute,
} from "@/lib/http/api";
import { ADMIN_COOKIE, clearCookieAttributes } from "@/lib/auth/session";

/** POST /api/admin/logout: clear the admin console cookie. */
export const POST = withRoute("admin/logout", async (request: NextRequest): Promise<NextResponse> => {
  const originProblem = checkOrigin(request);
  if (originProblem) return originProblem;
  const response = apiJson({ ok: true });
  response.headers.append(
    "Set-Cookie",
    clearCookieAttributes(ADMIN_COOKIE, isSecureOrigin()),
  );
  return response;
});
