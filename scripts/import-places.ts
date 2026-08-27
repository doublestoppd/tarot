import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getPool, closePool } from "@/lib/db/client";
import { normalizeSearchName } from "@/lib/places/places";

/**
 * `npm run import-places [minPopulation]` (spec §25, §47.3): import the
 * GeoNames cities gazetteer (CC BY 4.0 — attribution recorded in
 * data/sources/manifest.ts) into the places table at build/admin time.
 * This is the only moment external geodata is touched; runtime birthplace
 * search never leaves the application's own database.
 */

const GEONAMES_URL = "https://download.geonames.org/export/dump/cities15000.zip";

async function main(): Promise<void> {
  const minPopulation = Number(process.argv[2] ?? 15000);
  const workDir = path.resolve(process.cwd(), "data/places/generated");
  mkdirSync(workDir, { recursive: true });
  const zipPath = path.join(workDir, "cities15000.zip");

  if (!existsSync(zipPath)) {
    console.log(`Downloading ${GEONAMES_URL} …`);
    const response = await fetch(GEONAMES_URL);
    if (!response.ok || !response.body) {
      throw new Error(`download failed: HTTP ${response.status}`);
    }
    await pipeline(
      Readable.fromWeb(response.body as import("stream/web").ReadableStream),
      createWriteStream(zipPath),
    );
  }

  const unzip = spawnSync("unzip", ["-p", zipPath, "cities15000.txt"], {
    maxBuffer: 256 * 1024 * 1024,
    encoding: "utf-8",
  });
  if (unzip.status !== 0) {
    throw new Error(
      "could not extract the archive — ensure the `unzip` utility is installed",
    );
  }

  const pool = getPool();
  let imported = 0;
  const lines = unzip.stdout.split("\n");
  console.log(`Parsing ${lines.length} rows …`);
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 18) continue;
    // GeoNames columns: 0 id, 1 name, 4 lat, 5 lon, 8 country code,
    // 10 admin1 code, 14 population, 17 timezone.
    const population = Number(cols[14]);
    if (!Number.isFinite(population) || population < minPopulation) continue;
    const name = cols[1]!;
    const timezone = cols[17]!;
    if (!name || !timezone) continue;
    await pool.query(
      `INSERT INTO places (place_id, name, admin, country, country_code, lat, lon, timezone, population, search_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (place_id) DO UPDATE SET
         name = EXCLUDED.name, lat = EXCLUDED.lat, lon = EXCLUDED.lon,
         timezone = EXCLUDED.timezone, population = EXCLUDED.population,
         search_name = EXCLUDED.search_name`,
      [
        `gn:${cols[0]}`,
        name,
        cols[10] ?? "",
        cols[8] ?? "", // ISO country code doubles as label until enriched
        cols[8] ?? "",
        Number(cols[4]),
        Number(cols[5]),
        timezone,
        population,
        normalizeSearchName(`${name} ${cols[10] ?? ""} ${cols[8] ?? ""}`),
      ],
    );
    imported += 1;
    if (imported % 5000 === 0) console.log(`  ${imported} imported …`);
  }
  console.log(`Imported/updated ${imported} places (population ≥ ${minPopulation}).`);
  console.log("Attribution: GeoNames (geonames.org), CC BY 4.0.");
  await closePool();
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
