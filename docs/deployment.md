# Production launch runbook — DigitalOcean + Docker Compose + Caddy

Condensed from the v1 specification Part VII, adapted to this repository.
Re-open the vendors' current documentation at deployment time — control-panel
labels, package versions, model ids, and prices change (spec Appendix E).

## 1. Topology

```
Internet → DigitalOcean Cloud Firewall (80/443 public; 22 admin-IP only)
  └─ Droplet: Ubuntu 24.04 LTS
       └─ Docker Compose (private networks)
            ├─ caddy    :80/:443 published  → automatic TLS
            ├─ web      :3000 internal only → Next.js standalone
            └─ postgres :5432 internal only → PostgreSQL 17
web ── outbound HTTPS → api.openai.com only
```

Initial sizing: ~2 vCPU / 4 GB RAM / ≥50 GB SSD. Not compute-heavy; the
margin covers builds and OS caching. On a 2 GB plan, build images off-box.

## 2. Provision (DigitalOcean)

1. Account with MFA; upload an SSH public key; never password SSH.
2. Create Droplet: Ubuntu 24.04 LTS x64, region near the invited users,
   SSH-key auth only, monitoring enabled, tag `private-tarot-prod`.
   Enable automated backups only after reading the share-ciphertext backup
   tradeoff on the Privacy page (spec §45.1).
3. Cloud Firewall (attach by tag):
   - Inbound: TCP 22 from the administrator's CIDR only; TCP 80 and 443
     from 0.0.0.0/0 and ::/0. Nothing else — not 3000, not 5432.
   - Outbound: allow all (v1), or if restricting: 443, DNS 53, NTP 123.
4. Optional cloud-init: non-root `deploy` sudo user, `ssh_pwauth: false`,
   `disable_root: true`, unattended-upgrades, fail2ban (spec §33.3 skeleton).
   Public keys only in cloud-init — never private keys or secrets.

## 3. DNS

Point an A record (and AAAA if IPv6 is enabled) for the chosen hostname at
the Droplet. Verify with `dig +short A tarot.example.com` before starting
Caddy — certificates can only issue once DNS resolves and 80/443 are open.

## 4. Harden the host

```bash
ssh deploy@DROPLET_IP
sudo apt update && sudo apt full-upgrade -y && sudo reboot
sudo sshd -T | grep -E "permitrootlogin|passwordauthentication"  # both off
sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades
```

Keep a second SSH session open whenever changing sshd config.

## 5. Install Docker (official repository)

Follow https://docs.docker.com/engine/install/ubuntu/ (spec §37 lists the
exact commands). Verify: `sudo docker run --rm hello-world` and
`sudo docker compose version`. Prefer `sudo docker` over docker-group
membership (root-equivalent) for production operations.

## 6. Deploy the application

```bash
sudo mkdir -p /opt/private-tarot && sudo chown deploy:deploy /opt/private-tarot
cd /opt/private-tarot
git clone <private-repository-url> app && cd app
cp .env.example .env.production && chmod 600 .env.production
```

Fill `.env.production`:

- `APP_DOMAIN`, `APP_ORIGIN` — the real hostname/origin.
- Generate independent secrets (`openssl rand -base64 48`) for
  `AUTH_SIGNING_SECRET`, `RATE_LIMIT_PEPPER`, `POSTGRES_PASSWORD`;
  `openssl rand -base64 32` for `READING_TICKET_KEY_CURRENT` (must decode to
  32 bytes).
- `DATABASE_URL=postgresql://tarot:<urlencoded-password>@postgres:5432/tarot`
- OpenAI settings per `docs/openai-setup.md`; verify model id and the three
  price variables against current OpenAI documentation.
- Bootstrap credentials (hashes only):
  `npm ci && npm run admin:generate-access-code && npm run admin:generate-admin-secret`
  — run locally or on the box *before* the containers exist; each prints its
  plaintext once and the `BOOTSTRAP_*_HASH` line to paste into
  `.env.production`. Store plaintexts in a password manager; distribute the
  access code out-of-band; the admin secret is never the access code.

Launch:

```bash
sudo docker compose --env-file .env.production build --pull
sudo docker compose --env-file .env.production up -d
sudo docker compose ps
```

Migrations and reference seeds apply automatically at web-container start
(`instrumentation.ts`); to manage them manually set `AUTO_MIGRATE=false` and
run `sudo docker compose exec web node scripts/db-migrate.mjs`.

Optional richer gazetteer (GeoNames, CC BY 4.0): from a checkout with dev
dependencies, `DATABASE_URL=<prod-url-via-tunnel> npm run import-places`.

## 7. Verify (spec §43–44 checklist)

```bash
curl -I https://$APP_DOMAIN/                      # 200, HSTS, noindex headers
curl -fsS https://$APP_DOMAIN/api/health          # {"status":"ok"} only
sudo docker compose logs --tail=100 caddy web postgres
sudo docker ps                                     # only caddy publishes ports
```

- Unauthorized root shows the access gate and nothing else.
- Access code absent from git, images, bundles, logs; request bodies unlogged.
- One synthetic no-birth reading: no DB row contains cards/prose
  (`docker compose exec postgres psql -U tarot -c '\dt'` — operational tables only).
- One synthetic full-birth reading; after ticket expiry nothing personal in DB/logs.
- Create a share; DB holds ciphertext/iv/metadata only; open the link in a
  fresh browser → gate → local decrypt.
- Admin: AI kill switch off → deterministic reading still served with
  reading-oriented copy; back on afterwards.
- Provider timeout drill: same cards remain; “Continue this reading” retries
  without a redraw.
- Run the concurrency budget test against staging limits
  (`RUN_DB_TESTS=1 npx vitest run tests/integration`).

## 8. Routine upgrades (spec §46)

```bash
cd /opt/private-tarot/app
git fetch --all --prune && git checkout <approved-tag>
npm ci && npm run typecheck && npm test && npm run validate-content && npm run test:ai-evals
BUILD_SHA=$(git rev-parse --short HEAD) sudo -E docker compose --env-file .env.production build --pull
sudo docker compose --env-file .env.production up -d --remove-orphans
sudo docker compose logs --tail=100 web
```

Rollback: redeploy the previous tag/image. Migrations are forward-only —
destructive schema changes require a restore plan before deploying. Model or
prompt regressions roll back through admin settings without a deploy. On a
spend anomaly: admin → disable AI first, investigate second (spec §49.1).

## 9. Backups and restore (spec §45)

Droplet backups capture config, aggregates, and share *ciphertext* — never
raw personal reading inputs, which are structurally absent from the database.
Optional logical dump:

```bash
sudo docker compose exec -T postgres pg_dump -U tarot -d tarot -Fc > tarot-$(date +%F).dump
# encrypt before moving off-host; never upload plaintext dumps
```

Restore drill (isolated Droplet): restore, rotate all secrets if compromise
is suspected, run migrations, health checks, one synthetic reading — only
then reconnect DNS.

## 10. Incidents (spec §49)

- **Spend anomaly**: admin kill switch → check aggregates and the provider
  dashboard → rotate access code / bump session epoch if leaked → rotate the
  OpenAI key if compromised → re-enable only after controls verified.
- **Host compromise**: firewall off / DNS away after preserving forensics;
  revoke the OpenAI key; rotate every secret + session epoch; rebuild from a
  trusted image; restore only operational data.
- **Provider outage**: nothing to do — deterministic readings continue; no
  retry loops exist; users see reading-oriented copy.
- **Database outage**: the app fails closed for AI and shares by design;
  never bypass budget checks to keep AI up.
