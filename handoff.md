# Handoff — Make yaml-parity 'peers exist' glob skip gated/peerless fixtures so subdirectory placement isn't load-bearing

_Task: `T-4E9T-yaml-parity-glob-skips-peerless-fixtures`. PR: <https://github.com/sksizer/markdown-contract/pull/83>._

## Summary

Recursive yaml-parity glob + peerless opt-out marker: peers-exist check softened to a vitest annotate() warning, behavioral parity stays hard; text fixtures 22-25 relocated up out of the text/ subfolder and marked peerless.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-4E9T-yaml-parity-glob-skips-peerless-fixtures.md` | M |
| `docs/planning/tasks/T-RUNS-validate-run-summary.md` | M |
| `tests/fixtures/validation/text/22-text-requires-section.fail.md	tests/fixtures/validation/22-text-requires-section.fail.md` | R100 |
| `tests/fixtures/validation/text/22-text-requires-section.pass.md	tests/fixtures/validation/22-text-requires-section.pass.md` | R100 |
| `tests/fixtures/validation/text/22-text-requires-section.ts	tests/fixtures/validation/22-text-requires-section.ts` | R085 |
| `tests/fixtures/validation/text/23-text-forbids-body-root.fail.md	tests/fixtures/validation/23-text-forbids-body-root.fail.md` | R100 |
| `tests/fixtures/validation/text/23-text-forbids-body-root.pass.md	tests/fixtures/validation/23-text-forbids-body-root.pass.md` | R100 |
| `tests/fixtures/validation/text/23-text-forbids-body-root.ts	tests/fixtures/validation/23-text-forbids-body-root.ts` | R086 |
| `tests/fixtures/validation/text/24-text-requires-count.fail.md	tests/fixtures/validation/24-text-requires-count.fail.md` | R100 |
| `tests/fixtures/validation/text/24-text-requires-count.pass.md	tests/fixtures/validation/24-text-requires-count.pass.md` | R100 |
| `tests/fixtures/validation/text/24-text-requires-count.ts	tests/fixtures/validation/24-text-requires-count.ts` | R084 |
| `tests/fixtures/validation/text/25-text-regex.fail.md	tests/fixtures/validation/25-text-regex.fail.md` | R100 |
| `tests/fixtures/validation/text/25-text-regex.pass.md	tests/fixtures/validation/25-text-regex.pass.md` | R100 |
| `tests/fixtures/validation/text/25-text-regex.ts	tests/fixtures/validation/25-text-regex.ts` | R084 |
| `tests/fixtures/validation/index.ts` | M |
| `tests/fixtures/validation/text/index.ts` | D |
| `tests/harness.ts` | M |
| `tests/yaml-parity.test.ts` | M |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/83

## Spawned follow-ups

- none
