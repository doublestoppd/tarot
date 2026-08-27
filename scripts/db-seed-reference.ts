import { getPool, closePool } from "@/lib/db/client";
import { ensureSettingsRow } from "@/lib/db/settings";
import { seedPlacesIfEmpty } from "@/lib/places/places";

/**
 * `npm run db:seed-reference` — seed non-personal reference/config data only
 * (spec §43.2): the settings singleton and the curated place seed set.
 */
async function main(): Promise<void> {
  const pool = getPool();
  await ensureSettingsRow(pool);
  const seeded = await seedPlacesIfEmpty(pool);
  console.log(
    seeded > 0
      ? `Seeded ${seeded} reference places.`
      : "Places already present; settings ensured.",
  );
  await closePool();
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
