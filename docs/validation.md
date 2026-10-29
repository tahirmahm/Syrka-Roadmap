# Roadmaps 2.0 validation — 2026-10-29

Validated locally against the rebuilt production application, not merely the development server.

- ESLint and TypeScript: passed.
- Unit, PostgreSQL authorization and AI adapter tests: **32 passed**, zero failed/skipped. Database tests execute the actual migrations in PGlite with anonymous/authenticated roles. Provider tests use simulated responses; they are not live model verification.
- Production Next.js build: passed. Catalogue, discovery, learning and CV interpretation deployment traces all include the server-only catalogue JSON.
- Full serial production Chromium suite: **25 passed**, zero failures (approximately one minute).

Browser scenarios cover broad non-featured occupational discovery; AI Engineer alias disambiguation; three distinct detailed curricula; actual digitally generated PDF and DOCX extraction; actual English OCR from a synthetic scanned PDF, PNG and JPEG; source quotations and reviewed mapping; spoofed-file rejection; coursework provenance; academic outcome import; shared/distinct career comparison; persistent per-path progress without evidence verification; deterministic operation without AI; seven viewport widths (320–1440px); home/upload consent accessibility checks; and legacy storage migration with verification downgrading.

An earlier full run had 23 passes and two failures. Low upload-instruction contrast was corrected. The legacy migration test passed against the fresh production build. The final complete run passed all 25 scenarios; no prior failed/aborted run is counted as a pass.

OCR checks use clear fictional English fixtures, not a representative accuracy benchmark for arbitrary scans. Automated axe checks cover home and the upload consent dialog, not a complete accessibility certification. A desktop screenshot of the actual AI Engineer graph was inspected; source alias ambiguity now resolves to artificial intelligence engineer while preserving source alternatives.

Hosted Supabase migrations, authentication, cloud backup and live provider calls are unverified. Official-source dataset refresh, current provider terms/pricing and external live reference inspection were blocked by destination network policy. The Vercel production hostname and API also returned CONNECT HTTP 403 in this environment; no fresh deployed 2.0 verification is claimed. Canonical domain-owner routing remains a proposal and has not been changed.

## Canonical-prefix readiness

A separate build with `ROADMAP_BASE_PATH=/roadmaps` and `NEXT_PUBLIC_BASE_PATH=/roadmaps` passed. Local Chromium smoke checks passed prefixed home, discovery deep link and refresh, sign-in route, real PDF extraction, and real PNG OCR through prefixed packaged worker assets. Observed local responses in the home/PDF/deep-link run had no HTTP errors. This validates prefix compatibility locally, not a live canonical reverse proxy or hosted authentication callback.

The proposal patch passes `git apply --check` against the inspected domain-owner checkout. It remains unapplied. Domain ownership/current routing must be reconfirmed and the paired production environment/routing changes approved before activation.

## Qwen Token Plan adapter follow-up

The exact user-supplied Token Plan endpoint is enforced, with no Qwen Pay-As-You-Go fallback. A separate additive migration implements prepaid token quotas without fictitious USD pricing. All 34 unit/database tests passed; lint, TypeScript and production build passed. Two targeted production-browser regressions passed (normal PDF CV import and AI-disabled catalogue/learning). The prior full 25-test browser run belongs to the preceding application milestone; a new full-suite run is not claimed for this backend-only change.

The live endpoint is still blocked by CONNECT HTTP 403. Model inclusion and live authentication/JSON requests remain untested; mock tests are not counted as completed integration. See qwen-token-plan.md for the bounded probe and configuration prerequisites.

## Deterministic CV journey and proxy diagnosis follow-up

- Final local unit/database suite: **38 passed**, zero failed/skipped. New cases cover selection defaults, duplicate reconciliation, provider-error redaction, configuration/transport/provider stage separation and closed-by-default operator diagnostics.
- Lint, strict TypeScript and fresh production build: passed, including the new diagnostic server route.
- Final full serial browser run against the fresh production build: **26 passed**. The additional realistic fictional multidisciplinary CV scenario verifies automatic capability selection, global deselect/select, direct personalized discovery, named matching/gap explanations, profile persistence, selected roadmap claims, progress persistence and global occupation search. Existing PDF/DOCX/OCR, coursework, comparison, mobile and accessibility scenarios remain in the suite.
- An earlier run included an outdated expectation that every automatically selected mapping was document-supported; ambiguous suggestions now correctly remain inferred. That expectation was corrected. An overlapping-build run is not counted as a clean result; the final complete run used the finished production build.
- No Vercel-side live probe or official QwenCloud plan/model verification is claimed. Captured transport evidence is CONNECT=403 with ORIGIN_HTTP=000 for Qwen, Vercel API/production host and documentation. This proves the observed rejection is from the Codex execution proxy, before an origin response. The deployed diagnostic is prepared for execution once access/configuration are available; its local tests are simulated provider cases, not live Qwen tests.
