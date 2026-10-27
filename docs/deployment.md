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
