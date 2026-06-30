---
type: task
schema_version: '5'
id: T-CVPL
status: closed/done
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
last_reviewed: '2026-06-30'
prs:
- https://github.com/sksizer/markdown-contract/pull/125
completion_note: 'Shipped via #125.'
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

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `docs/catalog/validation-planes.yaml` parses to 17 entries `VALIDATION-PLANES-01..17` (16 shipped + 1 planned); confirmed by a YAML-parse count.
- AC-2: auto — programmatic field check reports all 12 schema fields present on every one of the 17 entries (`missing: none`).
- AC-3: agent-manual + auto — each of the 16 shipped sketches was run against the real engine (throwaway vitest file, since removed) and its finding id/level/message/pos cross-checked against `src/core/structure.ts`, `content.ts`, `validate.ts`, `projection.ts`; full suite green (574 tests via `npm run test`). 14/16 matched exactly; 2 (VP-03, VP-10) had drift and were corrected.
- AC-4: auto — only VP-17 carries `status: planned` (right after `name:`, CDYL convention) with `needs_test: "on impl"`, `coverage_status: uncovered`, seed `existing_coverage`, and the C-0009 / D-0011 `recommend_test`; entries 01..16 omit `status` and are the only ones counted as shipped.

### What worked

- The deterministic readiness gate + start flow was a clean no-op pass — the spec was already implementation-ready, so the gate added no friction.
- Sibling catalog YAMLs (`cli.yaml`, `inference-init.yaml`, `consume-as-data.yaml`, `dialect.yaml`) plus the in-flight `declarative-yaml.yaml` gave an unambiguous schema/convention template — both the 12-field shipped shape and the `status: planned` shape were copy-matchable.
- The existing `tests/fixtures/validation/` corpus encoded the real engine findings, so verifying AC-3 was mostly cross-reading fixtures against a green suite rather than authoring anything new.

### Friction and automation gaps

- The `docs/example-catalog.md` index table had coverage-path cells truncated mid-string in the source (rows 5, 7, 8) — completing them required grepping the fixtures dir for the intended sibling paths. A catalog lint that flags truncated/`…`-ending `existing_coverage` cells would catch this at authoring time. → [[T-922E-lint-truncated-coverage-cells]]
- Two shipped sketches (VP-03, VP-10) stated engine positions that the real engine does not emit (jumper-line vs declared-line; positionless `frontmatter/required`). A catalog-artifact-vs-engine roundtrip check (run each `artifact` through the engine and diff stated findings) would catch sketch drift mechanically instead of by manual cross-read — this is the gap [[T-CART-catalog-artifact-verb-output-roundtrip]] targets. → [[T-NBXH-catalog-artifact-verb-output-roundtrip]]
- VP-17 (text-constraint `requires`/`forbids`) is framed as planned (C-0009/D-0011) but the builders already ship in `src/core/text-constraints.ts` with fixtures 22–25. Kept `planned` per the explicit AC-4 instruction, but the catalog's planned-vs-shipped framing for this feature is worth a human reclassification pass. → [[T-QI0Z-reclassify-vp17-text-constraint-shipped]]

### Spawned follow-up tasks

- [[T-922E-lint-truncated-coverage-cells]] (https://github.com/sksizer/markdown-contract/pull/123) — spawned: catalog lint flagging truncated / `…`-ending `existing_coverage` cells at authoring time.
- [[T-NBXH-catalog-artifact-verb-output-roundtrip]] — linked (existing): the artifact-vs-engine roundtrip check that mechanically catches sketch drift; the bullet already named this meta-task.
- [[T-QI0Z-reclassify-vp17-text-constraint-shipped]] (https://github.com/sksizer/markdown-contract/pull/124) — spawned: human reclassification pass for VP-17 (planned → shipped); sibling to the in-flight [[T-237L-reconcile-text-constraint-catalog-syntax]] (PR #113) for the declarative-yaml category.
