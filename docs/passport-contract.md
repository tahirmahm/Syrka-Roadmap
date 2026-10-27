# Career Passport import v1

No live connection is implied. Import an authorized JSON export using My capabilities or the home import action. Maximum upload size: 1 MiB. The user must explicitly consent before file selection. A workspace export can also be restored. Deletion/reset removes local imported records and progress.

```json
{
  "version": 1,
  "name": "Example user",
  "headline": "Exploring a new direction",
  "hoursPerWeek": 6,
  "consent": true,
  "evidence": [
    {
      "id": "record-1",
      "skillId": "html",
      "title": "Personal website",
      "verification": "self-reported",
      "sourceSystem": "authorized-export",
      "sourceRecordId": "original-123",
      "reference": "portfolio:website",
      "timestamp": "2026-01-01T00:00:00Z",
      "consent": true
    }
  ]
}
```

Accepted learning skill IDs are listed in `src/data/ontology.ts`; official ESCO skill URIs in `src/data/esco.json` are also accepted. Unknown IDs are rejected, not guessed. Optional issuer/reference fields are retained. Dates must be ISO timestamps. Nonconsented evidence is excluded from matching. `institution-verified` and `employer-verified` upload claims become `document-supported` with an explicit unauthenticated-issuer notice. A future trusted, server-authenticated ingestion channel must establish actual verification, source authenticity and revocation before supporting issuer-verified states.
