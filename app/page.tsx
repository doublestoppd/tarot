import { cookies } from "next/headers";
import { AccessGate } from "@/components/access/AccessGate";
import { PrepareReading } from "@/components/reading-setup/PrepareReading";
import { getEnv } from "@/lib/config/env";
import { getPool } from "@/lib/db/client";
import { loadSettings } from "@/lib/db/settings";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Route `/` (spec §6.1–6.2): the access gate when unauthorized, otherwise
 * "Prepare a Reading" directly — there is no dashboard.
 */
export default async function HomePage() {
  let authorized = false;
  let available = true;
  try {
    const env = getEnv();
    const settings = await loadSettings(getPool());
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    authorized =
      verifySessionToken(token, env.authSigningSecret, {
        aud: "session",
        currentEpoch: settings.sessionEpoch,
      }) !== null;
  } catch {
    available = false;
  }

  if (!available) {
    return (
      <main>
        <span className="star-mark" aria-hidden>
          ✧
        </span>
        <div className="notice" role="status">
          This space is momentarily unavailable. Return in a little while.
        </div>
      </main>
    );
  }

  return authorized ? <PrepareReading /> : <AccessGate />;
}
