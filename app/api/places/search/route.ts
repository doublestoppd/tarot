import { NextResponse, type NextRequest } from "next/server";
import { apiJson, requireSession, withRoute } from "@/lib/http/api";
import { searchPlaces } from "@/lib/places/places";

/**
 * GET /api/places/search?q= (spec §24): candidates from the app-controlled
 * local gazetteer only — no external geocoder, and the query string is used
 * solely to select canonical rows (never logged or stored; ADR 0002).
 */
export const GET = withRoute("places/search", async (request: NextRequest): Promise<NextResponse> => {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.length > 64) {
    return apiJson({ candidates: [] });
  }
  const candidates = await searchPlaces(auth.pool, q, 8);
  return apiJson({
    candidates: candidates.map((c) => ({
      placeId: c.placeId,
      name: c.name,
      admin: c.admin,
      country: c.country,
    })),
  });
});
