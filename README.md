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
