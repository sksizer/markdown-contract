# Handoff — Fix noExplicitAny warnings at the source and promote the rule

_Task: `T-JGCX-biome-noexplicitany-source-fix`. PR: <https://github.com/sksizer/markdown-contract/pull/216>._

## Summary

Genericize the consumption harness over <F,B> and sweep all fixtures + model.test.ts off 'as any' onto the library's typed model, then promote noExplicitAny to error with zero suppressions.

## Files changed

| Path | Role |
|---|---|
| `apps/daemon-web-prototype/.storybook/main.ts` | M |
| `biome.jsonc` | M |
| `docs/planning/tasks/T-JGCX-biome-noexplicitany-source-fix.md` | M |
| `docs/planning/tasks/T-SCLI-list-item-transforms.md` | M |
| `packages/core/src/core/model.test.ts` | M |
| `packages/core/tests/FIXTURES.md` | M |
| `packages/core/tests/expect.ts` | A |
| `packages/core/tests/fixtures/consumption/01-read-the-model-door.ts` | M |
| `packages/core/tests/fixtures/consumption/02-validate-doc-and-tree.ts` | M |
| `packages/core/tests/fixtures/consumption/03-dual-key-section-access.ts` | M |
| `packages/core/tests/fixtures/consumption/04-sectionview-content.ts` | M |
| `packages/core/tests/fixtures/consumption/05-tableview-typed-rows.ts` | M |
| `packages/core/tests/fixtures/consumption/06-named-tables-content-record.ts` | M |
| `packages/core/tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts` | M |
| `packages/core/tests/fixtures/consumption/08-nested-subsections.ts` | M |
| `packages/core/tests/fixtures/consumption/09-unknown-sections.ts` | M |
| `packages/core/tests/fixtures/consumption/10-contracterror-door.ts` | M |
| `packages/core/tests/fixtures/consumption/11-real-task-consumed.ts` | M |
| `packages/core/tests/fixtures/consumption/12-typed-row-transform.ts` | M |
| `packages/core/tests/fixtures/consumption/13-typed-list-items.ts` | M |
| `packages/core/tests/fixtures/consumption/14-cell-position.ts` | M |
| `packages/core/tests/fixtures/consumption/15-no-transform-parity.ts` | M |
| `packages/core/tests/harness.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/216

## Spawned follow-ups

- `T-O6U0-quality-gate-raise-maxbuffer`
- `T-N0HI-task-ac-scope-matches-files-to-touch`
- `T-SCLI-list-item-transforms`
