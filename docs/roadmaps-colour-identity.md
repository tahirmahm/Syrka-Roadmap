# Roadmaps colour identity

Targeted visual update on `design/roadmaps-indigo-identity`. No functional, API,
authentication, environment, schema, or access-policy changes. Campus and
Workspace repositories and assets were not modified. Existing Syrka assets,
typography, layout, icons, and semantic warning/danger states are retained.

## Styling architecture and changes

- `src/app/globals.css`: centralized `--roadmaps-*` identity tokens and existing
  compatibility aliases (`--bg`, `--ink`, `--muted`, `--action`, `--selected`,
  `--line`, `--lavender`). Replaced obsolete decorative slate colours; extended
  visible keyboard focus to select and textarea controls.
- `src/odyssey/styles.css`: shared tokens throughout the current Odyssey screens;
  tinted sidebar, indigo header rule, more legible Roadmaps product label,
  selection marker, buttons, topic families and graph controls.
- `src/odyssey/components/explorer.tsx`: graph SVG connections and canvas dots use
  shared CSS tokens instead of duplicated colour literals. Suggested prerequisite
  branches retain their existing warm semantic distinction.

| Token suffix | Value | Role |
| --- | --- | --- |
| primary | #253B75 | Actions, headings, selected text |
| secondary | #687FD0 | Decorative selection and graph accents |
| accent | #DFE6FF | Selected surfaces |
| background | #F6F7FC | Main surface |
| text | #20283D | Body text |
| muted | #68748A | Foundation palette reference |
| muted-text | #5D687E | AA-safe muted text on tinted surfaces |
| border | #DCE2EF | Decorative boundaries |
| hover | #1C2E5E | Primary hover |
| tint | #EEF1FC | Sidebar and highlighted surfaces |
| control-border | #8898BF | Interactive outlines |
| connector | #687FD0 | Roadmap spine |
| canvas-dot | #BEC8E3 | Canvas grid |

The application explicitly supports light mode only (`color-scheme: light`);
this update does not introduce an untested dark theme. Periwinkle is not used
for normal text on white. Semantic states retain labels/icons as well as colour.

## Verification

- ESLint, strict TypeScript, and optimized production build passed.
- All 46 unit/database/provider-contract tests passed.
- Local production screenshots captured at 1440, 820 and 390 pixels for home,
  career discovery, graph/reading roadmap, CV upload, profile, comparison,
  progress and opportunities. Home before/after comparisons retained separately.
- No live AI calls are necessary for this visual change; adapter contracts remain
  covered by the unchanged regression suite.
- Deployment inspection from this executor is blocked: Vercel and deployed site
  CONNECT requests return proxy 403 with no origin HTTP response. GitHub REST API
  is also blocked. A branch push requests the existing Git-linked Preview build;
  it does not establish that the deployment is Ready. No production merge or
  deployment is requested.
- All 32 production-browser regression tests passed, including responsive
  navigation/roadmaps at seven widths from 320 to 1440 pixels and upload-consent
  accessibility checks.
- Additional axe WCAG 2 A/AA scans reported zero violations on home, profile,
  comparison, progress and opportunities at 390, 820 and 1440 pixels (15 scans).
