---
type: task
schema_version: '5'
id: T-5QJV
status: in-progress
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
- registry
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T15:27:51Z'
last_reviewed: '2026-06-30'
---
# Prototype: register / manage vault flow

## Goal

Prototype the **register / manage-vault flow** — add a vault (path + config),
edit it, remove it — against mock registry state. The daemon *reads* vaults and
never edits the docs; this UI only manages the registry of which vaults are
tracked. Multiple flow variants live in Storybook.

## Today

| Location | Role today |
|---|---|
| `prototype/web-ui/mocks/` | the mock registry state ([[T-D7X1-web-ui-mock-api-shapes]]) this flow mutates |
| `prototype/web-ui/components/` | the form/error-state kit ([[T-S5K8-web-ui-status-design-system]]) this flow composes |

## Proposed

An add-vault form (path + config selection) with client-side validation, an
edit/remove flow surfaced from the dashboard/detail, and error states for a
missing path or invalid config — all over mock registry state. **≥2 variants** in
Storybook (e.g. modal vs inline panel). New/edited/removed vaults reflect on the
dashboard ([[T-6RFC-web-ui-vault-dashboard]]).

## Approach

1. Build the add-vault form (path-picker placeholder + config field) with validation states.
2. Build edit + remove affordances on the dashboard/detail.
3. Model error states: missing path, invalid config.
4. Author variants: modal vs inline add flow.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/components/VaultForm.vue` | new | add/edit form + validation |
| `prototype/web-ui/components/VaultForm.stories.ts` | new | flow + error-state variants |

## Acceptance criteria

- [ ] AC-1: Add / edit / remove flows mutate the mock registry and reflect on the dashboard.
- [ ] AC-2: Error states for missing path / invalid config render.
- [ ] AC-3: **≥2 flow variants** exist as Storybook stories.

## Out of scope

- Real filesystem path picking; persisting the registry file; the daemon writing to docs.

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); the registry of managed vaults is the durable-intent layer in [[D-0012-distribution-single-exec-and-web-ui]] §D4.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `vue-tsc --noEmit` typechecks the registry-mutation logic (add via `mockApi.registerVault`, edit via map-in, remove via filter) and `build-storybook` renders `InlinePanel` / `Modal` / `EmptyRegistry` off the `mockVaultStatuses` fixtures. Live click-through of add/edit/remove in the running Storybook is a deferred-user spot-check.
- AC-2: auto — the `MissingPathError` and `InvalidConfigError` stories compile and build; the error elements render with `role="alert"` and `data-test="vf-error-path"` / `vf-error-config`, accent colored inline from `statusTokens.error.color`.
- AC-3: auto — five named, args-driven stories under title `Vaults/VaultForm` (`InlinePanel`, `Modal`, `EmptyRegistry`, `MissingPathError`, `InvalidConfigError`) compiled into the Storybook build; the two flow variants are inline panel vs modal dialog.

### What worked

- The merged foundation made this a pure compose: the design-system kit (`StatusBadge`, `statusTokens`) and the mock API seam (`mockApi.registerVault`, the `VaultStatus` / `RegisterVaultRequest` shapes) dropped in with zero new infrastructure — exactly the reuse the task asked for.
- Baseline-gated quality (`--diff-against-baseline`) cleanly isolated the two pre-existing `tests/yaml-parity.test.ts` typecheck errors from this branch, so the gate reported `OK 2/2` with zero new drift without any manual triage.
- `prototype/web-ui/**` is fully isolated from the root `tsconfig`/`vitest` scope, so the new files could not regress the root quality gate.

### Friction and automation gaps

- `preflight_permissions.ts` reported false-positive gaps (`npm`, `Write`, `Edit`) because it reads the static `settings.json` allow-list, not the harness's actual runtime grants — had to empirically run `npm --version` to confirm the tool worked before proceeding past Step 3b. → the probe (or task-work's Step 3b dispatch) should recognize broad-grant harness modes, or treat an empirically-runnable verb as overriding the static finding. → Already tracked upstream as `T-0AM0-preflight-probe-honors-runtime-edit-grant` (sksizer/dev, planning/draft) — linked to existing, no new PR.
- The Step 3a quality baseline is written to the MAIN repo's gitignored `.sdlc/quality-baselines/<sha>.json`, but Step 7 runs inside the worktree where `--diff-against-baseline` defaults `--baseline-dir` to the worktree's own `.sdlc/`, which lacks the baseline — the implementer had to copy the baseline file into the worktree to run the gate. → task-work should point `--baseline-dir` at the superproject's `.sdlc/quality-baselines/`, or seed it during `worktree_init`. → Already tracked upstream as `T-5X6Y-task-work-step7-explicit-baseline-dir` (sksizer/dev, closed/superseded by `T-44OO-plugin-scripts-self-discover-project-root`) — linked to existing, no new PR.

### Spawned follow-up tasks

Both friction bullets classify as `Upstream-plugin` (sdlc). Neither was
spawned: each gap is already tracked by a near-verbatim existing task in the
upstream `sksizer/dev` repo, so spawning would duplicate the upstream backlog
(the harm `spawn-from-post-mortem` Step 2a exists to prevent). The local dedup
search returned `SPAWNED` (no match in this repo's corpus); both were overridden
to link-existing-upstream after confirming the upstream matches by reading them.

- `T-0AM0-preflight-probe-honors-runtime-edit-grant` (sksizer/dev, planning/draft) — linked, preflight false-positive Write/Edit/runtime-grant gap. Created 2026-06-28; its embedded quote restates this bullet almost verbatim.
- `T-5X6Y-task-work-step7-explicit-baseline-dir` (sksizer/dev, closed/superseded → `T-44OO-plugin-scripts-self-discover-project-root`, planning/needs-definition) — linked, Step 3a/Step 7 baseline-dir worktree mismatch. Already carries four prior cross-repo dedup links from other consumer projects.
