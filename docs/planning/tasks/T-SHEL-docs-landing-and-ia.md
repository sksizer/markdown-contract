---
type: task
schema_version: '5'
id: T-SHEL
status: open/ready
created: '2026-06-30'
last_reviewed: '2026-06-30'
related:
- '[[M-0006-documentation-site]]'
- '[[M-0007-example-use-case-catalog]]'
depends_on:
- '[[T-7UTE-astro-docs-site]]'
tags:
- docs
- website
- content
- starlight
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
---
# Author the bare-shell landing page and content-collection IA for `apps/docs`

## Goal

Replace the scaffold's placeholder with a real **landing / overview page** (what
markdown-contract is, plus an install pointer) and declare the **sidebar IA slots** that the
example catalog ([[M-0007-example-use-case-catalog]] / [[T-SITE-bootstrap-docs-website]]) lands
into. Deliberately thin — a **bare shell**: one real page plus labelled-but-empty sections, per
M-0006's bare-shell scope.

This is the **interim, publish-early** landing: it makes the site meaningful *before* the
catalog data (`docs/catalog/*.yaml`, [[T-CTLG-example-catalog-finalize]]) is finalized — which
is a long pole — so M-0006 can publish something real off the critical path.
[[T-SITE-bootstrap-docs-website]] later **supersedes** this hand-authored landing with the
data-driven version (the hero tour) and fills these IA slots with the generated category pages.
Deeper guides/reference content is the catalog's job, not this task's.

## Today

[[T-7UTE-astro-docs-site]] scaffolds `apps/docs` with a placeholder `index` and empty sidebar
groups — the project builds via moon but renders no real content. The narrative that seeds a
landing page already exists: `README.md` (the pitch + the structure/content/rules planes) and
`docs/planning/vision.md` (the vision). The catalog's category scheme exists as a planning
document ([[M-0007-example-use-case-catalog]]) but its pages are not yet generated.

## Proposed

- A **landing / overview** page (`index`) authored from the `README.md` intro + `vision.md`:
  one paragraph on what markdown-contract is (markdown-as-data; the structure / content / rules
  planes), an install/getting-started pointer, and a link to the source. Code samples copied
  verbatim from the repo so they match shipping behaviour.
- The **sidebar IA**: set the Starlight sidebar groups to the slots the catalog will fill
  (mirroring M-0007's category labels), declared and visible even though they hold no pages yet —
  so [[T-SITE-bootstrap-docs-website]] *adds pages into a defined structure* rather than editing an
  empty config.
- Nothing else: no guides/reference prose, no per-example pages (those are M-0007 and later).

## Approach

1. Author `apps/docs/src/content/docs/index.(md|mdx)` (landing/overview) from `README.md` +
   `docs/planning/vision.md`; keep code samples verbatim.
2. Set the Starlight `sidebar` in `apps/docs/astro.config.mjs` to the catalog's category labels as
   the IA slots (placeholder groups, no page entries yet).
3. Confirm `moon run docs:build` stays green; the landing page is the site root and the sidebar
   shows the (empty) slots.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/docs/src/content/docs/index.(md\|mdx)` | new | Landing / overview page from `README.md` + `vision.md`, replacing the scaffold placeholder. |
| `apps/docs/astro.config.mjs` | modify | Final sidebar IA groups (the catalog's category slots), declared but empty. |
| `README.md` | modify | (optional) Link to the `apps/docs` source / forthcoming site URL. |

## Acceptance criteria

- [ ] AC-1: `apps/docs/src/content/docs/index.(md|mdx)` renders a real overview of
  markdown-contract — what it is plus an install pointer, sourced from `README.md` /
  `vision.md` — replacing the scaffold placeholder.
- [ ] AC-2: The Starlight sidebar in `astro.config.mjs` declares the IA slots for catalog content
  (the M-0007 category sections), visible in the rendered nav even though they hold no pages yet.
- [ ] AC-3: `moon run docs:build` stays green and the landing page is the site root.
- [ ] AC-4: No catalog / guide / reference prose is added here — that content is
  [[M-0007-example-use-case-catalog]]'s job (kept out so the shell stays bare).

## Out of scope

- The example catalog content and per-example pages — [[T-SITE-bootstrap-docs-website]].
- Deep guides / reference pages.
- The GitHub Pages deploy and publish — [[T-PAGE-docs-pages-deploy]].

## Dependencies

- Depends on [[T-7UTE-astro-docs-site]] (the scaffold + empty IA). Feeds
  [[T-SITE-bootstrap-docs-website]], which later **supersedes** this interim landing with the
  catalog-data-driven version (hero tour) and fills the IA slots once
  [[T-CTLG-example-catalog-finalize]] lands the `docs/catalog/*.yaml` data.
