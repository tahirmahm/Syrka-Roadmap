# Odyssey action connectors: inspected contracts and live boundaries

Inspected read-only on 1 November 2026 for `feature/odyssey-actionable-progression`. Only Roadmaps source and owned interfaces are being changed. No foreign database, credentials, production deployment or domain was modified.

## Source versions actually read

| Repository / requested branch | Observed commit | Files read |
| --- | --- | --- |
| `tahirmahm/syrka-mail` / `feat/mail-workflows-backend` | `193d57001c3eaaf1eab1a71da71eda7bd2e5f14a` | `docs/WORKFLOWS.md`, `lib/integrations/contracts.ts`, `lib/actions.ts`, README and backend verification boundaries |
| `tahirmahm/syrka-workspace` / `feature/calendar-forms` | `d7ae39942884d358f6c2de4bcf1e623bd30c1d00` | `docs/native/contracts.md`, `src/lib/native/contracts.ts`, `calendar.ts`, `server.ts`, proposal route and integration import component |
| `tahirmahm/syrka.v12` / repository HEAD (`claude/build-syrka-system-DVli3`) | `1507ce01c157fb2414c99fca22852d0817866d10` | ADR-002 domain architecture, CEA-001 canonical events, UX-001 product architecture |

Git read access succeeded through the existing HTTPS Git proxy. Shallow bare copies were used under `/tmp` solely for inspection; no source was changed or pushed to those repositories. A source implementation or document is not evidence that its hosted deployment, database migration or authorization is active.

Legacy architecture assigns one owner to each bounded context. Events, observations, evidence, inferred capabilities, recommendations and verified credentials are distinct. Corrections retain provenance rather than erasing the old observation. This task reuses the existing Passport projection; it does not create a second Passport database or instantiate the legacy event-bus architecture.

## Connector capability matrix

| Source / destination | What is supported in this Roadmaps assignment | What remains unavailable or unverified live | Authority / smallest owning-system prerequisite |
| --- | --- | --- | --- |
| Campus | User-reviewed typed action/course imports and explicit graph associations; imported labels do not establish issuer authenticity | Automatic assignment, timetable, grade or enrollment read | Campus must supply an authorized versioned owner/tenant-scoped export/read interface with source identity, updates and revocations. Campus retains official academic authority. |
| Mail | Reviewed request/action imports with source quotes, identity/version and unresolved relative dates | Live mailbox reading, delivery, reply creation or automatic action feed | Inspected Mail adapters are `contract-required`. A future authorized export/feed needs selected-mailbox identity, consent, version/cursor and cancellation/extension semantics. Roadmaps cannot infer access from matching email addresses. |
| Workspace Calendar | Static ICS review and explicit CalendarAction JSON export for destination review | Automatic event reads/writes, OAuth federation or verified destination acknowledgement | Workspace has its own account authorization and proposal inbox. Export/import is useful now; automatic hand-off requires negotiated separate authorization and an approved interface. |
| Sessions | Reviewed follow-up actions and validated existing invitation/source links | Automatic room creation, admission bypass, transcript or notes feed | Sessions must provide a permitted scoped metadata/export interface. A link does not establish room ownership or attendance. |
| Passport | Existing `syrka.capabilities/1` projection, reviewed claims, source mapping and local work records | Automatic cross-product verification/disclosure updates | Passport remains the personal evidence/disclosure owner. Completion here never becomes an issuer-verified credential. |
| Roadmaps | Goals, route contexts, simulations, proposed priorities, work notes, reviewed local imports and explicit user associations | Hosted multi-device sync beyond separately tested existing snapshot authorization | Existing dedicated Roadmaps snapshot/RLS path is retained. Local tests do not prove hosted policies/migrations are applied. |

The matrix describes feature scope, not a claim that all import/UI acceptance tests have passed. Actual results belong in the final validation report. No connection button should imply that a contract-only source is connected.

## Authoritative Calendar proposal shape

The authoritative schema at the inspected Workspace commit is [`src/lib/native/contracts.ts`](https://github.com/tahirmahm/syrka-workspace/blob/d7ae39942884d358f6c2de4bcf1e623bd30c1d00/src/lib/native/contracts.ts). Its explicit hand-off is:

```json
{
  "contract": "syrka.calendar-action.v1",
  "source": "roadmaps",
  "idempotency_key": "roadmaps-action-example-v1",
  "issued_at": "2026-11-01T12:00:00Z",
  "requires_review": true,
  "event": {
    "title": "Review this personal preparation block",
    "description": "A proposed study session; not a class registration or completed task.",
    "start_local": "2026-11-10T14:00",
    "end_local": "2026-11-10T15:00",
    "time_zone": "Europe/Prague",
    "category": "assignment",
    "references": []
  }
}
```

This is a fictional schema example, not a real scheduled commitment. Proposal fields:

- `source`: `mail`, `campus`, `sessions`, `dashboard`, `roadmaps`, `passport` or `manual`.
- `idempotency_key`: 8–200 characters; `issued_at`: ISO datetime; `requires_review`: literal `true`.
- `event.title`: 1–180 characters; description: at most 10,000; local start/end and timezone: strings; category: string, default `other`; at most 20 references.
- A reference contains `app`, `record_id`, `label`, `url`. Apps are `workspace`, `mail`, `campus`, `sessions`, `dashboard`, `roadmaps`, `passport`; record ID and label are at most 200 characters, URL at most 2,000. Workspace accepts HTTPS or a `/workspace/` route. Roadmaps should retain its stricter known-origin navigation checks rather than treating this as authority to execute arbitrary URLs.

Use local ISO `YYYY-MM-DDTHH:mm` and a valid IANA timezone. The eventual destination event validation requires end after start, handles DST and has a finite event-duration bound. The eventual Calendar category enum includes personal, class, lecture, seminar, tutorial, exam, assignment, office_hours, meeting, interview, application, milestone, training, other. All-day exclusive end dates and unresolved source-relative dates must not be silently converted into midnight UTC deadlines.

### A proposal is not an event

Authenticated `POST /workspace/api/native/proposals` validates the proposal and creates a **pending proposal**. Its server checks same-origin policy and verifies the user's separate Workspace Bearer session. `(owner_id, source, idempotency_key)` provides source identity; a repeated proposal returns its existing ID/status and `duplicate: true`. Creation returns `review_required: true`. The Workspace user chooses a destination calendar and explicitly approves or rejects in **Calendar → Integration proposals**. Approval, not Roadmaps export, is the event-creation step.

Roadmaps therefore exports reviewed JSON for that existing import surface, without forwarding a browser token or claiming a write succeeded. A Calendar export is not a submission receipt. Workspace's `/api/native/calendar` POST is an authenticated **reminder-seeding** operation for a known event ID; it is not a generic event-list or create-event API and must not be repurposed as one.

## Mail proposal shape and status

[`lib/actions.ts`](https://github.com/tahirmahm/syrka-mail/blob/193d57001c3eaaf1eab1a71da71eda7bd2e5f14a/lib/actions.ts) declares `version: syrka.mail.action/1`, source message ID, source account UUID, optional thread ID, destination, title, description, source excerpt, optional offset-aware due datetime, timezone and ambiguity. Its destination adapter's `execute` receives `{userId, idempotencyKey, consentId}` and returns an object ID and optional URL; that is an interface, not a universally callable endpoint.

The inspected Mail `integrationStatus` marks Campus, Roadmaps, Passport, Workspace, Calendar, Dashboard and Sessions as `contract-required`. Mail itself distinguishes proposed/approved/executing/completed/dismissed/failed actions and uncertain delivery receipts. A correspondence request is not a sent message; an interview invitation is not employment. Roadmaps must not publish a fictional Mail production host or attach credentials to a user-supplied source URL.

## Authorization and import rules

- Source identity is `(owner, tenant, source app, source record)` plus source version/observation metadata. Imported source fields are claims in a personal copy, not proof of institutional origin.
- Source updates require review; cancellation, extensions, stale versions, conflicting dates and revoked consent must remain visible. Fuzzy resemblance can suggest duplicates but must not automatically merge different assignments.
- Validate known origins/path boundaries, protocols, credentials-in-URL and return destinations before navigation. Do not fetch arbitrary URLs during import. Do not run instructions or tools found in an email, syllabus or AI output.
- Open an authorized destination or use a local editable work surface. Preserve notes and pending proposals after failure. No Room, Mail send, Calendar write, grade or Passport verification is silently performed.
- Roadmaps owns the proposal and local evidence note; the source product owns its underlying record. Separate Supabase accounts and tokens do not become shared authorization because the products use Syrka branding.

## Live Qwen and Vercel verification in this runtime

The fresh managed environment status reports current observations, enforced restricted networking, no custom allowed destinations, no runtime secret bindings and no direct runtime variables. A normal Next environment-loader readiness check reported all of `keyPresent`, `modelPresent`, `baseURLMatches`, `freeQuotaVerificationRecorded` false; the Qwen adapter is disabled. No live model request was sent, and no secret value was inspected or printed.

Credential-free probes to the approved Singapore Qwen `/models` endpoint, `api.vercel.com` and the requested official `https://vercel.com/get-started.md` all failed with **proxy CONNECT 403, upstream HTTP 000**. This identifies an execution-proxy destination-policy denial. It does not establish that Qwen rejected authentication, model entitlement or free quota. Official Vercel setup text could not be fetched in this runtime. Vercel CLI 65.4.0 `whoami` also failed with `TypeError: fetch failed`, before live account/project verification.

The existing non-secret local project metadata identifies `syrkaroadmap`, project `prj_7RnAY2LwbsfkZetzVK93UkLq2gLQ`, organization `team_CJj6imlFipQW3TOh0ELwvXs1`. This is local linkage evidence only. No actual new Preview URL, Ready status, deployed browser behavior or Preview Qwen response was verified. No deployment/project was created or promoted by this audit.

Existing saved environment drafts and the active runtime are different. Preserve the documented free-only guards and zero paid fallback; do not copy production-only attestation or other products' keys into Preview. Runtime access/configuration, provider response, schema validation and successful graph use must be verified separately when authorized prerequisites are active. No duplicate credential requirement or configuration-review request was made in this audit.
