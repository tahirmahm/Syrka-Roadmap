# Syrka Roadmaps 2.0

Evidence-aware occupational discovery and branching learning roadmaps in the existing Syrka application. The core application runs without an account, database or AI key.

## Develop and validate

Node 22+ and npm:

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

Browser tests use system Chromium or Playwright Chromium. Set `PLAYWRIGHT_BASE_URL` to select a test server. Document assets are copied locally during install/build; no third-party OCR CDN is needed at runtime.

## Implemented

- Searchable catalogue of 3,039 occupations, 13,939 skills and 129,004 essential/optional occupation–skill relationships, preserving source identifiers, aliases, descriptions and hierarchies.
- Transparent capability alignment, requirement gaps, interest relationships and evidence confidence; occupational similarity is never a hiring probability or legal eligibility decision.
- Three detailed editorial curricula: AI engineering (41 topics), policy/economics (32), product strategy (31). Other occupations expose their actual ESCO requirements without invented prerequisite sequences.
- XYFlow branching explorer, prerequisites, optional learning routes, expandable groups, search, progress, topic panels, onward occupations and mobile reading mode.
- Local PDF/DOCX and pasted résumé text extraction and English browser-worker OCR for scanned PDFs, PNG and JPEG. Source quotations, editable claims and default-selected capabilities lead directly to personalized discovery after profile approval. Bulk selection persists; ambiguous matches remain inferred.
- Academic document/structured-record import, explicit outcome/assessment mappings and coursework panels. Uploaded records remain document-supported, never institutionally verified.
- Searchable capability categories, global bulk selection, multiple saved roadmaps, resource completion, private self-reported evidence notes, compact comparisons, fictional PPE demonstration, profile preferences, export/import and local deletion. New CV imports preserve prior edits and reconcile exact duplicate claims.
- Optional consented Qwen CV interpretation, Flash career guidance and selective Max reasoning, plus private Supabase workspace backup and provider-independent server AI adapters. Deterministic lessons and practice remain available without external services.

## Data provenance and limitations

The English ESCO snapshot is reproduced from `Y4SSERk/ESCO-csv2Graph` at commit `3b2d8e6a34c7f7b0da6e808518b32bb4767d41a3`. See `src/data/catalogue-manifest.json` for source hashes and coverage. It is a pinned mirror, **not a verified current official release**. Official refresh tooling is supplied; fresh official downloads were blocked by this environment's network policy. English only; multilingual indexing and O*NET ingestion are unfinished.

Curriculum prerequisites are editorial/resource-derived suggestions with provenance, not verified occupational regulations. No complete curriculum is claimed for all 3,039 occupations. Resources link to original publishers; their content is not republished.

Document limits: 8 MB, 20 PDF pages, 12-megapixel images, bounded DOCX expansion. OCR is English and browser-dependent; large/non-English asynchronous workers are not implemented. Academic review supports a course context and bulk structured import, not automatic reliable multi-course transcript reconstruction. Files remain local; accepted claims persist in browser storage. Optional cloud backup contains reviewed records, not originals.

There is no authorized live Campus or Career Passport API integration. No jobs, admission rules, salaries, accreditation, visa eligibility or institutional verification are fabricated. Opportunity actions are labelled official-source discovery links.

## Optional services

See `.env.example`. External AI requires server-side configuration, recorded free-quota protection and explicit user consent. The existing production project can use the scoped free-only guest limiter; authenticated users use dedicated Supabase quotas when available. Qwen now uses the Singapore general-purpose endpoint and requested `qwen3.8-flash` model. The old Token Plan is rejected. The owner-confirmed Singapore Benefits record is scoped to this production project and expires before the January 2027 boundary. Explicit kill switches and conservative token limits remain in effect. See [free-quota configuration](docs/qwen-free-quota.md). An operator flag alone is not independent proof of the vendor setting. Adapters are implemented and mock-tested; live API responses and deployed runtime operation remain independently unverified from the blocked Codex executor. Keys stay server-side. Default quotas are zero.

Apply the additive migrations only to an authorized dedicated Roadmaps database. SQL RLS/budget policies are tested locally; hosted migrations, catalogue table population, authentication and cloud backup are not verified. Runtime discovery uses the packaged indexed JSON catalogue.

For the CONNECT 403 investigation and protected Vercel-side probe, see [Qwen diagnostics](docs/qwen-connectivity.md).

Existing Vercel project: https://syrkaroadmap.vercel.app. See [deployment](docs/deployment.md), [architecture](docs/architecture.md), [audit](docs/v2-audit.md) and [validation](docs/validation.md). Canonical `www.syrka.co/roadmaps` routing requires a separately approved change in the domain-owning project.


## Radial discipline wheel

The normal Home / Journey entry now opens a light segmented discipline wheel on
a black stage. One selected discipline discloses a bounded preparation tree;
node details, source evidence and Today / This week reuse one contextual panel.
The full evidence graph, reviewed profile and occupational catalogue remain
underneath. Explicit expansion controls reveal further preparation without
turning progress into verified credentials.

See [radial presentation and validation](docs/radial-discipline-wheel.md) for
navigation migration, disclosure limits, test results, media and deployment
boundaries. The implementation is on `feature/radial-discipline-wheel`; no
production merge or changes to other Syrka applications are included.

## Living Career Tree and actionable Odyssey progression

The Living Tree remains the shared academic/professional map. The current
`feature/odyssey-actionable-progression` increment adds Overview/Route/Action
contexts, a Today/This week quest dock, dependency-aware focused routes, a bounded
navigation journal, reviewed source imports and functional local work surfaces.
Desktop and mobile keep the interactive RPG map; dark is the new-user default and
explicit light preferences are preserved.

Typed JSON/ICS imports retain source identity, reviewed updates, conflicts and
revocation. Work notes enter the existing explicit evidence-review flow; completing
a task never verifies mastery or a credential. A/B semester comparison uses
supplied prerequisites, credits and timetable data. The PPE catalogue remains
fictional until authorized institutional records are available.

See [actionable progression architecture](docs/odyssey-actionable-progression.md),
[inspected connector contracts and live boundaries](docs/odyssey-connectors.md) and
[final increment validation](docs/odyssey-validation.md). Earlier [Living Tree
architecture](docs/living-tree.md), [renderer/inference audit](docs/rpg-inference-audit.md)
and [baseline validation](docs/living-tree-validation.md) remain available as history.

The existing Qwen gateway and free-only guards remain. Live AI, the new feature's
Vercel Preview and hosted migration/auth synchronization require independent
verification; local fixtures and a successful build do not establish those services.
No production merge, alternate Vercel project, domain change or modification to
Campus, Workspace, Sessions or Mail is included.
