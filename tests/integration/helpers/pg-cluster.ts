import { execFileSync } from "node:child_process";
import {
  chownSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { Pool } from "pg";

/**
 * Disposable local PostgreSQL cluster for integration tests. Uses the system
 * postgres binaries (initdb/pg_ctl); tests are skipped when unavailable and
 * no DATABASE_URL override is provided.
 */

export function findPgBin(): string | null {
  if (process.env.PG_BIN && existsSync(process.env.PG_BIN)) return process.env.PG_BIN;
  const root = "/usr/lib/postgresql";
  if (existsSync(root)) {
    const versions = readdirSync(root).sort().reverse();
    for (const v of versions) {
      const bin = path.join(root, v, "bin");
      if (existsSync(path.join(bin, "initdb"))) return bin;
    }
  }
  for (const candidate of ["/usr/local/pgsql/bin", "/opt/homebrew/opt/postgresql/bin"]) {
    if (existsSync(path.join(candidate, "initdb"))) return candidate;
  }
  return null;
}

export interface TestCluster {
  pool: Pool;
  connectionString: string;
  stop: () => Promise<void>;
}

export async function startTestCluster(): Promise<TestCluster> {
  const bin = findPgBin();
  if (!bin) throw new Error("postgres binaries not found");
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "pt-pg-"));
  const port = 54100 + Math.floor(Math.random() * 400);

  // initdb/postgres refuse to run as root; drop to an unprivileged uid when
  // the test process is root (e.g. containers). The data dir must be owned
  // by that uid.
  let runAs: { uid: number; gid: number } | undefined;
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    runAs = { uid: 65534, gid: 65534 }; // nobody:nogroup
    chownSync(dataDir, runAs.uid, runAs.gid);
  }
  const execOpts = { stdio: "ignore" as const, ...(runAs ?? {}) };

  execFileSync(path.join(bin, "initdb"), [
    "-D",
    dataDir,
    "-U",
    "postgres",
    "-A",
    "trust",
    "--no-sync",
  ], execOpts);

  execFileSync(path.join(bin, "pg_ctl"), [
    "-D",
    dataDir,
    "-o",
    `-p ${port} -c listen_addresses=127.0.0.1 -c fsync=off -c unix_socket_directories='${dataDir}'`,
    "-w",
    "start",
    "-l",
    path.join(dataDir, "server.log"),
  ], execOpts);

  const connectionString = `postgresql://postgres@127.0.0.1:${port}/postgres`;
  const pool = new Pool({ connectionString, max: 20 });

  const stop = async () => {
    await pool.end().catch(() => undefined);
    try {
      execFileSync(
        path.join(bin, "pg_ctl"),
        ["-D", dataDir, "-m", "immediate", "stop"],
        execOpts,
      );
    } catch {
      // already stopped
    }
    rmSync(dataDir, { recursive: true, force: true });
  };

  return { pool, connectionString, stop };
}
