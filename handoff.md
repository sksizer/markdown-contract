# Handoff — Vendor the C-0004 projection fixture into packages/core instead of reaching out to a repo-root planning doc

_Task: `T-1GIL-vendor-c0004-projection-fixture`. PR: <https://github.com/sksizer/markdown-contract/pull/221>._

## Summary

Vendored a byte-for-byte package-local snapshot of the C-0004 capability doc into packages/core/tests/fixtures/projection/ and repointed projection.test.ts at it, removing the ../../../../ climb so packages/core is self-contained.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-1GIL-vendor-c0004-projection-fixture.md` | M |
| `packages/core/src/core/projection.test.ts` | M |
| `packages/core/tests/fixtures/projection/C-0004-dialect-aware-projection.md` | A |

## Quality checks

OK 6/6

## PR

https://github.com/sksizer/markdown-contract/pull/221

## Spawned follow-ups

- none
