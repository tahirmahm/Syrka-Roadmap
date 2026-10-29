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
- Local PDF/DOCX text extraction and English browser-worker OCR for scanned PDFs, PNG and JPEG. Source quotations, editable claims, explicit mapping confirmation and profile approval precede evidence creation.
- Academic document/structured-record import, explicit outcome/assessment mappings and coursework panels. Uploaded records remain document-supported, never institutionally verified.
- Multiple saved roadmaps, compact comparisons, fictional PPE demonstration, profile preferences, export/import and local deletion.
- Optional consented Supabase workspace backup and provider-independent server AI adapters. Deterministic lessons and practice remain available without external services.

## Data provenance and limitations

The English ESCO snapshot is reproduced from `Y4SSERk/ESCO-csv2Graph` at commit `3b2d8e6a34c7f7b0da6e808518b32bb4767d41a3`. See `src/data/catalogue-manifest.json` for source hashes and coverage. It is a pinned mirror, **not a verified current official release**. Official refresh tooling is supplied; fresh official downloads were blocked by this environment's network policy. English only; multilingual indexing and O*NET ingestion are unfinished.

Curriculum prerequisites are editorial/resource-derived suggestions with provenance, not verified occupational regulations. No complete curriculum is claimed for all 3,039 occupations. Resources link to original publishers; their content is not republished.

Document limits: 8 MB, 20 PDF pages, 12-megapixel images, bounded DOCX expansion. OCR is English and browser-dependent; large/non-English asynchronous workers are not implemented. Academic review supports a course context and bulk structured import, not automatic reliable multi-course transcript reconstruction. Files remain local; accepted claims persist in browser storage. Optional cloud backup contains reviewed records, not originals.

There is no authorized live Campus or Career Passport API integration. No jobs, admission rules, salaries, accreditation, visa eligibility or institutional verification are fabricated. Opportunity actions are labelled official-source discovery links.

## Optional services

See `.env.example`. External AI requires a configured provider/model/key, authenticated dedicated Supabase quota storage and explicit user consent. Qwen uses only the supplied prepaid Token Plan endpoint, QWEN_* settings and token reservations; metered providers separately require verified pricing and USD budgets. See [Token Plan configuration](docs/qwen-token-plan.md). Adapters are implemented and mock-tested; current plan terms, model availability and live calls remain unverified. Keys stay server-side. Default quotas are zero.

Apply the additive migrations only to an authorized dedicated Roadmaps database. SQL RLS/budget policies are tested locally; hosted migrations, catalogue table population, authentication and cloud backup are not verified. Runtime discovery uses the packaged indexed JSON catalogue.

Existing Vercel project: https://syrkaroadmap.vercel.app. See [deployment](docs/deployment.md), [architecture](docs/architecture.md), [audit](docs/v2-audit.md) and [validation](docs/validation.md). Canonical `www.syrka.co/roadmaps` routing requires a separately approved change in the domain-owning project.
