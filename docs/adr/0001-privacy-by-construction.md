# ADR 0001 — Privacy by construction: ephemeral reading data, no user records

**Status:** accepted (binding, from the v1 specification)

## Decision

Personal inputs (birth date/time/place, structured selections) and the full
derived reading context (natal factors, numerology, resonance graph, prompt,
AI prose) are never written to the relational database, logs, or analytics.
They exist only:

1. in process memory during `/api/readings/prepare` and `/api/readings/interpret`, and
2. inside the AES-GCM encrypted, short-lived **reading ticket** returned to the
   browser (held in JS memory only — never localStorage/IndexedDB/cookies).

The database schema deliberately contains **no** `users`, `profiles`,
`readings`, `natal_charts`, `prompts`, or AI-output tables. A schema test
(`tests/integration/db-schema.test.ts`) fails the build if such a table ever
appears. The only persistent artifact containing reading content is the
opt-in share artifact, which is client-encrypted with a key the server never
receives (ADR 0005 / spec §20).

## Consequences

- A server restart or ticket expiry ends the reading; there is no recovery
  promise and no "temporary readings" table may be added as a shortcut.
- Logging middleware never serializes request bodies for reading, place
  search, unlock, or share routes; the logger scrubs configured key names as
  defense in depth.
- Operational persistence is limited to: settings, aggregate usage counters,
  HMAC-derived rate-limit buckets, budget state/reservations, share
  ciphertext, and schema migrations.
