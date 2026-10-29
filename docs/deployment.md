# Production deployment

## Existing project

- Vercel project: **syrkaroadmap**
- Team: **tahirmahmood439wel-gmailcoms-projects**
- Plan: **Hobby**
- Repository: **tahirmahm/Syrka-Roadmap**
- Production branch: **main**
- Production alias: **https://syrkaroadmap.vercel.app**
- Framework: **Next.js**
- Install: `npm ci`
- Build: `npm run build`
- Output: framework default
- Node: **24.x**

The existing project was reused; no new project was created. Other Syrka projects and DNS were not changed. The framework setting was explicitly corrected from an empty setting to Next.js so Vercel packages server routes and framework assets correctly.

## Reproduce a deployment

Run lint, strict type checks, unit/database tests and the production build before changing application source on main. Commit and push to the existing GitHub repository. Verify the remote SHA and source tree before deployment. The GitHub-connected Vercel project builds main automatically. For a deliberate API-triggered rebuild, provide a GitHub `gitSource` with this repository ID, main ref and verified pushed SHA; never upload a disconnected local snapshot.

Check the actual deployment's source SHA, target, build logs and Ready state, then verify the public application in a browser. A saved project link or Ready state alone does not establish functional correctness. Record any browser/network limitations separately.

In this cloud machine, the CLI is available after:

```sh
export PATH="/workspace/.vercel-tools/bin:$PATH"
vercel whoami --global-config /workspace/.vercel-tools/config
```

CLI browser sign-in is configured separately from application authentication. Do not read, copy or commit CLI authentication files. If login expires, use `vercel login` and the official browser/device authorization flow. No manually supplied Vercel token is necessary for this workflow. `.vercel/` and `.env.local` remain ignored. Never commit credentials or generated dependencies.

The demo needs no application environment variables. Hosted Supabase, trusted Career Passport ingestion and external AI remain unconfigured. Use only a dedicated free Supabase project if one is provisioned; do not reuse Campus/Workspace databases or enable paid services.

## Canonical `/roadmaps` integration

**https://www.syrka.co/roadmaps is not configured.** Do not modify the existing domain-owning Syrka project or DNS without approval for the exact changes. Inspect its actual routing configuration first. The domain already serves Campus and Workspace; a separate project cannot independently claim a path on that host.

A narrowly scoped rewrite proposal for the domain owner is:

```json
{
  "rewrites": [
    {
      "source": "/roadmaps",
      "destination": "https://syrkaroadmap.vercel.app/roadmaps"
    },
    {
      "source": "/roadmaps/:path*",
      "destination": "https://syrkaroadmap.vercel.app/roadmaps/:path*"
    }
  ]
}
```

This is a proposal, not an applied configuration. Prepare the actual diff against the identified owner repository and preserve all existing rewrite rules. Before requesting approval, validate a prefixed Roadmaps build with both `ROADMAP_BASE_PATH=/roadmaps` and `NEXT_PUBLIC_BASE_PATH=/roadmaps`. Next.js handles client-link base paths; brand masks use the public base path explicitly. Validate fonts, assets, direct deep links, refreshes, API routes and sign-in links. Future authentication callbacks need their own verified canonical-origin configuration. Never pass authentication tokens through URLs.

The current production project serves the app at its root. Retain that dedicated deployment until canonical integration has been separately approved and tested.

## 2.0 deployment status (2026-10-29)

The 2.0 foundation was pushed as `beed1b392d85cf3cacae3b02abceca4a4b0db5f7`; the application milestone follows after browser verification. Runtime network policy currently denies CONNECT requests to both the production hostname and Vercel API (HTTP 403). The saved environment draft includes those hosts but has not become the enforced runtime policy. A user must save/publish the environment settings to apply it. Do not retry interactive login to repair a destination-policy denial.

The existing alias is known, but a fresh Ready deployment/source SHA and live behavior for 2.0 cannot be asserted while that restriction remains. A GitHub push can trigger the existing integration; it does not prove deployment success. No canonical-site configuration, DNS, paid infrastructure or Campus/Workspace backend changes were made.

`canonical-route-proposal.patch` is a review artifact against the inspected empty `next.config.mjs` in `tahirmahm/syrka.v12`. It is not applied, and current domain ownership must be reconfirmed before use. Review the complete owner configuration at that time and preserve all existing rules. The paired Roadmaps base-path build/environment change must be coordinated; applying only the rewrite to the current root build will not work correctly. This is not approval to alter either project's production settings.

The prefixed build and local browser smoke checks now pass, including document/OCR workers, catalogue deep links, refresh and sign-in route. No live reverse proxy, authentication callback or cross-project cookies are claimed tested. Actual routing approval and current ownership verification remain pending.

## Operator Qwen investigation

The protected Node.js endpoint `/api/diagnostics/qwen` and `scripts/probe-vercel-qwen.ts` allow testing from the Vercel server, separate from a Codex-to-Qwen request. Configure a separate server-only `QWEN_DIAGNOSTICS_TOKEN` (32+ characters), the Qwen key/base URL and a confirmed included model. The route stays closed by default. See `qwen-connectivity.md` for exact modes, safe output fields and the confirmed CONNECT-layer blocker. No new project, subscription, DNS or canonical rewrite is introduced.
