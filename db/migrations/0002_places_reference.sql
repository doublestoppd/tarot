-- App-controlled birthplace gazetteer (spec §3.1, §25): reference data only,
-- imported at build/admin time (seed set or GeoNames export). Never stores
-- anything a user typed; search queries select from these canonical rows.

CREATE TABLE IF NOT EXISTS places (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  timezone TEXT NOT NULL,
  population BIGINT NOT NULL DEFAULT 0,
  search_name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_places_search ON places (search_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_places_population ON places (population DESC);
