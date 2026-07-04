# Handoff — Fix noNonNullAssertion warnings with real narrowing and promote the rule

_Task: `T-FOCX-biome-nononnull-source-fix`. PR: <https://github.com/sksizer/markdown-contract/pull/214>._

## Summary

Eliminated all ~199 noNonNullAssertion findings via real narrowing (destructure-guards, get-or-create, .charAt(0), a mustGet invariant helper in structure.ts, and shared expectDefined/first/throwing-byName test helpers); promoted the rule to error in biome.jsonc with 0 biome-ignore. Behavior-preserving; quality gate OK 5/5, 686 tests pass.

## Files changed

| Path | Role |
|---|---|
| `apps/daemon-web-prototype/components/VaultForm.vue` | M |
| `apps/daemon-web-prototype/mocks/api-fixtures.ts` | M |
| `biome.jsonc` | M |
| `docs/planning/tasks/T-FOCX-biome-nononnull-source-fix.md` | M |
| `packages/core/src/cli/run.ts` | M |
| `packages/core/src/core/camel.ts` | M |
| `packages/core/src/core/content.test.ts` | M |
| `packages/core/src/core/navigate.test.ts` | M |
| `packages/core/src/core/projection.test.ts` | M |
| `packages/core/src/core/structure.ts` | M |
| `packages/core/src/core/table-source.test.ts` | M |
| `packages/core/src/core/text-constraints.test.ts` | M |
| `packages/core/src/core/text-constraints.ts` | M |
| `packages/core/src/core/text-match.test.ts` | M |
| `packages/core/src/declarative/body.ts` | M |
| `packages/core/src/declarative/infer.test.ts` | M |
| `packages/core/src/declarative/infer.ts` | M |
| `packages/core/src/runner/corpus.ts` | M |
| `packages/core/tests/expect.ts` | A |
| `packages/core/tests/fixtures/infer/01-flat-uniform/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/02-optional-sections/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/03-order-recognized/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/04-order-strict/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/05-order-conflict/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/06-frontmatter-values/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/07-tree-depth1/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/08-tree-depth2/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/09-root-and-subdirs/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/10-stranded-depth/fixture.ts` | M |
| `packages/core/tests/fixtures/infer/11-relax/fixture.ts` | M |
| `packages/core/tests/harness.ts` | M |
| `packages/core/tests/inference.cli.test.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/214

## Spawned follow-ups

- `T-K96I-task-work-preflight-full-gate-scan`
