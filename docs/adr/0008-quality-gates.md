# ADR 0008 — v1 quality gates: strict TypeScript, deterministic tests, content validation

**Status:** accepted

## Decision

The v1 merge gate is: `tsc --noEmit` under `strict` +
`noUncheckedIndexedAccess`, the Vitest unit suite, the PostgreSQL-backed
integration suite (spins up a disposable local cluster when no
`DATABASE_URL` is provided), `scripts/validate-content.ts` (referential
integrity of the card/correspondence/source graph), and the Playwright smoke
suite where a browser is available. ESLint is deliberately deferred: with
strict TypeScript, schema-validated boundaries, and an architecture test
enforcing the layering rule (§26.1), a linter adds style enforcement but no
additional safety in v1; it can be added without restructuring.

Local integration tests run on PostgreSQL 16 (the environment's system
packages); production pins the `postgres:17-alpine` image. No SQL feature
used here differs between the two; the deploy runbook's migration step runs
against 17 before launch.
