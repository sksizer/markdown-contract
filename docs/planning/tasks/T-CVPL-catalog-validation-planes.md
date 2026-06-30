---
type: task
schema_version: '5'
id: T-CVPL
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
- validation
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T05:29:43Z'
last_reviewed: '2026-06-30'
---
# Finalize the Authoring-in-Code catalog category as verified YAML (`validation-planes`)

## Goal

Turn the **16 shipped** examples in the `validation-planes` category of
`docs/example-catalog.md` (`VALIDATION-PLANES-01`..`16`) into
`docs/catalog/validation-planes.yaml`, with each code sketch verified against the
real structure / content / custom-rule planes, plus the **1 planned** example
carried as `status: planned`.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `validation-planes` section (`VALIDATION-PLANES-01`..) as a prose index table + sketches. |
| `src/core/` | The structure + content validation planes and custom-rule machinery the examples exercise; verified against. |
| `tests/fixtures/validation/` | The validation fixtures the coverage verdicts cite. |

## Proposed

`docs/catalog/validation-planes.yaml`: 16 verified shipped entries plus the 1
planned entry, each with the full example-entry schema.

## Approach

1. Extract the `validation-planes` examples from `docs/example-catalog.md` into
   `docs/catalog/validation-planes.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each shipped code `artifact` against the real engine (`src/core/`) and
   reconcile the findings shown.
3. Mark the planned example `status: planned` (link C-0009 / D-0011) and exclude
   it from coverage.
4. Re-confirm each shipped `coverage_status` / `existing_coverage` link against
   `tests/fixtures/validation/`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/validation-planes.yaml` | new | 16 verified + 1 planned entries for the `validation-planes` category |
| `docs/example-catalog.md` | modify | reconcile any shipped-example corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/validation-planes.yaml` exists with one entry per
  example (16 shipped + 1 planned).
- [ ] AC-2: Every entry in `docs/catalog/validation-planes.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every shipped `artifact` in `docs/catalog/validation-planes.yaml` reproduces the real engine findings.
- [ ] AC-4: The planned example carries `status: planned` and is excluded from
  coverage counts.

## Out of scope

- The other seven categories (their own child tasks).
- Writing new tests; implementing the planned text-constraint feature.
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.
