# QwenCloud prepaid Token Plan

The user supplied this Singapore Token Plan base URL:

`https://token-plan.maas.qwencloudapi.com/compatible-mode/v1`

Qwen mode accepts that exact HTTPS host and path only. It has no metered DashScope fallback and rejects redirects. The legacy `qwen` provider alias also uses Token Plan only. Other provider adapters remain separately configured and are never a Qwen fallback.

## Configuration

Set server-side secrets/settings only:

- `AI_PROVIDER=qwen-token-plan`
- `QWEN_API_KEY`: secured credential, never a client/public variable.
- `QWEN_BASE_URL`: the exact URL above.
- `QWEN_MODEL`: an included model identifier confirmed by the account console. No model is guessed or defaulted.
- `QWEN_DAILY_TOKEN_LIMIT`: positive operator-selected conservative reservation limit. Zero disables requests.

Apply `202610290002_qwen_token_plan.sql` to the authorized dedicated Roadmaps database, and set `roadmaps_private.qwen_token_settings.daily_token_limit` explicitly. This is an application quota, not the provider's remaining plan balance. Reservations account for both bounded attempts and are not refunded by reported usage. Paid-plan renewal, purchase and recharge are never activated by this code. Normal app requests still require an authenticated account and durable quota storage. Hosted configuration remains unverified.

Prepaid quotas do not require invented USD-per-token pricing. The separate existing USD budget configuration applies only to separately selected metered providers.

## Bounded operator probes

With a securely configured environment, Node 24 supports the session proxy through `NODE_USE_ENV_PROXY=1`:

```sh
NODE_USE_ENV_PROXY=1 npx tsx scripts/probe-qwen-token-plan.ts --models
NODE_USE_ENV_PROXY=1 npx tsx scripts/probe-qwen-token-plan.ts
```

The first command attempts model discovery. That route may be unsupported; a returned model list alone does not prove purchased-plan inclusion. The second sends one synthetic structured-output request with a 128-token maximum and no CV/personal data. It does not retry or change endpoints. No secret arguments, raw request/response payloads or headers are logged. The probe does not constitute an application quota-store test.

## Verification status

Local unit/database tests cover exact endpoint enforcement, no generic-key fallback, schema handling, redirect rejection, conservative token reservations, disabled quotas, exhaustion and private-table authorization. These tests use simulated provider responses.

The live endpoint returned proxy CONNECT HTTP 403 before any authenticated request. Its hostname and secret requirement were saved in the cloud environment draft, but saving a draft does not apply runtime access. The key has not been installed in source files, commits or documentation. Included model IDs, plan terms, permitted application uses, vision, embeddings, OCR, live authentication and live JSON support remain unverified. Do not claim the application is live-integrated until those checks succeed. Basic OCR continues locally without a vision API.

The latest user instruction explicitly continues deterministic application development independently of this API issue. Default-selected capabilities, persistent bulk selection and the CV-to-discovery workflow have therefore proceeded while the provider remains isolated. Live provider activation, official model/plan verification and production verification remain separate requirements. See qwen-connectivity.md for the precise failure boundary and protected Vercel-side diagnostic.
