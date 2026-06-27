---
type: task
schema_version: '5'
id: T-VQ1N
status: open/ready
created: '2026-06-27'
related: []
tags:
- ci
- testing
need_human_review: false
impact: medium
complexity: small
readiness_verified_at: '2026-06-27T17:02:50Z'
---
# Add a CI workflow that runs the quality checks (test, typecheck) on PRs and pushes to main

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-06-27. Review the Goal, Approach, Today,
> Files-to-touch, and Acceptance-criteria carefully before trusting it.

## Goal

The project's quality checks (`npm run test`, `npm run typecheck`) are
declared in `sdlc.yaml` and pass locally, but nothing runs them
automatically — a pull request can regress the test suite or the type
checker with no signal until someone runs the checks by hand. Add a CI
workflow so every PR and every push to `main` runs the checks, making
"green before merge" the default and catching regressions at the PR
boundary instead of after they land.

## Today

There is no `.github/` directory and no continuous-integration
configuration. The quality checks exist and pass, but run only when a
human invokes them locally; nothing enforces them on PRs or pushes.

| Location | Role today |
|---|---|
| `package.json` | Defines the `test` (`vitest run`), `typecheck` (`tsc --noEmit`), and `build` scripts that make up the quality checks |
| `sdlc.yaml` | Declares `quality_checks: [npm run test, npm run typecheck]` — currently run only locally by task-work, never in CI |
| `vitest.config.ts` | Vitest configuration discovering `src/**/*.test.ts` and `tests/**/*.test.ts`; `npm run test` runs the suite |

## Proposed

A `.github/workflows/ci.yml` GitHub Actions workflow runs on every
`pull_request` and every `push` to `main`. The job checks out the repo,
sets up a pinned Node version, installs dependencies with `npm ci`, and
runs `npm run typecheck` and `npm run test` as distinct steps so a failure
names which check broke. `README.md` carries a CI status badge linking to
the workflow's runs. The two commands the job runs stay in lockstep with
`sdlc.yaml`'s `quality_checks` so local and CI gates agree.

## Approach

1. Add `.github/workflows/ci.yml` defining a single `ci` job triggered on
   `pull_request` (any branch) and on `push` to `main`, running on
   `ubuntu-latest`.
2. In the job, run: `actions/checkout@v4`; `actions/setup-node@v4` pinned
   to Node 20 with `cache: npm`; `npm ci`; then `npm run typecheck` and
   `npm run test` as two separate steps.
3. Keep the run commands aligned with `sdlc.yaml`'s `quality_checks` (test,
   typecheck) so the CI gate and the local task-work gate enforce the same
   set.
4. Add a CI status badge to the top of `README.md` pointing at the new
   workflow.
5. Confirm the workflow is valid by opening a PR and observing the checks
   run green, then confirming a deliberately broken test turns the check
   red before reverting.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.github/workflows/ci.yml` | new | GitHub Actions workflow running `npm run typecheck` + `npm run test` on PRs and pushes to `main` |
| `README.md` | modify | Add a CI status badge near the top |

## Acceptance criteria

- [ ] AC-1: `.github/workflows/ci.yml` exists, is valid YAML, and defines a job triggered on `pull_request` and on `push` to `main`.
- [ ] AC-2: The CI job installs dependencies with `npm ci` and runs `npm run typecheck` and `npm run test` as separate steps.
- [ ] AC-3: The job pins a Node version via `actions/setup-node` rather than relying on the runner default.
- [ ] AC-4: Opening a PR triggers the workflow and a green run is observable in the PR's checks; a deliberately failing test makes the check go red.
- [ ] AC-5: `README.md` renders a CI status badge that links to the workflow's run history.

## Out of scope

- Branch-protection / required-status-check enforcement — that is configured in the GitHub repository settings, not in the workflow file.
- Publish / release automation (`prepublishOnly`, `npm publish`).
- Coverage gating and a Node-version / OS build matrix.
- Caching beyond `actions/setup-node`'s built-in npm cache.

## Dependencies

- none

## Discovery context

Raised via `/sdlc:task-auto-define`: the project already declares
`quality_checks` in `sdlc.yaml` and runs them locally during task-work,
but has no automation to run them on PRs or pushes, so regressions are
only caught by hand.
