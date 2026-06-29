---
type: task
schema_version: '5'
id: T-7UTE
status: open/ready
created: '2026-06-28'
related:
- '[[M-0006-documentation-site]]'
- '[[M-0005-monorepo-tooling]]'
depends_on:
- '[[T-WKSP-bun-workspace-split]]'
tags:
- docs
- tooling
need_human_review: false
impact: medium
complexity: large
---
# Stand up an Astro + Starlight documentation site for markdown-contract (overview, contract format, CLI, and typed-consumption API)

> ASSUMPTIONS (extrapolated by sub-agent — review carefully):
> - **SCOPE UPDATE (M-0006 readiness):** build the site as a **moon `apps/docs` project** in the Bun workspace (depends on [[T-WKSP-bun-workspace-split]]), with the Bun toolchain via moon — per [[D-0010-monorepo-tooling]] and M-0006's "builds as a moon project" success criterion. This **supersedes** the standalone-`website/` / npm / "not a root workspace" assumptions and AC-9 below; align the project directory (`apps/docs`), scaffolding, and CI to moon + Bun at implementation. GitHub Pages remains the deploy target.
> - **Framework: Astro + Starlight** (Astro's official docs framework) rather than plain Astro — it ships sidebar nav, search, and the docs content-collection out of the box, so the work is content authoring, not chrome building.
> - **Site directory: `website/`** (a new top-level dir), chosen over `docs/` because `docs/` already holds this repo's self-hosted SDLC planning corpus (`docs/planning/`), and over `docs-site/` for brevity. `website/` reads unambiguously as "the published site" next to the planning `docs/`.
> - **Standalone sibling package, not a root workspace** — `website/` carries its own manifest / lockfile and is never added to the root package's workspaces, keeping the published library (`files: ["dist"]`) and its dependency tree free of the Astro toolchain.
> - **Deploy target: GitHub Pages project site** at `https://sksizer.github.io/markdown-contract/`, built and published by a new GitHub Actions workflow (`withastro/action` + `actions/deploy-pages`).
> - **First pages ported:** overview (from `README.md` + `docs/planning/vision.md`), getting-started (from `README.md`), a contract-format guide (from `provenance/d0014/proposed-shape.md`), a validation-and-findings guide, a typed-consumption guide, a CLI reference (from `src/cli/run.ts`), and a declarative-contracts reference (from `contracts/`).
> - **Toolchain: Node 20 + npm**, matching the repo's `engines` and existing CI.

## Goal

markdown-contract's documentation today is scattered across `README.md`, a
design appendix under `provenance/d0014/`, and a self-hosted SDLC planning
corpus under `docs/planning/` — there is no rendered, navigable site a
prospective user can read to learn the contract format, the CLI, or the typed
read-model. Stand up an Astro + Starlight documentation site under a new
`website/` directory that surfaces this project's real content as a small,
coherent page set, and wire a GitHub Pages workflow so it publishes on every
push to `main`.

## Today

There is no documentation website; the prose that would seed one already
exists, spread across the repo.

| Location | Role today |
|---|---|
| `README.md` | The only narrative entry point — pitch, layout table, packaging notes, and the install/build/test/CLI quickstart. No rendered site. |
| `docs/planning/vision.md` | The vision narrative ("the bet", proof-by-dogfooding); source for the site's overview page. |
| `docs/planning/` | The self-hosted SDLC planning corpus (capabilities, decisions, drivers, milestones, tasks) — internal planning, not published end-user docs. |
| `provenance/d0014/proposed-shape.md` | The forward-looking API spec — package layout, public surface, the structure/content/rule planes, and the mdast-to-projection-to-model pipeline; primary source for the contract-format and API guides. |
| `provenance/d0014/review-checklist.md` | The plan plus decision log behind the design; supporting reference material. |
| `contracts/README.md` | Documents the declarative YAML contracts and the per-type contract files; source for the declarative-contracts reference page. |
| `src/cli/run.ts` | Implements the CLI surface (the `validate` and `init` commands, the `--format` flag accepting human/json/sarif, and exit codes 0/1/2); source of truth for the CLI reference page. |
| `.github/workflows/ci.yml` | Existing CI (typecheck plus test on PRs and pushes to `main`); the new deploy workflow sits beside it. |
| `.gitignore` | Ignores `node_modules/` and `dist/` for the root package; carries no entries for the site's build artifacts yet. |

## Proposed

A new top-level `website/` directory holds an Astro + Starlight project — its
own package manifest, `astro.config.mjs`, TypeScript config, and a
`src/content/docs/` content collection — that builds to a static site under
`website/dist/`. It is a **standalone sibling package**: not added to the root
package as a workspace, so the published library's dependency tree and
`files: ["dist"]` allow-list are untouched and the Astro toolchain never ships
to npm. The site's `dev` / `build` / `preview` scripts are run from inside the
`website/` directory.

The content collection surfaces this project's real material as a small,
navigable page set, grouped in the Starlight sidebar into **Guides** and
**Reference** (page filenames are bare; the parenthetical names the source):

- `index.mdx` — Overview / landing (from `README.md` intro + `docs/planning/vision.md`).
- `getting-started.md` — Install, build, test, and CLI quickstart (from `README.md` "Develop" / "Packaging").
- `guides/` `contract-format.md` — The two-plane model: structure plane (tree grammar over sections plus block kinds), content plane (Zod over each block's data), and the named-rule registry; the mdast-to-projection-to-model pipeline (from `provenance/d0014/proposed-shape.md` and `docs/planning/vision.md`).
- `guides/` `validation-and-findings.md` — The `validate()` door and the Finding shape (id / level / source position) (from `provenance/d0014/proposed-shape.md` and `src/core/finding.ts`).
- `guides/` `typed-consumption.md` — The `read()` typed model / out-of-model (OOM), and the `./declarative` export (from `provenance/d0014/proposed-shape.md` and the root package exports).
- `reference/` `cli.md` — The `validate` and `init` commands, the `--format` flag (human/json/sarif), and exit codes 0/1/2 (from `src/cli/run.ts`).
- `reference/` `declarative-contracts.md` — The declarative YAML contracts and `init` scaffolding (from `contracts/README.md` and the per-type contract files).

A new `.github/workflows/deploy-docs.yml` builds the site (Node 20, install
plus build scoped to `website/`) and publishes it to GitHub Pages via
`actions/deploy-pages`, triggered on pushes to `main` that touch `website/**`
plus a manual `workflow_dispatch`. The root `.gitignore` ignores the site's
`website/node_modules/`, `website/dist/`, and `website/.astro/` cache, and
`README.md` gains a link to the published site.

## Approach

1. Scaffold the Starlight starter into `website/` (e.g. `npm create astro@latest website -- --template starlight --typescript strict --no-install --no-git`), then delete the starter's placeholder example pages so only this project's pages remain. Confirm the generated manifest declares `astro` plus `@astrojs/starlight` and exposes `dev` / `build` / `preview` scripts.
2. Configure `website/astro.config.mjs` for a GitHub Pages project site: set the `site` to `https://sksizer.github.io` and the `base` to `/markdown-contract/`, and register `starlight()` with a title of "markdown-contract", a GitHub social link, and a `sidebar` declaring two groups — **Guides** and **Reference** — listing the pages enumerated in `## Proposed`.
3. Wire the content-collection config (`website/src/content.config.ts`) using Starlight's `docsLoader()` plus `docsSchema()` so pages under `website/src/content/docs/` are validated and rendered by Starlight.
4. Author the page set under the `website/src/content/docs/` collection (Overview, Getting started, the three guides, the two reference pages), porting prose from the real sources cited per page in `## Proposed`. Keep code samples copied verbatim from the repo (CLI usage, exports) so the docs match shipping behavior.
5. Add `.github/workflows/deploy-docs.yml`: a single job on `ubuntu-latest` — `actions/checkout@v4`, `actions/setup-node@v4` pinned to Node 20, install plus build via `withastro/action@v3` (with `path: website`), then `actions/upload-pages-artifact` into `actions/deploy-pages@v4`. Set `permissions` to `contents: read`, `pages: write`, `id-token: write`, the `github-pages` environment, and triggers `push` to `main` filtered on `website/**` plus `workflow_dispatch`.
6. Add root `.gitignore` entries for `website/node_modules/`, `website/dist/`, and `website/.astro/`.
7. Add a "Documentation" link to `README.md` pointing at the published site (`https://sksizer.github.io/markdown-contract/`) and the `website/` source.
8. Verify locally: from `website/`, run install then build (emits `website/dist/index.html`) and preview; spot-check that every sidebar entry resolves and the ported content renders.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `website/` | new | Scaffolded Astro + Starlight project root — its own package manifest (astro plus @astrojs/starlight deps; dev/build/preview scripts), tsconfig, a short site README, and public/ assets (favicon). |
| `website/astro.config.mjs` | new | Astro config: site plus base for GitHub Pages, the starlight() integration, and the sidebar groups (Guides, Reference). |
| `website/src/content.config.ts` | new | Content-collection config wiring Starlight's docsLoader() plus docsSchema(). |
| `website/src/content/docs/` | new | Starlight content collection — the initial page set from `## Proposed`: index.mdx, getting-started.md, the guides/ group (contract-format, validation-and-findings, typed-consumption), and the reference/ group (cli, declarative-contracts). |
| `.github/workflows/deploy-docs.yml` | new | GitHub Pages workflow building the `website/` site and publishing it via actions/deploy-pages. |
| `.gitignore` | modify | Ignore `website/node_modules/`, `website/dist/`, and `website/.astro/`. |
| `README.md` | modify | Add a "Documentation" link to the published site and the `website/` source. |

## Acceptance criteria

- [ ] AC-1: `website/` contains an Astro + Starlight project — the site manifest declares `astro` and `@astrojs/starlight` as dependencies and exposes `dev` / `build` / `preview` scripts, and `website/astro.config.mjs` registers the `starlight()` integration.
- [ ] AC-2: From `website/`, installing dependencies then running the build exits 0 and emits a static site to `website/dist/` containing a root `index.html`.
- [ ] AC-3: The content collection under `website/src/content/docs/` contains exactly this initial page set: `index.mdx`, `getting-started.md`, a `guides/` group (`contract-format.md`, `validation-and-findings.md`, `typed-consumption.md`), and a `reference/` group (`cli.md`, `declarative-contracts.md`).
- [ ] AC-4: Every page matching `website/src/content/docs/**/*.{md,mdx}` is reachable from a Starlight sidebar group declared in `website/astro.config.mjs` (no orphan pages).
- [ ] AC-5: Content reflects this repo's real material — the CLI reference page (`cli.md`) documents the actual `validate` and `init` commands, the `--format` flag accepting human/json/sarif, and exit codes 0/1/2 as implemented in `src/cli/run.ts`; the contract-format guide (`contract-format.md`) describes the structure plane, content plane, and named-rule registry.
- [ ] AC-6: `.github/workflows/deploy-docs.yml` builds the site and publishes to GitHub Pages via `actions/deploy-pages` with `permissions` granting `pages: write` and `id-token: write` and the `github-pages` environment, triggered on push to `main` filtered on `website/**` plus `workflow_dispatch`.
- [ ] AC-7: Root `.gitignore` ignores `website/node_modules/`, `website/dist/`, and `website/.astro/`; `git status` after a local build shows no site build artifacts staged.
- [ ] AC-8: `README.md` links to the published documentation site (`https://sksizer.github.io/markdown-contract/`).
- [ ] AC-9: The site is independent of the library package — the root package's `files` field still lists only `dist` (the website is never published to npm), and `website/` is not registered as a root workspace.

## Out of scope

- Implementing or changing the library/CLI itself — this task only documents the existing surface; any behavior change is a separate task.
- Versioned / multi-version docs, internationalization, or a search backend beyond Starlight's built-in default.
- A custom domain, DNS, or `CNAME` configuration for GitHub Pages (the default github.io project URL is used).
- Auto-generating API reference from TypeScript types (e.g. a TypeDoc integration) — the reference pages are hand-authored from existing sources for the first pass.
- Porting the full SDLC planning corpus (`docs/planning/`) or the `provenance/d0014/` design appendix verbatim into the site.
- Branch-protection / required-status-check wiring for the deploy workflow (configured in repo settings, not the workflow file).

## Dependencies

- GitHub repository **Pages** must be enabled with the **GitHub Actions** source (repository Settings, Pages) for `actions/deploy-pages` to publish; this is a one-time repo-settings step outside the workflow file.
- **Risk:** the repo's GitHub Actions are currently billing-blocked, so the deploy workflow will not run (and the site will not publish) until Actions billing is unblocked. This does not block authoring the spec, scaffolding the site, or building/previewing it locally — only the live publish step waits on it.

## Discovery context

Raised while grounding the project's documentation surface: the design and
usage prose already exist (`README.md`, `docs/planning/vision.md`,
`provenance/d0014/`, `contracts/`) but there is no rendered site a user can
browse. A Starlight site lets that existing content be navigated and published
without rewriting it.
