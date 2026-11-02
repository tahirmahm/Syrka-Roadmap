# Radial discipline wheel — architecture and validation

Working report, 2 November 2026. Branch: `feature/radial-discipline-wheel`; starting commit: `8b95017`.
Final implementation commit: **PENDING**. Final acceptance is **PENDING** until the rebuilt browser suite and visual review finish.

## Presentation architecture

The normal Roadmaps tree entry now uses a light segmented discipline wheel on a `#000000` stage, with its inspector and secondary tools closed. Explicit saved theme choices remain respected; the implicit/new-user default is dark. Light mode uses the same navigation hierarchy.

- [`discipline-wheel.tsx`](../src/living/discipline-wheel.tsx) renders the SVG wheel, named sectors, stable arc attachments and small preparation buds. Structured ontology categories and evidence mappings determine disciplines; labels, quotations and CV prose are not classifiers. Additional disciplines use discoverable pages of at most eight sectors.
- Hover and keyboard focus have independent local preview state. They change emphasis and the centre label without selecting, expanding, persisting, hydrating evidence or requesting AI. Click, tap, Enter and Space commit selection directly.
- [`radial-projection.ts`](../src/living/radial-projection.ts) projects one discipline from the complete graph. The requested budget is 12 nodes on mobile and 16 on desktop, capped at 18. Deterministic positions and one chosen display parent keep the branch readable; each connector retains its actual typed relationship, direction and source.
- Canonical node IDs remain unchanged. Shared preparation and alternate routes remain in the graph; a display parent is presentation ownership, never a newly asserted prerequisite. The selected node can reveal relevant secondary relationships without drawing every cross-domain edge.
- Hidden formal prerequisites retain their target, source reference, AND/OR operator and group identity. The inspector reports undisplayed preparation, offers paged required-record disclosure and a full discipline outline. Display budgets do not silently discard requirements.
- [`tree.tsx`](../src/living/tree.tsx) supplies only the current bounded projection to React Flow, synchronously. The clean wheel mounts no graph nodes; old-domain nodes and invisible hit areas are excluded when changing disciplines. Mobile initial framing uses the actual projected root.
- A node opens one inspector with truthful state, explanation, preparation and an appropriate action. Source quotations, provenance and secondary controls sit behind disclosures. Today is a compact counted control whose Today/This Week view opens in that same panel area on request.
- Goal underhalos are static, selective and explained through supported relationships to stated goals. Selection rings and progress/evidence indicators remain separate. No goal or supported relevance means no invented ranking.
- [`radial-scene.css`](../src/living/radial-scene.css) reserves space for the desktop panel and uses one mobile sheet. Named keyboard controls, focus return, explicit preparation controls, an optional outline and reduced-motion styling accompany radial navigation. Visual acceptance remains pending below.

## State and compatibility

[`navigation.ts`](../src/living/navigation.ts) keeps presentation separate from factual progress: Wheel → Discipline → Node details → explicitly disclosed preparation. Selecting a node opens details; preparation has its own control. Close dismisses the panel while keeping the discipline, selection and camera. Back restores one recorded context. Wheel restores a clean overview. Related-path navigation records a return context.

Navigation stays at schema version 1. Optional `radialVersion: 1` and `domainId` distinguish the new presentation without invalidating existing workspace imports. Legacy or invalid radial contexts migrate to a clean wheel while preserving valid pins and the quiet preference. Navigation history and camera are account scoped.

Optional `LivingState.investigatedOccupations` separates previously requested career-data hydration from expansion/collapse state. Legacy investigated occupation IDs are retained when migrating presentation. No database migration is introduced by this correction.

Unsaved application-preparation fields are cached by node in the mounted, account-scoped tree workspace across Close and discipline changes. **Save preparation draft** remains the explicit persistence action for reload recovery. This cache is not a reload guarantee. Existing ActionSurface work autosave is unchanged.

Reviewed profile facts, academic lifecycle, source quotations, evidence/capability identities, typed prerequisites, comparisons, hypothetical progress, CV correction, local extraction/OCR, provider safeguards and owner isolation remain underlying capabilities. Opening a sector does not call a model. No new database, paid dependency or external connector is introduced.

## Validation record

Results below describe the available evidence, not a final pass claim. The final graph/navigation/data layers pass 130 unit/database/provider tests. Lint, TypeScript and the current production build pass. All six new radial browser cases pass; the complete 67-case regression is running.

| Check | Recorded result | Final result / evidence |
| --- | --- | --- |
| Unit suite | **130 passed**, 0 failed/skipped | Final graph/navigation/data layers; `/tmp/radial-unit-release.log` |
| Focused radial/navigation unit checks | **21 included in the full 130** (12 projection, 9 navigation) | Four-successor branches, shared collapse, latest-expansion priority, formal AND/OR disclosure and real PPE anchors |
| ESLint and TypeScript | **Pass** on current source | `/tmp/radial-lint-dimensions.log`, `/tmp/radial-type-dimensions.log` |
| Optimized production build | **Pass** | `/tmp/radial-build-dimensions.log`; local provider probe skipped outside authorized deployment scope |
| Existing browser regressions | 61 existing scenarios retained/adapted for wheel entry | **PENDING** final run |
| New radial browser acceptance | **6 passed in 32.1 seconds**, including rapid interaction | `/tmp/radial-corrected-browser.log` |
| Automated accessibility | Radial wheel/branch checks pass in both tested themes and sizes | No exhaustive conformance claim |
| Screenshot/manual visual review | Script and planned gallery prepared | **PENDING** final capture and inspection |
| Interaction recording | Required sequence scripted | **PENDING** final recording and inspection |
| Exact feature Preview rendering | Fresh Vercel access attempt blocked | **BLOCKED**, see deployment record |

The radial suite covers desktop and 390 px mobile interactions, clean black launch, light sectors, independent hover/focus, one-tap opening, theme persistence, reduced motion, bounded disclosure, exclusion of unrelated nodes/edges, explicit expansion, one panel, Close/Back/Wheel differences and unchanged evidence/progress. Known node dimensions prevent XYFlow from hiding remounted records; a single interruptible camera coordinator uses linear framing, cancels obsolete work on Close/Back/selection, and preserves the latest navigation flags. A synthetic dense profile preserves 1,000 reviewed source records beneath the presentation budget; it contains no private CV.

The existing regression suite remains part of acceptance, including extraction/OCR, review/correction, discovery, comparisons, actions, recovery and account isolation. Changing entry/navigation assertions does not waive their original functional checks.

Reproduce against one completed production build; do not rebuild `.next` while a browser run uses it:

```sh
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:browser
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 RADIAL_REVIEW_DIR=/workspace/radial-review npx tsx scripts/record-radial.mjs
```

Final browser count/duration: **PENDING**. Final tested commit: **PENDING**. Browser failure notes or accepted exceptions: **PENDING**.

## Review artifacts and limits

Planned local gallery: `/workspace/radial-review/index.html`; recording: `/workspace/radial-review/radial-interaction.webm`. Generation and review are **PENDING**. [`record-radial.mjs`](../scripts/record-radial.mjs) captures fictional before/after desktop and mobile views, both themes, node details, expansion, Today on request and reduced motion. Prior before images are copied from `/workspace/odyssey-review` where available; confirm their existence and framing during final review.

Required recorded sequence: **Wheel → hover → discipline → node → subbranch → Back → another discipline**.

Final inspected artifact paths, recording duration and any corrected visual defects: **PENDING**.

Only the text brief was available in the supplied attachments; no game-reference image files were available for direct comparison. Acceptance can assess the specified hierarchy and interactions, but cannot claim an image-by-image reference comparison. No actual user CV was supplied; fixtures are fictional equivalents.

Physical-device testing, WebKit/Safari and measured frame rate have not been performed. Browser viewport emulation does not establish those results. No new radial performance benchmark is claimed; the earlier Odyssey 92 ms measurement belongs to the prior implementation.

## Deployment record

Use only the existing Git-linked Vercel project `syrkaroadmap`. A fresh 2 November Vercel attempt returned proxy **CONNECT 403, upstream HTTP 000**; available local metadata identifies the existing project but does not establish an actual feature deployment or Preview URL.

- Exact Preview URL: **PENDING / unavailable**.
- Exact deployed commit and status: **PENDING / unverified**.
- Actual deployed-page browser and visual checks: **PENDING / unverified**.
- No paid fallback, replacement Vercel project, production promotion or merge was performed. Other Syrka applications were not changed.

Local build or test success cannot substitute for the missing exact-commit Preview verification. Live provider, hosted identity and multi-device behavior are not established by these fictional local artifacts.
