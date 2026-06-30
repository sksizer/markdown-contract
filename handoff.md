# Handoff — Pass the projected tree to DocRule for line-exact whole-document text scopes

_Task: `T-5LHY-docrule-receives-projected-tree`. PR: <https://github.com/sksizer/markdown-contract/pull/92>._

## Summary

Widened DocRule.run to also receive the projected DocTree (additive 3rd arg); textRule now reconstructs whole-document scope text from tree.root for line-exact forbids positions; re-pinned fixture 23 and its peer test to the exact offending line (3).

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-5LHY-docrule-receives-projected-tree.md` | M |
| `src/core/grammar.ts` | M |
| `src/core/text-constraints.test.ts` | M |
| `src/core/text-constraints.ts` | M |
| `src/core/types.ts` | M |
| `src/core/validate.ts` | M |
| `tests/fixtures/validation/23-text-forbids-body-root.ts` | M |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/92

## Spawned follow-ups

- `T-KS7C-ensure-ready-enumerates-peer-test-twin`
- `T-A1SR-quality-gate-resolves-superproject-baseline`
