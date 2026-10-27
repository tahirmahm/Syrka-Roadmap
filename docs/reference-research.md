# Reference research — 27 October 2026

## Evidence and access

The live HTML for Campus, Workspace, the student demonstration, Career Dreamer and roadmap.sh was retrieved with verified HTTPS after adding their hostnames to the cloud environment allowlist. Source repositories were inspected at:

- Campus: `82b020b53a97713740b9f3565a1e04666a4c760b`
- Workspace: `2e7cda395f183dd289e77d22d4a8e59bdd5326e7`

No source, database, DNS or configuration in those projects was changed. Their availability was checked with read-only HTTP requests returning 200. This does not establish every existing application workflow is healthy.

External Chromium observation encountered `ERR_CERT_AUTHORITY_INVALID` through the session proxy. TLS verification was not disabled. Consequently no external interaction or visual-browser outcome is claimed. Local application browser tests use Chromium and do not require TLS. Live reference understanding is bounded by the retrieved HTML, public application bundles and authorized source code.

## Syrka design

Campus uses Inter, ivory `#FAFAF8`, white surfaces, charcoal `#26282B`, slate blue `#536D91`, powder blue selection, lavender and apricot accents. Its primary controls use 44px targets and fine borders. Workspace contributes the fixed product sidebar, compact breadcrumbs, restrained cards, app launchers and profile placement. Workspace's current source still includes forest green styling, while Campus implements the newer palette requested here. Roadmaps follows Campus colors and Workspace shell patterns, without introducing green.

The official symbol and wordmark raster files in Campus `public/brand` match the supplied brand references. They are retained without tracing or geometric alterations. CSS luminance masks follow Campus's existing technique to remove the black background without modifying the artwork. The hand-drawn SVG in Workspace was deliberately not substituted for the supplied artwork.

## Student demonstration and Passport boundary

`https://syrka-landing.vercel.app/demo/student` identifies itself as **SYRKA Campus — Demo**, with student, employer and admin views and fictional data. Its publicly served client bundle uses localStorage key `syrka-campus-demo` and schemaVersion 4. Public fixture structures include students, education, studentSkills, verifications, projects and project evidence, assessments, jobs and requirement relationships. Demo review states include values described as verified; they are still fictional and do not establish real issuer verification.

No authenticated read-only Career Passport API contract was established. An attempted read of a repository named `tahirmahm/syrka-landing` returned repository-not-found; a GitHub API repository-list request was forbidden. The backing source repository and production backend remain unidentified. No endpoint is invented. Roadmaps defines its own versioned, consented import boundary with provenance preservation and downgrading of untrusted issuer claims. Public bundles were inspected only to understand observable fixture contracts; none of their application code or data was copied into this product.

## Career Dreamer and roadmap.sh

Career Dreamer's landing HTML is a small JavaScript application shell; deeper interaction could not be verified under the external-browser trust limitation. The supplied brief's principles—simple aspiration input and understandable transferable skills—inform our original interface; they are not reported as observed behavior.

roadmap.sh's live page provides role-based and skill-based roadmap categories, search, learning packs and incremental paths. Roadmaps uses original layouts, text and components: a destination-first entry point, expandable learning alternatives, individual node explanations and explicit evidence labels. No proprietary assets or source code were reused.

## REA evaluation

Reviewed the official `morluto/rea` README and CLI/install documentation. Its supported setup is `npx rea-agents setup`, which registers an MCP server and matching agent instructions and requires an agent restart. No REA server is installed in this session. We did not rewrite the running agent configuration or claim REA analysis. Ordinary read-only HTML/source analysis was used as the documented fallback; external browser observation remained limited as above.

## Ontology sources

The official European Commission endpoint `https://ec.europa.eu/esco/api/resource/` was reachable, even though the ESCO website returned 403. `scripts/import-esco.py` retrieves 3 occupations and their 69 distinct essential skills / 73 relationships using stable source URIs. Source URLs, descriptions, retrieval timestamp and reuse attribution are committed in `src/data/esco.json`. The API's default release was not explicitly returned; no version number is invented. Database seed SQL reproduces those records and REQUIRES edges.

Product designer is associated with the ESCO **user interface designer** reference; front-end developer with **web developer**; data analyst with **data analyst**. These are explicitly labeled occupational references, not exact legal or hiring specifications. Authored learning skills and prerequisite edges are separate from ESCO requirements. They do not assert that React or a portfolio automatically satisfies an ESCO skill, qualification or admission rule. O*NET was considered as a later US occupational enrichment; none was imported in this release.

## AI provider evaluation

Reviewed `mnfst/awesome-free-llm-apis`. It lists Groq first-party models and describes a no-card free plan. The community list is not treated as authoritative proof. Groq's privacy policy was retrieved: it distinguishes website data from Customer Data governed by its Services Agreement and DPA. Official console model and rate-limit pages returned 403 in this environment. Current free limits, available account models, structured-output support, commercial terms and no-card eligibility could not all be verified.

Groq is a candidate, not a verified active provider. A minimized server-side adapter is unit tested against simulated success, invalid output and rate-limit failures. The public explanation endpoint intentionally remains deterministic and never sends records externally. No AI key is necessary for any demo feature. Activating AI requires current official plan/terms verification, a secure server key, authenticated quotas and explicit processing consent; these remain outstanding.

## Domain integration

The existing `www.syrka.co` landing page and `/cam` and `/workspace` responses were inspected read-only. They already share a host. A separate project cannot own `/roadmaps` on that host. No authoritative configuration of the domain-owning project was available, so the concrete rewrite procedure is documented in `deployment.md` for specific approval after a GitHub-connected deployment exists. DNS and existing project routes were not changed.
