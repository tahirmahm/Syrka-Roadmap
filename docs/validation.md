# Roadmaps 2.0 validation — 2026-10-29

Validated locally against the rebuilt production application, not merely the development server.

- ESLint and TypeScript: passed.
- Unit, PostgreSQL authorization and AI adapter tests: **32 passed**, zero failed/skipped. Database tests execute the actual migrations in PGlite with anonymous/authenticated roles. Provider tests use simulated responses; they are not live model verification.
- Production Next.js build: passed. Catalogue, discovery, learning and CV interpretation deployment traces all include the server-only catalogue JSON.
- Full serial production Chromium suite: **25 passed**, zero failures (approximately one minute).

Browser scenarios cover broad non-featured occupational discovery; AI Engineer alias disambiguation; three distinct detailed curricula; actual digitally generated PDF and DOCX extraction; actual English OCR from a synthetic scanned PDF, PNG and JPEG; source quotations and reviewed mapping; spoofed-file rejection; coursework provenance; academic outcome import; shared/distinct career comparison; persistent per-path progress without evidence verification; deterministic operation without AI; seven viewport widths (320–1440px); home/upload consent accessibility checks; and legacy storage migration with verification downgrading.

An earlier full run had 23 passes and two failures. Low upload-instruction contrast was corrected. The legacy migration test passed against the fresh production build. The final complete run passed all 25 scenarios; no prior failed/aborted run is counted as a pass.

OCR checks use clear fictional English fixtures, not a representative accuracy benchmark for arbitrary scans. Automated axe checks cover home and the upload consent dialog, not a complete accessibility certification. A desktop screenshot of the actual AI Engineer graph was inspected; source alias ambiguity now resolves to artificial intelligence engineer while preserving source alternatives.

Hosted Supabase migrations, authentication, cloud backup and live provider calls are unverified. Official-source dataset refresh, current provider terms/pricing and external live reference inspection were blocked by destination network policy. The Vercel production hostname and API also returned CONNECT HTTP 403 in this environment; no fresh deployed 2.0 verification is claimed. Canonical domain-owner routing remains a proposal and has not been changed.
