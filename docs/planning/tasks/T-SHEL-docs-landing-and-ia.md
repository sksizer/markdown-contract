---
type: task
schema_version: '5'
id: T-SHEL
status: closed/done
created: '2026-06-30'
last_reviewed: '2026-07-03'
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
prs:
- https://github.com/sksizer/markdown-contract/pull/181
completion_note: 'Shipped via #181.'
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

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-02. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — replaced `apps/docs/src/content/docs/index.md` with a real
  overview (markdown-as-data; the structure/content/rules planes; a verbatim
  getting-started snippet copied from `README.md`) sourced from `README.md` +
  `docs/planning/vision.md`; confirmed the placeholder is gone and the overview text
  renders in `apps/docs/dist/index.html`.
- AC-2: agent-manual — set the Starlight `sidebar` in `astro.config.mjs` to the 8
  M-0007 catalog category slots (empty `items: []`) plus a leading Overview group;
  confirmed all category labels (CLI Quickstart, Scaffold & Guard, Declarative YAML,
  Contracts in Code, Consume as Data, Dialect, Embed & Automate, Real-World Schemas)
  render in the built nav via grep over `dist/index.html`.
- AC-3: auto — `bunx moon run docs:build` stays green and emits `apps/docs/dist/index.html`
  from the landing page as the site root (verified independently, not just by the sub-agent).
- AC-4: agent-manual — no catalog/guide/reference prose added; the 8 category slots are
  labelled but empty, keeping the shell bare (confirmed by reviewing the two authored files).

### What worked

- The scaffold from [[T-7UTE-astro-docs-site]] matched the task's `## Today` exactly
  (placeholder `index.md` + declared-but-generic sidebar), so implementation was a clean
  replace with no drift to reconcile.
- The M-0007 milestone already carried the canonical category label/key table, so the
  sidebar IA slots dropped in verbatim — no design decision left to invent.
- `moon run docs:build` gave a fast, unambiguous green signal for AC-3, and the core
  quality gate (`OK 5/5`) confirmed the docs-only change left `packages/core` untouched.

### Friction and automation gaps

- The project's `quality_checks:` in `sdlc.yaml` cover only `core:` verbs, so `docs:build`
  (the load-bearing check for AC-3) is outside the gate and had to be run manually — a
  `docs:build` verb (or a docs-scoped quality profile) would let the gate cover doc-site tasks.
  → [[T-MWBG-quality-gate-covers-docs-build]]
- Step 7's baseline-gated `quality run` defaults its `--baseline-dir` to the worktree cwd,
  but Step 3a writes the baseline into the main repo's `.sdlc/quality-baselines/`; the first
  gate invocation failed `baseline not found` until `--baseline-dir <main-repo>/...` was passed
  explicitly — task-work Step 7 should pass the main-repo baseline dir when running from a worktree.
  → [[T-P6OB-task-work-baseline-dir-main-repo]]

### Spawned follow-up tasks

- [[T-MWBG-quality-gate-covers-docs-build]]
  (https://github.com/sksizer/markdown-contract/pull/180) — Local: add a `docs:build` verb
  (or docs-scoped quality profile) to `sdlc.yaml` `quality_checks:` so the gate covers
  doc-site tasks — spawned.
- [[T-P6OB-task-work-baseline-dir-main-repo]]
  (https://github.com/sksizer/dev/pull/605) — Upstream-plugin (`sdlc-meta`): task-work Step 7
  should default `--baseline-dir` to the main-repo baseline dir when run from a worktree — spawned.
