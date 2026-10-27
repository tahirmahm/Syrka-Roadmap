# Syrka Roadmaps

An evidence-aware career navigation application. The working public demo needs no account, database or AI key.

## Develop

Node 22+ (validated with Node 24.19.0), npm. From this repository:

```sh
npm ci
npm run dev
```

Production: `npm run build` then `npm start`. Port defaults to 3000. Retained dependencies/build outputs do not retain a running server; start the service in each new environment. Use the existing checkout in isolated cloud tasks; do not create a worktree unless requested.

## Validate

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

The browser suite uses `/usr/bin/chromium` in the cloud image, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` on another machine. Set that path or install Playwright Chromium with `npx playwright install --with-deps chromium`; the config falls back to Playwright’s managed browser if the system Chromium is absent. Tests start the production server when one is not already running. PostgreSQL authorization tests run the actual migration/seed in PGlite with authenticated/anonymous roles; they do not require Supabase credentials. They do not claim hosted Supabase service validation.

## Working features

- Home, searchable career discovery, roadmap, capability evidence, opportunities/resources, progress and path comparison.
- XYFlow/Dagre directed graph generated from profile and destination, expandable learning alternatives, source-backed ESCO requirement branches, details, pan/zoom and accessible HTML list.
- Three destination pathways, explicit provenance/uncertainty, prerequisite traversal, cycle detection and evidence-aware matching.
- Fictional demo, configurable weekly pace, local save/resume, export/restore, consented Passport v1 import and deletion/reset.
- Official Syrka raster brand references, light responsive shell and standard Campus/Workspace links.
- PostgreSQL migration and idempotent ESCO seed with ownership RLS and cross-owner graph protection.
- Deterministic explanations and an isolated server-side Groq adapter with mocked-provider tests. External AI is not activated or verified.

## Sources and limits

`src/data/esco.json` is an official API snapshot of **3 occupations, 69 essential skills and 73 relationships**. Update intentionally with `python3 scripts/import-esco.py`, review the diff, then run `npx tsx scripts/esco-seed.ts`. Source URIs, retrieval time and attribution are preserved. The API did not explicitly identify its default release. Authored learning prerequisites, evidence suggestions and planning ranges remain separate from source occupational requirements. No formal equivalence is asserted.

The Passport reference was a local-storage fictional demonstration, not a verified integration API. No real student data is included. No live jobs or eligibility feed is connected. Learning resources are explicitly distinguished from opportunities with verified entry criteria. AI, hosted Supabase auth/database, cloud roadmap sync and Vercel deployment remain unconfigured until their prerequisites are supplied. Demo persistence is browser-local, not shared-device multi-user storage.

Optional configuration is documented in `.env.example`. Never commit actual credentials. Dedicated Supabase project only: apply `supabase/migrations/202610270001_roadmaps.sql` and `supabase/seed.sql`, then configure public URL/anon key and validate hosted policies. No changes to existing Syrka databases are authorized or needed.

See [research](docs/reference-research.md), [architecture](docs/architecture.md), [Passport contract](docs/passport-contract.md), [deployment](docs/deployment.md) and [validation](docs/validation.md).
