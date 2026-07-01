---
type: task
schema_version: "5"
id: T-CRWS
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
  - real-world
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T17:38:43Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/128
---
# Finalize the Real-World-Schemas catalog category as verified YAML (`real-world-schemas`)

## Goal

Turn the **15 shipped** examples in the `real-world-schemas` category of
`docs/example-catalog.md` (`REAL-WORLD-SCHEMAS-01`..`15`) into
`docs/catalog/real-world-schemas.yaml` — the capstone category of end-to-end
document-template and cross-document governance examples — each verified against
the real engine, plus the **1 planned** example (`REAL-WORLD-SCHEMAS-16`) carried
as `status: planned`.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `real-world-schemas` section (`REAL-WORLD-SCHEMAS-01`..`16`; 16 planned) as a prose index table + sketches. |
| `src/runner/` | The `runCorpus` + `docRule` cross-document surface the capstone examples exercise; verified against. |
| `tests/fixtures/` | The corpus the coverage verdicts cite (validation + consumption + corpus fixtures). |

## Proposed

`docs/catalog/real-world-schemas.yaml`: 15 verified shipped entries plus 1
planned entry, each with the full example-entry schema.

## Approach

1. Extract `REAL-WORLD-SCHEMAS-01`..`16` from `docs/example-catalog.md` into
   `docs/catalog/real-world-schemas.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each shipped `artifact` against the real engine (`runCorpus`, `docRule`,
   typed frontmatter) and reconcile the aggregated findings / exit codes.
3. Mark `REAL-WORLD-SCHEMAS-16` `status: planned` (link C-0009 / D-0011) and
   exclude it from coverage.
4. Re-confirm each shipped `coverage_status` / `existing_coverage` link; keep the
   `recommend_test` links to [[T-DRAG-docrule-runcorpus-aggregation]]
   (REAL-WORLD-SCHEMAS-12, 13) and [[T-ROUT-runcorpus-first-match-routing]]
   (REAL-WORLD-SCHEMAS-11) exact.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/real-world-schemas.yaml` | new | 15 verified + 1 planned entries for the `real-world-schemas` category |
| `docs/example-catalog.md` | modify | reconcile any corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/real-world-schemas.yaml` exists with 16 entries (15
  shipped + 1 planned).
- [ ] AC-2: Every entry in `docs/catalog/real-world-schemas.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every shipped `artifact` in `docs/catalog/real-world-schemas.yaml` reproduces the real engine findings / exit codes.
- [ ] AC-4: `REAL-WORLD-SCHEMAS-16` carries `status: planned`; the
  `recommend_test` links point at T-DRAG / T-ROUT.

## Out of scope

- The other seven categories (their own child tasks).
- Writing the runner / docRule tests themselves
  ([[T-ROUT-runcorpus-first-match-routing]], [[T-DRAG-docrule-runcorpus-aggregation]]).
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — YAML parse confirms `docs/catalog/real-world-schemas.yaml` holds 16 entries (REAL-WORLD-SCHEMAS-01..16; 15 shipped + 1 planned).
- AC-2: auto — programmatic field check confirms all 12 example-entry fields are present on every entry; `artifact_kind` / `needs_test` / `coverage_status` enum values all valid.
- AC-3: agent-manual — each shipped YAML contract (01,02,03,06,07,08,09) was loaded via `loadContract` and run through `.validate()` over conforming and violating documents, confirming exact finding ids (`structure/section-missing`, `structure/section-order`, `frontmatter/enum`, `frontmatter/unknown-key`, `frontmatter/type`, `content/table/cell`, `content/table/min-rows`, `content/list/item-kind`, `content/code/lang`); the code artifact (05) was executed against the engine; code artifacts (12,13) and CLI artifacts (04,14,15) were reconciled against the public API exports, `existing_coverage` fixtures, and `src/cli/run.ts` flags / exit codes 0·1·2.
- AC-4: auto — REAL-WORLD-SCHEMAS-16 carries `status: planned` (immediately after `name`) and `recommend_test: "[[C-0009-declarative-text-constraints]] / [[D-0011-declarative-text-constraints]]"`.

### What worked

- The already-merged sibling catalog files (`validation-planes.yaml`, `declarative-yaml.yaml`) gave an exact schema, field-order, and block-style template — zero ambiguity on the target shape.
- `loadContract` + `.validate()` made AC-3 mechanical: every shipped YAML artifact was reproducible against the real engine in a throwaway script (conforming → 0 findings; violating → the precise finding id).
- The baseline-gated `quality run` cleanly separated pre-existing typecheck drift from branch-introduced drift, so the docs-only change gated to `OK 3/3` with no triage.

### Friction and automation gaps

- `sdlc quality run --diff-against-baseline` invoked from inside the task-work worktree defaulted its baseline-dir to the worktree's own `.sdlc/quality-baselines/`, but Step 3a captured the baseline into the **main repo's** `.sdlc/quality-baselines/` — the gate failed `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly. Task-work Step 7 should resolve the baseline-dir to the superproject when run from a worktree (or Step 3a should write into the worktree's dir). Captured as a backlog item this run.
- AC-3's "reproduces the real engine" is agent-manual diligence, not a CI gate — no test consumes `docs/catalog/*.yaml`. Already tracked by [[T-D5QD-catalog-yaml-source-parity-test]] (planning/draft); no new item needed.
- `preflight_permissions.ts` (Step 3b) reported `bun` / `npm` / `Write` / `Edit` as missing when the harness had in fact granted them (the probe reads static settings files, not the live grant) — best-effort, low-signal; noted, not actioned.
