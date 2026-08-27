# OpenAI API project setup — production checklist

From the v1 specification §41–§42. The application talks to the OpenAI
**API** (billed and configured separately from any ChatGPT subscription).
Re-read the current OpenAI documentation at deployment — endpoints,
key-permission UIs, retention tables, model ids, and prices change.

## 1. Create and isolate the project

- [ ] Sign in to the OpenAI platform; confirm billing on the intended org.
- [ ] Create a dedicated project, e.g. `private-tarot-production` — never the
      default project.
- [ ] Limit membership to the operators who need production access.
- [ ] Under model usage limits, allow only the production model family
      (start: `gpt-5.6-luna`). Do not enable every expensive model.
- [ ] Set conservative project rate limits — the app's internal limits are
      stricter; the provider's are a second barrier.
- [ ] Configure spend alerts, and a hard project spend ceiling if the current
      Spend Limits controls enforce one (verify: historical "budget" UIs were
      alert-only).
- [ ] Create a project service account (preferred) or project-scoped secret
      key named `private-tarot-prod-server`; restrict key permissions to
      Responses inference if per-endpoint controls exist. No Files,
      Assistants, fine-tuning, vector stores, or admin APIs.
- [ ] Copy the secret straight into `.env.production` (`OPENAI_API_KEY`);
      it is displayed once. Never in frontend code, git, or build args.

## 2. Data controls

- [ ] Confirm the org has **not** opted into training on API data.
- [ ] Note current abuse-monitoring retention (documented as up to ~30 days
      for Responses) — the Privacy page language matches this; do not claim
      zero retention unless Zero Data Retention / Modified Abuse Monitoring
      is actually approved and configured for this project.
- [ ] The application always sends `store: false` and uses no Conversations,
      Assistants, files, tools, web search, or background mode — keep it so.

## 3. Application configuration

- [ ] `OPENAI_MODEL` — pin a snapshot id once OpenAI exposes a stable one and
      the eval suite passes on it; alias ids accept silent behavior changes.
- [ ] `OPENAI_REASONING_EFFORT=low` to start (spec §42.4).
- [ ] Verify the three price variables against the current model page —
      illustrative Aug 2026 Luna prices: $0.20/M input, $0.02/M cached input,
      $1.20/M output. They are configuration, not constants.
- [ ] Budgets: the defaults ($2 daily / $30 monthly / $0.05 per reading +
      $0.05 repair) leave a wide margin over the ~$0.003–0.004 measured cost
      of a compact deep reading; adjust from telemetry, in admin.

## 4. Connectivity smoke test (no personal data)

```bash
sudo docker compose exec web node - <<'NODE'
const OpenAI = require('openai').default || require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
(async () => {
  const r = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    store: false,
    reasoning: { effort: 'low' },
    input: 'Return only the word READY.'
  });
  console.log(r.output_text);
})();
NODE
```

Expected output: `READY`. Remove any temporary debugging that prints full
provider responses before enabling real readings.

## 5. Quality gate before enabling in production

- [ ] `RUN_REAL_EVALS=1 OPENAI_API_KEY=… npm run test:ai-evals` — the
      109-fixture suite must pass its gate (no fatal findings, ≥95% fully
      valid, swap test) against the exact model id configured.
- [ ] Only then set `AI_ENABLED=true` / enable via admin. Re-run the evals on
      every model or prompt change (`lib/openai/prompt.ts` is versioned).
- [ ] Escalating to a stronger model (e.g. Terra) is an admin configuration
      decision backed by eval comparisons — never automatic.
