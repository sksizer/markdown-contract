---
type: task
schema_version: '5'
id: T-HHLC
status: closed/done
created: '2026-06-30'
related:
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
- '[[T-ZLND-web-ui-prototype-app]]'
- '[[T-D7X1-web-ui-mock-api-shapes]]'
- '[[T-S5K8-web-ui-status-design-system]]'
tags:
- web-ui
- prototype
- drift
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: '2026-06-30'
prs:
- https://github.com/sksizer/markdown-contract/pull/121
completion_note: 'Shipped via #121.'
---
# Prototype: config drift view (init --check surface)

## Goal

Prototype the **config-drift view** — the `init --check` surface: what config
inference would change versus the committed config. Multiple presentation
variants live in Storybook.

## Today

| Location | Role today |
|---|---|
| `src/declarative/infer.ts` | `inferConfig` / the `--check` drift logic the *real* view will later call; the prototype only mirrors its result shape |
| `prototype/web-ui/mocks/` | the mock drift payload ([[T-D7X1-web-ui-mock-api-shapes]]) this view renders |

## Proposed

A drift screen/panel showing a diff between the committed config and the inferred
config — added / removed / changed entries — with an in-sync vs in-drift summary
status. **≥2 variants** in Storybook (e.g. unified diff vs side-by-side), with
in-sync and drifted data variants. Drift status surfaces as a badge on the vault
card/detail, linking here.

## Approach

1. Build the drift summary (in-sync vs in-drift) from the mock drift payload.
2. Build the change list: added / removed / changed config entries.
3. Author variants: unified vs side-by-side diff; in-sync vs drifted data.
4. Surface a drift badge on the vault card/detail that links to this view.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/components/DriftView.vue` | new | the drift diff view |
| `prototype/web-ui/components/DriftView.stories.ts` | new | presentation + data variants |

## Acceptance criteria

- [ ] AC-1: The drift view renders added / removed / changed config entries from mock drift data.
- [ ] AC-2: In-sync and drifted states both render.
- [ ] AC-3: **≥2 presentation variants** exist as Storybook stories.

## Out of scope

- Running real `inferConfig` / `--check`; applying or writing config changes.

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); drift is the third status dimension (green / findings / drift) in [[C-0010-single-binary-and-vault-dashboard]].

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `prototype/web-ui` `npm run typecheck` (`vue-tsc --noEmit`) + `npm run build-storybook`; `DriftView` classifies each `DriftEntry` via `KIND_GROUP` into added/removed/changed and renders them from `sampleDrift` (the `Drifted` and `SideBySide` stories).
- AC-2: auto — both states build and render: `cleanDrift` drives the in-sync panel (`kit/EmptyState`, `data-test="drift-in-sync"`), `sampleDrift` drives the entry list. Exposed as `InSync`/`SideBySideInSync` vs `Drifted`/`SideBySide`.
- AC-3: auto — two presentation variants (`variant="unified"` single list, `variant="split"` side-by-side Added/Removed/Changed), exposed across four named stories under `title: "Drift/DriftView"`.
- (deferred-user) Visual feel of the unified vs split layouts in the Storybook browser — please spot-check; the structural/data contract above is auto-verified but the look is not.

### What worked

- The foundation tasks paid off cleanly: the drift fixtures (`sampleDrift` / `cleanDrift` in `mocks/api-fixtures.ts`) and the kit (`StatusBadge`, `EmptyState`) already existed, so the component was pure composition — no new fixtures, no token edits, no shared-file churn.
- Disjoint-file scoping held: only `DriftView.vue` + `DriftView.stories.ts` were created, so the three sibling surface tasks and the catalog task ran in parallel with zero contention.
- Baseline-gated `sdlc quality run` plus the prototype's own `vue-tsc` + `storybook build` auto-verified every AC without a human in the loop; root `vitest`/`tsc` stayed green because `prototype/` is outside their scope.

### Friction and automation gaps

- Step 7's `quality run --diff-against-baseline` defaulted `--baseline-dir` to the *worktree's* `.sdlc/quality-baselines/`, but Step 3a captured the baseline in the *main repo's* `.sdlc/quality-baselines/`; the first gate invocation failed `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly — task-work Step 7 should resolve the baseline dir to the worktree's superproject (main checkout) automatically, or pass it explicitly the way Step 3a does. → Classified **Upstream-plugin** (`sdlc`); linked to existing upstream task `T-44OO-plugin-scripts-self-discover-project-root` (sksizer/dev, on `main`) — the structural "plugin scripts self-discover project root via `git rev-parse --git-common-dir`" fix that resolves this, which supersedes the exact prior `T-5X6Y-task-work-step7-explicit-baseline-dir`. No new task spawned.
- The Step 3b permissions probe flagged `npm`, `Write`, and `Edit` as missing grants even though `npm` demonstrably runs in this repo (sibling web-ui worktrees built and `npm install` succeeded), forcing a judgment call in an autonomous run where no human is present to answer the AskUserQuestion — the probe could treat a tool family already declared in `sdlc.yaml` `quality_checks:`/`worktree_init:` as implicitly granted to avoid the false-positive gap. → Classified **Upstream-plugin** (`sdlc`); linked to existing upstream PR sksizer/dev #527 (task `T-XERZ-preflight-permissions-runtime-reconcile`, from sibling `T-CINF`) — same Step 3b probe flagging `npm`/`Write`/`Edit` as false-positive missing grants under autonomous dispatch. This bullet's "sdlc.yaml-declared families imply a grant" idea is an alternative for that task's still-TBD Proposed section. No new task spawned.
- Under heavy parallel `/sdlc:task-work` sessions the shared `commitToMainViaWorktree` path left local `main` lagging origin/main: an intermediate read showed the lease still `claimed` and a foreign task's start-commit as the branch tip, even though the start-commit and `working` transition had in fact landed on origin (the authority) — required a manual `git fetch origin` + reset to confirm true state. A post-commit `git fetch origin main` (or a note that the authority, not local main, is the source of truth) inside the helper would cut the operator confusion. → Classified **Upstream-plugin** (`sdlc`); linked to existing upstream PR sksizer/dev #526 (task `T-OLKM-commit-on-main-advances-local-main`, from sibling `T-ZLND`) — same `--commit-on main` / commit-to-main-via-worktree local-`main`-vs-`origin` divergence under concurrent parallel sessions. No new task spawned.

### Spawned follow-up tasks

All three friction gaps are `sdlc`-plugin internals (`/sdlc:task-work` Steps 3b/7 and the
commit-to-main-via-worktree helper), so each is classified **Upstream-plugin** (plugin `sdlc`,
source repo sksizer/dev). All three are already tracked upstream — two of them by open PRs
spawned from sibling tasks in this same M-0009 web-ui batch — so each is **linked** to the
existing work rather than re-spawned, to avoid fragmenting the upstream backlog with
duplicates:

- `T-44OO-plugin-scripts-self-discover-project-root` (sksizer/dev, on `main`) — baseline-dir / superproject auto-resolution; supersedes exact prior `T-5X6Y-task-work-step7-explicit-baseline-dir`. Linked, no new PR.
- `T-XERZ-preflight-permissions-runtime-reconcile` (sksizer/dev PR https://github.com/sksizer/dev/pull/527) — Step 3b probe `npm`/`Write`/`Edit` false-positive under autonomous dispatch. Linked, no new PR.
- `T-OLKM-commit-on-main-advances-local-main` (sksizer/dev PR https://github.com/sksizer/dev/pull/526) — commit-to-main-via-worktree local-`main`-vs-`origin` divergence under concurrent sessions. Linked, no new PR.
