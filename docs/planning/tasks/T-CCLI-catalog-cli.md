---
type: task
schema_version: '5'
id: T-CCLI
status: open/ready
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
