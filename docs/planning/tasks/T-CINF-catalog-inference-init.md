---
type: task
schema_version: "5"
id: T-CINF
status: in-progress
created: 2026-06-30
related:
  - "[[M-0007-example-use-case-catalog]]"
parent_key: "[[T-CTLG-example-catalog-finalize]]"
depends_on: []
tags:
  - docs
  - examples
  - catalog
  - inference
  - init
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T12:51:16Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/107
---
# Finalize the Scaffold-and-Guard catalog category as verified YAML (`inference-init`)

## Goal

Turn the **10 shipped** examples in the `inference-init` category of
`docs/example-catalog.md` (`INFERENCE-INIT-01`..`INFERENCE-INIT-10`) into
`docs/catalog/inference-init.yaml` — structured, schema-keyed data with each
sketch verified against real `markdown-contract init` output. Includes the
`--infer-bounds` flagged correction (parsed but not yet read).

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `inference-init` section (`INFERENCE-INIT-01`..`10`) as a prose index table + sketches, including the `--infer-bounds` review note. |
| `src/declarative/` | The inference / `init` surface the examples exercise; verified against. |
| `tests/fixtures/infer/` | The inference fixtures the coverage verdicts cite. |

## Proposed

`docs/catalog/inference-init.yaml`: 10 example entries with the full
example-entry schema, sketches reproducing real `init` output, and
`INFERENCE-INIT-05` documented as a planned / no-op flag rather than working
behavior.

## Approach

1. Extract `INFERENCE-INIT-01`..`10` from `docs/example-catalog.md` into
   `docs/catalog/inference-init.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each `artifact` command against the real `init` verb and reconcile output;
   **apply the correction**: `INFERENCE-INIT-05` (`--infer-bounds`) is parsed in
   `src/cli/run.ts` but never read in `src/declarative/infer.ts` — document it as
   planned / no-op (set its `coverage_status` accordingly), not as working
   bound inference.
3. Re-confirm each `coverage_status` / `existing_coverage` link against
   `tests/fixtures/infer/` and `src/declarative/`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/inference-init.yaml` | new | structured, verified entries for the `inference-init` category |
| `docs/example-catalog.md` | modify | apply the `--infer-bounds` correction inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/inference-init.yaml` exists with 10 entries (one per
  shipped example).
- [ ] AC-2: Every entry in `docs/catalog/inference-init.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every `artifact` in `docs/catalog/inference-init.yaml` reproduces the output shown when run against the real `init` verb — no invented flags or behavior.
- [ ] AC-4: `INFERENCE-INIT-05` is recorded as a planned / no-op flag, not as
  working bound inference, in both YAML and `docs/example-catalog.md`.

## Out of scope

- The other seven categories (their own child tasks).
- Writing new tests (incl. [[T-IOUT-init-out-placement]], which adds the `--out`
  test).
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — loaded `docs/catalog/inference-init.yaml` with a YAML parser; exactly 10 entries (`INFERENCE-INIT-01`..`10`).
- AC-2: auto — parser confirmed every entry carries the 12 schema fields in order (`id` … `recommend_test`).
- AC-3: agent-manual — built the CLI (`npm run build`) and ran `node dist/cli/index.js init …` over throwaway copies of the `tests/fixtures/infer/*` vaults (01-flat-uniform, 02-optional-sections, 07-tree-depth1, 09-root-and-subdirs, 10-stranded-depth), reconciling each artifact's stdout / written files / generated YAML against the real verb.
- AC-4: auto + agent-manual — `command grep` showed `inferBounds` is declared-only in `src/declarative/infer.ts` (line 70, never read; line-406 "future phase" comment), and `init --dry-run` vs `init --infer-bounds --dry-run` were byte-identical; the YAML records `INFERENCE-INIT-05` as `coverage_status: uncovered` with no-op framing, and `example-catalog.md` was softened to match the existing review note.

### What worked

- The deterministic readiness gate + `start_task.ts` landed the verify/start commits on `origin/main` and reset the worktree branch to that tip with zero rebase friction.
- Baseline-gated `quality run` subtracted the pre-existing `tests/yaml-parity.test.ts` typecheck drift automatically — the gate reported `OK 2/2` without forcing any triage of unrelated failures.
- The `tests/fixtures/infer/*` vaults plus their `fixture.ts` expected-config files were exact ground truth for verifying each `init` artifact, making AC-3 reconciliation mechanical.

### Friction and automation gaps

- `preflight_permissions.ts` flagged `Bash(npm:*)`, `Write`, and `Edit` as missing-permission gaps that were false positives (npm ran fine; Write/Edit are native tools) — the probe reads declared `settings.json` and can't see the autonomous harness's actual runtime grants, costing a manual empirical-verification detour. The probe should reconcile against runtime capability (or downgrade these to a soft signal under autonomous dispatch) so it stops surfacing non-actionable gaps each run. → [[T-XERZ-preflight-permissions-runtime-reconcile]]
- The prose `inference-init` sketches in `example-catalog.md` had drifted from real `init` output in four places (INFERENCE-INIT-01 stdout, 02 invented frontmatter, 06 group names + stranded warning, 07 `--relax` annotation); the YAML-ization caught and fixed each. A CI round-trip that diffs every catalog `artifact` block against the real verb output would prevent the prose and YAML re-drifting after merge. → [[T-NBXH-catalog-artifact-verb-output-roundtrip]]

### Spawned follow-up tasks

- [[T-XERZ-preflight-permissions-runtime-reconcile]] (https://github.com/sksizer/dev/pull/527) — reconcile the preflight permission probe against runtime grants under autonomous dispatch; spawned (Upstream-plugin / `sdlc-meta`).
- [[T-NBXH-catalog-artifact-verb-output-roundtrip]] (https://github.com/sksizer/markdown-contract/pull/106) — CI round-trip diffing each catalog `artifact` block against real verb output; spawned (Local).
