import { generateAccessCode } from "@/lib/auth/access-code";
import { hashSecret } from "@/lib/auth/hash";

/**
 * `npm run admin:generate-access-code` (spec §43.3): prints the plaintext
 * ONCE and stores only the Argon2id hash. With no reachable database, prints
 * the bootstrap hash line for .env.production instead. Never logs or
 * persists the plaintext anywhere.
 */
async function main(): Promise<void> {
  const code = generateAccessCode();
  const hash = await hashSecret(code);

  let stored = false;
  if (process.env.DATABASE_URL) {
    try {
      const { getPool, closePool } = await import("@/lib/db/client");
      const { ensureSettingsRow, rotateAccessCodeHash } = await import("@/lib/db/settings");
      const pool = getPool();
      await ensureSettingsRow(pool);
      await rotateAccessCodeHash(pool, hash);
      await closePool();
      stored = true;
    } catch {
      stored = false;
    }
  }

  console.log("──────────────────────────────────────────────────────");
  console.log("GLOBAL ACCESS CODE (shown once — store it in a password");
  console.log("manager and distribute out-of-band):");
  console.log("");
  console.log(`    ${code}`);
  console.log("");
  if (stored) {
    console.log("Argon2id hash stored in app_settings.");
  } else {
    console.log("Database not reachable — add this to .env.production:");
    console.log(`BOOTSTRAP_ACCESS_CODE_HASH='${hash}'`);
  }
  console.log("──────────────────────────────────────────────────────");
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
