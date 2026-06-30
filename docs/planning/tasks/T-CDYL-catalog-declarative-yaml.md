---
type: task
schema_version: "5"
id: T-CDYL
status: in-progress
created: 2026-06-30
related:
  - "[[M-0007-example-use-case-catalog]]"
  - "[[C-0009-declarative-text-constraints]]"
parent_key: "[[T-CTLG-example-catalog-finalize]]"
depends_on: []
tags:
  - docs
  - examples
  - catalog
  - declarative
  - yaml
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T15:15:03Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/114
---
# Finalize the Declarative-YAML catalog category as verified YAML (`declarative-yaml`)

## Goal

Turn the **13 shipped** examples in the `declarative-yaml` category of
`docs/example-catalog.md` (`DECLARATIVE-YAML-01`..`13`) into
`docs/catalog/declarative-yaml.yaml`, with each sketch verified against the real
contract/config loader, and carry the **7 planned** examples
(`DECLARATIVE-YAML-14`..`20`, the C-0009 / D-0011 text-constraint preview) as
`status: planned` excluded from the coverage counts.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `declarative-yaml` section (`DECLARATIVE-YAML-01`..`20`; 14-20 marked planned) as a prose index table + sketches. |
| `src/declarative/` | The declarative contract + config loader the examples compile to; verified against. |
| `tests/fixtures/validation/` | The YAML contract fixtures the coverage verdicts cite. |

## Proposed

`docs/catalog/declarative-yaml.yaml`: 13 verified shipped entries plus 7 planned
entries, each with the full example-entry schema. Planned entries carry
`status: planned` and are excluded from coverage tallies.

## Approach

1. Extract `DECLARATIVE-YAML-01`..`20` from `docs/example-catalog.md` into
   `docs/catalog/declarative-yaml.yaml`, one entry per example keyed by the
   example-entry schema.
2. For the 13 shipped examples, compile/validate each `artifact` against the real
   loader (`src/declarative/`) and reconcile findings.
3. For `DECLARATIVE-YAML-14`..`20`, mark `status: planned`, link
   [[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]]
   and the seed fixture `tests/fixtures/validation/17-node-level-custom-rule.ts`;
   do not verify (the feature is unshipped).
4. Re-confirm each shipped `coverage_status` / `existing_coverage` link.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/declarative-yaml.yaml` | new | 13 verified + 7 planned entries for the `declarative-yaml` category |
| `docs/example-catalog.md` | modify | reconcile any shipped-example corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/declarative-yaml.yaml` exists with 20 entries (13
  shipped + 7 planned).
- [ ] AC-2: Every entry in `docs/catalog/declarative-yaml.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every shipped `artifact` in `docs/catalog/declarative-yaml.yaml` compiles/validates against the real declarative loader with the documented findings.
- [ ] AC-4: `DECLARATIVE-YAML-14`..`20` carry `status: planned`, are excluded
  from coverage counts, and link C-0009 / D-0011.

## Out of scope

- The other seven categories (their own child tasks).
- Implementing the planned text-constraint feature (C-0009 / D-0011).
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.
Planned examples preview [[C-0009-declarative-text-constraints]].

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
