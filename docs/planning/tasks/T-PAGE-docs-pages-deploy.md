---
type: task
schema_version: '5'
id: T-PAGE
status: closed/done
created: '2026-06-30'
last_reviewed: '2026-07-02'
related:
- '[[M-0006-documentation-site]]'
- '[[D-0010-monorepo-tooling]]'
depends_on:
- '[[T-7UTE-astro-docs-site]]'
tags:
- docs
- ci
- deploy
- github-pages
- moon
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
prs:
- https://github.com/sksizer/markdown-contract/pull/184
completion_note: 'Shipped via #184.'
---
# Wire the GitHub Pages deploy workflow for `sites/docs` (moon/Bun build → Pages)

## Goal

Publish `sites/docs` to GitHub Pages via a workflow that builds the site through **moon** on the
**Bun** toolchain and deploys with `actions/deploy-pages`. The live publish is **blocked on
GitHub Actions billing** — the workflow and the one-time Pages repo setting can be authored and
reviewed now; the actual deploy runs once billing clears. Isolating the publish here lets the
rest of M-0006 (scaffold [[T-7UTE-astro-docs-site]], bare shell [[T-SHEL-docs-landing-and-ia]])
reach "green locally" without waiting on billing.

## Today

`sites/docs` builds locally via `moon run docs:build` ([[T-7UTE-astro-docs-site]]); there is no
deploy workflow and GitHub Pages is not wired. The repo's GitHub Actions are currently
**billing-blocked** (jobs do not start: "recent account payments have failed or your spending
limit needs to be increased"), so any new workflow will not execute until that is resolved.

## Proposed

- A new **`.github/workflows/deploy-docs.yml`**: triggered on push to `main` filtered to
  `sites/docs/**` (plus `workflow_dispatch`); bootstraps with **Bun** (`setup-bun` +
  `bun install`), builds via `moon run docs:build`, uploads `sites/docs/dist/` with
  `actions/upload-pages-artifact`, and publishes with `actions/deploy-pages`. `permissions` grant
  `pages: write` + `id-token: write`; it uses the `github-pages` environment.
- The one-time repo setting (documented, not in the workflow file): **Pages source = GitHub
  Actions**.
- `README.md` gains a link to the published URL.

## Approach

1. Author `.github/workflows/deploy-docs.yml` as above — **Bun-bootstrapped**, consistent with the
   M-0005 CI model ([[D-0010-monorepo-tooling]]), not `setup-node`/`npm`.
2. Confirm `sites/docs` `astro.config.mjs` `base`/`site` match the Pages project URL (set in
   [[T-7UTE-astro-docs-site]]).
3. Document the one-time **Settings → Pages → Source: GitHub Actions** step.
4. **Once Actions billing clears:** enable Pages, run the workflow (push or `workflow_dispatch`),
   confirm the public URL serves the bare shell, and link it from `README.md`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.github/workflows/deploy-docs.yml` | new | Bun-bootstrapped Pages workflow: `moon run docs:build` → upload-pages-artifact → deploy-pages. |
| `README.md` | modify | Link to the published documentation URL. |
| `sites/docs/astro.config.mjs` | modify | Confirm `base`/`site` match the Pages project URL. |

## Acceptance criteria

- [ ] AC-1: `deploy-docs.yml` builds `sites/docs` via `moon run docs:build` and publishes via
  `actions/deploy-pages`, with `permissions` granting `pages: write` + `id-token: write` and the
  `github-pages` environment, triggered on push to `main` filtered to `sites/docs/**` plus
  `workflow_dispatch`.
- [ ] AC-2: The workflow bootstraps with **Bun** (`setup-bun` + `bun install`) and runs the build
  through moon — consistent with the M-0005 CI model, not `setup-node`/`npm`.
- [ ] AC-3 *(billing-gated)*: once Actions billing is unblocked and Pages is set to the GitHub
  Actions source, the workflow publishes the shell to its public URL and `README.md` links it.
  Until billing clears, this AC is explicitly deferred — authoring/review is the deliverable.

## Out of scope

- Custom domain / DNS / `CNAME` (the default `github.io` project URL is used).
- The example catalog content — [[M-0007-example-use-case-catalog]].
- Resolving the GitHub Actions billing itself — a repo-settings / account action, outside this
  task and outside the codebase.

## Dependencies

- Depends on [[T-7UTE-astro-docs-site]] (a buildable `sites/docs`). **Blocked at publish time by
  GitHub Actions billing** — author and review now, deploy when it clears. Governed by
  [[D-0010-monorepo-tooling]] (Bun-bootstrapped CI through moon).

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-03. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — inspected `.github/workflows/deploy-docs.yml`: builds via `bunx moon run docs:build`, publishes with `actions/deploy-pages@v4`, `permissions` grant `pages: write` + `id-token: write` (+ `contents: read`), `deploy` job uses the `github-pages` environment, triggered on `push` to `main` filtered to `sites/docs/**` plus `workflow_dispatch`. YAML parsed clean.
- AC-2: agent-manual — the `build` job bootstraps with Bun (`oven-sh/setup-bun@v2`, `bun-version: 1.3.14`) + `bun install --frozen-lockfile` and builds through moon, mirroring `.github/workflows/ci.yml` (no `setup-node`/`npm`).
- AC-3: deferred-user — billing-gated. GitHub Actions are billing-blocked, so the live publish cannot be run; the workflow file + README link + the documented one-time "Settings → Pages → Source: GitHub Actions" prerequisite are the reviewable deliverable. Once billing clears and Pages source is set, an operator must trigger the workflow and confirm the public URL (`https://sksizer.github.io/markdown-contract/`) serves the shell.

### What worked

- Quality gate stayed green (`OK 5/5`, no new drift) — the change is CI-config + README only, so the `core:*` verbs were unaffected.
- The existing `ci.yml` was a precise template for the Bun/moon bootstrap idiom (setup-bun pin, `bun install --frozen-lockfile`, proto toolchain cache), so the deploy workflow reused a proven, house-consistent shape rather than inventing one.
- `astro.config.mjs` already carried the correct `site`/`base` from T-7UTE, so the config-confirmation touchpoint needed no edit — no churn.

### Friction and automation gaps

- Step 7's baseline-gated quality run failed first attempt with `baseline not found` — the baseline is written under the main repo's `.sdlc/quality-baselines/` (Step 3a) but the gate, run from the worktree, defaults `--baseline-dir` to the worktree's `.sdlc/`. Had to pass `--baseline-dir <main-repo>/.sdlc/quality-baselines` explicitly. The task-work Step 7 invocation should either resolve the baseline dir against the main repo (superproject) automatically, or the skill prose should call out passing `--baseline-dir` explicitly when running the gate from inside a worktree. → [[T-W2TM-baseline-dir-resolves-from-superproject]]

### Spawned follow-up tasks

- [[T-W2TM-baseline-dir-resolves-from-superproject]] (https://github.com/sksizer/dev/pull/608) — task-work Step 7's baseline gate should resolve `--baseline-dir` against the superproject when run from a worktree (Upstream-plugin, spawned).
