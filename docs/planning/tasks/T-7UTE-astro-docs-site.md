---
type: task
schema_version: '5'
id: T-7UTE
status: in-progress
created: '2026-06-28'
last_reviewed: '2026-07-02'
related:
- '[[M-0006-documentation-site]]'
- '[[M-0005-monorepo-tooling]]'
- '[[D-0010-monorepo-tooling]]'
depends_on:
- '[[T-WKSP-bun-workspace-split]]'
tags:
- docs
- website
- astro
- starlight
- moon
need_human_review: true
impact: medium
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-07-02T18:43:44Z'
---
# Scaffold the `apps/docs` Astro + Starlight project as a moon workspace member

## Goal

Stand up `apps/docs` as a **moon project**: an Astro + Starlight site that builds via the
moon **Bun** toolchain to static output, with an empty-but-wired content collection and
sidebar IA ready to receive pages. This is the **shell only** — the bare-shell landing page
is [[T-SHEL-docs-landing-and-ia]], the GitHub Pages publish is [[T-PAGE-docs-pages-deploy]],
and the catalog content is [[M-0007-example-use-case-catalog]] / [[T-SITE-bootstrap-docs-website]].
Closes M-0006's "builds as a moon project" success criterion.

## Today

moon is adopted over the single root project ([[T-MOON-adopt-moon-monorepo]], shipped #61);
`.moon/workspace.yml` still maps `markdown-contract: '.'` and there is **no `apps/` directory**
— that slot is created by [[T-WKSP-bun-workspace-split]] (`packages/core` + `apps/web`), which
has not landed. There is no documentation site. The prose that would seed one already exists,
spread across the repo (`README.md`, `docs/planning/vision.md`, `provenance/d0014/`,
`contracts/`), but nothing renders it.

## Proposed

A new **`apps/docs`** moon project holding an Astro + Starlight site:

- Its own package manifest (`astro` + `@astrojs/starlight`), `astro.config.mjs`, tsconfig, and a
  `src/content/docs/` collection wired with Starlight's `docsLoader()` + `docsSchema()`.
- `astro.config.mjs` sets `site` + `base` for the eventual GitHub Pages project URL and registers
  `starlight()` with the project title and **sidebar groups declared but empty** (the IA slots).
- A **placeholder** `index` page so the build is green; real content lands in
  [[T-SHEL-docs-landing-and-ia]].
- Registered in moon's project map (`docs: 'apps/docs'`) with a `moon.yml` `build` task on the
  **bun** toolchain, so `moon run docs:build` emits the static site. The npm library
  (`packages/core`) is untouched — `apps/docs` is a workspace sibling, never published to npm.

## Approach

1. Land **after** [[T-WKSP-bun-workspace-split]] so the `apps/` slot and the Bun workspace exist.
2. Scaffold the Starlight starter into `apps/docs` (e.g. `bun create astro@latest apps/docs --
   --template starlight --typescript strict --no-install --no-git`), then delete the starter's
   placeholder example pages, leaving only a minimal `index` placeholder.
3. Register the project: add `docs: 'apps/docs'` to `.moon/workspace.yml` `projects`, and add
   `apps/docs/moon.yml` with a `build` task (bun toolchain, `inputs` = the site sources, `outputs`
   = `dist`).
4. Configure `apps/docs/astro.config.mjs`: `site` = the GitHub Pages origin, `base` =
   `/markdown-contract/`, and `starlight()` with the title and the **empty** sidebar groups (the
   IA slots [[T-SHEL-docs-landing-and-ia]] will populate).
5. Wire `apps/docs/src/content.config.ts` with `docsLoader()` + `docsSchema()`.
6. Confirm `moon run docs:build` exits 0 and emits `apps/docs/dist/index.html`.
7. Gitignore `apps/docs/node_modules/`, `apps/docs/dist/`, and `apps/docs/.astro/`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/docs/` | new | Astro + Starlight project — manifest (astro + @astrojs/starlight), astro.config.mjs, tsconfig, content collection, placeholder index. |
| `apps/docs/moon.yml` | new | moon `build` task on the bun toolchain (inputs/outputs scoped to `apps/docs`). |
| `.moon/workspace.yml` | modify | Add `docs: 'apps/docs'` to the `projects` map. |
| `.gitignore` | modify | Ignore `apps/docs/node_modules/`, `apps/docs/dist/`, `apps/docs/.astro/`. |
| `bun.lock` | modify | Re-resolved by `bun install` to include the new workspace member. |

## Acceptance criteria

- [ ] AC-1: `apps/docs` is a moon project (in `.moon/workspace.yml` `projects`) and
  `moon run docs:build` exits 0 on the **bun** toolchain, emitting a static site to
  `apps/docs/dist/` with a root `index.html`.
- [ ] AC-2: `apps/docs/astro.config.mjs` registers `starlight()` with `site` + `base` set for the
  GitHub Pages project URL and declares the sidebar IA groups (empty is fine at this stage).
- [ ] AC-3: The content collection under `apps/docs/src/content/docs/` is wired with
  `docsLoader()` + `docsSchema()`; a placeholder `index` renders.
- [ ] AC-4: `apps/docs/node_modules/`, `apps/docs/dist/`, and `apps/docs/.astro/` are gitignored;
  `git status` after a build shows no site artifacts staged.
- [ ] AC-5: `packages/core` and the npm artifact are unchanged — `apps/docs` is a workspace
  sibling and is never published to npm.

## Out of scope

- The landing/overview page content and the final IA labels — [[T-SHEL-docs-landing-and-ia]].
- The GitHub Pages deploy workflow and the live publish — [[T-PAGE-docs-pages-deploy]].
- The example catalog content — [[M-0007-example-use-case-catalog]] / [[T-SITE-bootstrap-docs-website]].
- Changing the library/CLI itself — this task only adds the site project.

## Dependencies

- Depends on [[T-WKSP-bun-workspace-split]] (creates the `apps/` slot and the Bun workspace).
  Governed by [[D-0010-monorepo-tooling]] (moon + Bun; `apps/docs` builds as a moon project).

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-02. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — `MOON_CACHE=off bunx moon run docs:build` exits 0 and emits `apps/docs/dist/index.html` (19434 bytes); `docs: "apps/docs"` present in `.moon/workspace.yml`, `moon.yml` build task on `toolchain: 'bun'` with `outputs: ['dist']`.
- AC-2: agent-manual — `apps/docs/astro.config.mjs` registers `starlight()` with `site: 'https://sksizer.github.io'` + `base: '/markdown-contract/'` and four declared-but-empty sidebar IA groups (Overview/Guides/Examples/Reference); Starlight 0.41.2 built green with `items: []`.
- AC-3: agent-manual — `src/content.config.ts` wires `docsLoader()` + `docsSchema()`; placeholder `src/content/docs/index.md` renders to `dist/index.html`.
- AC-4: auto — `git check-ignore` confirms `apps/docs/{node_modules,dist,.astro}/` ignored; `git status --porcelain` shows no site artifacts staged after a build.
- AC-5: auto — `git diff --name-only origin/main -- packages/core` is empty (untouched); docs package is `private: true`, never published to npm.

### What worked

- Baseline-gated quality run stayed green (`OK 5/5`, pre-existing ignored) — adding a new workspace member broke none of the `core:`-scoped gates.
- Astro/Starlight scaffold + `bun install` + `moon run docs:build` composed cleanly on the bun toolchain; empty sidebar groups needed no autogenerate fallback.

### Friction and automation gaps

- Starlight scaffolder drops a `CLAUDE.md -> AGENTS.md` symlink; deleting the starter `AGENTS.md` left a dangling symlink that `find -type f`/`cat` skip but `git ls-files --others` still tracks — worktree init or a scaffold-cleanup step should sweep dangling symlinks so a broken link can't get committed. → [[worktree-init-sweeps-dangling-symlinks]]
- The quality baseline is written under the main repo's `.sdlc/quality-baselines/` but Step 7's gate defaults `--baseline-dir` to the worktree's `.sdlc/`, so the first baseline-gated run failed `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed — task-work Step 7 should pass the main-repo baseline dir explicitly (or the executor should resolve the superproject `.sdlc/`). → [[task-work-step7-threads-baseline-dir]]
- preflight_permissions reported `Bash(bun:*)`/`Write`/`Edit` as hard gaps though bun and file-mutation worked throughout — the static-settings probe under-reported this session's grants; a probe that also consults the live/effective permission mode would avoid a spurious gate. → [[preflight-permissions-checks-effective-mode]]

### Spawned follow-up tasks

- [[worktree-init-sweeps-dangling-symlinks]] (https://github.com/sksizer/dev/pull/601) — spawned; Upstream-plugin (sdlc). Sweep dangling symlinks during task-work worktree init so a broken link can't be committed.
- [[task-work-step7-threads-baseline-dir]] (https://github.com/sksizer/dev/pull/598) — linked to existing upstream PR; Upstream-plugin (sdlc). Thread the main-repo quality-baseline dir into worktree gate runs.
- [[preflight-permissions-checks-effective-mode]] (https://github.com/sksizer/dev/pull/603) — spawned; Upstream-plugin (sdlc). Probe consults the live/effective permission mode instead of only static settings.

