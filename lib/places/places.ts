import type { Pool } from "pg";
import { SEED_PLACES } from "@/data/places/seed-places";

/**
 * Private birthplace lookup (spec §6.2, §24): queries the app-controlled
 * local dataset only — never an external geocoder. The search string is used
 * solely to select a canonical place row and is never logged or persisted.
 */

export interface PlaceRecord {
  placeId: string;
  name: string;
  admin: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
}

export function normalizeSearchName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function seedPlacesIfEmpty(pool: Pool): Promise<number> {
  const existing = await pool.query<{ n: string }>("SELECT count(*)::text AS n FROM places");
  if (Number(existing.rows[0]!.n) > 0) return 0;
  let inserted = 0;
  for (const place of SEED_PLACES) {
    await pool.query(
      `INSERT INTO places (place_id, name, admin, country, country_code, lat, lon, timezone, population, search_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (place_id) DO NOTHING`,
      [
        place.id,
        place.name,
        place.admin,
        place.country,
        place.countryCode,
        place.lat,
        place.lon,
        place.timezone,
        place.population,
        normalizeSearchName(`${place.name} ${place.admin} ${place.country}`),
      ],
    );
    inserted += 1;
  }
  return inserted;
}

export async function searchPlaces(
  pool: Pool,
  query: string,
  limit = 8,
): Promise<PlaceRecord[]> {
  const normalized = normalizeSearchName(query);
  if (normalized.length < 2) return [];
  const tokens = normalized.split(" ").slice(0, 4);
  const conditions = tokens.map((_, i) => `search_name LIKE $${i + 1}`).join(" AND ");
  const params: unknown[] = tokens.map((t) => `%${t}%`);
  params.push(limit);
  const result = await pool.query(
    `SELECT place_id, name, admin, country, country_code, lat, lon, timezone
       FROM places
      WHERE ${conditions}
      ORDER BY population DESC
      LIMIT $${tokens.length + 1}`,
    params,
  );
  return result.rows.map((r) => ({
    placeId: r.place_id,
    name: r.name,
    admin: r.admin,
    country: r.country,
    countryCode: r.country_code,
    lat: r.lat,
    lon: r.lon,
    timezone: r.timezone,
  }));
}

export async function getPlace(pool: Pool, placeId: string): Promise<PlaceRecord | null> {
  const result = await pool.query(
    `SELECT place_id, name, admin, country, country_code, lat, lon, timezone
       FROM places WHERE place_id = $1`,
    [placeId],
  );
  const r = result.rows[0];
  if (!r) return null;
  return {
    placeId: r.place_id,
    name: r.name,
    admin: r.admin,
    country: r.country,
    countryCode: r.country_code,
    lat: r.lat,
    lon: r.lon,
    timezone: r.timezone,
  };
}
