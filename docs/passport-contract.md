# Capability and academic import contracts

No live Career Passport connection is claimed. The import dialog requires authorization/consent and accepts JSON up to 2 MB. Export a current capability profile from My Profile to obtain a complete example with all required arrays and preferences.

The current capability envelope is `{ "schemaVersion": "syrka-capability/2", "consent": true, "person": { ... } }`. `personSchema` in `src/odyssey/profile.ts` is authoritative. Assertions retain skill identifiers, claim/source record references, quotes, consent and reliability. Source occupational skills use stable ESCO URIs. Uploaded institutional/employer verification flags are downgraded to document-supported.

Workspace exports have `version: 2` and contain the person, multiple paths, progress, route choices, bookmarks and audit events. Legacy `version: 1` workspace files with a `profile` are accepted for person migration. Old path identifiers are not silently equated with the new catalogue; the original local v1 storage is retained for recovery.

Academic bulk import is `{ "version": 1, "consent": true, "courses": [...] }`. Each course requires institution, programme, code, title, reported completion state, source references, document-supported/self-reported status, explicit outcomes and assessments. Each outcome includes its source quote and selected skill IDs. Course titles alone do not create skill assertions. The dialog can download the supported example.

A future trusted server interface must verify issuer authorization, record authenticity and revocation before granting verified capability status. File upload, self-completion and fictional demonstrations cannot establish institutional verification. Private capabilities are never scraped from public portfolios.
