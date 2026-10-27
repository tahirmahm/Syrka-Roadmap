# Deployment and canonical routing

## Required sequence

1. Complete checks and a production build.
2. Commit source, lockfile, migration, tests and documentation to **tahirmahm/Syrka-Roadmap**.
3. Push **main**. Confirm `git ls-remote origin refs/heads/main` equals the local full SHA, and inspect the fetched remote tree for actual source/build/docs.
4. Only then inspect the authorized Vercel account for an existing project linked to this repository. Reuse it if present; otherwise create exactly one free/Hobby project, preferably **syrka-roadmap**, using Vercel's GitHub repository import. Do not upload a disconnected CLI deployment.
5. Set main as production branch, use Next.js framework defaults, `npm ci`, `npm run build`, and deploy from the verified Git commit. Do not enable paid services.
6. Observe the production deployment ready state and verify the actual public URL, demo, imported-source branches, persistence, mobile layouts and existing app links. Record deployment ID and Git SHA.

## Manual deployment selected

The user chose to deploy manually from GitHub. After the verified push, import the existing repository in Vercel, reuse an existing linked project if one exists, select the free/Hobby tier and deploy main. No Vercel token is required in this cloud environment for manual import. The previously saved token requirement can be removed from environment settings. No automated Vercel deployment is being attempted.

## External service status

There is no configured Vercel account credential in this environment. An earlier onboarding draft declared **VERCEL_TOKEN** scoped to `api.vercel.com`; this is unnecessary for the user-selected manual deployment. A Vercel API credential alone does not prove GitHub App authorization; repository import may still require the account owner to authorize Vercel's GitHub integration. No Vercel project, deployment or URL is claimed until observed.

No dedicated Supabase project is configured, and no account-management tooling/credential is available. The demo intentionally runs without one. Use only a new dedicated free project within account limits; do not upgrade or reuse Campus/Workspace databases. Hosted auth, real issuer verification and cloud persistence still need separate provisioning and validation.

## `/roadmaps` integration

Do not modify the existing domain-owning Syrka project or DNS without approval for its exact changes. Inspect its actual routing configuration first. The domain already serves Campus and Workspace; a new project cannot independently claim the `/roadmaps` path.

After a dedicated GitHub-connected Roadmaps deployment works, the domain-owning project can receive a narrowly scoped rewrite, for example:

```json
{
  "rewrites": [
    {
      "source": "/roadmaps",
      "destination": "https://ACTUAL-ROADMAPS-HOST/roadmaps"
    },
    {
      "source": "/roadmaps/:path*",
      "destination": "https://ACTUAL-ROADMAPS-HOST/roadmaps/:path*"
    }
  ]
}
```

This is a proposal, not an applied change or fabricated host. Before requesting approval, prepare the actual diff against the identified owner repository and merge it with its existing rules. Build the target project with both `ROADMAP_BASE_PATH=/roadmaps` and `NEXT_PUBLIC_BASE_PATH=/roadmaps` so assets, standard links and in-app navigation agree. Next.js configuration handles client links with basePath. Brand masks explicitly use the public base path. Configure future Supabase callbacks on the canonical origin only after secure shared-identity decisions. No tokens are passed through URLs.

Run the full browser suite against the prefixed build and verify direct deep links, refreshes, brand/fonts, `_next` assets, API routes and sign-in links before integrating. Keep the dedicated root deployment while canonical integration is blocked; canonical integration is currently pending, not completed.
