# Product recovery verification

Branch: `recovery/evidence-led-career-journey`, based on the existing indigo
identity branch. No merge or production promotion. Only Roadmaps was changed;
Campus, Workspace and Sessions were not modified.

## Architecture and implemented behaviour

- Retained Next App Router, XYFlow, pinned English ESCO snapshot, PDF/DOCX/native
  text/OCR parsers, Qwen adapter, existing Supabase migrations and RLS.
- Five primary destinations: Overview, My Capabilities, Explore Careers, My
  Roadmaps and Progress. Comparison and opportunities remain secondary routes.
- Personalized overview: reviewed evidence, selected capability foundation,
  evidence-linked occupation suggestions and a resume/next-action route.
  Direct career search and CV updates remain available to returning users.
- Deterministic ranking uses skill specificity, confidence, normalized coverage,
  stated interests and short reviewed education/role/project context. Background
  context is processed inside Roadmaps, not sent to the external AI provider.
  Candidates require actual skill overlap or an interest relationship; an empty
  profile no longer receives an alphabetical list disguised as recommendations.
- Realistic / Adjacent / Aspirational are exploration bands describing source
  requirement overlap or an explicitly reported employment role, never legal
  eligibility or employment probability. A sparse skills list does not make the
  person's explicitly reported profession an aspirational role; verification and
  missing capability evidence remain separate.
  Explanations include literal supporting evidence, missing skills and uncertainty.
- Lexical candidates require support for every substantive term in the actual skill label, reducing
  false specialist matches caused by unioned alias tokens (e.g. economic data
  analysis becoming genetic-data expertise). Exact source IDs/provenance retained.
- Common French, German, Spanish, Czech and Arabic section headings recognized
  without translating or inventing capability claims. Other text stays reviewable.
- Graph engine retained with prerequisite-aware next-task selection. Topic
  overviews bring source explanations, existing evidence, practical next steps
  and completion evidence together. Checkboxes never create verified proficiency.
- `syrka.capabilities/1` read-only capability/evidence/experience projection provides
  a reusable foundation for a future Passport adapter; it does not duplicate storage
  or authorize public sharing.

## Account persistence

`/api/workspace` uses the existing dedicated Roadmaps `workspace_snapshots` and
`profiles` tables with the signed-in user's session and RLS, never a service key.
No new migration is needed; the existing Odyssey migration must be installed.
Writes and deletion require same-origin JSON requests. PUT validates the existing
workspace schema, downgrades imported issuer claims, rejects fictional demos and
uses conditional revision writes. Stale writes return 409 and preserve local work.
Revision timestamps advance at least one millisecond to prevent equal revisions.

The opt-in account panel opens/saves reviewed personal state, scopes browser
storage per account, resumes a consented account within the authenticated browser
session and handles auth transitions. Guest state is not uploaded automatically.
New account users can import their existing exported guest backup explicitly.
Sign-out attempts to flush pending edits before removing the account cache; save
failure is reported without discarding the workspace. Manual blind-upsert backup
controls were consolidated into this path. Export and explicit cloud deletion
remain available.

## Acceptance scope and limitations

The fictional fixtures cover a school student without employment, an Economics
student with academic/project experience, and a software professional exploring
new directions. They are test inputs, not real people or institutional records.
Native PDF, DOCX and pasted-text browser journeys include correction/approval,
source-backed recommendations, evidence explanation, topic resources, progress,
reload and personalized overview. Desktop/mobile runs are local production builds.

Hosted sign-in → cloud save → logout → another-device sign-in has **not** been
verified. PostgreSQL RLS and stale revision tests are real local database tests,
not proof that the hosted migration or auth configuration is ready. Do not promote
this branch until a real authorized account completes that acceptance scenario.

Live Qwen connectivity and deployed Preview inspection remain blocked by the
execution proxy (CONNECT 403, origin HTTP 000). Local provider-contract tests use
isolated fixtures. No successful production AI call or fresh vendor-doc review is
claimed. Qwen free-quota protections and no-paid-fallback policy are unchanged.

The ESCO snapshot remains English-only and is not claimed to be the latest release.
Multilingual section recognition is not multilingual semantic matching; local OCR
is English. Three detailed curricula remain available; other occupations expose
real source skills without inventing prerequisite sequences or formal qualifications.
Ranking is explainable but still needs broader expert relevance evaluation.

## Passport integration still required

An authorized identity/consent contract, versioned import/export reconciliation,
trusted institutional/employer verification, shared capability identifier/version
policy and live multi-device acceptance. No Campus integration is implemented.

## Latest verification record

- ESLint, strict TypeScript (including production build type checking), optimized
  Next production build: passed.
- 51 unit/database/provider-contract tests: passed. Includes actual local
  PostgreSQL RLS and conditional revision updates, three source-data profile
  comparisons, empty-profile handling and the specialist-mapping regression.
- Unauthenticated and cross-origin account API checks are included in browser
  acceptance; no successful hosted account session is represented by those checks.
- Final full browser results are recorded after the release run below.
- Rechecked Vercel and Singapore Qwen hosts after the branch push: both still
  CONNECT 403 / origin 000. The branch push requests the existing Git-linked
  Preview workflow but its Ready status and exact URL remain unobserved.

Existing saved profiles are not silently remapped or deleted. The stricter matcher
applies to new/reviewed suggestions; users retain control of older inferred
mappings in My Capabilities. Correcting claim text clears stale mappings and
provides an explicit suggestion-refresh action. Corrected text retains its original
source quote and produces self-reported assertions instead of claiming that the
edited wording was extracted verbatim from a document.

Final release browser run: **40 passed**, zero failed/skipped, against the final
optimized build. Includes six real parser/review/discovery/roadmap journeys
(three fictional profiles × desktop/mobile), corrected Python-to-SQL extraction,
local OCR, saved per-path progress, AI-disabled operation, provider fixtures,
accessibility scans and seven responsive widths from 320 to 1440 pixels.
Reviewed final screenshots are exported separately in the workspace gallery.
These results do not include hosted logout/login or real external AI calls.
