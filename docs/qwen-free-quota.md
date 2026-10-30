# Singapore QwenCloud integration

The owner confirmed the Singapore Benefits dashboard on 2026-10-30: `qwen3.8-flash`, `qwen3.8-max`, `qwen-vl-ocr`, `text-embedding-v4`, `qwen3-rerank` and `qwen3.7-text-embedding` each have 1M free tokens, zero consumption at the time of that report, and Free Quota Only enabled through 29 January 2027. This is an owner-provided account confirmation, not an independently queried live balance.

## Existing production configuration

The existing `syrkaroadmap` Vercel project uses its securely configured `QWEN_API_KEY`, `QWEN_BASE_URL=https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1` and `QWEN_MODEL=qwen3.8-flash`. No key is copied into this repository or requested in chat. The old Token Plan mode/endpoint and its operator probe are retired.

`deployment-policy.ts` records the owner's confirmation only for the known existing production project ID or production hostname. It supplies non-secret free-quota verification fields, a conservative 100,000-token per-instance application reservation limit and the free-only guest opt-in. It never supplies a key or substitutes a different API base URL. Preview/local/other projects do not inherit this confirmation.

The confirmation expires conservatively at **2027-01-28 16:00 UTC**, the start of 29 January in Singapore. Reverify the benefit before extending it. Explicit environment false/disabled/zero values override policy defaults. The source record does not query or enable the vendor switch; the provider's actual Free Quota Only setting remains the hard billing guard. Reconfirm protection after account/key/model changes.

For another authorized environment, configure `AI_PROVIDER=qwen-free-quota`, a positive `QWEN_DAILY_TOKEN_LIMIT`, `QWEN_FREE_QUOTA_ONLY_VERIFIED=true`, a nonempty verification reference and a future `QWEN_FREE_QUOTA_VERIFIED_UNTIL`. Do not set these merely because free credits are displayed.

## Application behavior

- Flash handles optional CV interpretation and normal contextual learning/career explanations. CV text is sent only with explicit consent. Local extraction remains intact; up to 12 high-signal AI candidates are merged without replacing edits or deselections.
- Career discovery and prerequisite/roadmap generation remain deterministic and source-backed. AI explanations do not create occupational requirements or verified credentials.
- Max is available only through an explicit complex-transition request: at least three selected capabilities overlap and the transition is interdisciplinary or has substantial gaps. It is never a Flash failure fallback.
- Unconfigured, failed, quota-limited or invalid-schema requests preserve profile/progress and return local guidance.
- No API key, raw profile/document, request header or raw provider error is logged. Usage logs contain model/action, reservation ID, token counts and status only.

Authenticated requests use the existing dedicated Supabase quota functions when configured. The production free-only guest mode avoids requiring an account for CV interpretation: it uses a best-effort per-instance limiter (3 requests/minute, 12/day per ephemeral hashed client, and the instance token reservation cap). It is **not a durable global quota across serverless instances**. The provider's confirmed Free Quota Only guard prevents paid overflow; the app counters alone cannot guarantee zero charges. Other metered adapters never get this guest fallback. No new database or paid rate-limit service is provisioned.

## Deployment and runtime verification

The optional production prebuild probe makes one synthetic JSON request, capped at 128 output tokens. It verifies both JSON shape and the returned model. Only after Flash is verified does it attempt a tiny `text-embedding-v4` vector request and a `qwen-vl-ocr` request containing a committed, explicitly fictional SQL/Python image. No real CV or private data is used. Probe failure does not block the deterministic application build.

The generated public artifact is `/build-status/qwen.json`: commit, timestamp, execution environment, response status, schema/model verification and redacted enhancement compatibility results. It is generated during the deployment and ignored by Git. **A build-time result is not proof of deployed runtime availability or end-to-end CV understanding.** `QWEN_VERIFY_ON_DEPLOY=false` disables it. Production provider disabled/zero/unverified configuration also prevents the requests.

For a separate runtime check, `/api/diagnostics/qwen` remains closed unless the separate server-only `QWEN_DIAGNOSTICS_TOKEN` is set. Use `scripts/probe-vercel-qwen.ts --configuration` (no provider request), then model/JSON modes. No operator secret or provider key is printed. The runtime result distinguishes configuration, transport, provider HTTP, structured output and actual model metadata.

The OCR/vector investigation does not activate real-document vision OCR or build an occupational embedding index. Basic scanned CV OCR remains local English Tesseract. Rerank and the alternative embedding model are recorded as available according to the owner but are not automatically called.

## Observability limits

Codex runtime egress still reports CONNECT=403 / ORIGIN_HTTP=000 for Vercel and Qwen. Current Vercel variables/Ready SHA and live provider results cannot be independently observed from this executor. The GitHub-connected deployment can run its own probe using Production variables; report the observed result separately from local mocks. No successful live request or current remaining quota is claimed merely because code/tests pass.
