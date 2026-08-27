# ADR 0005 — Stateless encrypted reading ticket

**Status:** accepted (binding, from the v1 specification)

## Decision

`/api/readings/prepare` returns an opaque ticket:
`pt1.<keyId>.<b64url(iv)>.<b64url(ciphertext)>.<b64url(gcmTag)>`, AES-256-GCM
encrypted with the server-held `READING_TICKET_KEY_CURRENT`. The plaintext
carries schema version, a random reading nonce, issued/expiry instants
(default TTL 15 min, configurable 5–30), the frozen draw, capability flags,
and the compiled evidence/context required to run interpretation and one
retry. It never contains the access code, cookies, or provider keys.

The browser holds the ticket in memory only. The server persists no reading
row; replaying interpretation is bounded by the nonce-unique budget
reservation (ADR 0004). Key rotation is supported via key IDs
(`READING_TICKET_KEYS_PREVIOUS`) so active tickets survive a planned
rotation window; the session epoch handles emergency invalidation.
