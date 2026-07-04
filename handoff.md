# Handoff — Remove stale eslint-disable comments from test fixtures now that Biome is the linter

_Task: `T-1C0J-remove-stale-eslint-disable-comments`. PR: <https://github.com/sksizer/markdown-contract/pull/219>._

## Summary

Removed all 65 stale eslint-disable comments (64 line-level across ten consumption fixtures + one file-level block in model.test.ts); all mapped to Biome noExplicitAny=warn so pure deletions, noSelfCompare biome-ignore preserved. All three ACs pass.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-1C0J-remove-stale-eslint-disable-comments.md` | M |
| `packages/core/src/core/model.test.ts` | M |
| `packages/core/tests/fixtures/consumption/01-read-the-model-door.ts` | M |
| `packages/core/tests/fixtures/consumption/02-validate-doc-and-tree.ts` | M |
| `packages/core/tests/fixtures/consumption/03-dual-key-section-access.ts` | M |
| `packages/core/tests/fixtures/consumption/04-sectionview-content.ts` | M |
| `packages/core/tests/fixtures/consumption/05-tableview-typed-rows.ts` | M |
| `packages/core/tests/fixtures/consumption/06-named-tables-content-record.ts` | M |
| `packages/core/tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts` | M |
| `packages/core/tests/fixtures/consumption/08-nested-subsections.ts` | M |
| `packages/core/tests/fixtures/consumption/09-unknown-sections.ts` | M |
| `packages/core/tests/fixtures/consumption/11-real-task-consumed.ts` | M |

## Quality checks

OK 5/5 core verbs (build/typecheck/lint/test/package-check); knip lint:deps new-drift=4 is proven pre-existing environmental false-positive (installed lefthook hooks; identical on origin/main tree; CI knip green)

## PR

https://github.com/sksizer/markdown-contract/pull/219

## Spawned follow-ups

- none
