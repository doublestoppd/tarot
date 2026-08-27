"use client";

import { useState, type FormEvent } from "react";

/**
 * Screen A — Private Access (spec §6.1). Masked input with reveal toggle,
 * one action, generic failure copy, no application content behind the gate.
 */
export function AccessGate() {
  const [code, setCode] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || code.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/access/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: code }),
      });
      if (response.ok) {
        // Reload preserves the requested path — including a shared-reading
        // URL and its fragment key, which never leaves this browser.
        window.location.reload();
        return;
      }
      if (response.status === 429) {
        setError("Access is temporarily unavailable from this browser. Try again a little later.");
      } else {
        setError("That access code doesn’t open this space. Check it and try again.");
      }
    } catch {
      setError("The connection was interrupted. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: "22rem", margin: "12vh auto 0", textAlign: "center" }}>
      <span className="star-mark" aria-hidden>
        ✧
      </span>
      <h1 style={{ letterSpacing: "0.3em", fontSize: "1.1rem" }}>PRIVATE ACCESS</h1>
      <p style={{ color: "var(--text-dim)" }}>Enter the access code to continue.</p>
      <form onSubmit={submit}>
        <label className="visually-hidden" htmlFor="access-code">
          Access code
        </label>
        <input
          id="access-code"
          className="field"
          type={reveal ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Access code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ textAlign: "center", letterSpacing: "0.15em" }}
        />
        <button
          type="button"
          className="btn-quiet btn"
          onClick={() => setReveal((r) => !r)}
          aria-pressed={reveal}
          style={{ marginTop: "0.4rem", fontSize: "0.8rem" }}
        >
          {reveal ? "Hide code" : "Show code"}
        </button>
        {error && (
          <p role="alert" className="notice error" style={{ textAlign: "left" }}>
            {error}
          </p>
        )}
        <div style={{ marginTop: "1rem" }}>
          <button className="btn btn-primary" type="submit" disabled={busy || code.length === 0}>
            Enter
          </button>
        </div>
      </form>
    </main>
  );
}
