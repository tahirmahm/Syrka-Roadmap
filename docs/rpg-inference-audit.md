# RPG scene and résumé intelligence correction

Branch: `feature/living-career-tree`. Scope is Roadmaps only. Production remains untouched.

## Before and after

The previous renderer assigned every record to one of five fixed columns with rectangular, text-filled cards and defaulted mobile to a reading list. The replacement uses stable radial sector coordinates, an evidence-centred character node, circular minor capabilities, intermediate course/project shapes and larger destination focal points. Curved connections share the underlying capability nodes. The viewport is the primary scene; navigation, filters and planners use compact HUD/overlays. Both desktop and mobile default to the interactive graph. Reading mode is explicit.

Selecting destinations changes progressive disclosure on the canvas. Selecting a goal fades unrelated nodes while preserving discovery; provenance remains in the inspector. Historical/reported evidence connections illuminate. Hypothetical nodes and connections are dashed, and simulation never alters actual records. Animations have a reduced-motion alternative. Mobile has touch pan/zoom, return-to-character, fit, focus, optional reading and a dismissible drag-handle bottom sheet. Spatial positions are presentation, never inferred ontology edges.

## Résumé interpretation audit

The existing `/api/cv/interpret` route already called the server AI gateway when consent and configuration permitted; Qwen was not solely a Guide. Its prior limitations were a 12-claim supplement without explicit education lifecycle, and merged AI suggestions could be preselected. The local parser retained the complete document.

The corrected pipeline keeps local PDF/DOCX/OCR/text extraction, adds conservative literal education lifecycle classification, and expands structured Qwen extraction to distinguish attendance, current enrolment, completion, incomplete study, withdrawal and transfer. Dates or institution names alone never establish a completed degree. Every model quotation/page, ontology identifier, date, grade and institution is validated. Unsupported lifecycle statements fail closed. Candidate additions remain unchecked for review; user corrections are retained. The review form can explicitly correct lifecycle status. Source quotations remain unchanged. An incomplete qualification renders as academic history, not a completed credential. Current enrolment is in progress, and no historical institution is automatically made a goal.

The new `/api/relationships` route uses Flash for bounded source-grounded proposals linking existing courses, experience, mapped capabilities, projects and destinations. It shares only up to eight approved excerpts (900 characters each) after separate explicit consent and a source-preview disclosure. It accepts no invented IDs, self edges, missing quotes or formal/guaranteed requirements. One endpoint must relate to the cited evidence or mapped capability. Candidates require individual acceptance; accepted links remain advisory and removable. They do not verify mastery or satisfy formal prerequisites. Uploaded text remains untrusted context.

## Model operations and honest activation status

| Operation | Adapter/model | Fallback and observed status |
| --- | --- | --- |
| CV interpretation | `qwen3.8-flash`, schema-validated candidate claims | Local extraction and review; no live call made here. |
| Relationship reasoning | `qwen3.8-flash`, known-node/quoted-source advisory candidates | Existing deterministic source graph preserved; contract and review fixtures tested. No live model result claimed. |
| Guide | Flash normally; Max for explicit, separately authorised complex reasoning | Deterministic source-grounded Guide. No live call made here. |
| Career matching and roadmap generation | Deterministic ESCO/evidence scoring and curated prerequisite graph | Functional without AI; similarity never means hiring probability. AI may explain or propose reviewed advisory links. |
| Semantic retrieval | Optional `text-embedding-v4` with model-specific quota gating | Exact graph/lexical retrieval. Vector transport fixtures only, not a live embedding index. |
| Reranking / external OCR | Disabled/unactivated pending verified compatibility | Existing local OCR remains. No external CV image sent. |

A fresh readiness check through the application's normal Next environment loader reported: key absent, endpoint/model absent, quota verification absent, adapter disabled. No values were printed. Independent credential-free network probes to Qwen and Vercel both failed at the execution proxy: **CONNECT 403, upstream HTTP 000**. This establishes a proxy policy denial, not a vendor authentication or model-entitlement rejection. The Vercel Preview runtime could not be reached for testing; it is not claimed to work.

Required live activation gates: authorised runtime key/endpoint/model configuration, environment-specific free-quota attestation and expiry/reference, a positive daily token limit, and network access to the existing services. Preserve Free Quota Only and zero paid fallback. Production-only attestation is not reused for Preview. No subscription or service was purchased or switched.

## Database compatibility correction

The previous quota RPC allowed legacy learning/CV action names but rejected `living-guide` and `living-embedding`. The new migration `202611010001_living_ai_actions.sql` adds those names and `relationship-inference` only. It retains authentication, row ownership, locking, existing global and per-user limits, rate checks and non-refunding reservations. It does not enable or increase a quota. Local PostgreSQL tests check the additional operation names, reject an invented action and retain isolation/limit checks. **The migration has not been applied to hosted Supabase.**

## Acceptance boundaries

The PPE→consulting→MBA, PPE→risk, tax→research and limited-student demonstrations are fictional. A separate fictional CV lifecycle browser test checks prior incomplete study and current enrolment through review and persistence. No actual private user CV was supplied for this correction, so the requested actual-user-CV demonstration remains unperformed. No private CV details were added to source, fixtures or screenshots.

See the final validation report and review gallery for the measured browser/build results. Screenshots are a local production build, not a deployed Vercel Preview. No new Vercel project, production merge or main-site route change was performed. Campus, Workspace, Sessions and Mail were not modified.
