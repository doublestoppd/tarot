import { getPool, closePool } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

/** `npm run db:migrate` — apply pending SQL migrations (spec §43.2). */
async function main(): Promise<void> {
  const applied = await runMigrations(getPool());
  console.log(
    applied.length > 0
      ? `Applied migrations: ${applied.join(", ")}`
      : "No pending migrations.",
  );
  await closePool();
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
