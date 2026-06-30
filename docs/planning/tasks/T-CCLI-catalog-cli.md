---
type: task
schema_version: '5'
id: T-CCLI
status: in-progress
created: '2026-06-30'
related:
- '[[M-0007-example-use-case-catalog]]'
parent_key: '[[T-CTLG-example-catalog-finalize]]'
depends_on: []
tags:
- docs
- examples
- catalog
- cli
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: '2026-06-30'
readiness_verified_at: '2026-06-30T13:52:02Z'
---
# Finalize the CLI Quickstart catalog category as verified YAML (`cli`)

## Goal

Turn the **12 shipped** examples in the `cli` category of `docs/example-catalog.md`
(`CLI-01`..`CLI-12`) into `docs/catalog/cli.yaml` — structured, schema-keyed data
with each sketch verified against real `markdown-contract validate` output. This
category carries the most review-note corrections, so honesty against the real
CLI is the point.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `cli` section (`CLI-01`..`CLI-12`) as a prose index table + sketches, including the flagged finding-id review notes. |
| `src/cli/` | The CLI surface (`validate`, formatters, exit codes) the examples exercise and are verified against. |

## Proposed

`docs/catalog/cli.yaml`: a list of 12 example entries, each with the full
example-entry schema, every `artifact` sketch reproducing real CLI output, and
the flagged finding-id corrections applied.

## Approach

1. Extract `CLI-01`..`CLI-12` from `docs/example-catalog.md` into
   `docs/catalog/cli.yaml`, one entry per example keyed by the example-entry
   schema (id, name, demonstrates, rank, builds_on, artifact_kind, artifact,
   surfaces, needs_test, coverage_status, existing_coverage, recommend_test).
2. Run each `artifact` command against the real CLI and reconcile the shown
   output, **applying the flagged corrections**: `CLI-02`/`CLI-03`
   `structure/missing-section` → `structure/section-missing`; `CLI-05`/`CLI-06`
   `content/enum` → `frontmatter/enum` and `structure/unknown-section` →
   `frontmatter/unknown-key`.
3. Re-confirm each `coverage_status` / `existing_coverage` link against the
   current tests under `src/cli/`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/cli.yaml` | new | structured, verified entries for the `cli` category |
| `docs/example-catalog.md` | modify | apply the CLI finding-id corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/cli.yaml` exists with one entry per shipped `cli`
  example (12 entries).
- [ ] AC-2: Every entry in `docs/catalog/cli.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every `artifact` in `docs/catalog/cli.yaml` reproduces the output shown when run against the real CLI — no invented finding ids or flags.
- [ ] AC-4: The four flagged finding-id corrections are applied in both
  `docs/catalog/cli.yaml` and `docs/example-catalog.md`; no `structure/missing-section`,
  `content/enum`, or `structure/unknown-section` string remains.

## Out of scope

- The other seven categories (their own child tasks).
- Writing new tests (the T-ROUT / T-DRAG / T-DREF / T-DANF / T-IOUT follow-ups).
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `yaml.safe_load(docs/catalog/cli.yaml)` confirms 12 entries, ids `CLI-01`..`CLI-12` in order.
- AC-2: auto — programmatic check confirms every entry carries all 12 example-entry fields in the exact schema order (`id, name, demonstrates, rank, builds_on, artifact_kind, artifact, surfaces, needs_test, coverage_status, existing_coverage, recommend_test`).
- AC-3: agent-manual — the five finding-bearing artifacts (`CLI-02`..`CLI-06`) were run live against the freshly-built CLI (`node dist/cli/index.js validate <dir> --contract <yaml>` and `--format json|sarif`); finding ids, messages (typographic quotes), the human run-summary line, JSON key order, and SARIF byte-matched, and the embedded JSON/SARIF round-trip-parse.
- AC-4: auto — `grep -c 'structure/missing-section\|content/enum\|structure/unknown-section'` is `0` in both `docs/catalog/cli.yaml` and `docs/example-catalog.md`.

### What worked

- Capturing real CLI output as a ground-truth reference before authoring caught three silent inaccuracies the prose sketches carried: the human path prepends a `Scanned N files; …` run-summary line, the real `Finding` JSON key order is `id, level, path, message, pos` (the sketch put `pos` before `message`), and messages use typographic quotes `‘ ’`, not straight quotes.
- The baseline-gated quality gate cleanly separated the 4 pre-existing findings from this branch's zero new drift — `OK 2/2`, no triage needed.

### Friction and automation gaps

- The source catalog sketches showed single-file `validate <file>` invocations, but the real CLI's `--contract` path requires a directory (a file argument errors `ENOTDIR`, exit 2); reconciling to honest output needed a manual judgment call to switch to directory runs — a lint that executes each catalog artifact's command against the CLI would catch un-runnable invocations automatically (likely already tracked by the `catalog-artifact-verb-output-roundtrip` meta-task). → [[T-NBXH-catalog-artifact-verb-output-roundtrip]]
- `sdlc quality run --diff-against-baseline` invoked from a worktree resolves `--baseline-dir` against the worktree's `.sdlc/`, but Step 3a wrote the baseline under the main checkout's `.sdlc/quality-baselines/`; the gate failed `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly — task-work Step 7's documented `quality run` invocation should resolve the superproject's baseline dir (or pass `--baseline-dir`) when run from a worktree. → [[T-F1WJ-quality-run-resolves-superproject-baseline]]

### Spawned follow-up tasks

- [[T-NBXH-catalog-artifact-verb-output-roundtrip]] — catalog-artifact runnability lint; linked to the existing meta-task (a verb-output round-trip that runs each catalog `artifact` would catch un-runnable invocations).
- [[T-F1WJ-quality-run-resolves-superproject-baseline]] (https://github.com/sksizer/dev/pull/530) — Upstream-plugin (sdlc-meta): `quality run` should resolve the superproject's baseline dir from a worktree; spawned.
