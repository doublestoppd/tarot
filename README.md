# Private Tarot

A private, invitation-only, browser-based esoteric tarot reading application.

One shared access code gates the whole application. A visitor prepares a
reading through structured choices (no free text), optionally provides birth
facts, triggers a cryptographically secure tarot draw, and receives one
long-form integrated interpretation. Deterministic engines — tarot draw and
pattern analysis, Western tropical astrology, Pythagorean numerology, a
provenance-tracked Hermetic correspondence graph, and a resonance/theme
compiler — produce an evidence graph; a single AI model call writes the final
prose and must cite that evidence. Personal inputs and the full calculation
context are ephemeral by construction.

The authoritative build contract is the v1 specification
(`docs/specification.md` summarises the binding constraints; architecture
decision records live in `docs/adr/`).

## Non-negotiable properties

- No accounts, no free-text reading input, no chat, no reading history.
- The card draw is CSPRNG-based and receives no user/topic/AI context.
- The AI never selects cards, calculates astrology, or invents
  correspondences; it interprets a compiled, capped evidence set and every
  paragraph must cite supplied evidence IDs.
- One model call per reading (plus at most one repair call), guarded by
  atomic application-side budget reservations.
- Personal inputs and derived context live only inside a short-lived
  encrypted reading ticket held by the browser. There is no readings table.
- Sharing is opt-in: the browser encrypts a sanitized artifact with a key the
  server never sees (URL fragment); ciphertext expires after a TTL.

## Repository layout

| Path | Contents |
| --- | --- |
| `app/` | Next.js App Router routes (gate, reading flow, share viewer, admin, static pages, API) |
| `components/` | React components (access, reading setup, tarot deck, result, transparency, share) |
| `domain/` | Pure deterministic engines: tarot, astrology, numerology, correspondences, resonance, reading-compiler, safety. **No framework, SDK, or DB imports.** |
| `lib/` | Platform adapters: auth, crypto, budget, rate-limit, openai, db, logging, config |
| `data/` | Versioned content: 78-card dataset, correspondence graph, sources manifest, spreads, intake taxonomy, seed places |
| `db/migrations/` | Hand-written SQL migrations (operational tables only) |
| `tests/` | unit, integration (real PostgreSQL), e2e (Playwright), ai-evals fixtures |
| `scripts/` | migrate/seed, access-code + admin-secret generation, place import, content validation, AI eval runner |
| `docs/` | Deployment runbook, ADRs |

## Development

```bash
npm ci
cp .env.example .env.local        # fill in secrets — see comments
npm run typecheck
npm test                          # unit tests (no database needed)
RUN_DB_TESTS=1 npm test           # + integration tests (needs DATABASE_URL or local initdb)
npm run dev
```

Bootstrap credentials:

```bash
npm run admin:generate-access-code   # prints plaintext ONCE, stores Argon2id hash
npm run admin:generate-admin-secret
```

## Production

See `docs/deployment.md` for the full DigitalOcean + Docker Compose + Caddy
runbook, and `docs/openai-setup.md` for the provider project checklist.
