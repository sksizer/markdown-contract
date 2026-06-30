---
type: task
schema_version: '5'
id: T-CINF
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
- inference
- init
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T05:29:43Z'
last_reviewed: '2026-06-30'
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
