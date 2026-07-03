---
type: task
schema_version: '5'
id: T-SITE
status: planning/draft
created: '2026-06-28'
last_reviewed: '2026-06-30'
related:
- '[[M-0006-documentation-site]]'
- '[[M-0007-example-use-case-catalog]]'
- '[[D-0010-monorepo-tooling]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
- '[[T-7UTE-astro-docs-site]]'
- '[[T-SHEL-docs-landing-and-ia]]'
- '[[T-CTLG-example-catalog-finalize]]'
tags:
- docs
- website
- marketing
- moon
- examples
need_human_review: true
impact: high
complexity: large
autonomy: supervised
---
# Generate & publish the example catalog pages into the docs site

> Belongs to [[M-0006-documentation-site]] (the site), not M-0007 (the catalog *data*). This is
> the **page-generation** task: it renders [[T-CTLG-example-catalog-finalize]]'s
> `docs/catalog/*.yaml` into the [[T-7UTE-astro-docs-site]] shell. Standing up the project is
> T-7UTE; the deploy is [[T-PAGE-docs-pages-deploy]].

## Goal

Render the example catalog as pages **into the existing `sites/docs` shell**
([[T-7UTE-astro-docs-site]] scaffold + [[T-SHEL-docs-landing-and-ia]] interim landing), driven by
the structured catalog data (`docs/catalog/*.yaml`) finalized by
[[T-CTLG-example-catalog-finalize]]. This is the **page-generation** half of M-0006: it does
**not** stand up the project (T-7UTE) or wire the deploy ([[T-PAGE-docs-pages-deploy]]) — it turns
catalog data into the site's content and **supersedes** the interim landing with the data-driven
version.

## Today

The `sites/docs` shell is scaffolded ([[T-7UTE-astro-docs-site]]) with an interim hand-authored
landing and empty IA slots ([[T-SHEL-docs-landing-and-ia]]); no catalog pages render yet. The
catalog is being finalized from `docs/example-catalog.md` into structured `docs/catalog/*.yaml`
data by [[T-CTLG-example-catalog-finalize]] (8 categories, the example-entry schema) — the input
this task renders.

## Proposed

Catalog pages whose structure mirrors the data: each category → a docs section; each example → a
documented unit rendering its `artifact` verbatim; `builds_on` → an ordered ladder within each
category with cross-linked prerequisites; a **data-driven landing** whose hero tour pulls the
rank-1 example from each category, **superseding** the interim [[T-SHEL-docs-landing-and-ia]]
landing. In the sidebar, all eight category sections nest under a **single top-level
"Examples" group** (per-category sub-groups), rather than eight top-level groups. Pages are *generated from* `docs/catalog/*.yaml` (a Starlight / Astro content collection
reads the YAML — its schema is shaped for this by [[T-CTLG-example-catalog-finalize]]), not
hand-copied, so they stay in sync with the data. Artifacts are wired so they can be
regression-checked against real CLI/library output.

## Approach

1. Read `docs/catalog/*.yaml` into the Astro / Starlight content collection.
2. Generate one section per category and one unit per example (artifact verbatim, the `builds_on`
   ladder cross-linked) under `sites/docs/src/content/docs/`.
3. Replace the interim landing ([[T-SHEL-docs-landing-and-ia]]) with the data-driven hero tour
   (rank-1 per category) and populate the sidebar with the generated pages — restructuring the
   shell's eight top-level category slots into sub-groups under one top-level **"Examples"**
   group.
4. Add a check that renders each `artifact` and diffs it against real CLI/library output, so
   snippets stay honest. (The flagged snippet *corrections* are applied **in the data** by
   [[T-CTLG-example-catalog-finalize]], not here.)

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `sites/docs/src/content/docs/**` | new | generated catalog pages — category sections + per-example units. |
| `sites/docs/src/content.config.ts` (loader) | modify | a content-collection loader that reads `docs/catalog/*.yaml`. |
| `sites/docs/src/content/docs/index.(md\|mdx)` | modify | the data-driven landing (hero tour), superseding the T-SHEL interim landing. |
| `sites/docs/astro.config.mjs` | modify | populate the sidebar IA slots with the generated category pages. |
| artifact regression check | new | render each `artifact` and diff against real CLI/library output. |

## Acceptance criteria

- [ ] AC-1: Every catalog category renders as a section and every example renders with its
  `artifact` and a link to its `builds_on` prerequisite — **generated from** `docs/catalog/*.yaml`,
  not hand-copied.
- [ ] AC-2: The data-driven landing presents a hero tour (one rank-1 example per category) and
  **supersedes** the interim [[T-SHEL-docs-landing-and-ia]] landing.
- [ ] AC-3: The generated category pages sit in the sidebar as sub-groups of a **single
  top-level "Examples" group** — no orphan pages, and no empty slots left over from T-SHEL.
- [ ] AC-4: Each example `artifact` is regression-checked against real CLI/library output (a
  failing diff fails the check).
- [ ] AC-5: The site builds via `moon run docs:build` with the generated pages included.

## Out of scope

- Standing up the `sites/docs` project / moon registration — [[T-7UTE-astro-docs-site]].
- The interim hand-authored landing + IA slots — [[T-SHEL-docs-landing-and-ia]].
- Finalizing the catalog data and applying the flagged snippet corrections —
  [[T-CTLG-example-catalog-finalize]].
- The GitHub Pages deploy / publish — [[T-PAGE-docs-pages-deploy]].
- The `daemon` / local web-UI — [[D-0012-distribution-single-exec-and-web-ui]] (M-0009).

## Dependencies

Depends on [[T-7UTE-astro-docs-site]] (the shell), [[T-SHEL-docs-landing-and-ia]] (the IA slots +
the interim landing it supersedes), and [[T-CTLG-example-catalog-finalize]] (the
`docs/catalog/*.yaml` data it renders). Governed by [[D-0010-monorepo-tooling]].
