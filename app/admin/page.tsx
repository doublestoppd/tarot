"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

/**
 * Administrator console (spec §28): operating the service, never inspecting
 * users. Separate admin secret; aggregate data only; no reading content
 * exists to show.
 */

interface AdminStatus {
  settings: {
    aiEnabled: boolean;
    unlockEnabled: boolean;
    aiProvider: string;
    aiModel: string;
    dailyBudgetUsd: string;
    monthlyBudgetUsd: string;
    maxReadingCostUsd: string;
    maxRepairCostUsd: string;
    perInstallHourly: number;
    perInstallDaily: number;
    globalAiConcurrency: number;
    shareTtlDays: number;
    sessionEpoch: number;
  };
  usage: {
    today: UsageBlock | null;
    month: UsageBlock | null;
  };
  budget: Record<string, { committedUsd: string; reservedUsd: string }>;
  shares: { activeCount: number; totalBytes: number; nextExpiry: string | null };
  health: {
    database: string;
    providerConfigured: boolean;
    buildSha: string;
    nodeEnv: string;
  };
}

interface UsageBlock {
  aiRequests: number;
  repairRequests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: string;
  providerErrors: number;
  validationFailures: number;
}

export default function AdminPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [rotatedCode, setRotatedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/status");
      if (response.status === 401 || response.status === 403) {
        setNeedsLogin(true);
        setStatus(null);
        return;
      }
      if (response.ok) {
        setStatus((await response.json()) as AdminStatus);
        setNeedsLogin(false);
      }
    } catch {
      setMessage("Status unavailable.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: secret }),
      });
      if (response.ok) {
        setSecret("");
        await refresh();
      } else {
        setMessage("That secret was not accepted.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function patchSettings(patch: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) setMessage("Update rejected.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, body: Record<string, unknown>, onData?: (d: unknown) => void) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) setMessage("Action failed.");
      else onData?.(data);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (needsLogin) {
    return (
      <main style={{ maxWidth: "22rem", margin: "10vh auto 0" }}>
        <div className="eyebrow">Administration</div>
        <form onSubmit={login}>
          <label className="label" htmlFor="admin-secret">
            Admin secret
          </label>
          <input
            id="admin-secret"
            className="field"
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          {message && (
            <p role="alert" className="notice error">
              {message}
            </p>
          )}
          <div style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" type="submit" disabled={busy || !secret}>
              Enter
            </button>
          </div>
        </form>
      </main>
    );
  }

  if (!status) {
    return (
      <main>
        <div className="eyebrow">Administration</div>
        <p style={{ color: "var(--text-dim)" }}>Loading status…</p>
        {message && <p className="notice error">{message}</p>}
      </main>
    );
  }

  const s = status.settings;

  return (
    <main className="page-wide" style={{ maxWidth: "62rem" }}>
      <div className="eyebrow">Administration</div>
      <h1>Operations</h1>
      {message && (
        <p role="alert" className="notice error">
          {message}
        </p>
      )}

      <section className="panel">
        <h2>Interpretation service</h2>
        <p style={{ color: s.aiEnabled ? "var(--ok)" : "var(--danger)" }}>
          {s.aiEnabled ? "AI synthesis ENABLED" : "AI synthesis DISABLED — deterministic readings continue"}
        </p>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void patchSettings({ aiEnabled: !s.aiEnabled })}
          >
            {s.aiEnabled ? "Emergency: disable AI" : "Enable AI"}
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            disabled={busy}
            onClick={() => void patchSettings({ unlockEnabled: !s.unlockEnabled })}
          >
            {s.unlockEnabled ? "Disable new unlocks" : "Enable new unlocks"}
          </button>
        </div>
        <p style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
          Model: <code>{s.aiModel}</code> · provider configured:{" "}
          {status.health.providerConfigured ? "yes" : "no"} · build {status.health.buildSha}
        </p>
      </section>

      <section className="panel">
        <h2>Usage &amp; budgets (UTC)</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Today · requests</div>
            <div className="v">{status.usage.today?.aiRequests ?? 0}</div>
          </div>
          <div className="stat">
            <div className="k">Today · est. cost</div>
            <div className="v">${status.usage.today?.estimatedCostUsd ?? "0.00"}</div>
          </div>
          <div className="stat">
            <div className="k">Month · requests</div>
            <div className="v">{status.usage.month?.aiRequests ?? 0}</div>
          </div>
          <div className="stat">
            <div className="k">Month · est. cost</div>
            <div className="v">${status.usage.month?.estimatedCostUsd ?? "0.00"}</div>
          </div>
          <div className="stat">
            <div className="k">Provider errors (mo)</div>
            <div className="v">{status.usage.month?.providerErrors ?? 0}</div>
          </div>
          <div className="stat">
            <div className="k">Validation fails (mo)</div>
            <div className="v">{status.usage.month?.validationFailures ?? 0}</div>
          </div>
          <div className="stat">
            <div className="k">Daily committed / reserved</div>
            <div className="v" style={{ fontSize: "1rem" }}>
              ${status.budget.daily?.committedUsd ?? "0.00"} / ${status.budget.daily?.reservedUsd ?? "0.00"}
            </div>
          </div>
          <div className="stat">
            <div className="k">Monthly committed</div>
            <div className="v" style={{ fontSize: "1rem" }}>
              ${status.budget.monthly?.committedUsd ?? "0.00"}
            </div>
          </div>
        </div>

        <SettingsForm settings={s} busy={busy} onSave={patchSettings} />
      </section>

      <section className="panel">
        <h2>Access</h2>
        <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
          Session epoch: {s.sessionEpoch}. Rotating the code affects new
          admissions only; incrementing the epoch signs out every authorized
          browser, including this console.
        </p>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() =>
              void act("/api/admin/access-code/rotate", { confirm: true }, (data) => {
                const d = data as { accessCode?: string };
                if (d?.accessCode) setRotatedCode(d.accessCode);
              })
            }
          >
            Rotate access code
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Invalidate every authorized browser, including this console?")) {
                void act("/api/admin/sessions/invalidate", { confirm: true });
              }
            }}
          >
            Invalidate all sessions
          </button>
        </div>
        {rotatedCode && (
          <div className="notice" role="alert">
            <strong>New access code (shown once):</strong>
            <div style={{ fontFamily: "monospace", fontSize: "1.05rem", margin: "0.4rem 0" }}>
              {rotatedCode}
            </div>
            Store it in a password manager and distribute out-of-band.
            <div>
              <button type="button" className="btn btn-quiet" onClick={() => setRotatedCode(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Encrypted shares</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Active links</div>
            <div className="v">{status.shares.activeCount}</div>
          </div>
          <div className="stat">
            <div className="k">Ciphertext bytes</div>
            <div className="v" style={{ fontSize: "1rem" }}>
              {status.shares.totalBytes.toLocaleString()}
            </div>
          </div>
          <div className="stat">
            <div className="k">Next expiry</div>
            <div className="v" style={{ fontSize: "0.85rem" }}>
              {status.shares.nextExpiry
                ? new Date(status.shares.nextExpiry).toISOString().slice(0, 10)
                : "—"}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => void act("/api/admin/shares/purge-expired", {})}
        >
          Purge expired now
        </button>
      </section>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() =>
            void fetch("/api/admin/logout", { method: "POST" }).then(() => {
              setNeedsLogin(true);
              setStatus(null);
            })
          }
        >
          Sign out of console
        </button>
      </div>
    </main>
  );
}

function SettingsForm({
  settings,
  busy,
  onSave,
}: {
  settings: AdminStatus["settings"];
  busy: boolean;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [daily, setDaily] = useState(settings.dailyBudgetUsd);
  const [monthly, setMonthly] = useState(settings.monthlyBudgetUsd);
  const [maxReading, setMaxReading] = useState(settings.maxReadingCostUsd);
  const [hourly, setHourly] = useState(String(settings.perInstallHourly));
  const [dailyLimit, setDailyLimit] = useState(String(settings.perInstallDaily));
  const [concurrency, setConcurrency] = useState(String(settings.globalAiConcurrency));
  const [model, setModel] = useState(settings.aiModel);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          dailyBudgetUsd: daily,
          monthlyBudgetUsd: monthly,
          maxReadingCostUsd: maxReading,
          perInstallHourly: Number(hourly),
          perInstallDaily: Number(dailyLimit),
          globalAiConcurrency: Number(concurrency),
          aiModel: model,
        });
      }}
    >
      <h3 style={{ marginTop: "1.2rem" }}>Controls</h3>
      <div className="admin-form-row">
        <div>
          <label className="label" htmlFor="f-daily">
            Daily budget $
          </label>
          <input id="f-daily" className="field" value={daily} onChange={(e) => setDaily(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-monthly">
            Monthly budget $
          </label>
          <input id="f-monthly" className="field" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-maxread">
            Max reading $
          </label>
          <input id="f-maxread" className="field" value={maxReading} onChange={(e) => setMaxReading(e.target.value)} />
        </div>
      </div>
      <div className="admin-form-row">
        <div>
          <label className="label" htmlFor="f-hourly">
            Per-browser / hour
          </label>
          <input id="f-hourly" className="field" value={hourly} onChange={(e) => setHourly(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-dailylim">
            Per-browser / day
          </label>
          <input id="f-dailylim" className="field" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-conc">
            Global concurrency
          </label>
          <input id="f-conc" className="field" value={concurrency} onChange={(e) => setConcurrency(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-model">
            Model id
          </label>
          <input id="f-model" className="field" style={{ maxWidth: "16rem" }} value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={busy}>
          Save
        </button>
      </div>
    </form>
  );
}
