# Living Career Tree — correction validation

Validated locally on 1 November 2026, branch `feature/living-career-tree`, based on recovery commit `853c6aaf0a4c05b32a94a72db2276eace6b8878d`. The spatial renderer/inference correction follows implementation commit `bbd1b3d`.

## Measured checks

- ESLint, TypeScript and the optimized Next.js production build passed.
- **77 unit/database/provider-contract tests passed**. This includes spatial stability, actual disclosure expansion, education lifecycle, advisory relationship source validation, account isolation and quota operation compatibility.
- The full **49 browser scenarios passed (3.1 minutes)** against the optimized local build: PDF, DOCX, scanned PDF, PNG/JPEG OCR, review/correction, recommendation differences, broad occupational search, comparison, progress, mobile navigation, all four fictional Living demos, and CV education lifecycle persistence.
- After the final editorial-source clarification, all **nine focused browser scenarios passed again (53.5 seconds)** against the rebuilt production server.
- Browser assertions check that the default mobile/desktop scene is spatial, occupies over 85% of the viewport, and destination selection increases the disclosed canvas-node count. Virtualized DOM-node count is deliberately not mistaken for total graph size.
- WCAG A/AA automated checks in the browser suite passed for the tested views. This is not a claim of exhaustive accessibility conformance. Light/dark desktop, mobile scene, bottom sheet and expansion screenshots were manually inspected. Before/after artifacts were collected; no approved pixel-diff regression baseline is claimed.
- A **14.56-second node-expansion recording** shows consulting → MBA. Review media under `/workspace/rpg-tree-review/` contains only fictional records and a local production build.

Reproduce: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:browser`. Do not rebuild `.next` while a production browser run is using it. `tests/browser/living.spec.ts` contains the nine focused scenarios.

## Requested journeys

| Journey | Actual validation |
| --- | --- |
| PPE → Consulting → MBA | Fictional desktop/mobile browser journey: on-canvas disclosure, source scope, onward MBA, application preparation, themes, persistence and comparison. |
| PPE → Geopolitical Risk | Fictional desktop/mobile: shared academic capabilities, project preparation, isolated econometrics simulation and semester plan. Editorial direction is explicitly associated with a broader ESCO source, not declared an exact equivalent. |
| Tax Adviser → Academic Research | Fictional desktop/mobile: original experience preserved, doctoral transition, historical reading alternative, self-progress, Guide and persistence. |
| Actual user CV | **Not performed.** No private CV was supplied for this correction. A separate fictional CV checks incomplete prior study and current enrolment through extraction, review and saved profile; it is not a real-user demonstration. |
| Limited student (additional existing demo) | No invented employment, meaningful starter project, optional reading/keyboard navigation and accessibility checks. |

## Live-service and data gates

**No Qwen model was called live in this task.** Flash structured CV interpretation and relationship reasoning, selective Max Guide and optional embedding adapters are distinct from deterministic matching/pathfinding. Contract fixtures validate schemas, known IDs, exact quotes and safe fallback; they do not establish vendor availability. Reranking and external personal-document OCR remain disabled/unactivated. Local PDF/DOCX extraction and local OCR work independently.

The application's environment loader reports key, endpoint/model and quota attestation absent; the adapter is disabled. Qwen Singapore and Vercel requests return **CONNECT 403, upstream HTTP 000**, identifying execution-proxy policy denial rather than a vendor authentication/model rejection. The editable environment draft already has these domains, but the active runtime does not. The Qwen secret requirement still targets the retired Token Plan host; the draft tool rejected overwriting the conflicting existing requirement. The owner must correct that destination and enter the key securely in environment settings. No duplicate requirement or paid service was created.

Startup instructions and the expiry-variable requirement were saved successfully in the environment draft (`requires_publish: true`). This does not apply or publish it. Keep Free Quota Only and false/zero kill switches until the appropriate runtime attestation and token limit are reviewed. Production-only attestation is not used for Preview.

The existing Vercel project and repository are preserved. **The actual feature Preview URL, Ready status, deployed browser behavior and Preview Qwen responses remain unverified** because Vercel is unreachable here. No URL has been invented, and production has not been merged or promoted.

The new `202611010001_living_ai_actions.sql` quota-operation migration passed local PostgreSQL tests but **has not been applied to hosted Supabase**. Hosted auth/RLS and multi-device acceptance remain unverified. There is no new Passport database or private academic API. Official university course ingestion, live employer/admissions requirements and authorised cross-application connectors remain outstanding; ten demo courses are explicitly fictional.

Campus, Workspace, Sessions, Mail and the main Syrka site's code, design and routing were not modified.
