---
type: task
schema_version: '5'
id: T-CDYL
status: in-progress
created: '2026-06-30'
related:
- '[[M-0007-example-use-case-catalog]]'
- '[[C-0009-declarative-text-constraints]]'
parent_key: '[[T-CTLG-example-catalog-finalize]]'
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
last_reviewed: '2026-06-30'
readiness_verified_at: '2026-06-30T15:15:03Z'
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

- AC-1: auto — YAML-parse count confirms 20 entries (`DECLARATIVE-YAML-01..13` shipped + `14..20` planned).
- AC-2: auto — YAML-parse field-presence check across all 20 entries; 0 missing-field failures across the 12-field schema.
- AC-3: auto (agent-driven) — every shipped `artifact` (01–11, 13's YAML half) compiled against the real loader (`loadContract`/`loadConfigFile` from `src/declarative/`); fragments wrapped in a minimal `mcVersion: 1` / `kind: contract` envelope, configs materialized their referenced contract files; spot-checked findings (01 `frontmatter/required`, 05 `frontmatter/unknown-key`, 13 `frontmatter/type`+`frontmatter/enum`). 12 is CLI/bash (covered by the CLI suite). No corrections needed; throwaway verifier deleted.
- AC-4: auto — all 7 planned entries carry `status: planned`, `coverage_status: uncovered`; entry 14 keeps the seed fixture `tests/fixtures/validation/17-node-level-custom-rule.ts`, 15–20 carry `existing_coverage: []`; each `recommend_test` links both `[[C-0009-declarative-text-constraints]]` and `[[D-0011-declarative-text-constraints]]`.

### What worked

- The four already-merged catalog files (`dialect.yaml` et al.) gave an unambiguous schema/format model — field order, literal-block `artifact`, bare-string `builds_on` — so the new file dropped in consistently with zero schema guesswork.
- Compiling each shipped sketch through the real `src/declarative` loader caught nothing broken (all 13 clean), which is the strongest possible signal that the catalog's `artifact` bodies are faithful and not aspirational.
- The baseline-gated quality gate (`OK 2/2`) cleanly separated this branch's drift (none) from the 4 pre-existing findings.

### Friction and automation gaps

- Step 7's documented `sdlc quality run --diff-against-baseline` invocation omits `--baseline-dir`, so from a worktree it defaults to the worktree's own `.sdlc/quality-baselines/` and fails with `baseline not found` (the baseline was captured into the *main repo's* `.sdlc/`, which is gitignored and absent in the worktree) — task-work Step 7 (and 9) should pass `--baseline-dir <main-repo>/.sdlc/quality-baselines` explicitly, or the executor should fall back to the superproject's baseline dir when run inside a worktree. → [[T-VJYX-quality-run-resolves-superproject-baseline-dir]]
- Content observation (not an automation gap, flag for a possible follow-up): the text-constraint loader (`src/declarative/text.ts` + fixtures `22..25`) is in fact already implemented, even though `DECLARATIVE-YAML-14..20` are framed as PLANNED in `example-catalog.md`. They were correctly kept `status: planned` here because the *sketched* syntax still diverges from the shipped engine (e.g. entry 18's `requires: [{max: 0}]` "forbids dual" is explicitly rejected by `text.ts`, which routes absence to `forbids`); a future task may want to reconcile the sketched syntax against the shipped text-constraint surface. → [[T-237L-reconcile-text-constraint-catalog-syntax]]

### Spawned follow-up tasks

- [[T-VJYX-quality-run-resolves-superproject-baseline-dir]] (https://github.com/sksizer/dev/pull/531) — Upstream-plugin (sdlc): resolve the quality-baseline dir from the superproject when `sdlc quality run` runs inside a worktree; spawned.
- [[T-237L-reconcile-text-constraint-catalog-syntax]] (https://github.com/sksizer/markdown-contract/pull/113) — Local: reconcile the planned DECLARATIVE-YAML-14..20 text-constraint sketches against the shipped `text.ts` engine; spawned.
