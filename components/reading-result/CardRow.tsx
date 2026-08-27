"use client";

import { useState } from "react";
import { activeDeckTheme } from "@/components/tarot/deck-theme";
import type { ReadingDisplay } from "@/lib/reading/display";

/**
 * Drawn cards with face-down → reveal presentation (spec §6.3). The reveal
 * is presentation only — cards were committed server-side before any
 * interpretation. Tap/click opens a compact canonical-meaning detail.
 */
export function CardRow({
  cards,
  revealed,
}: {
  cards: ReadingDisplay["cards"];
  revealed: boolean;
}) {
  const [detail, setDetail] = useState<number | null>(null);

  return (
    <>
      <div className="card-row">
        {cards.map((card, index) => (
          <button
            key={`${card.cardId}_${index}`}
            type="button"
            className="card-slot"
            onClick={() => revealed && setDetail(index)}
            aria-label={
              revealed
                ? `${activeDeckTheme.altText({ canonicalName: card.name }, card.orientation, card.positionLabel)}. Show details.`
                : "Card face down"
            }
          >
            <div className="card-face-wrap">
              <div
                className={`card-inner${revealed ? " revealed" : ""}`}
                style={{ transitionDelay: revealed ? `${index * 140}ms` : "0ms" }}
              >
                <div className="card-back">
                  <activeDeckTheme.CardBack />
                </div>
                <div
                  className="card-front"
                  style={
                    card.orientation === "reversed"
                      ? { transform: "rotateY(180deg) rotate(180deg)" }
                      : undefined
                  }
                >
                  <activeDeckTheme.CardFace cardId={card.cardId} />
                </div>
              </div>
            </div>
            <div className="card-caption" aria-hidden={!revealed}>
              {revealed && (
                <>
                  <strong>{card.name}</strong>
                  {card.orientation === "reversed" && <span className="rev">Reversed · </span>}
                  {card.positionLabel}
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      {detail !== null && cards[detail] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${cards[detail].name} details`}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8,6,14,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
          onClick={() => setDetail(null)}
        >
          <div
            className="panel"
            style={{ maxWidth: "24rem", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {cards[detail].name}
              {cards[detail].orientation === "reversed" ? " (reversed)" : ""}
            </h3>
            <p style={{ color: "var(--text-faint)", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {cards[detail].positionLabel} — {cards[detail].positionPurpose}
            </p>
            <p style={{ color: "var(--text-dim)" }}>{cards[detail].meaning}</p>
            <div className="actions" style={{ margin: "0.5rem 0 0" }}>
              <button type="button" className="btn" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
