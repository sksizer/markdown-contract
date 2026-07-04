# Handoff — Repeatable sections: let a heading recur as peers, surfaced as a collection in the model

_Task: `T-1TA2-repeatable-sections-as-collections`. PR: <https://github.com/sksizer/markdown-contract/pull/224>._

## Summary

Add first-class repeatable sections: section({ repeatable, min?, max? }) validates repeated peers, surfaces them as a positional array in the model, extends the YAML DSL + init inferer, and lands decision record D-0017.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/decisions/D-0017-repeatable-sections.md` | A |
| `docs/planning/tasks/T-1TA2-repeatable-sections-as-collections.md` | M |
| `packages/core/src/core/grammar.test.ts` | M |
| `packages/core/src/core/grammar.ts` | M |
| `packages/core/src/core/model.test.ts` | M |
| `packages/core/src/core/model.ts` | M |
| `packages/core/src/core/registry.ts` | M |
| `packages/core/src/core/structure.test.ts` | M |
| `packages/core/src/core/structure.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/src/declarative/body.test.ts` | M |
| `packages/core/src/declarative/body.ts` | M |
| `packages/core/src/declarative/infer.test.ts` | M |
| `packages/core/src/declarative/infer.ts` | M |

## Quality checks

OK 6/6

## PR

https://github.com/sksizer/markdown-contract/pull/224

## Spawned follow-ups

- `T-RV1F-ground-approach-file-citations`
- `T-HGPH-quality-runner-raise-maxbuffer`
