# ADR 0004 — One AI call per reading; atomic application-side budgets

**Status:** accepted (binding, from the v1 specification)

## Decision

Normal reading generation performs exactly one synthesis model call. If the
first response is unusable after deterministic repair attempts, exactly one
repair call with the same evidence is allowed. There are no retry loops,
agent chains, tool calls, or provider-side persistence (`store: false`).

Budgets are enforced application-side in integer micro-USD inside database
transactions: worst-case cost is reserved (row-locked daily + monthly budget
rows) before the provider call and finalized from actual usage after it.
A unique index on the reading-ticket nonce guarantees at most one normal and
one repair reservation per reading, which is also the idempotency barrier
against duplicate charges. Provider-side project limits are a second barrier,
never the primary one. If the database is unavailable, AI calls fail closed.

The deterministic reading (cards, positions, canonical meanings, compiled
themes) must remain available whenever AI is disabled, over budget, or the
provider is down — with reading-oriented copy, never budget/API vocabulary.
