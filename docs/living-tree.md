# Syrka Roadmaps — Living Career Tree

Feature branch: `feature/living-career-tree`; baseline recovery commit
`853c6aaf0a4c05b32a94a72db2276eace6b8878d`. No production promotion.

## Implemented architecture

`src/living/schema.ts` defines typed/versioned nodes, formal-versus-advisory edge
semantics and the optional `Workspace.living` extension. Existing workspace version
2 and `syrka.capabilities/1` remain supported. Personal assertions, courses and claims
are projected, not copied into a second Passport database. Graph nodes and edges
retain provenance, quality, sources, versions and unknown verification dates.

`engine.ts` builds a many-goal graph from the pinned ESCO catalogue and reviewed
Passport projection. Shared capability IDs are reused by multiple courses/projects/
occupations. Source requirements remain separate from legal/employer/admissions
eligibility. Reverse planning follows preparation/dependency relationships, detects
cycles, and treats application-support/alternative edges as distinct from mandatory
requirements. Hypothetical preparation never modifies actual records or progress.

The default interface is the Living Career Tree. Existing career discovery, CV
review, evidence editing, detailed occupational learning roadmaps and recovery
Overview remain accessible. The XYFlow surface supports stable incremental layout,
pan/zoom, focus, search, nested expansion/collapse, breadcrumbs, minimap and filtering.
Desktop and mobile default to the interactive radial constellation, including history.
The fixed-column renderer has been replaced by original circular/hexagonal icon nodes,
curved shared connections and compact HUD overlays. Chronological reading is optional. Both light and dark themes use
centralized tokens, a persistent header toggle, local preference and a server-read
cookie to avoid whole-page theme flashing. Account snapshots can sync the preference.

The inspector shows source scope, evidence quotes, historical dates, relationships,
project deliverables, completion criteria, resource links and contextual Guide
navigation. Quests are self-reported records, never credentials. Goals do not spend
points or erase historical evidence. Multiple goals share preparation; comparison
shows overlap and unverified formal requirements.

## Academic model and honest data boundaries

The academic profile records institution, faculty, degree/programme, specialisation,
year/term, credit limit and user-supplied remaining requirements. Reviewed course
records support optional grades/credits. Explicit links can associate personal
course records with catalogue records; titles alone do not establish equivalence.

`catalogue.ts` is an extensible structured-file adapter. It validates bounded
`syrka.courses/1` JSON, stable
identifiers, source HTTPS links, duplicate IDs, prerequisite closure and cycles.
Imported references remain document-supported, not issuer verified. Server-side
graph construction rejects unknown ontology skill IDs. The example download at
`/fixtures/ppe-catalogue.example.json` is explicitly fictional.

The semester planner combines goal coverage with user-supplied degree priorities,
prior prerequisite completion, known credits, credit limits, supplied term and
schedule-slot conflicts. Unknown timetable/availability/enrolment/transfer rules
remain explicit. It is a proposed combination, not confirmed registration. The
planner cannot infer unpublished institutional degree rules or credit equivalence.

Charles University SIS retrieval was blocked by proxy CONNECT 403 / origin 000.
Consequently the PPE course catalogue is a teaching fixture, not a claim about
actual offerings, course codes, published credits or enrolment permissions. All
employer/graduate nodes are exploration targets with official discovery links and
unknown current eligibility/availability. McKinsey → MBA is application support,
never an HBS admission requirement or sufficient condition. No live vacancy,
deadline, fee, salary or admissions rule was invented.

## Four working fictional demonstrations

Use **Explore another destination or demonstration** on the main screen:

1. PPE → Consulting → MBA: expand McKinsey Business Analyst, inspect shared
   analytical/project preparation and the MBA application-support relationship.
2. PPE → Geopolitical Risk: reuse statistics/economics/politics; explore OSINT and
   a sourced risk-brief project, semester choices and econometrics simulation.
3. Tax adviser → Academic Research: preserve the accounting/tax history and its
   dates, investigate methodology/writing/research fit and actual degree rules.
   No forced second undergraduate programme is asserted.
4. Student · limited experience: no fabricated employment or internships; a small
   reported foundation, beginner project and unverified future directions.

These are fictional test profiles. Loading one preserves any existing personal
workspace in a backup scoped to its current storage namespace. The tree remounts
when the account workspace changes, preventing stale private graph content from
being shown across account scopes. Guest records are device-local and are never
silently uploaded to an account. Export/deletion and account conflict checks remain.

## Syrka Guide and optional models

The existing server-only Qwen gateway is reused, including conservative budgets,
rate limits, timeout handling, JSON schema validation and no paid fallback. Guide
uses selected-node context and permitted neighbouring graph IDs. Personal names,
grades and literal source quotations are excluded from automatic provider context.
Questions are explicit user input; the consent checkbox states what is transmitted.
Structured links/actions must reference known supplied graph nodes; Guide never
mutates evidence. Successful responses have bounded TTL caching and deduplication;
concurrency is capped. Without consent/configuration, local guidance still works.

Flash handles ordinary assistance. Max is explicit complex/multi-goal reasoning,
not an error fallback. Outside the known production context it additionally requires
`QWEN_COMPLEX_MODEL_FREE_VERIFIED=true`. Preview never inherits production's owner
attestation. Existing free-only verification, reference, expiry, endpoint/key/model
and conservative token limits must all be configured independently before real
Preview requests. These application flags do not enable or replace vendor billing
protection; the vendor Free Quota Only switch and entitlement require confirmation.

Optional public-label embedding retrieval uses `text-embedding-v4` only with
`QWEN_EMBEDDING_FREE_VERIFIED=true`, the exact model and all existing free-only
configuration guards. Requests are bounded, budget-reserved, schema-validated and
never transmit whole CVs. Semantic proximity only retrieves candidates; it creates
no qualifications, formal requirements or evidence. Contract tests use fixtures.

`qwen3-rerank` is deliberately disabled: its current native regional API format and
specific entitlement could not be verified. No chat-compatible rerank endpoint was
invented. `qwen-vl-ocr` remains the existing synthetic investigation adapter; live
personal-document vision is not enabled. Native PDF/DOCX and local English OCR stay
default. No model has been verified live during this feature task.

## Persistence and database status

The additive living state needs no new table. The quota action-name correction in
`202611010001_living_ai_actions.sql` is required for authenticated Guide, embedding and
relationship inference; it has been tested locally but not applied to hosted Supabase.
The living state is validated by the existing version-2 schema and saved through the existing dedicated Roadmaps
`workspace_snapshots` RLS/revision path. Historic records remain intact. Existing
hosted migration/auth readiness and real multi-device account acceptance remain
unverified; local PostgreSQL tests are not a claim about the hosted database.

Campus, Workspace, Sessions, Mail and the primary website were not modified.

## Reproducible demonstration

Run `npm run build`, start with `npm run start -- --port 3000`, then:

```
npx playwright test tests/browser/living.spec.ts
```

The nine desktop/mobile and CV-lifecycle flagship tests exercise real graph APIs and local Guide,
with screenshots written to Playwright output directories. The full browser suite
also exercises existing CV/PDF/DOCX/scanned-document workflows. Provider contract
fixtures are explicitly separate from real external inference.

Release results and exact deployment limitations are recorded in
`living-tree-validation.md`. Preview URL must be observed from the existing Vercel
project, not guessed from a branch name. No production merge/promotion is authorised.

Application targets also have a private preparation draft: official-source URL,
user-recorded source review date (not institutional verification), chosen Passport
record IDs, a review checklist and notes. Drafts persist and can be exported. There
is no automatic application or submission control. Reported course grades/credits
can be supplied during reviewed academic imports; their provenance is retained.

## Final trust and history refinements

The tree bridges existing completed pathway milestones into lifetime history without modifying their original records or inventing missing completion dates. The bridge is bounded to 500 historical milestones with an explicit notice; full originals remain saved. Living goals and quest progress also appear in My Roadmaps and Progress.

An inferred-only capability uses an inferred status and advisory relationship rather than `DEMONSTRATES`. Self-completion does not satisfy capability evidence in reverse planning. Personal record provenance is kept separate from ESCO taxonomy provenance. Related ESCO occupation nodes can themselves expand into requirements and further shared-skill continuations.

See [validation and remaining gates](living-tree-validation.md) for measured test results and the explicit distinction between local implementation and live external verification.

The RPG renderer and résumé/relationship changes are audited in [rpg-inference-audit.md](rpg-inference-audit.md). Editorial directions explicitly distinguish their broader ESCO references from exact occupational equivalence.
