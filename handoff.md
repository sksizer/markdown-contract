# Handoff — Frontmatter/body split — a pure splitter retained on the `parse()` result

_Task: `T-FMSP-frontmatter-split-primitive`. PR: <https://github.com/sksizer/markdown-contract/pull/139>._

## Summary

Add pure projection-free splitFrontmatter(md) => {raw, body} and verbatim DocTree.body; parse() reuses the shared bodyAfterFrontmatter helper (no second scan), recognizer is remark-frontmatter (no new dep). 6 files + peer test.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-FMSP-frontmatter-split-primitive.md` | M |
| `packages/core/src/core/frontmatter.test.ts` | A |
| `packages/core/src/core/frontmatter.ts` | A |
| `packages/core/src/core/index.ts` | M |
| `packages/core/src/core/projection.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/src/index.ts` | M |

## Quality checks

OK 3/3

## PR

https://github.com/sksizer/markdown-contract/pull/139

## Spawned follow-ups

- none
