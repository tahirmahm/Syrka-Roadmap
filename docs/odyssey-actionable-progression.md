# Odyssey — actionable progression architecture

This increment builds on the reviewed Living Tree commit `bb699ee98cbe50d0df8a614c1c152810264c7835`, on `feature/odyssey-actionable-progression`. It preserves the existing Next.js/TypeScript/XYFlow application, occupational identifiers, document parsers, reviewed Passport projection, themes, exports and dedicated Roadmaps persistence. Public naming and routes remain unchanged. No production merge, domain change or modification to another Syrka product is part of this increment.

The product loop is **history → current commitments → concrete work → reviewed evidence → revised routes → next action**. A source task can contribute to several destinations through one canonical action and explicit graph relationships. It is not duplicated for each goal. The map and action dock are two views of this shared state, not a second person/profile system.

## One scene at three scales

The default desktop and mobile experience remains an interactive skill map. Overview shows current evidence, goals and adjacent directions. Route shows a selected destination's preparation and dependencies. Action selects a real permitted work surface or local editable draft. Explicit Overview/Route/Action controls provide the same context changes without relying on zoom gestures. The compact Today/This week dock keeps the next action visible on entry; details reuse one inspector, with a mobile peek/detail sheet.

New users default to true-black dark presentation. An explicit light preference is preserved in the existing workspace/local preference and theme cookie. Quiet presentation and reduced motion retain the relationships and actions. Motion is secondary to logical state: camera selection is bounded, obsolete camera motion can be interrupted by interaction, and no AI request is needed for expansion, collapse or navigation. No game assets, XP gates, paid unlocks or career-reset penalties are used.

### Presentation state machine and journal

`src/living/navigation.ts` defines a versioned presentation state with semantic scale, selected node, active route, expanded branches, pinned routes, camera, inspector/edge selection, preview route and focus/quiet settings. `OPEN_NODE` selects and expands without unexpectedly collapsing an already open node. `TOGGLE_BRANCH` is explicit. Closing details retains the route and progress. Back restores the preceding context and camera; Home returns to the profile/overview without erasing goals.

Meaningful transitions enter a bounded journal. Numeric camera updates do not append navigation history. Browser history entries are scoped to the mounted profile context. Persisted useful context can restore on entry, and the renderer adapts the saved camera to the current canvas size. Presentation transitions cannot mutate claims, qualifications or actual progress. Existing `LivingState.selected`, `expanded` and `view` remain readable for backward compatibility.

Visibility is a union of base context, expanded branch neighbourhoods and pinned-route preparation closures, with reference counts per canonical node. Collapsing one branch cannot remove a node still referenced by another expanded/pinned route. Detailed display is bounded to 150 nodes. Hidden branch counts, hidden formal prerequisite IDs and undisplayed formal AND/OR group members are explicitly reported rather than silently implying all requirements are visible. Group containment is presentation, not proof of a prerequisite.

### Dependency-aware route positions

`src/living/route-layout.ts` keeps overview landmarks from the existing stable constellation. Focused route placement uses typed preparation edges and declared prerequisites, detects cycles with strongly connected components, and orders preparation before its destination. Parallel preparations occupy the same semantic layer with label-aware collision separation. Shared capability IDs stay shared across goals. Stable route/destination anchors are retained where possible; there is no continuously running force simulation.

Coordinates do not create relationships, and dependency depth is not time-to-success. Formal requirements, helpful preparation, alternatives, missing/unknown evidence and hypothetical paths remain separately inspectable. Selecting an edge opens its relation, rationale and source scope. Whole-graph fit is an explicit control, not the normal response to every node selection.

## Today and This week

`src/journey/schema.ts` defines bounded actions, source metadata, deadline/event types, import proposals, connector states and workload settings. Tasks, fixed events, administration and optional preparation are distinct. Progress is planned/working/submitted/completed/cancelled; evidence reliability and practical feasibility remain separate. A past event does not prove attendance, and submitting a draft is not delivery to a source application.

`rankActions` is deterministic and exposes reasons. It first considers imminent fixed commitments, overdue mandatory work and reviewed source-reported hard deadlines; then blocking mandatory preparation, other source deadlines, required commitments, administration and optional goal preparation. User priority and supplied/estimated remaining effort are used transparently within those constraints. Prestige is not an ordering input.

The initial **30-minute imminent fixed-commitment window** is an explicit product policy, bounded/configurable in the ranking function. A class later today does not automatically hide tomorrow's mandatory assignment merely because both are relevant. Unresolved relative wording stays unresolved. Instant deadlines retain their timezone; a date-only deadline is a local calendar date, never silently midnight UTC. Supplied or estimated effort is labelled. Missing effort never becomes an invented duration or a false slack calculation. Source observations older than 14 days produce a visible freshness warning.

`planWeek` combines the next seven days' fixed events with supplied task effort, a user-editable gross available-minute budget and buffer. Overlapping fixed events are reported and their occupied time is unioned rather than double-counted. Optional working hours cap capacity; they do not book individual slots. All-day dates retain unknown occupied hours. Unknown effort, unavailable/blocked tasks, timetable conflicts and workload overflow keep feasibility uncertain or explicitly over capacity. No obligation is silently moved, and no Calendar write happens from ranking.

The primary action opens a validated permitted source/resource link or a local editable work surface in one activation. “Why this matters” selects the related graph context. Necessary administration can have no career edge; the implementation does not manufacture one to justify its visibility. If there is no imported commitment, original graph projects can become clearly optional local preparation actions.

## Reviewed integrations and source updates

The integration inbox accepts bounded typed `syrka.actions/1` JSON and static ICS, as well as manual actions. JSON review is capped at 600 KB and 150 records per proposal; persisted Journey actions are bounded at 500, with up to 50 inbox proposals. Each record carries owner/tenant, source app/record/version/observation, permissions and consent. These fields are claims in a reviewed personal copy, not proof the named institution issued it. Uploaded issuer-verification flags are downgraded.

Source identity `(owner, tenant, app, record ID)` determines a stable derived action ID. Reimporting identical source content does not duplicate the action. A newer reviewed version can update an extension/cancellation while preserving existing notes, work evidence and legitimate recorded progress. Older versions, stale observations and conflicting same-version content are refused as conflicts. Source cancellations remain visible, and revocation disables future source use without deleting existing personal notes. Connector status distinguishes demo, reviewed import, stale, revoked and disconnected states; a reviewed file is not a connected service.

ICS handles stable UID, sequence, cancellation/completion metadata, explicit timezone/date types and reviewed source URLs. Ambiguous/nonexistent DST local times are rejected for correction. Missing UIDs are not guessed by fuzzy matching. Unsupported recurrence does not become a fabricated live recurring feed; review warnings preserve the limitation. Source text is data, never executable instructions.

Deep links require known HTTPS source origins, without URL credentials, nonstandard ports, API paths or unsafe redirect parameters. Resource links use a separate known-publisher allowlist. Import never fetches arbitrary URLs. External actions require source consent and permission; an expired event, cancelled task or revoked source does not remain an actionable link.

The inspected Mail and Workspace contracts, pinned source commits and minimal owning-app prerequisites are documented in [odyssey-connectors.md](odyssey-connectors.md). The working fallback is reviewed import/export. There is no browser-token forwarding, shared service key or authorization inferred from matching email addresses. Campus retains academic authority, Mail owns delivery, Workspace Calendar owns live events and Passport owns evidence/disclosure.

A reviewed Calendar export follows the existing `syrka.calendar-action.v1` contract and `requires_review: true`. It is a proposal file for Workspace's existing import surface. Workspace must perform its separate account authorization, select a calendar and explicitly approve; Roadmaps never claims that exporting JSON created an event or received a destination acknowledgement.

## Work, evidence and corrected history

The action surface is functional local work: notes/draft and supporting work text persist immediately through the existing workspace snapshot path. Submission and completion are separate, explicit self-reports with confirmation. A checkbox does not verify a credential, mastery or external submission. Event completion requires the user's acknowledgement rather than elapsed time.

A separate **Review this work as evidence** action passes user-authored work into the existing DocumentReview extraction/mapping/correction workflow. The user reviews actual work text, original quotations and candidate mappings. Only approved claims are saved. Newly derived assertions from these work notes remain **self-reported**. A project title or a task completion toggle alone never creates a capability assertion. External Qwen processing remains separately consent-controlled.

`src/living/node-state.ts` separates progress, evidence reliability, feasibility, actual/hypothetical reality, history and eligibility. Source-backed requirement groups retain explicit AND/OR semantics and provenance. Evidence support is not formal eligibility. Self-marked topic progress and hypothetical completion cannot satisfy missing capability evidence. A current course or incomplete degree is not an awarded qualification.

Profile corrections preserve original legitimate history while invalidating stale dependent assertions and advisory links for review. Deselected/revoked mappings do not continue contributing to matching or the graph. Portable Passport records remain compatible; user corrections are not overwritten by new inferred text. Simulation and adjacent-route preview cannot edit actual work or silently adopt a goal. Discarding preview restores the prior context; adopting a goal is a separate reversible action.

## Academic comparison

The source-aware semester planner remains. A new compact A/B comparison selects illustrative course combinations and checks supplied credits/limits, term, timetable-slot conflicts, completed-course prerequisites and explicit formal AND/OR groups. Selecting a prerequisite in the same semester does not prove it was already completed. A self-checked topic cannot satisfy that course evidence.

Capability trade-offs and shared goal benefits follow supplied identifiers and typed directed relationships, never course-title keywords. Unknown availability, workload, restrictions, enrollment/transfer rules and programme-specific graduate admissions stay explicit. The comparison neither registers courses nor changes the saved plan. Credits are not converted to invented weekly hours. Fictional PPE courses remain labelled teaching examples.

## Persistence, AI and deployment boundaries

The existing version-2 workspace gains optional version-1 Journey and navigation objects. Older snapshots remain readable; there is no second Passport database and no additional new SQL migration for this increment. Existing account isolation, local snapshots, export/recovery and authorized cloud-snapshot revision checks remain in force. Local success does not establish hosted multi-device synchronization.

The prior `202611010001_living_ai_actions.sql` quota-operation migration is still required for authenticated Guide/embedding/relationship operations and remains **unapplied/unverified on hosted Supabase**. This increment does not reset databases or repair migration history by destructive replay.

The existing server-only Qwen gateway and free-only restrictions are retained. Flash interpretation/explanation, selective separately authorized Max reasoning and optional approved embeddings remain enhancements. No model is required to navigate, restore, expand, prioritize known actions or compare supplied constraints. No paid fallback, new subscription, credential copy or external profile dump was introduced. Provider configuration, response, schema-valid output and successful graph use require separate evidence.

The current runtime still reports enforced restricted networking with no active custom domains, secret bindings or runtime variables. Through the normal application environment loader, Qwen key/model/endpoint/quota-readiness flags are false and the adapter is disabled. Qwen Singapore, Vercel API and official Vercel setup-document probes fail at **CONNECT 403 with upstream HTTP 000**: this is a proxy policy denial, not proof of a provider authentication/model rejection. No live model call was made. Previously saved configuration drafts are not active runtime permissions.

The local non-secret linkage identifies the existing `syrkaroadmap` Vercel project. The Git connection and project are preserved. Live account/project inspection failed before a Preview URL or Ready status could be confirmed. Do not treat the existing production alias as this feature's verified Preview. No replacement project, production promotion or domain change is authorized or claimed. No other product's code, design, database or secrets were changed.

## Validation checkpoints and remaining evidence

An earlier development checkpoint reported **107 unit/database/provider tests passed**, and initial browser source/action workflows passed. Those are intermediate observations, not a final release count. The final expanded browser regression and latest unit/build results were still pending when this architecture note was written; [odyssey-validation.md](odyssey-validation.md) is the authoritative final result record.

Use deterministic fictional fixtures and a controllable clock to distinguish priority changes, source updates, shared visibility, real versus hypothetical state and correction invalidation. Browser acceptance must inspect the map and actual work launch, not merely count nodes or validate JSON. Action budgets, screenshots, recordings, light/dark/reduced-motion behavior, security failures and current performance measurements belong in the final report.

No physical MacBook/iOS device, mobile WebKit performance result, FPS measurement, live provider success, hosted migration readiness or enterprise reliability is claimed by this document. The synthetic 1,000-node/2,500-edge target is a test specification; its actual measured environment and results must be stated separately. Live Campus/Mail/Calendar/Sessions synchronization and verified remote opportunity data remain external integration work, not simulated successes.
