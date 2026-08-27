# ADR 0006 — Astronomy Engine as the v1 astrology adapter

**Status:** accepted

## Context

The specification names "Celestine" as a candidate MIT astrology adapter,
"after verification against known fixtures", with Astronomy Engine (MIT) as an
independent fixture reference, and Swiss Ephemeris as future/licensing-gated.
At implementation time Celestine could not be verified as an actively
maintained, accuracy-documented package, so it fails the specification's own
verification precondition.

## Decision

Implement `AstrologyProvider` (`domain/astrology/provider.ts`) against
**Astronomy Engine** (`astronomy-engine`, MIT — Espenak/Meeus-derived VSOP87
models, documented ±1 arcminute planetary accuracy over 1700–2100), which
comfortably exceeds the precision demanded by the configured aspect orbs
(minimum 1.5°). The adapter normalizes everything into application-owned
types; no other module imports the library.

House cusps (Placidus, with Whole Sign fallback at extreme latitudes) and
aspect/orb logic are implemented in-application from the standard published
formulae, because Astronomy Engine is an astronomy library, not an astrology
library. Independent verification is performed inside the test suite:
ascendant/midheaven values from the analytic formulae are cross-checked
against a numerical horizon/culmination search that uses a *different*
Astronomy Engine code path (equatorial→horizontal transforms), plus published
solstice/equinox and sign-ingress spot fixtures.

Swiss Ephemeris remains a future adapter behind the same interface if higher
precision is ever justified and licensing is resolved.
