import { NextResponse } from "next/server";

/**
 * Minimal public health endpoint (spec §43.5): coarse status only — no
 * environment, versions, model, budget, or stack detail.
 */
export async function GET(): Promise<NextResponse> {
  const response = NextResponse.json({ status: "ok" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
