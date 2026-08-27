import { cookies } from "next/headers";
import { AccessGate } from "@/components/access/AccessGate";
import { SharedReading } from "@/components/share/SharedReading";
import { getEnv } from "@/lib/config/env";
import { getPool } from "@/lib/db/client";
import { loadSettings } from "@/lib/db/settings";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Screen E — Shared Reading (spec §6.5). The access gate remains mandatory;
 * after authorization the browser fetches ciphertext and decrypts locally
 * with the fragment key, which never reaches the server.
 */
export default async function SharedReadingPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  let authorized = false;
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
    authorized = false;
  }

  if (!authorized) {
    return <AccessGate />;
  }
  return <SharedReading shareId={shareId} />;
}
