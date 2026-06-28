# Handoff — Text-constraint fixture scaffold + the `text-*` enable gates

_Task: `T-TXSC-text-constraint-fixture-scaffold`. PR: <https://github.com/sksizer/markdown-contract/pull/65>._

## Summary

Landed text-constraint fixture scaffold: text-api/text-yaml component gates (both off), a no-op requires/forbids/textRule stub through core+public barrels, and four text-api-gated validation fixtures (requires/forbids/count/regex) with pass/fail peers; fixtures skip green, no behavior.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-TXSC-text-constraint-fixture-scaffold.md` | M |
| `src/core/index.ts` | M |
| `src/core/text-constraints.test.ts` | A |
| `src/core/text-constraints.ts` | A |
| `src/index.ts` | M |
| `tests/components.ts` | M |
| `tests/fixtures/validation/index.ts` | M |
| `tests/fixtures/validation/text/22-text-requires-section.fail.md` | A |
| `tests/fixtures/validation/text/22-text-requires-section.pass.md` | A |
| `tests/fixtures/validation/text/22-text-requires-section.ts` | A |
| `tests/fixtures/validation/text/23-text-forbids-body-root.fail.md` | A |
| `tests/fixtures/validation/text/23-text-forbids-body-root.pass.md` | A |
| `tests/fixtures/validation/text/23-text-forbids-body-root.ts` | A |
| `tests/fixtures/validation/text/24-text-requires-count.fail.md` | A |
| `tests/fixtures/validation/text/24-text-requires-count.pass.md` | A |
| `tests/fixtures/validation/text/24-text-requires-count.ts` | A |
| `tests/fixtures/validation/text/25-text-regex.fail.md` | A |
| `tests/fixtures/validation/text/25-text-regex.pass.md` | A |
| `tests/fixtures/validation/text/25-text-regex.ts` | A |
| `tests/fixtures/validation/text/index.ts` | A |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/65

## Spawned follow-ups

- `T-4E9T-yaml-parity-glob-skips-peerless-fixtures`
