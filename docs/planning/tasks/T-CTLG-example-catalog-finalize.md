---
type: task
schema_version: '5'
id: T-CTLG
status: planning/proposed
created: '2026-06-30'
related:
- '[[M-0007-example-use-case-catalog]]'
- '[[T-SITE-bootstrap-docs-website]]'
depends_on: []
tags:
- docs
- examples
- catalog
need_human_review: false
impact: high
complexity: large
autonomy: supervised
---
# Finalize the example use-case catalog as verified, structured data

## Goal

Turn the prose catalog in `docs/example-catalog.md` into durable, site-ready
structured data: one `docs/catalog/<category>.yaml` per category, with every
shipped example verified against real CLI/library output and the flagged
review-note corrections applied. This is the umbrella (epic) task for the eight
per-category children; it exists so the catalog stops being prose embedded in a
milestone and becomes data the docs site ([[T-SITE-bootstrap-docs-website]])
consumes directly.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | The full prose catalog (99 shipped + 9 planned examples, 8 categories), extracted verbatim from [[M-0007-example-use-case-catalog]]; the source of record for the children. |
| `tests/fixtures/` | The corpus the catalog's coverage verdicts are cross-referenced against. |

## Proposed

`docs/catalog/<category>.yaml` for all eight categories, each example keyed by
the example-entry schema (id, name, demonstrates, rank, builds_on,
artifact_kind, artifact, surfaces, needs_test, coverage_status,
existing_coverage, recommend_test). Sketches reproduce real output; corrections
applied; planned (C-0009 / D-0011) examples carried as `status: planned` and
excluded from verification until that feature ships. The YAML schema is shaped so
a Starlight / Astro content collection can read it directly.

## Approach

1. Land the eight per-category children. They may run **in parallel** — each owns
   exactly one `docs/catalog/<category>.yaml` file, so there is no write
   contention; only the shared `docs/example-catalog.md` correction edits must be
   serialized or merged.
2. Children: `catalog-cli`, `catalog-inference-init`, `catalog-declarative-yaml`,
   `catalog-validation-planes`, `catalog-consume-as-data`, `catalog-dialect`,
   `catalog-embed-and-ci`, `catalog-real-world-schemas`.
3. Once all eight YAML files exist and verify, the catalog is the data source for
   [[T-SITE-bootstrap-docs-website]] (M-0006); `docs/example-catalog.md` is then
   either regenerated from the data or retired by the site task.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/` | new | per-category YAML directory (the children create the files) |
| `docs/example-catalog.md` | modify | apply the flagged corrections inline as each category is verified |

## Acceptance criteria

- [ ] AC-1: All eight `docs/catalog/<category>.yaml` files exist, one per child.
- [ ] AC-2: Every shipped example in `docs/example-catalog.md` appears in exactly
  one category YAML with all example-entry schema fields populated.
- [ ] AC-3: The three flagged corrections are applied across the data (CLI finding
  ids; `--infer-bounds` documented as planned / no-op).
- [ ] AC-4: Planned (C-0009 / D-0011) examples are present with `status: planned`
  and excluded from the coverage counts.

## Out of scope

- Writing the recommended new tests — owned by
  [[T-ROUT-runcorpus-first-match-routing]],
  [[T-DRAG-docrule-runcorpus-aggregation]],
  [[T-DREF-dialect-referential-integrity]],
  [[T-DANF-dialect-anchor-fragment-edges]], [[T-IOUT-init-out-placement]].
- Building or publishing the site — [[T-SITE-bootstrap-docs-website]] (M-0006).
- Implementing the planned text-constraint feature —
  [[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]].

## Dependencies

Consumes the catalog source preserved at `docs/example-catalog.md` (extracted
from [[M-0007-example-use-case-catalog]]). Feeds
[[T-SITE-bootstrap-docs-website]].
