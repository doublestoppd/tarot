"use client";

import { useRef } from "react";
import type { ReadingDisplay } from "@/lib/reading/display";

/**
 * Transparency layers (spec Appendix D): layer 2 "What shaped this reading"
 * (human-readable strongest factors, no scores) and layer 3 "Detailed basis"
 * (provenance: tradition, acceptance class, sources). Session-only views of
 * data the browser already holds; nothing is fetched or stored.
 */

export function WhatShapedButton({ display }: { display: ReadingDisplay }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailRef = useRef<HTMLDialogElement>(null);
  const shaped = display.whatShaped;

  return (
    <>
      <button type="button" className="btn" onClick={() => dialogRef.current?.showModal()}>
        What shaped this reading
      </button>

      <dialog ref={dialogRef} className="sheet" aria-label="What shaped this reading">
        <div className="eyebrow">What shaped this reading</div>

        {shaped.cards.length > 0 && (
          <div className="factor-group">
            <h3>The cards</h3>
            <ul>
              {shaped.cards.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {shaped.personal.length > 0 && (
          <div className="factor-group">
            <h3>Personal correspondence</h3>
            <ul>
              {shaped.personal.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {shaped.currentSky.length > 0 && (
          <div className="factor-group">
            <h3>Current sky</h3>
            <ul>
              {shaped.currentSky.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {shaped.availableNotEmphasized.length > 0 && (
          <div className="factor-group">
            <h3>Available but not emphasized</h3>
            <ul>
              {shaped.availableNotEmphasized.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {shaped.notAvailable.length > 0 && (
          <div className="factor-group">
            <h3>Not available</h3>
            <ul>
              {shaped.notAvailable.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              dialogRef.current?.close();
              detailRef.current?.showModal();
            }}
          >
            Detailed basis
          </button>
          <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
      </dialog>

      <dialog ref={detailRef} className="sheet" aria-label="Detailed basis">
        <div className="eyebrow">Detailed basis</div>
        <p style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
          Provenance for the factors this reading drew on. Traditions can
          disagree; classifications name the tradition rather than asserting
          universal consensus. This view exists only while the reading is open.
        </p>
        <div className="table-scroll">
          <table className="basis-table">
            <thead>
              <tr>
                <th scope="col">Factor</th>
                <th scope="col">Tradition</th>
                <th scope="col">Class</th>
                <th scope="col">Sources</th>
              </tr>
            </thead>
            <tbody>
              {display.detailedBasis.map((row, i) => (
                <tr key={i}>
                  <td className="stmt">{row.statement}</td>
                  <td>{row.tradition}</td>
                  <td>{row.acceptanceClass}</td>
                  <td>{row.sources.join("; ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => detailRef.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
