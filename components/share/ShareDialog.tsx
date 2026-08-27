"use client";

import { useRef, useState } from "react";
import {
  buildSanitizedArtifact,
  encryptShareArtifact,
} from "@/lib/client/share-crypto";
import type { ReadingDisplay } from "@/lib/reading/display";
import type { ReadingSynthesis } from "@/domain/reading-compiler/types";

/**
 * Private share link creation (spec §20.1–20.2). The browser encrypts a
 * minimized artifact; the server stores ciphertext only; the key travels in
 * the URL fragment and never reaches any server or log.
 */
export function ShareDialog({
  display,
  synthesis,
  shareTtlDays = 90,
}: {
  display: ReadingDisplay;
  synthesis: ReadingSynthesis;
  shareTtlDays?: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLink() {
    setBusy(true);
    setError(null);
    try {
      const artifact = buildSanitizedArtifact(display, synthesis);
      const encrypted = await encryptShareArtifact(artifact);
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext: encrypted.ciphertextB64,
          iv: encrypted.ivB64,
          algorithm: "AES-256-GCM",
          schemaVersion: 1,
        }),
      });
      if (!response.ok) {
        throw new Error("create failed");
      }
      const data = (await response.json()) as { shareId: string };
      setUrl(`${window.location.origin}/r/${data.shareId}#${encrypted.fragmentKey}`);
    } catch {
      setError("A private link couldn’t be created. Your reading is still here in this session.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // The link stays visible for manual copying.
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={() => dialogRef.current?.showModal()}>
        Create private share link
      </button>

      <dialog ref={dialogRef} className="sheet" aria-label="Share this reading">
        <div className="eyebrow">Share this reading</div>
        <p style={{ color: "var(--text-dim)" }}>
          A private copy of the finished reading will be created.
        </p>
        <div className="factor-group">
          <h3>Included</h3>
          <ul>
            <li>Reading title and text</li>
            <li>Cards, positions and orientations</li>
            <li>General reading topic and focus</li>
            <li>Reading date</li>
          </ul>
        </div>
        <div className="factor-group">
          <h3>Not included</h3>
          <ul>
            <li>Birth date, birth time or birthplace</li>
            <li>Full natal or numerology calculations</li>
            <li>Detailed evidence and resonance basis</li>
          </ul>
        </div>
        <p style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
          The reading itself may mention derived astrological or numerological
          details when they were relevant. Private links expire after {shareTtlDays}{" "}
          days. The link is encrypted in this browser; anyone opening it will
          still need the access code.
        </p>

        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}

        {url ? (
          <div>
            <label className="label" htmlFor="share-url">
              Private link
            </label>
            <input
              id="share-url"
              className="field"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={copy}>
                {copied ? "Copied" : "Copy link"}
              </button>
              <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={createLink}>
              {busy ? "Creating…" : "Create private link"}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
