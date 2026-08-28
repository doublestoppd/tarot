"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_INSIGHT_ID,
  DEFAULT_TIME_PERSPECTIVE_ID,
  DOMAINS,
  INSIGHT_LENSES,
  TIME_PERSPECTIVES,
} from "@/data/intake/taxonomy";
import {
  compatibleSpreads,
  selectSpread,
} from "@/domain/tarot/spread-selection";
import { readingSession } from "@/lib/client/reading-session";
import type { ReadingDisplay } from "@/lib/reading/display";

/**
 * Screen B — Prepare a Reading (spec §6.2): one calm vertical flow with
 * progressive sections, structured choices only, optional personalization,
 * a live capability summary, and a single primary action.
 */

interface PlaceCandidate {
  placeId: string;
  name: string;
  admin: string;
  country: string;
}

type Depth = "focused" | "deep" | "comprehensive";

export function PrepareReading() {
  const router = useRouter();
  const [domainId, setDomainId] = useState<string | null>(null);
  const [situation, setSituation] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [insightId, setInsightId] = useState(DEFAULT_INSIGHT_ID);
  const [timeId, setTimeId] = useState(DEFAULT_TIME_PERSPECTIVE_ID);
  const [depth, setDepth] = useState<Depth>("deep");
  const [reversals, setReversals] = useState(true);
  const [spreadOverrideId, setSpreadOverrideId] = useState<string | null>(null);

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceCandidate[]>([]);
  const [place, setPlace] = useState<PlaceCandidate | null>(null);
  const [dstChoice, setDstChoice] = useState<"first" | "second" | "not_sure" | null>(null);
  const [dstPrompt, setDstPrompt] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const domain = useMemo(
    () => DOMAINS.find((d) => d.id === domainId) ?? null,
    [domainId],
  );

  function pickDomain(id: string) {
    setDomainId(id);
    const d = DOMAINS.find((x) => x.id === id);
    setFocusId(d?.focuses[0]?.id ?? null);
    setSpreadOverrideId(null);
  }

  // Recommended spread + same-depth alternatives (spec §8): users never need
  // tarot expertise, but a subtle override remains available.
  const spreadChoice = useMemo(() => {
    if (!domainId || !focusId) return null;
    const selections = {
      domainId,
      focusId,
      insightId,
      timePerspectiveId: timeId,
      depth,
      reversalsEnabled: reversals,
    };
    const recommended = selectSpread(selections);
    const alternatives = compatibleSpreads(selections);
    const effective =
      alternatives.find((s) => s.id === spreadOverrideId) ?? recommended;
    return { recommended, alternatives, effective };
  }, [domainId, focusId, insightId, timeId, depth, reversals, spreadOverrideId]);

  // Birthplace lookup: the query only selects a canonical internal place
  // record (spec §3.1); it is never part of the reading itself.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (place || placeQuery.trim().length < 2) {
      setPlaceResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/places/search?q=${encodeURIComponent(placeQuery.trim())}`,
        );
        if (response.ok) {
          const data = (await response.json()) as { candidates: PlaceCandidate[] };
          setPlaceResults(data.candidates);
        }
      } catch {
        setPlaceResults([]);
      }
    }, 220);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [placeQuery, place]);

  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate);
  const effectiveTime = timeUnknown ? "" : birthTime;

  const capability = useMemo(() => {
    const included: string[] = ["Tarot and spread symbolism", "Current celestial conditions"];
    if (domain && focusId) {
      const focus = domain.focuses.find((f) => f.id === focusId);
      included.push(`${domain.label} — ${focus?.label ?? ""}`);
    }
    const lens = INSIGHT_LENSES.find((l) => l.id === insightId);
    if (lens) included.push(lens.label);
    if (hasDate) {
      included.push("Birth-date astrology", "Numerology and personal cycles");
      if (effectiveTime && place) included.push("Natal houses and Ascendant");
    }
    const excluded: string[] = [];
    if (!hasDate) {
      excluded.push("No personal birth information will be used.");
    } else if (!effectiveTime || !place) {
      excluded.push(
        "Natal houses and Ascendant — birth time and birthplace were not provided.",
      );
    }
    return { included, excluded };
  }, [domain, focusId, insightId, hasDate, effectiveTime, place]);

  const canDraw = domainId !== null && focusId !== null && !busy;

  async function drawCards() {
    if (!canDraw || !domainId || !focusId) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        idempotencyKey: crypto.randomUUID(),
        domainId,
        focusId,
        insightId,
        timePerspectiveId: timeId,
        depth,
        reversalsEnabled: reversals,
      };
      if (
        spreadChoice &&
        spreadChoice.effective.id !== spreadChoice.recommended.id
      ) {
        body.spreadOverrideId = spreadChoice.effective.id;
      }
      if (hasDate) {
        body.birth = {
          date: birthDate,
          time: effectiveTime || null,
          placeId: place?.placeId ?? null,
          dstAmbiguityChoice: dstChoice,
        };
      }
      if (situation.trim().length > 0) {
        body.situation = situation.trim().slice(0, 500);
      }
      const response = await fetch("/api/readings/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        readingTicket?: string;
        expiresAt?: string;
        display?: ReadingDisplay;
        error?: string;
        reason?: string;
        message?: string;
      };
      if (response.ok && data.readingTicket && data.display && data.expiresAt) {
        readingSession.set({
          ticket: data.readingTicket,
          expiresAt: data.expiresAt,
          display: data.display,
          result: null,
        });
        router.push("/reading");
        return;
      }
      if (data.reason === "BIRTH_TIME_AMBIGUOUS") {
        setDstPrompt(
          data.message ??
            "That local time occurred twice on this date because of a clock change.",
        );
      } else if (data.reason === "BIRTH_TIME_NONEXISTENT") {
        setError(
          data.message ??
            "That local time did not occur on this date because of a clock change. Check the time, or leave birth time open.",
        );
      } else if (response.status === 429) {
        setError("The reading room is busy at this moment. Try again shortly.");
      } else if (response.status === 401) {
        window.location.reload();
        return;
      } else {
        setError("The reading couldn’t begin. Check your entries and try again.");
      }
    } catch {
      setError("The reading couldn’t begin because the connection was interrupted. Nothing was drawn. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <span className="star-mark" aria-hidden>
        ✧
      </span>
      <div className="eyebrow" style={{ textAlign: "center" }}>
        Prepare a reading
      </div>
      <p style={{ textAlign: "center", color: "var(--text-dim)", maxWidth: "30rem", margin: "0 auto 2rem" }}>
        Choose what you would like the reading to explore. Personal details are
        optional; share only what you want.
      </p>

      {/* Step 1 — domain */}
      <section aria-labelledby="step-domain">
        <h2 id="step-domain">What should the reading explore?</h2>
        <div className="choice-grid" role="group" aria-labelledby="step-domain">
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              type="button"
              className="choice"
              aria-pressed={domainId === d.id}
              onClick={() => pickDomain(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 — focus */}
      {domain && (
        <section aria-labelledby="step-focus" style={{ marginTop: "1.6rem" }}>
          <h2 id="step-focus">Focus</h2>
          <div className="choice-grid compact" role="group" aria-labelledby="step-focus">
            {domain.focuses.map((f) => (
              <button
                key={f.id}
                type="button"
                className="choice"
                aria-pressed={focusId === f.id}
                onClick={() => setFocusId(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3 — insight lens */}
      {domain && (
        <section aria-labelledby="step-lens" style={{ marginTop: "1.6rem" }}>
          <h2 id="step-lens">Insight</h2>
          <div className="choice-grid compact" role="group" aria-labelledby="step-lens">
            {INSIGHT_LENSES.map((lens) => (
              <button
                key={lens.id}
                type="button"
                className="choice"
                aria-pressed={insightId === lens.id}
                onClick={() => setInsightId(lens.id)}
                title={lens.description}
              >
                {lens.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 4 — time perspective */}
      {domain && (
        <section aria-labelledby="step-time" style={{ marginTop: "1.6rem" }}>
          <h2 id="step-time">Time perspective</h2>
          <div className="seg" role="group" aria-labelledby="step-time">
            {TIME_PERSPECTIVES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="choice"
                aria-pressed={timeId === t.id}
                onClick={() => setTimeId(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 5 — in your own words (optional free text, ADR 0011) */}
      {domain && (
        <section aria-labelledby="step-situation" style={{ marginTop: "1.6rem" }}>
          <span className="optional-tag">Optional</span>
          <h2 id="step-situation">In your own words</h2>
          <p style={{ color: "var(--text-dim)", fontSize: "0.92rem" }}>
            A few lines about what is going on, if you want the reading aimed
            at your actual situation.
          </p>
          <textarea
            id="situation"
            className="field"
            rows={3}
            maxLength={500}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="e.g. I've been offered a new role in another city and can't decide whether to take it."
            style={{ width: "100%", resize: "vertical", minHeight: "4.5rem" }}
          />
          <p style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            Travels encrypted inside this one reading and is shared with the
            interpretation engine once. Never stored, never part of share
            links. {situation.length > 0 ? `${situation.length}/500` : ""}
          </p>
        </section>
      )}

      {/* Step 6 — personalization */}
      {domain && (
        <section className="panel" aria-labelledby="step-personal" style={{ marginTop: "2rem" }}>
          <span className="optional-tag">Optional</span>
          <h2 id="step-personal">Personalize your reading</h2>
          <p style={{ color: "var(--text-dim)", fontSize: "0.92rem" }}>
            You can leave this whole section blank. Birth facts let the
            reading add links from astrology, numbers, and tarot birth cards.
          </p>
          <label className="label" htmlFor="birth-date">
            Birth date
          </label>
          <input
            id="birth-date"
            className="field"
            type="date"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value)}
            style={{ maxWidth: "14rem" }}
          />
          <p style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            Adds birth astrology, numerology, personal cycles and tarot birth cards.
          </p>

          {hasDate && (
            <div style={{ marginTop: "1.2rem", borderTop: "1px solid var(--border-soft)", paddingTop: "1.1rem" }}>
              <span className="optional-tag">Optional</span>
              <h3>Add more astrological detail</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <label className="label" htmlFor="birth-time">
                    Birth time
                  </label>
                  <input
                    id="birth-time"
                    className="field"
                    type="time"
                    value={timeUnknown ? "" : birthTime}
                    disabled={timeUnknown}
                    onChange={(e) => setBirthTime(e.target.value)}
                    style={{ maxWidth: "9rem" }}
                  />
                </div>
                <div style={{ flex: "1 1 14rem", position: "relative" }}>
                  <label className="label" htmlFor="birth-place">
                    Birthplace
                  </label>
                  {place ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span className="field" style={{ display: "inline-flex", alignItems: "center" }}>
                        {place.name}, {place.admin ? `${place.admin}, ` : ""}
                        {place.country}
                      </span>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        onClick={() => {
                          setPlace(null);
                          setPlaceQuery("");
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="birth-place"
                        className="field"
                        type="text"
                        placeholder="City / region / country"
                        autoComplete="off"
                        value={placeQuery}
                        onChange={(e) => setPlaceQuery(e.target.value)}
                      />
                      {placeResults.length > 0 && (
                        <ul
                          role="listbox"
                          aria-label="Birthplace candidates"
                          style={{
                            listStyle: "none",
                            margin: "0.3rem 0 0",
                            padding: 0,
                            border: "1px solid var(--border)",
                            borderRadius: "7px",
                            background: "var(--surface-2)",
                            maxHeight: "13rem",
                            overflowY: "auto",
                          }}
                        >
                          {placeResults.map((c) => (
                            <li key={c.placeId}>
                              <button
                                type="button"
                                className="choice"
                                style={{ width: "100%", border: "none", borderRadius: 0 }}
                                onClick={() => {
                                  setPlace(c);
                                  setPlaceResults([]);
                                }}
                              >
                                {c.name}
                                {c.admin ? `, ${c.admin}` : ""} · {c.country}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p style={{ color: "var(--text-faint)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Adding both unlocks houses, angles, and a fuller birth chart.
              </p>
              <button
                type="button"
                className="btn btn-quiet"
                aria-pressed={timeUnknown}
                onClick={() => setTimeUnknown((v) => !v)}
              >
                {timeUnknown ? "✓ Birth time left open" : "I don’t know my birth time"}
              </button>

              {dstPrompt && effectiveTime && (
                <div className="notice" role="group" aria-label="Clock-change choice">
                  <p style={{ marginBottom: "0.5rem" }}>{dstPrompt}</p>
                  <div className="seg">
                    {(
                      [
                        ["first", "First occurrence"],
                        ["second", "Second occurrence"],
                        ["not_sure", "Not sure"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className="choice"
                        aria-pressed={dstChoice === value}
                        onClick={() => setDstChoice(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Step 6 — reading settings */}
      {domain && (
        <details className="disclosure panel panel-quiet">
          <summary>Reading settings</summary>
          <div style={{ paddingTop: "0.8rem" }}>
            <h3>Reversals</h3>
            <div className="seg">
              <button type="button" className="choice" aria-pressed={reversals} onClick={() => setReversals(true)}>
                On
              </button>
              <button type="button" className="choice" aria-pressed={!reversals} onClick={() => setReversals(false)}>
                Off
              </button>
            </div>
            <h3 style={{ marginTop: "1rem" }}>Reading depth</h3>
            <div className="seg">
              {(
                [
                  ["focused", "Focused"],
                  ["deep", "Deep"],
                  ["comprehensive", "Comprehensive"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="choice"
                  aria-pressed={depth === value}
                  onClick={() => {
                    setDepth(value);
                    setSpreadOverrideId(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {spreadChoice && (
              <>
                <h3 style={{ marginTop: "1rem" }}>Spread</h3>
                <p style={{ color: "var(--text-faint)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
                  Recommended for these choices: {spreadChoice.recommended.name} (
                  {spreadChoice.recommended.cardCount} cards). Choose another if
                  you prefer.
                </p>
                <div className="seg">
                  {spreadChoice.alternatives.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="choice"
                      aria-pressed={spreadChoice.effective.id === s.id}
                      title={s.description}
                      onClick={() =>
                        setSpreadOverrideId(
                          s.id === spreadChoice.recommended.id ? null : s.id,
                        )
                      }
                    >
                      {s.name}
                      {s.id === spreadChoice.recommended.id ? " ·  recommended" : ""}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </details>
      )}

      {/* Step 7 — capability summary */}
      {domain && focusId && (
        <div className="capability" aria-live="polite">
          <div className="eyebrow">This reading will draw from</div>
          <ul>
            {capability.included.map((item) => (
              <li key={item} className="on">
                {item}
              </li>
            ))}
          </ul>
          {capability.excluded.length > 0 && (
            <>
              <div className="eyebrow" style={{ color: "var(--text-faint)" }}>
                Not included
              </div>
              <ul>
                {capability.excluded.map((item) => (
                  <li key={item} className="off">
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}

      {domain && focusId && (
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={!canDraw} onClick={drawCards}>
            {busy ? "Setting the moment…" : "Draw the cards"}
          </button>
        </div>
      )}
    </main>
  );
}
