---
type: task
schema_version: '5'
id: T-CEMB
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
- runner
- ci
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: '2026-07-01'
prs:
- https://github.com/sksizer/markdown-contract/pull/130
completion_note: 'Shipped via #130.'
---
# Finalize the Embed-and-Automate catalog category as verified YAML (`embed-and-ci`)

## Goal

Turn the **11 shipped** examples in the `embed-and-ci` category of
`docs/example-catalog.md` (`EMBED-AND-CI-01`..`11`) into
`docs/catalog/embed-and-ci.yaml` — structured, schema-keyed data with each runner
/ CI sketch verified against the real `runCorpus` library surface.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `embed-and-ci` section (`EMBED-AND-CI-01`..`11`) as a prose index table + sketches. |
| `src/runner/` | The runner library (`runCorpus`, aggregation, exit codes) the examples embed; verified against. |
| `src/cli/` | The CLI gating examples wrap the runner with. |

## Proposed

`docs/catalog/embed-and-ci.yaml`: 11 verified entries, each with the full
example-entry schema and a sketch reproducing the real runner / exit-code
behavior.

## Approach

1. Extract `EMBED-AND-CI-01`..`11` from `docs/example-catalog.md` into
   `docs/catalog/embed-and-ci.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each `artifact` against the real runner library / CLI and reconcile the
   aggregated findings and exit codes shown.
3. Re-confirm each `coverage_status` / `existing_coverage` link against
   `src/runner/` and `src/cli/`; keep the `EMBED-AND-CI-03` follow-up link to
   [[T-ROUT-runcorpus-first-match-routing]] exact.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/embed-and-ci.yaml` | new | structured, verified entries for the `embed-and-ci` category |
| `docs/example-catalog.md` | modify | reconcile any corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/embed-and-ci.yaml` exists with 11 entries.
- [ ] AC-2: Every entry in `docs/catalog/embed-and-ci.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every `artifact` in `docs/catalog/embed-and-ci.yaml` reproduces the real runner / exit-code behavior shown.
- [ ] AC-4: Every `existing_coverage` link in `docs/catalog/embed-and-ci.yaml` resolves to a current test under `src/runner/` or `src/cli/`; the `EMBED-AND-CI-03` `recommend_test` points at `[[T-ROUT-runcorpus-first-match-routing]]`.

## Out of scope

- The other seven categories (their own child tasks).
- Writing the runner test itself ([[T-ROUT-runcorpus-first-match-routing]]).
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — parsed `docs/catalog/embed-and-ci.yaml` with the `yaml` lib; `examples.length === 11`.
- AC-2: auto — field-parity check confirmed all 12 example-entry fields present on every entry (no missing, no extra) and key-order matches sibling `docs/catalog/consume-as-data.yaml`.
- AC-3: agent-manual — verified every `artifact` against the real surface: `runCorpus` signature/opts/`{findings, exitCode, stats}` return (`src/runner/corpus.ts`), CLI exit policy 0/1/2 + `--format json|sarif` + `init --check` + `--include` (`src/cli/run.ts`), `formatJson` / `formatSarif` SARIF 2.1.0 `region.startLine` (`src/cli/format.ts`), `FindingLevel = error|warn|report` / `SourcePos {line, col?}` / `Finding` shape (`src/core/types.ts`), and the deterministic line→col→plane sort (`src/core/validate.ts`).
- AC-4: auto — all 8 distinct `existing_coverage` paths resolve on disk; `EMBED-AND-CI-03.recommend_test === "[[T-ROUT-runcorpus-first-match-routing]]"` and the T-ROUT task file is present.

### What worked

- The runner/CLI library surface matched every catalog sketch verbatim — zero artifact corrections were needed, and the catalog's at-a-glance row 7 (`11 / 8 / 3 / 0 / 1`) already matched the authored YAML's coverage tally, so `docs/example-catalog.md` needed no reconciliation edit.
- The shipped sibling YAMLs (`consume-as-data.yaml`, `cli.yaml`) gave an exact structural template; key-order parity was a one-shot match with no iteration.
- The baseline-gated quality run cleanly subtracted the 4 pre-existing findings and reported `OK 3/3` with no new drift introduced.

### Friction and automation gaps

- Step 3b's permissions probe reported false-positive gaps (`bun`/`npm` missing `Bash(...)`, `Write`/`Edit` missing for the worktree path) that contradicted observed behavior — every `bun`/`npm`/`Write`/`Edit` call in the run succeeded. The probe resolves against the literal settings file and does not account for harness-granted runtime permissions, so it would fire a spurious AskUserQuestion on every supervised run in this environment. Captured as a backlog note (`docs/planning/backlog/B-PFPB-permissions-probe-false-positive.md`) rather than a separate follow-up PR, per the consolidation directive.
