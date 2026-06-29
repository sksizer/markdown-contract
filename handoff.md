# Handoff — TS-API predicate builders — `requires` / `forbids` / `textRule`

_Task: `T-TXAP-text-predicate-builders`. PR: <https://github.com/sksizer/markdown-contract/pull/71>._

## Summary

Implement requires/forbids (section Rule) + textRule (whole-doc DocRule) over the text-match core; flip IMPLEMENTED[text-api] true (4 gated fixtures green); add peer unit test; fix pre-existing TextMatchSpec duplicate-export.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-TXAP-text-predicate-builders.md` | M |
| `src/core/index.ts` | M |
| `src/core/text-constraints.test.ts` | M |
| `src/core/text-constraints.ts` | M |
| `tests/components.ts` | M |
| `tests/fixtures/validation/text/22-text-requires-section.ts` | M |
| `tests/fixtures/validation/text/23-text-forbids-body-root.ts` | M |
| `tests/fixtures/validation/text/24-text-requires-count.ts` | M |
| `tests/fixtures/validation/text/25-text-regex.ts` | M |

## Quality checks

OK 2/2 baseline-gated (538 passed / 0 skipped)

## PR

https://github.com/sksizer/markdown-contract/pull/71

## Spawned follow-ups

- `T-5LHY-docrule-receives-projected-tree`
- `T-KY0Y-enumerate-activated-gated-fixtures`
- `T-LDH4-surface-failing-baseline-at-pickup`
