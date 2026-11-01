# Living Career Tree — validation and remaining gates

Validated locally on 1 November 2026, branch `feature/living-career-tree`, based on recovery commit `853c6aaf0a4c05b32a94a72db2276eace6b8878d`. Implementation commits: `18b2c29` and `288c963`.

## Results

- ESLint, TypeScript and the optimized Next.js production build passed.
- All **71 unit, database-policy and provider-contract tests passed**.
- All **48 browser scenarios passed** against the local production server. A second full run also passed (4.3 minutes).
- Browser coverage includes desktop and mobile fictional PPE consulting/MBA, risk and semester simulation, professional lifetime history, and limited-experience journeys; existing CV/document extraction, correction, discovery, comparison and self-progress workflows remain covered.
- The graph benchmark with 40 occupation goals produced **813 nodes and 993 edges in 3,666 ms** in the shared test process. Initial progressive disclosure shows fewer than 25 nodes. This is not a hosted performance or frame-rate measurement.

Reproduce with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and the repository's Playwright production-server configuration (`tests/browser/living.spec.ts` contains the four demonstration journeys). Browser artifacts were collected separately from source, under `/workspace/living-tree-review/` in the implementation workspace.

## What is implemented and what is not verified live

| Area | Status and boundary |
| --- | --- |
| Living graph | Implemented: shared capability identifiers, progressive expansion, search, goal planning, prerequisite traversal, source-backed vs advisory edges, history, comparison and continuation into actual ESCO occupations. |
| Academic planning | Implemented catalogue schema/import, explicit personal-course links, supplied prerequisites, credits, declared degree priorities and schedule-slot conflicts. Ten course records are explicitly fictional. No official Charles University catalogue was fetched successfully; current offerings, exact eligibility and transfer rules require authoritative data. |
| Quests and simulation | Implemented reusable original projects, self-progress and notes, semester planning and isolated hypothetical completion. A checkbox never verifies a credential or establishes unsupported capability mastery. |
| Persistence | Existing workspace snapshot and authorization architecture retained, with optional versioned Living state. Guest persistence and mocked authenticated flows are covered locally. No new SQL migration is required or applied. Hosted Supabase authorization and cross-device persistence were not newly verified. |
| Guide and AI | Source-grounded deterministic fallback works without AI. Flash/Max structured-output and optional embedding adapters are tested with transport fixtures. **No Qwen model was tested live in this task.** Existing free-quota guards remain; paid fallback is not enabled. Preview cannot inherit production-only quota attestation. |
| Embedding/reranking/OCR | Optional `text-embedding-v4` has bounded public-label retrieval and explicit free-quota gating. `qwen3-rerank` remains disabled pending official endpoint/entitlement verification. Existing local document OCR remains; external Qwen OCR is not activated. |
| Applications | Local preparation drafts, reviewed source URL/date, selected claims, checklist and export implemented. No application is submitted and no live vacancy/admission rule is asserted. |
| External integrations | Campus, Passport, employer and admissions connectors remain manual/not connected where no authorized interface exists. No invented institutional verification. |
| Deployment | Branch pushed to the existing GitHub repository. Existing Vercel project retained. Preview URL and Ready state **not verified**: Vercel requests failed at the execution proxy (CONNECT 403); CLI inspection returned `fetch failed`. No production promotion or routing change. |

## Evidence boundaries

Four demos are explicitly fictional. University course codes are not invented. Official resource and employer/university URLs are discovery references, not evidence of current requirements. Inferred mappings remain distinct from reported or document-supported claims. The historical bridge preserves original saved pathways and exposes up to 500 legacy completed milestones, with a truncation notice when needed; it never invents missing completion dates.

Private graph data is not stored in public catalogue caches. Account changes remount the tree; demo backups are account-scoped and cleared on logout. AI context excludes raw names, grades and source quotations by default; external processing remains consent-controlled.

Campus, Workspace, Sessions, Mail and the main Syrka site's code/routing were not modified. Production has not been merged or promoted. Hosted deployment, live Qwen responses, real university ingestion and authenticated multi-device verification remain acceptance gates.
