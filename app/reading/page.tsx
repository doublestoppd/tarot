"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readingSession, type ActiveReadingResult } from "@/lib/client/reading-session";
import { CardRow } from "@/components/reading-result/CardRow";
import { WhatShapedButton } from "@/components/transparency/TransparencyPanels";
import { ShareDialog } from "@/components/share/ShareDialog";

/**
 * Screens C + D — generation transition and Your Reading (spec §6.3–6.4).
 * The reading lives only in this session's memory: a refresh closes it, and
 * that is the documented behavior. No chat box, no follow-up prompt.
 */

const TRANSITION_PHRASES = [
  "Drawing the cards…",
  "Setting the moment…",
  "Reading the pattern…",
  "Bringing the threads together…",
];

type Phase =
  | { kind: "closed" }
  | { kind: "working" }
  | { kind: "interrupted" }
  | { kind: "done"; result: ActiveReadingResult; note: string | null };

export default function ReadingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "working" });
  const [phraseIndex, setPhraseIndex] = useState(0);
  const startedRef = useRef(false);

  const interpret = useCallback(async () => {
    const active = readingSession.get();
    if (!active) {
      setPhase({ kind: "closed" });
      return;
    }
    if (active.result) {
      setPhase({ kind: "done", result: active.result, note: null });
      return;
    }
    setPhase({ kind: "working" });
    try {
      const response = await fetch("/api/readings/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: active.ticket }),
      });
      const data = (await response.json()) as {
        kind?: "ai" | "deterministic";
        reason?: string;
        synthesis?: ActiveReadingResult["synthesis"];
        error?: string;
      };
      if (response.ok && data.kind && data.synthesis) {
        const result: ActiveReadingResult = {
          kind: data.kind,
          ...(data.reason ? { reason: data.reason } : {}),
          synthesis: data.synthesis,
        };
        readingSession.setResult(result);
        const note =
          data.kind === "deterministic"
            ? "The full interpretation isn’t available at this moment. Your cards and the underlying pattern can still be read."
            : null;
        setPhase({ kind: "done", result, note });
        return;
      }
      switch (data.error) {
        case "AI_PROVIDER_INTERRUPTED":
          setPhase({ kind: "interrupted" });
          return;
        case "AI_CAPACITY_UNAVAILABLE":
        case "RATE_TEMPORARILY_UNAVAILABLE": {
          const fallback: ActiveReadingResult = {
            kind: "deterministic",
            reason: "capacity",
            synthesis: active.display.deterministicFallback,
          };
          readingSession.setResult(fallback);
          setPhase({
            kind: "done",
            result: fallback,
            note: "The full interpretation isn’t available at this moment. Your cards and the underlying pattern can still be read.",
          });
          return;
        }
        case "READING_TICKET_EXPIRED":
        default:
          setPhase({ kind: "closed" });
          return;
      }
    } catch {
      setPhase({ kind: "interrupted" });
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void interpret();
  }, [interpret]);

  useEffect(() => {
    if (phase.kind !== "working") return;
    const timer = setInterval(
      () => setPhraseIndex((i) => (i + 1) % TRANSITION_PHRASES.length),
      1600,
    );
    return () => clearInterval(timer);
  }, [phase.kind]);

  const active = readingSession.get();

  function beginAnother() {
    readingSession.clear();
    router.push("/");
  }

  if (phase.kind === "closed" || !active) {
    return (
      <main style={{ textAlign: "center", paddingTop: "14vh" }}>
        <span className="star-mark" aria-hidden>
          ✧
        </span>
        <h1>This reading has closed.</h1>
        <p style={{ color: "var(--text-dim)" }}>Begin a new reading when you’re ready.</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={beginAnother}>
            Begin a new reading
          </button>
        </div>
      </main>
    );
  }

  const { display } = active;

  if (phase.kind === "working") {
    return (
      <main className="transition-scene" aria-live="polite">
        <div className="orbit" aria-hidden />
        <p className="transition-phrase">{TRANSITION_PHRASES[phraseIndex]}</p>
        <CardRow cards={display.cards} revealed={false} />
      </main>
    );
  }

  if (phase.kind === "interrupted") {
    return (
      <main>
        <div className="reading-meta" style={{ marginTop: "2rem" }}>
          {display.domainLabel} · {display.focusLabel}
        </div>
        <CardRow cards={display.cards} revealed={true} />
        <div className="notice" role="alert" style={{ maxWidth: "30rem", margin: "1.5rem auto" }}>
          The interpretation was interrupted. Your cards and the moment of the
          draw are still set for this session.
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => void interpret()}>
            Continue this reading
          </button>
          <button type="button" className="btn btn-quiet" onClick={beginAnother}>
            Begin another reading
          </button>
        </div>
      </main>
    );
  }

  const { result, note } = phase;
  const basisParts = display.basisSummary.included.slice(0, 5);

  return (
    <main>
      <div className="reading-meta" style={{ marginTop: "1rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        {display.domainLabel}
      </div>
      <div className="reading-meta">
        {display.focusLabel} • {display.insightLabel} • {display.timePerspectiveLabel}
      </div>

      <CardRow cards={display.cards} revealed={true} />

      <h1 className="reading-title">{result.synthesis.title}</h1>

      {note && (
        <div className="notice" role="status" style={{ maxWidth: "32rem", margin: "1rem auto" }}>
          {note} <span style={{ color: "var(--text-faint)" }}>You can return later for the complete interpretation with a fresh draw.</span>
        </div>
      )}

      <article className="prose-reading">
        {result.synthesis.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph.text}</p>
        ))}
      </article>

      <p className="basis-line">
        Prepared with{" "}
        {basisParts.map((part, i) => (
          <span key={part}>
            {part}
            {i < basisParts.length - 1 ? " • " : ""}
          </span>
        ))}
      </p>

      <div className="actions">
        <WhatShapedButton display={display} />
        <ShareDialog display={display} synthesis={result.synthesis} />
        <button type="button" className="btn btn-quiet" onClick={beginAnother}>
          Begin another reading
        </button>
      </div>
    </main>
  );
}
