---
type: task
schema_version: "5"
id: T-0P0U
status: in-progress
created: 2026-06-30
related:
  - "[[M-0009-local-web-ui-vault-dashboard]]"
  - "[[C-0010-single-binary-and-vault-dashboard]]"
  - "[[D-0012-distribution-single-exec-and-web-ui]]"
depends_on:
  - "[[T-ZLND-web-ui-prototype-app]]"
  - "[[T-D7X1-web-ui-mock-api-shapes]]"
  - "[[T-S5K8-web-ui-status-design-system]]"
tags:
  - web-ui
  - prototype
  - sse
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
readiness_verified_at: 2026-06-30T15:27:24Z
last_reviewed: 2026-06-30
prs:
  - https://github.com/sksizer/markdown-contract/pull/122
---
# Prototype: live-status & SSE UX (watching, loading, errors)

## Goal

Prototype the **live-status UX** — how a status change lands (badge flip / subtle
re-render / toast), a watching on/off + connection indicator, and the
loading/in-progress and error states — driven by a **mock** event stream. No real
SSE server, watcher, or daemon. Multiple "how an update surfaces" variants live
in Storybook.

## Today

| Location | Role today |
|---|---|
| `prototype/web-ui/mocks/` | the mock SSE event sequence ([[T-D7X1-web-ui-mock-api-shapes]]) this driver replays |
| `prototype/web-ui/pages/index.vue` | the dashboard ([[T-6RFC-web-ui-vault-dashboard]]) whose cards re-render on events |

## Proposed

A mock event-stream driver replaying the mock SSE sequence on a timer; a watching
toggle + connection indicator; validation-running and error treatments; and the
update-landing affordance. **≥2 variants** in Storybook of how an update surfaces
(silent badge flip vs toast vs row highlight). Feeds the dashboard
([[T-6RFC-web-ui-vault-dashboard]]) and detail ([[T-4CUI-web-ui-vault-detail-findings]]).

## Approach

1. Build a mock SSE/event-stream driver that replays the mock event sequence on a timer.
2. Wire the dashboard/detail to re-render on events; build the watching toggle + connection indicator.
3. Build running (in-progress) and error treatments.
4. Author variants: how an update lands — silent badge flip vs toast vs row highlight.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/mocks/event-stream.ts` | new | timer-driven mock event replayer |
| `prototype/web-ui/components/WatchIndicator.vue` | new | watching toggle + connection state |
| `prototype/web-ui/components/WatchIndicator.stories.ts` | new | update-landing variants |

## Acceptance criteria

- [ ] AC-1: A mock event stream drives visible status changes on the dashboard.
- [ ] AC-2: A watching on/off + connection indicator render; running and error states render.
- [ ] AC-3: **≥2 update-landing variants** exist as Storybook stories.

## Out of scope

- A real SSE server / file-watcher / daemon; reconnection/backoff logic; persistence.

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]]. Drives [[T-6RFC-web-ui-vault-dashboard]] and [[T-4CUI-web-ui-vault-detail-findings]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); live in-memory status pushed over SSE is the D4 "live status" layer of [[D-0012-distribution-single-exec-and-web-ui]].

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — prototype `vue-tsc` (`npm run typecheck` in `prototype/web-ui`) compiles the stream-driven `LiveBoard`: `useMockEventStream` replays `mockSseEvents` → `stateFromEvent` → `vaultStates` → per-vault `StatusBadge` re-render. The live visual flip itself is deferred-user (Storybook spot-check).
- AC-2: auto — `vue-tsc` compiles `WatchIndicator` across all five `ConnectionState`s plus the watching toggle; `running` surfaces via `statusTokens.running` + the `running` badge, `error` via the `Disconnected` indicator + the `error` badge. Visual = deferred-user.
- AC-3: auto — three named update-landing story exports present and typechecked: `LandingSilentFlip`, `LandingToast`, `LandingRowHighlight` (≥2 satisfied).

### What worked

- The merged foundation (mock API seam `types/api.ts` + `SseEvent`, the `mockSseEvents`/`mockVaultStatuses` fixtures, `design/tokens.ts`, the kit `StatusBadge`) was complete enough that the live-status layer was pure composition — no new fixtures or token edits, and the work stayed inside the three owned files.
- The prototype's own `npm run typecheck` (vue-tsc) gave fast, real verification that the composable + SFC + stories all compile, beyond the root quality gate (which does not cover the prototype tree).
- The baseline-gated quality run cleanly separated the 4 pre-existing root-typecheck findings from this branch's zero new drift.

### Friction and automation gaps

- Step 7's quality-run defaulted `--baseline-dir` to the worktree's `.sdlc/quality-baselines/`, but Step 3a captured the baseline in the MAIN repo's `.sdlc/quality-baselines/`; the gate errored `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly — task-work Step 7 should pass the main-repo baseline dir (or Step 3a should capture into the worktree). → [[task-work-threads-main-baseline-dir]]
- `ensure_ready_mutate.ts --mode pass` rejects `--cleanup-on-fail` (exit 2), yet task-work Step 5a documents invoking the gate with both `--commit-on main --cleanup-on-fail`; an operator shelling the mutator directly on the PASS path hits the validation — the skill's flag guidance and the script's pass-path arg validation disagree. → [[reconcile-ensure-ready-pass-path-flags]]
- `--commit-on main` could not advance the `main` ref (it is checked out in the primary worktree while parallel sessions race it): the verify-stamp landed as an orphan commit and the start-commit landed on the task branch instead of main, leaving 7 foreign sibling start/verify commits in branch ancestry for Step 9 to rebase out — expected under heavy parallel dispatch, but the orphaned verify commit is litter worth a periodic gc. → [[commit-on-main-advances-local-main]]

### Spawned follow-up tasks

- [[reconcile-ensure-ready-pass-path-flags]] (https://github.com/sksizer/dev/pull/536) — spawned `sdlc-meta` PR on `sksizer/dev`: reconcile `ensure_ready_mutate.ts --mode pass` rejecting `--cleanup-on-fail` with task-work Step 5a's documented `--commit-on main --cleanup-on-fail` invocation.
- [[task-work-threads-main-baseline-dir]] (https://github.com/sksizer/dev/pull/509) — existing upstream PR on `sksizer/dev` already covers task-work Step 7 passing the main-repo `--baseline-dir` so the Step 3a baseline is found; reused, no new PR opened (also covered by #533/#529/#528/#530/#531/#514).
- [[commit-on-main-advances-local-main]] (https://github.com/sksizer/dev/pull/526) — existing upstream PR on `sksizer/dev` already covers `--commit-on main` advancing the local `main` ref under concurrent sessions; reused, no new PR opened. The orphaned-verify-commit/durability angle is also covered by [[task-work-durable-task-state-commits]] (https://github.com/sksizer/dev/pull/511).
