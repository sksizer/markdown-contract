# Handoff — Scaffold the structured-cells fixtures and enable gates (`cell-typed` / `list-typed` / `cell-pos`)

_Task: `T-SCFX-structured-cells-fixture-scaffold`. PR: <https://github.com/sksizer/markdown-contract/pull/174>._

## Summary

Scaffolded gated skipped-green structured-cells fixtures (cell-typed/list-typed/cell-pos, seeded false), made table() generic over its cells map, and confirmed TableView<Row>; no engine change, suite green by skipping.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-SCFX-structured-cells-fixture-scaffold.md` | M |
| `packages/core/src/core/leaves.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/tests/FIXTURES.md` | M |
| `packages/core/tests/components.ts` | M |
| `packages/core/tests/fixtures/consumption/12-typed-row-transform.md` | A |
| `packages/core/tests/fixtures/consumption/12-typed-row-transform.ts` | A |
| `packages/core/tests/fixtures/consumption/13-typed-list-items.md` | A |
| `packages/core/tests/fixtures/consumption/13-typed-list-items.ts` | A |
| `packages/core/tests/fixtures/consumption/14-cell-position.md` | A |
| `packages/core/tests/fixtures/consumption/14-cell-position.ts` | A |
| `packages/core/tests/fixtures/consumption/15-no-transform-parity.contract.yaml` | A |
| `packages/core/tests/fixtures/consumption/15-no-transform-parity.md` | A |
| `packages/core/tests/fixtures/consumption/15-no-transform-parity.ts` | A |
| `packages/core/tests/fixtures/consumption/index.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/174

## Spawned follow-ups

- `refresh-planning-paths-post-monorepo-split`
- `quality-runner-streams-past-maxbuffer`
- `quality-run-resolves-superproject-baseline`
