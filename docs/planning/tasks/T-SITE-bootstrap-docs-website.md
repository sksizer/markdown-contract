---
type: task
schema_version: "5"
id: T-SITE
status: in-progress
created: '2026-06-28'
last_reviewed: '2026-07-03'
related:
  - "[[M-0006-documentation-site]]"
  - "[[M-0007-example-use-case-catalog]]"
  - "[[D-0010-monorepo-tooling]]"
  - "[[D-0012-distribution-single-exec-and-web-ui]]"
depends_on:
  - "[[T-7UTE-astro-docs-site]]"
  - "[[T-SHEL-docs-landing-and-ia]]"
  - "[[T-CTLG-example-catalog-finalize]]"
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
readiness_verified_at: '2026-07-03T16:59:12Z'
prs:
  - https://github.com/sksizer/markdown-contract/pull/196
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
| `sites/docs/src/content.config.ts` | modify | a content-collection loader that reads `docs/catalog/*.yaml`. |
| `sites/docs/src/content/docs/index.md` | modify | the data-driven landing (hero tour), superseding the T-SHEL interim landing. |
| `sites/docs/astro.config.mjs` | modify | populate the sidebar IA slots with the generated category pages. |
| artifact regression check | new | render each `artifact` and diff against real CLI/library output. |

## Acceptance criteria

- [ ] AC-1: Every category in `docs/catalog/*.yaml` (8 files) renders as a section, and every
  example entry in those files renders with its `artifact` and a link to its `builds_on`
  prerequisite — **generated from** the YAML, not hand-copied.
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

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-03. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `sites/docs/scripts/generate.ts` emits one page per example from
  `docs/catalog/*.yaml` (117 generated pages; artifact verbatim, `builds_on` cross-links,
  rank order); regenerated on every `dev`/`build`, generated files gitignored.
- AC-2: agent-manual — interim `index.md` removed from tracking; the generator emits the
  landing with a rank-1-per-category hero tour (116 unique example links verified in built
  `dist/index.html`).
- AC-3: agent-manual — built sidebar inspected in `dist/index.html`: Overview → Introduction,
  then a single top-level **Examples** group holding the eight category sub-groups in spine
  order (Starlight 0.41 needed `items: [{ autogenerate }]` nesting).
- AC-4: auto — `moon run docs:check-artifacts` (deps `core:build`): 108 artifacts — 91 pass,
  5 baselined known failures (genuine catalog data bugs, reasons recorded in
  `scripts/checks/known-failures.ts`), 12 skipped (9 planned, 3 mixed with no command);
  exits 1 on unexpected failures and stale baseline entries.
- AC-5: auto — `bunx moon run docs:build` green (118 pages incl. 404), verified from scratch
  and re-verified post-implementation; quality gate `OK 5/5` baseline-diffed against
  `origin/main`.

### What worked

- The catalog YAML schema (shaped by T-CTLG for content-collection consumption) mapped
  directly onto page generation — no data massaging needed.
- The shell's pre-declared sidebar slots and moon task wiring (T-7UTE) made the IA
  restructure a config-only change.
- The baseline-gated quality run isolated the branch cleanly from pre-existing core lint
  drift.

### Friction and automation gaps

- The readiness gate flagged three spec defects the relevance check missed (an annotation
  inside a Files-to-touch Location cell, an `index.(md|mdx)` alternation as a path, an AC
  quantifier whose pinning glob sat on the following line) — the quantifier resolver reads
  line-scoped, so multi-line ACs can false-positive; worth documenting in the
  implementation-ready contract or widening the resolver's window.
  → [[T-0O6S-widen-quantifier-resolver-ac-window]]
- `sdlc quality run` false-FAILs on `core:lint` under the stock invocation: the runner's
  1MB `spawnSync` maxBuffer overflows on moon's ANSI-inflated replay of biome's 306-warning
  stream (ENOBUFS → SIGTERM → FAIL), reproduced identically on main. Workaround
  `MOON_CACHE=off NO_COLOR=1`; upstream fix: raise maxBuffer or stream output — and core's
  warning count is the other lever (T-D8TE ratchet).
  → [[T-ADNR-quality-runner-maxbuffer-stream-output]]
- The artifact check surfaced 5 genuine catalog data bugs: DIALECT-03/07/08/10 import
  `extractVaultRefs` from `"markdown-contract"` but the package root never re-exports it
  (export chain stops at the internal dialect barrel), and EMBED-AND-CI-01 calls
  `sections()` with no arguments against a two-required-arg signature — catalog data
  corrections (or a deliberate `extractVaultRefs` public export) owned by the catalog side.
  → [[T-E698-export-extractvaultrefs-from-package-root]]

### Spawned follow-up tasks

- [[T-0O6S-widen-quantifier-resolver-ac-window]] (https://github.com/sksizer/dev/pull/617) —
  widen the task-work readiness gate's AC quantifier resolver beyond line scope, spawned
  (Upstream-plugin, `sdlc-meta`).
- [[T-ADNR-quality-runner-maxbuffer-stream-output]] (https://github.com/sksizer/dev/pull/618) —
  quality runner raises its `spawnSync` maxBuffer or streams child output, spawned
  (Upstream-plugin, `sdlc-meta`).
- [[T-E698-export-extractvaultrefs-from-package-root]] — the catalog data bugs trace to the
  missing package-root export that task already covers, linked (the residual EMBED-AND-CI-01
  `sections()` arity correction is recorded in its Discovery context and in
  `sites/docs/scripts/checks/known-failures.ts`).
