"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  decryptShareArtifact,
  type SanitizedShareArtifact,
} from "@/lib/client/share-crypto";
import { activeDeckTheme } from "@/components/tarot/deck-theme";

type State =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "bad_key" }
  | { kind: "ready"; artifact: SanitizedShareArtifact };

/**
 * Shared reading viewer: deliberately minimized (spec §6.5). No
 * "What shaped this reading" here — the provenance graph was intentionally
 * never stored.
 */
export function SharedReading({ shareId }: { shareId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fragmentKey = window.location.hash.slice(1);
      if (!fragmentKey) {
        setState({ kind: "bad_key" });
        return;
      }
      try {
        const response = await fetch(`/api/shares/${encodeURIComponent(shareId)}`);
        if (!response.ok) {
          if (!cancelled) setState({ kind: "unavailable" });
          return;
        }
        const data = (await response.json()) as {
          ciphertext: string;
          iv: string;
        };
        const artifact = await decryptShareArtifact(
          data.ciphertext,
          data.iv,
          fragmentKey,
        );
        if (!cancelled) setState({ kind: "ready", artifact });
      } catch (error) {
        if (cancelled) return;
        setState(
          (error as Error).name === "ShareDecryptError"
            ? { kind: "bad_key" }
            : { kind: "unavailable" },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (state.kind === "loading") {
    return (
      <main className="transition-scene">
        <div className="orbit" aria-hidden />
        <p className="transition-phrase">Opening the reading…</p>
      </main>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <main style={{ textAlign: "center", paddingTop: "14vh" }}>
        <span className="star-mark" aria-hidden>
          ✧
        </span>
        <h1>This shared reading is no longer available.</h1>
        <p style={{ color: "var(--text-dim)" }}>Private reading links are temporary.</p>
        <div className="actions">
          <Link className="btn" href="/">
            Begin a reading
          </Link>
        </div>
      </main>
    );
  }

  if (state.kind === "bad_key") {
    return (
      <main style={{ textAlign: "center", paddingTop: "14vh" }}>
        <span className="star-mark" aria-hidden>
          ✧
        </span>
        <h1>This private link can’t be opened.</h1>
        <p style={{ color: "var(--text-dim)" }}>
          This private link can’t be opened with the information in this URL.
        </p>
      </main>
    );
  }

  const { artifact } = state;
  const readingDate = new Date(artifact.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main>
      <div className="eyebrow" style={{ textAlign: "center" }}>
        A shared reading
      </div>
      <div className="reading-meta" style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>
        {artifact.broadDomainLabel}
        {artifact.focusLabel ? ` · ${artifact.focusLabel}` : ""}
      </div>
      <div className="reading-meta">{readingDate}</div>

      <div className="card-row">
        {artifact.cards.map((card, index) => (
          <div key={`${card.cardId}_${index}`} className="card-slot">
            <div className="card-face-wrap">
              <div className="card-inner revealed">
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
            <div className="card-caption">
              <strong>{card.displayName}</strong>
              {card.orientation === "reversed" && <span className="rev">Reversed · </span>}
              {card.positionLabel}
            </div>
          </div>
        ))}
      </div>

      <h1 className="reading-title">{artifact.title}</h1>

      <article className="prose-reading">
        {artifact.paragraphs.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </article>

      <p className="basis-line">
        Shared privately. Personal information used to create this reading is
        not included in the saved reading artifact.
      </p>
    </main>
  );
}
