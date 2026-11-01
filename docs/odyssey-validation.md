# Actionable Odyssey: validation and delivery record

Verified locally on **1 November 2026**, on `feature/odyssey-actionable-progression`. The product-code head tested is **`f0fb5986b5840f2170746a752d4713951b0db07e`**, based on the inspected Living Tree head `bb699ee98cbe50d0df8a614c1c152810264c7835`. Later commits containing this report change documentation only. The branch is pushed to the existing `tahirmahm/Syrka-Roadmap` repository; no production merge or deployment promotion was performed.

## Working journey

- One Overview / Route / Action scene, typed dependency layout, shared canonical nodes, pins, explicit expansion/collapse, edge provenance, scoped browser Back and restored viewport/inspector context.
- Today / This week dock with a visible next action, transparent deadline/commitment ordering, actionable dependency alternatives, local draft editor, workload limits and conflicts.
- Explicit work → extraction → correction/mapping → approval → self-reported capability support. A task checkbox, submitted draft or elapsed class never issues a credential.
- Consent/reviewed `syrka.actions/1` JSON and static ICS imports, source-identity deduplication, extensions, same-version conflicts, cancellation and revocation. Manual tasks and explicit graph associations work without a connector or AI.
- Alternative-route preview and hypothetical simulation remain separate from actual evidence/adopted goals. Semester A/B comparison checks supplied credits, slots and evidenced completed-course prerequisites, including formal AND/OR groups, without enrolling anyone.
- True-black default for new users; explicit light preference, quiet/reduced-motion controls, touch controls, mobile bottom sheet and the accessible reading alternative remain available.

The packaged occupational snapshot remains **3,039 occupations / 13,939 skills / 129,004 occupation–skill relationships**, English only, pinned mirror version `esco-english-mirror-3b2d8e6a34c7`. This increment did not refresh ESCO or claim a current official release. Existing PDF/DOCX extraction and local English OCR are preserved and browser-tested; no remote OCR service was activated.

Source/connector scope and the exact inspected Mail, Workspace and legacy commits are in [odyssey-connectors.md](odyssey-connectors.md). Architecture and state boundaries are in [odyssey-actionable-progression.md](odyssey-actionable-progression.md).

## Commands and results

| Check | Actual result and scope |
| --- | --- |
| `npm run lint` | Pass on final product code |
| `npm run typecheck` | Pass on final product code |
| `npm test` | **109 passed, 0 failed, 0 skipped**; deterministic models, parser/provider contracts and local PGlite database/RLS tests |
| `npm run build` | Pass, optimized Next.js 16.4.3 webpack production build; local Qwen deployment probe skipped outside its authorized scope |
| Full `npx playwright test` | **61 passed in 4.3 minutes**, Chromium, code `94cb13f`; includes all pre-existing scenarios plus Odyssey and deferred-import cancellation |
| Final prerequisite guard | After adding the one-line course-evidence requirement in `f0fb598`, **22 focused unit tests passed**, followed by the full **109-test suite**, lint/type/build and **3 planner browser regressions passed in 18.2 seconds** on that final build |
| Isolated synthetic browser benchmark | **1 passed in 8.1 seconds**, final build; metrics and limits below |
| Fictional browser recording | Completed against final production build; WebM duration **34.36 seconds** |
| `git diff --check` | Pass |

The full 61-scenario suite was not repeated after the final isolated course-evidence guard; the affected planner scenarios were rerun instead. Browser tests ran against the optimized local production server, not Vercel. There were no retries hiding a failing scenario.

### End-to-end coverage

| Scenario | Evidence actually exercised |
| --- | --- |
| A: Today to work to evidence | At 390px and 1440px, imminent fictional essay visible on entry; one activation opens editable work; notes/progress restore on reload; explicit evidence review retains quoted text and creates only self-reported mappings; no AI call without consent |
| Source update | Reviewed extension changes priority; duplicate import does not multiply tasks; conflicting same-version change preserves accepted deadline |
| B: Shared route and Back | Consulting → Statistics; pin/collapse with shared-node retention; browser Back and toolbar Back restore selection/zoom; reading alternative retains the shared capability |
| C: Adjacent direction | Geopolitical-risk preview and OSINT simulation discarded without altering actual person, goals or progress |
| D: Semester | Credit/timetable/prerequisite comparison and impossible weekly capacity; saved plan unchanged; both mobile/desktop interdisciplinary planner regressions pass |
| E/F: History and correction | Existing mobile/desktop tax-to-research and sparse-student journeys; reviewed incomplete-study chronology; stale-claim/advisory invalidation and self-completion versus evidence tests |
| G: Failure and permission | Wrong-owner import, revoked source, stale/conflicting update, expired action, duplicate approvals, safe URL checks, proposal-only Calendar export, unscoped/foreign navigation history, deferred file-read cancellation; existing simulated provider outage/timeout/quota/injection contract tests |
| Document → profile → careers → graph | Normal PDF, DOCX, scanned PDF, PNG and JPEG OCR, reviewed quotations, bulk capability selection persistence, distinct fictional-profile recommendations, non-featured occupation and deterministic roadmap browsing |
| Responsive/accessibility | Chromium at mobile/tablet/desktop widths in the existing regression suite; dark/light/reduced motion, keyboard/reading navigation, selected-node visibility after desktop→mobile reload; existing axe checks are limited to their tested home/consent surfaces |

No full-app accessibility certification, hosted account-switch browser test, real-mailbox failure, real Calendar outage, or physical touch/keyboard-device study is implied by these fixtures. Offline/cloud-save code retains local work and explicit errors, but real offline multi-device synchronization was not tested.

### Interaction budgets

After workspace loading and required consent:

| Task | Observed / implemented interaction |
| --- | --- |
| Know next action | **0**: next action and reason visible on initial fictional Journey at both tested widths |
| Open that work | **1** dock activation opens editable action surface; browser-asserted |
| Understand contribution | **1** “Why this matters” activation opens its related graph context; retained context uses the same inspector |
| Inspect visible goal / child | **1** goal selection expands/inspects; **1 further** child selection reuses inspector. Search through tools requires additional deliberate navigation |
| Return | **1** close/Back activation; route and drafts preserved; browser Back/zoom restoration asserted |
| Preview alternate route | **1** “Try this route” from the inspected destination; adopting the goal is separate. Finding an offscreen destination can require search/pan |
| Approve imported plan | Explicit consent → review → accept; exporting a Calendar proposal creates no event |

These are task-flow observations, not a claim that every node on a large offscreen graph is one click away. Authentication at an external destination remains outside the budget.

## Security and persistence

New data is optional/versioned inside the existing workspace snapshot: Journey v1 and navigation v1, with backward-compatible old snapshots and `syrka.capabilities/1` projection. Limits include 500 actions, 50 inbox proposals, 150 records / 600 KB per JSON review, 30 navigation history entries, 100 saved anchors and 150 disclosed detailed graph nodes. Extra graph requirements and AND/OR members remain explicitly counted.

Work completion and imported issuer flags cannot grant verified credentials. Deselected/revoked/corrected claims stop driving current matching without deleting legitimate original history. Simulation cannot update actual work. Exact source identity controls deduplication; user text and AI output cannot add arbitrary ontology IDs or execute tools.

The isolation pass added owner-generation/mounted checks around asynchronous file reads, restores, cloud loads/saves and deletion. PUT/DELETE `/api/workspace` require `X-Roadmaps-Owner` to match the authenticated owner before any database mutation, in addition to same-origin and existing RLS. GET checks that header when supplied. A delayed account-A operation cannot be authorized as B after cookies switch. Old clients without the mutation header fail closed and must reload. Local reset pauses cloud sync and switches to guest; it does not silently delete retained hosted data.

Those guards have local unit/browser regression coverage. Hosted login/logout, real multi-device concurrency and applied Supabase policies remain independently unverified. **No new SQL migration is needed for this increment.** The earlier `202611010001_living_ai_actions.sql` remains relevant to authenticated AI quota operations; its hosted applied status is unknown. No hosted migration, remote database reset or destructive replay was performed.

## Performance observation

One isolated run after other tests and recording stopped:

| Measurement | Result |
| --- | --- |
| Input fixture | 1,000 nodes / 2,500 edges, explicitly synthetic |
| Detailed display | 150 disclosed; 850 additional nodes explicitly indicated; virtualization can render fewer DOM nodes |
| Pointerdown → semantic-scale DOM mutation | **92 ms**; one sample meets the initial <100 ms acknowledgement target |
| Observed long tasks | **221, 110, 68, 51 ms** during selection/closing/pan/screenshot observation window |
| Automated 10-move pan sequence | **551.37 ms**, including Playwright/protocol overhead; not pan input latency |
| Browser/system | Chromium **154.0.8037.57**, Node **24.19.0**, Debian 13 Linux x86_64; container quota 4 CPUs and 32 GiB memory limit |

The mutation metric does not measure first painted feedback. The broad regression guard is <1,000 ms; the product target is <100 ms. One run establishes neither percentiles nor an FPS/smoothness guarantee. Long tasks remain a performance limitation. No physical MacBook Air, iPhone/mobile WebKit or dedicated-hardware benchmark was available. The Chromium trace is preserved for further analysis.

## Review artifacts

Session artifacts are in `/workspace/odyssey-review/` (not committed binaries):

- `index.html`: before/after gallery with entry, expansion/collapse, task work, comparison, source update, light, mobile and reduced-motion screenshots.
- `journey-demonstration.webm`: native fictional walkthrough, 34.36 seconds.
- `performance/interaction-measurements.json`, `synthetic-interaction-trace.zip` and `synthetic-1000-2500.png`.
- `logs/`: lint, type, unit, build, full-browser, final-planner and isolated-performance output.

Screenshots were opened and inspected, including desktop dark/light, focused route, source update and mobile work. All use fictional records. Before/after captures are qualitative, with different selected contexts; no automated pixel-diff baseline is claimed. `scripts/record-odyssey.mjs` reproduces the recording with a fixed fictional clock; use `PLAYWRIGHT_BASE_URL` and `ODYSSEY_REVIEW_DIR` to select a production test server/output.

## Live services, Preview and remaining handoff

**Verified feature Preview URL: unavailable. Ready state and deployed source SHA: unverified.** Local non-secret metadata points to the existing `syrkaroadmap` Vercel project (`prj_7RnAY2LwbsfkZetzVK93UkLq2gLQ`, team `team_CJj6imlFipQW3TOh0ELwvXs1`). Its existing production alias `https://syrkaroadmap.vercel.app` is not this feature's Preview. A GitHub commit-page inspection exposed no Vercel URL. No duplicate project, production promotion, main merge or domain rewrite was performed.

Fresh managed runtime observations report enforced restricted network access, no custom Qwen/Vercel hosts, no ready secret bindings and no runtime variables. Normal application loading reports Qwen key/model/endpoint/free-quota readiness false and the adapter disabled. Credential-free probes failed at **execution-proxy CONNECT 403 / upstream HTTP 000**; Vercel CLI account inspection failed before project/deployment verification. This is not a Qwen API-gateway, credential or model-entitlement response. The requested official Vercel setup document could not be fetched through this policy.

**Live provider calls made in this increment: zero.** Provider schema, timeout, quota, prompt-injection and disabled-mode behavior are mock/deterministic tests. The existing server-only Flash/Max adapter and free-only protections remain; no paid fallback, new subscription or copied key was introduced. No independent current vendor entitlement or quota balance is claimed.

To finish the external verification in one pass:

1. Inspect the saved cloud network/configuration draft for Qwen Singapore and `api.vercel.com`; add `vercel.com` and the exact observed Preview hostname if absent, then publish/apply it. Do not assume an unknown Preview host is already allowed. Rebind the existing Qwen secret requirement to the current Singapore host if the saved requirement still targets the retired Token Plan host; do not request/paste a second key.
2. In the existing Vercel project, inspect the Git-linked deployment for this branch/commit first. Reuse it; if none exists, create a Git-source **Preview**, then confirm team/project/branch/SHA/Ready and record its actual URL.
3. Inspect Preview-scoped service configuration and dedicated Roadmaps migration history without copying production-only attestations or another app's credentials. Preview/local do not inherit the production free-quota confirmation. Activate AI only with verified Free Quota Only protection and the separately authorized Preview verification fields described in [qwen-free-quota.md](qwen-free-quota.md).
4. From that Vercel server, run configuration-only diagnostics, then a bounded consented synthetic Flash/schema check and the CV → approved capabilities → recommendations → roadmap flow. Verify hosted auth/save/isolation separately before claiming multi-device sync. No paid fallback is permitted.

Automatic live Campus/Mail/Sessions/Calendar synchronization, native Mail-proposal ingestion, real opportunity/admissions verification, non-English/background OCR, refreshed official/multilingual ontology data, physical-device/WebKit performance and verified feature deployment remain unfinished or unverified. The reviewed-import/deterministic core is working despite those boundaries.

**Campus, Workspace, Mail and Sessions code, styles, databases, routing and secrets were not modified.**
