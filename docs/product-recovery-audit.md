# Product recovery audit — 31 October 2026

Inspected the existing feature branch, routes, parsers, matching algorithm, graph,
AI adapter, auth UI, persistence and dedicated Roadmaps migrations before edits.

## Root causes

1. Discovery sorts raw overlap counts, favouring long requirement lists and
   common transferable skills. Zero-evidence candidates remain alphabetically
   ranked. Interest matching is a substring test rather than a qualification rule.
2. The sign-in form authenticates but explicitly reports that cloud sync is not
   enabled. A secondary manual backup panel does read/write the RLS-protected
   `workspace_snapshots` table, but uses blind upserts and does not provide
   continuous sync, conflict protection or account-scoped browser isolation.
   The initial verbal audit overlooked that secondary control; this corrects it.
3. Seven primary items and a generic entry dashboard obscure the five-step
   capability-to-career journey. Saved users see entry options before next actions.
4. Deterministic document sections recognise English headings only. A document
   may extract correctly but remain categorised as miscellaneous. Skills are
   English ESCO candidates, not multilingual semantic mapping.
5. Three detailed curricula work; remaining occupations have actual ESCO
   requirements without fabricated dependencies. Six topic tabs work, but the
   first view does not bring supporting evidence and an actionable task together.

## Working foundations retained

Bounded PDF/DOCX parsing, native-text-first OCR, reviewed claims with literal
quotes, evidence verification distinctions, English ESCO snapshot (3,039
occupations / 13,939 skills), interactive graph, resource tracking, deterministic
AI-free fallbacks and Qwen free-only guards. Previous release passed 46 unit and
32 browser checks; those are regression evidence, not live hosted acceptance.

## Blocked / incomplete before implementation

Deployed interface fetch: proxy CONNECT 403, origin HTTP 000. No claim that the
provider itself rejected authentication. No live Qwen response or hosted database
contents inspected. No actual account credentials provided for hosted multi-device
acceptance. Existing SQL enforces ownership in local PostgreSQL tests; hosted
migration state is unknown. Campus/Workspace/Sessions are outside scope.

## Recovery approach

Retain Next/XYFlow/Supabase and current versioned evidence schema. Introduce
specificity- and confidence-weighted ranking with normalized coverage, explicit
three-category exploration, an evidence-led overview, five primary destinations,
reviewable multilingual section extraction and authenticated opt-in snapshots
with conflict protection. Add three fictional acceptance profiles and keep live,
fixture, local and blocked results separate. No production promotion.
