import { generateAdminSecret } from "@/lib/auth/access-code";
import { hashSecret } from "@/lib/auth/hash";

/**
 * `npm run admin:generate-admin-secret` (spec §43.3): separate high-entropy
 * admin credential — never distributed as the app access code. Plaintext
 * shown once; only the Argon2id hash is stored.
 */
async function main(): Promise<void> {
  const secret = generateAdminSecret();
  const hash = await hashSecret(secret);

  let stored = false;
  if (process.env.DATABASE_URL) {
    try {
      const { getPool, closePool } = await import("@/lib/db/client");
      const { ensureSettingsRow, setAdminSecretHash } = await import("@/lib/db/settings");
      const pool = getPool();
      await ensureSettingsRow(pool);
      await setAdminSecretHash(pool, hash);
      await closePool();
      stored = true;
    } catch {
      stored = false;
    }
  }

  console.log("──────────────────────────────────────────────────────");
  console.log("ADMIN SECRET (shown once — keep private; this is NOT");
  console.log("the shared access code):");
  console.log("");
  console.log(`    ${secret}`);
  console.log("");
  if (stored) {
    console.log("Argon2id hash stored in app_settings.");
  } else {
    console.log("Database not reachable — add this to .env.production:");
    console.log(`BOOTSTRAP_ADMIN_SECRET_HASH='${hash}'`);
  }
  console.log("──────────────────────────────────────────────────────");
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
