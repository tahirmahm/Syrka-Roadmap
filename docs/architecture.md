# Odyssey architecture

The existing Next.js App Router, TypeScript, Supabase and XYFlow stack is retained. `src/odyssey/components/app.tsx` owns the versioned local workspace. Legacy modules remain for migration compatibility and regression tests; the routed application uses Odyssey.

`server/data.ts` loads the pinned catalogue only on the server. Catalogue APIs provide bounded search, source occupation details and a skinny skill vocabulary. `catalogue.ts` implements alias/related-term retrieval, requirement overlap and transparent matching. Candidate mappings always reference existing identifiers; lexical candidates are not neural embeddings or verified equivalences.

`curricula.ts` separates editorial learning topics from source occupational requirements. `graph.ts` builds prerequisite graphs, detects cycles, computes topological closure and minimum-cost learning alternatives. Costs express preferences, not invented tuition or duration. Source requirement branches do not acquire fabricated prerequisites. Self-marked completion changes learning progress without changing evidence verification.

The explorer uses stable cached positioning, collapsed families, visible-element rendering and a mobile reading mode. Six-tab topic panels connect resources, coursework, evidence, practice and next actions. Related occupations derive from shared source requirements and remain explicitly inferred navigation.

`documents.ts` validates signatures and bounds decompression, extracts PDF/DOCX text, and invokes packaged Tesseract workers only where OCR is needed. Files are never uploaded in the basic flow. Immutable source quotes accompany editable candidates. Detected capabilities are selected by default, with global and per-item controls plus explicit profile approval. Exact/alias mappings retain document support while ambiguous unconfirmed matches remain inferred; untrusted imports cannot create institutional verification. Deselected assertions are excluded from matching, roadmap highlights, comparisons and prerequisite closure. Bulk academic JSON requires explicit outcomes and assessments.

`profile.ts` validates workspace, academic and Passport-shaped imports with Zod and downgrades untrusted verification flags. Original v1 local storage is retained during migration. Fictional demo workspaces are isolated from personal imports. Browser storage is device-local; users should export and clear it on shared devices.

AI routes validate bounded inputs and schema outputs, minimize transmitted records and require explicit processing consent. Provider configuration is server-only. The SQL quota layer reserves conservative worst-case cost before requests, enforces global daily budget and per-user rate limits, and does not refund reservations based on untrusted reports. Provider failure returns deterministic learning where available. Uploaded text is treated as untrusted data, never instructions.

The additive Odyssey migration supplies normalized catalogue/evidence/academic tables, owner RLS, composite ownership foreign keys and private quota functions. Hosted deployment is not performed without an authorized dedicated backend. Optional cloud persistence currently saves a reviewed workspace snapshot rather than implementing full normalized record synchronization.

Campus was inspected at commit `82b020b53a97713740b9f3565a1e04666a4c760b`; Workspace at `2e7cda395f183dd289e77d22d4a8e59bdd5326e7`. Their databases remain untouched. No authorized shared student-record interface was found. Coursework import is the working integration boundary; shared Passport identifiers and consented records are a versioned contract, not a claimed live connection.
