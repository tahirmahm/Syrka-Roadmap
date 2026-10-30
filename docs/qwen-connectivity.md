> Historical investigation from 2026-10-29. The latest directive replaces the Token Plan with the Singapore general-purpose endpoint and requires verified Free Quota Only protection. Current instructions: [qwen-free-quota.md](qwen-free-quota.md). No authenticated request is authorized before that verification.

# Qwen connectivity investigation — 2026-10-29

## Observed failure boundary

Unauthenticated curl probes used the inherited Codex HTTPS proxy, verified TLS defaults and no API key. For each destination below, curl reported **CONNECT=403, ORIGIN_HTTP=000**:

- `https://token-plan.maas.qwencloudapi.com/compatible-mode/v1/models`
- `https://api.vercel.com`
- `https://syrkaroadmap.vercel.app`
- `https://www.alibabacloud.com/help/en/model-studio/`

The rejection occurs at HTTP CONNECT, before an origin HTTP response. The observed 403 therefore originates from the execution proxy, not a demonstrated Qwen gateway rejection. Runtime status confirms enforced restricted policy with no custom allowed hosts. The saved environment draft is not the enforced runtime policy. Vercel CLI account access also fails at transport; that does not establish an expired login.

Missing application variables, invalid Qwen authentication, incorrect API routes and model entitlement cannot explain this particular unauthenticated CONNECT rejection. They remain separate, untested downstream possibilities. The user-supplied URL is pinned exactly, but current official QwenCloud documentation and supported model IDs have not been independently verified. Alibaba Model Studio documentation must not be treated as proof of a separately named QwenCloud plan's entitlements. No model names are guessed.

## Required fixes and independent verification

1. Publish/apply the saved environment network rules for the Token Plan host, Vercel API/production host and relevant documentation hosts. Confirm those hosts appear in current enforced runtime policy, not only the draft.
2. Configure the key securely on the actual Vercel server as `QWEN_API_KEY`, the exact `QWEN_BASE_URL`, and an included `QWEN_MODEL`. Codex runtime currently has no configured Qwen secret binding; actual Vercel variables are unknown because its API is unreachable. Do not infer deployment configuration from local .env files or draft requirements.
3. Use the protected Vercel diagnostic below. Model discovery success is not independent proof that every returned model is included in the purchased Lite plan. Confirm plan entitlement and permitted uses in the official console/docs.
4. A JSON probe verifies one synthetic response, not real CV comprehension or the full authenticated quota workflow. Verify those separately with fictional data after activation.

## Vercel-side diagnostic

`POST /api/diagnostics/qwen?mode=models` or `mode=json` runs the outbound request in the deployed Node.js server. The exact Token Plan host is fixed. No redirects, alternate providers, arbitrary URLs or paid fallback are allowed. JSON mode sends only a synthetic 128-token-max request and makes no retry. It does not upload a CV.

The route is closed unless a server-only `QWEN_DIAGNOSTICS_TOKEN` of at least 32 characters is configured. Callers must send that separate operator token in `x-roadmaps-diagnostics`; the Qwen API key never goes into the client request. Configuration checks disclose presence booleans only to the authenticated operator. Provider errors expose only status and allowlisted error codes; no raw payload/header/credential output. Keep the operator token private and unset it when investigation is complete.

From an authorized operator machine with the same diagnostic token securely configured:

```sh
NODE_USE_ENV_PROXY=1 npx tsx scripts/probe-vercel-qwen.ts
NODE_USE_ENV_PROXY=1 npx tsx scripts/probe-vercel-qwen.ts --json
```

The response states `executionEnvironment: vercel` when executed there, and separates configuration, transport, provider HTTP and validated JSON stages. HTTP 401 suggests rejected authentication. A provider HTTP 403 alone cannot distinguish gateway policy from model/plan entitlement. Error codes must be interpreted using official documentation. HTTP 404 may mean an unsupported model-list route or model/path mismatch; it does not by itself prove an invalid base URL.

**No deployed Vercel execution result is claimed yet:** both the control-plane API and production hostname are blocked by the Codex proxy. The protected route is implemented and locally tested; a successful GitHub push or automatic deployment trigger is not proof it ran in production.

## Development independence

The application continues with native PDF/DOCX extraction, local English OCR, deterministic skill mapping, editable structured claims, default-selected capabilities, global bulk selection, persistent profile choices, deterministic career matching and personalized graph highlighting. Inferred mappings remain inferred; no upload or self-marked topic becomes a verified credential. CV updates append provenance and preserve manual edits, while exact duplicate source claims are reconciled. Fixture profiles used in tests and the demonstration are explicitly fictional.
