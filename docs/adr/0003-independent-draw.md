# ADR 0003 — The card draw is independent of all context

**Status:** accepted (binding, from the v1 specification)

## Decision

`drawCards(cardCount, reversalsEnabled, randomSource?)` in
`domain/tarot/draw.ts` is the only card-selection code path. Its signature
accepts a card count, a reversal flag, and an injectable CSPRNG (tests only).
It must never accept birth data, domain/focus/insight selections, astrology,
numerology, resonance results, AI output, or prior readings — a unit test
asserts the exported signature arity and a grep-style architecture test keeps
context types out of the module.

The shuffle is an unbiased Fisher–Yates using rejection-sampled integers from
`crypto.randomBytes`; orientation is one independent secure bit per card.
The draw and its authoritative UTC timestamp are frozen inside the reading
ticket before any AI involvement.

## User-facing claim

"Cards are selected using a cryptographically secure randomized draw. Your
profile, selected topic, and the interpretation model do not choose the
cards." We do not claim metaphysical or "true" randomness.
