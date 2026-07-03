# Handoff — Thread `z.output<cells>` to a typed `TableView` row read-back through `read()` and `Infer`

_Task: `T-SCRB-typed-row-read-back`. PR: <https://github.com/sksizer/markdown-contract/pull/192>._

## Summary

Typed TableView row read-back: tableView reads the T-SCTC cache overlay (node.typed) with raw-string fallback; table<C>/RowOf threads z.output<cells> through section/sections/Infer; TableView default stays Record<string,string>; cell-typed gate flipped true.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-EW8J-refresh-planning-paths-post-monorepo-split.md` | M |
| `docs/planning/tasks/T-SCRB-typed-row-read-back.md` | M |
| `packages/core/src/core/grammar.ts` | M |
| `packages/core/src/core/index.ts` | M |
| `packages/core/src/core/leaves.ts` | M |
| `packages/core/src/core/model.test.ts` | M |
| `packages/core/src/core/model.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/tests/components.ts` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/192

## Spawned follow-ups

- `doc-zod-enum-output-string-caveat`
- `conditional-safe-type-equality-helper`
- `guard-table-overloads-dynamic-callsite`
- `worktree-gate-bypass-moon-cache`
- `refresh-planning-paths-post-monorepo-split`
