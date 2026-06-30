---
type: task
schema_version: "5"
id: T-CCON
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
  - consumption
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T12:06:12Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/99
---
# Finalize the Consume-as-Typed-Data catalog category as verified YAML (`consume-as-data`)

## Goal

Turn the **11 shipped** examples in the `consume-as-data` category of
`docs/example-catalog.md` (`CONSUME-AS-DATA-01`..`11`) into
`docs/catalog/consume-as-data.yaml` — structured, schema-keyed data with each
read-model sketch verified against the real consumption object model.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `consume-as-data` section (`CONSUME-AS-DATA-01`..`11`) as a prose index table + sketches. |
| `src/core/model.test.ts` | The typed read-model (`Doc`, `SectionView`, `byAnchor`, …) the examples exercise; verified against. |
| `tests/fixtures/consumption/` | The consumption fixtures the coverage verdicts cite. |

## Proposed

`docs/catalog/consume-as-data.yaml`: 11 verified entries, each with the full
example-entry schema and a sketch reproducing the real read-model behavior.

## Approach

1. Extract `CONSUME-AS-DATA-01`..`11` from `docs/example-catalog.md` into
   `docs/catalog/consume-as-data.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each `artifact` against the real consumption object model and reconcile
   the shown values / types.
3. Re-confirm each `coverage_status` / `existing_coverage` link against
   `src/core/model.test.ts`, `src/core/projection.test.ts`, and
   `tests/fixtures/consumption/`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/consume-as-data.yaml` | new | structured, verified entries for the `consume-as-data` category |
| `docs/example-catalog.md` | modify | reconcile any corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/consume-as-data.yaml` exists with 11 entries.
- [ ] AC-2: Every entry in `docs/catalog/consume-as-data.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every `artifact` in `docs/catalog/consume-as-data.yaml` reproduces the real read-model behavior shown.
- [ ] AC-4: Every `existing_coverage` link in `docs/catalog/consume-as-data.yaml` resolves to a current test or fixture under `src/core/` or `tests/fixtures/consumption/`.

## Out of scope

- The other seven categories (their own child tasks).
- Writing new tests.
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — parsed `docs/catalog/consume-as-data.yaml`; exactly 11 entries (`CONSUME-AS-DATA-01`..`11`).
- AC-2: auto — every entry carries all 12 schema fields in canonical order (programmatic key-order check against `dialect.yaml`'s order, plus `npm run typecheck`).
- AC-3: agent-manual — each `artifact` cross-checked against its peer runnable fixture under `tests/fixtures/consumption/01..11` and `src/core/model.ts`/`src/core/types.ts`; the fixtures assert the same values (`rowPos(2)` → `{line:7,col:1}`, `column("File")` → `["grammar.ts","leaves.ts","legacy.ts"]`, etc.), and `npm run test` keeps them green.
- AC-4: auto — all 13 distinct `existing_coverage` paths resolve on disk (`fs.existsSync` over every entry).

### What worked

- The sibling `docs/catalog/dialect.yaml` gave an exact format template; mirroring it made the schema unambiguous and field-order verification mechanical.
- The consumption fixtures (`tests/fixtures/consumption/01..11`) are runnable, asserted ground truth for the sketches, so AC-3 was a deterministic cross-check rather than a judgment call.
- Baseline-gated quality run cleanly separated the 4 pre-existing findings from this branch's zero new drift.

### Friction and automation gaps

- `quality run --diff-against-baseline` resolved `--baseline-dir` relative to the worktree cwd, not the main repo, so the first gate invocation failed `baseline not found` — task-work Step 7's documented invocation (no `--baseline-dir`, relying on the `<project-root>/.sdlc/quality-baselines/` default) fails inside a worktree because Step 3a captured the baseline in the MAIN repo's `.sdlc/`; Step 7 should pass the absolute main-repo baseline-dir when running inside a worktree. → already tracked upstream in `sksizer/dev` (sdlc plugin): in-flight PRs https://github.com/sksizer/dev/pull/509 (near-verbatim) and https://github.com/sksizer/dev/pull/514; successor task `T-44OO-plugin-scripts-self-discover-project-root` (supersedes closed `T-5X6Y-task-work-step7-explicit-baseline-dir`). Not re-spawned.
- `preflight_permissions.ts` reported false-positive gaps (`npm`, `Write`, `Edit`) by inspecting settings files that did not reflect the runner's actual tool capabilities — npm and Write both worked when tested directly — so the probe parked an autonomous run that should have proceeded; the probe could cross-check actual capability before flagging in non-interactive dispatches. → already fixed upstream in `sksizer/dev` (sdlc plugin): merged PR https://github.com/sksizer/dev/pull/495 (probe honors runtime acceptEdits/bypassPermissions / touch-tests before flagging Write/Edit gaps) and merged PR https://github.com/sksizer/dev/pull/423 (key package-manager signal off project verbs, not blanket npm). The behavior observed here was the pre-fix probe on a stale plugin install. Not re-spawned.

### Spawned follow-up tasks

- none spawned — both `Upstream-plugin` friction bullets were de-duplicated against the upstream `sksizer/dev` (sdlc plugin) backlog rather than re-spawned as new PRs. The spawn-from-post-mortem dedup search scans only the local task corpus, which missed these foreign-repo matches; resolving the upstream target surfaced them:
  - Step 7 baseline-dir-in-worktree → linked to in-flight upstream PRs https://github.com/sksizer/dev/pull/509 and https://github.com/sksizer/dev/pull/514, plus successor task `T-44OO-plugin-scripts-self-discover-project-root`.
  - preflight false-positive capability gaps → already merged upstream: PR https://github.com/sksizer/dev/pull/495 (Write/Edit runtime grant) and PR https://github.com/sksizer/dev/pull/423 (package-manager/npm).
