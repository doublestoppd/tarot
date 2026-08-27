import { defineConfig } from "@playwright/test";

/**
 * Browser/E2E suite (spec §31.2). Run against a locally started stack:
 *
 *   npx tsx scripts/dev-stack.ts .dev-stack.env &   # postgres + seeds + hashes
 *   set -a; source .dev-stack.env; set +a
 *   npm run build && npx next start -p 3100 &
 *   E2E_BASE_URL=http://localhost:3100 E2E_ACCESS_CODE=TEST-ACCESS-CODE npm run test:e2e
 *
 * In sandboxed environments with a preinstalled browser, set
 * PW_CHROMIUM_PATH (e.g. /opt/pw-browsers/chromium).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
});
