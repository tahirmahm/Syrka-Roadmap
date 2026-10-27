# Validation record

Recorded checks are updated after the final run. No hosted production deployment is claimed.

Initial implementation: lint and strict TypeScript passed. PostgreSQL policy tests and graph/import/AI tests passed (15 tests). Initial browser run: 11 passed, 2 failed. The failures identified insufficient contrast for muted navigation labels (4.28:1) and an ambiguous test locator that also selected Next.js's live route announcer. Muted labels were darkened and the import-error assertion was scoped to its dialog. Subsequent results are recorded below after rerun.

Production build succeeded before the final ESCO/contrast changes; a final build and browser run are required for the exact committed tree.

External reference HTML returned 200 for the existing Syrka routes and the required research references. External Chromium TLS trust failed; no external visual/interactive verification is claimed. Official ESCO API data was retrieved with verified TLS. No hosted Supabase or Groq call is counted as verified. Local AI tests use simulated provider responses.

## Final checked tree

- Frozen `npm ci`: passed with the committed lockfile.
- ESLint: passed without warnings or errors.
- Strict TypeScript: passed.
- Unit / PostgreSQL authorization / AI adapter tests: **15 passed, 0 failed, 0 skipped**.
- Production build: passed, including App Router prerendering, server routes and strict TypeScript compilation.
- Final production-browser suite: **12 passed** and three responsive tests exceeded the 30-second budget during parallel Chromium execution. Those exact three tests were rerun with one worker: **3 passed** (375px 5.1s, 390px 4.1s, 430px 3.1s). All 15 browser scenarios have therefore passed on the final application build across the suite and its targeted serial rerun; a single all-green final full-suite run is not claimed. The committed browser configuration now defaults to one worker.
- Browser checks cover destination search and filtering, different paths, graph selection, branching, source-backed ESCO expansion, pan/zoom controls, keyboard-accessible node list, save/reload, progress updates, invalid imports, consented import/provenance downgrading, no horizontal overflow at 320/375/390/430/768/1024/1440px, deterministic explanation responses and automated WCAG A/AA checks on the home screen. Automated checks are not a full accessibility conformance claim.
- The prior contrast issue and ambiguous test locator are fixed. ESCO expansion now refits the canvas as the node set changes.

The user selected manual Vercel deployment after GitHub push. No Vercel project or public deployment is claimed. Canonical routing, hosted Supabase, cloud roadmap sync, trusted Passport ingestion and an active verified-free AI service remain outstanding as documented. The local development/demo environment is prepared; the full production integration directive is not complete.
