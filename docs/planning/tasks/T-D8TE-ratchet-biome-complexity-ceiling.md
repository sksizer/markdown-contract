---
type: task
schema_version: '5'
id: T-D8TE
status: planning/backlog
created: '2026-07-02'
related:
- '[[M-0010]]'
- '[[T-0MVN-biome-lint-format]]'
tags:
- quality
- lint
- complexity
- biome
- tech-debt
need_human_review: false
impact: low
complexity: medium
---
# Ratchet down the Biome cognitive-complexity ceiling from 46 toward 15

## Goal

When [[T-0MVN-biome-lint-format]] promoted `noExcessiveCognitiveComplexity` from
`warn` to `error`, 16 functions already exceeded Biome's recommended ceiling of 15
(the maximum was 46, in `declarative/text.ts`). Refactoring them was out of scope for
a behavior-preserving reformat, so the ceiling was parked at 46 (`maxAllowedComplexity: 46`)
to gate *new* regressions only. This task pays down that debt: refactor the worst
offenders and lower the ceiling step by step so the gate becomes meaningful rather than
a rubber stamp.

## Today

| Location | Role today |
|---|---|
| `biome.jsonc` | `noExcessiveCognitiveComplexity` at `error` with `maxAllowedComplexity: 46` — set to today's max so the promotion did not break the build. |
| `packages/core/src/declarative/text.ts` | Contains the single most-complex function (cognitive complexity 46). |
| `packages/core/src/core/structure.ts` | Two functions at 45 and 43. |
| `packages/core/src/cli/run.ts` | Functions at 36 and 30. |
| `packages/core/src/core/projection.ts` | Function at 36. |
| `packages/core/src/declarative/infer.ts` | Functions at 35, 23, 22. |
| `packages/core/src/declarative/schema.ts` | Function at 24. |
| `packages/core/src/core/content.ts` | Functions at 22, 19, 17. |
| `packages/core/src/core/text-match.ts` | Function at 20. |
| `packages/core/src/declarative/body.ts` | Function at 19. |
| `packages/core/src/runner/corpus.ts` | Function at 16. |

## Proposed

`maxAllowedComplexity` is lowered materially below 46 (target: the recommended 15, or an
agreed intermediate such as 20 if 15 proves impractical for the parser/inference core),
with the functions above 15 either refactored under it or explicitly annotated with a
`biome-ignore` carrying a rationale. `bunx moon run core:lint` stays green at the new
ceiling; behavior is unchanged (the full test suite stays green).

## Approach

1. Enumerate the current offenders: `biome lint packages/core --reporter=json` filtered to
   `noExcessiveCognitiveComplexity`, sorted by reported complexity.
2. Pick a target ceiling (15 ideal; agree an intermediate if the parser/inference functions
   resist decomposition without hurting readability).
3. Refactor top-down (46 → …), extracting helpers and flattening control flow; run
   `bunx moon run core:test` after each function so every step is behavior-preserving.
4. For any function that genuinely reads best above the ceiling, add a scoped
   `// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>` rather than
   contorting it.
5. Lower `maxAllowedComplexity` in `biome.jsonc` to the target and confirm the gate is green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `biome.jsonc` | modify | Lower `maxAllowedComplexity` from 46 to the agreed target. |
| `packages/core/src/**/*.ts` | modify | Refactor the functions above the new ceiling (or annotate with rationale). |

## Acceptance criteria

- [ ] AC-1: `maxAllowedComplexity` in `biome.jsonc` is materially lower than 46 (target 15, or a documented intermediate).
- [ ] AC-2: `bunx moon run core:lint` exits 0 at the new ceiling.
- [ ] AC-3: `bunx moon run core:test` stays green — the refactors are behavior-preserving.

## Out of scope

- Changing which rules are enabled or their severities beyond the complexity ceiling.

## Dependencies

- [[T-0MVN-biome-lint-format]] (must be merged first — it introduces the rule at `error` and the ceiling).

## Discovery context

Captured from the [[T-0MVN-biome-lint-format]] post-mortem: the ceiling was set to today's
maximum (46) as a deliberate regression-gate rather than refactoring 16 functions inside a
behavior-preserving reformat PR.
