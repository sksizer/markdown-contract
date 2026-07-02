# Handoff — Document that moon tasks must wrap npm scripts under moon's runtime-only node toolchain

_Task: `T-U6W3-document-moon-npm-script-wrapping`. PR: <https://github.com/sksizer/markdown-contract/pull/176>._

## Summary

Documented the moon runtime-only-toolchain runner convention: rewrote the README Toolchain section and added an 'Authoring moon tasks' rule, added a matching packages/core/moon.yml comment (node-pinned test/coverage gate as the reason), reworded the stale npm-canonical line, and corrected the task doc's moved moon.yml path references.

## Files changed

| Path | Role |
|---|---|
| `README.md` | M |
| `docs/planning/decisions/D-0016-per-node-source-fidelity/03-verbatim-table-cells.md` | D |
| `docs/planning/decisions/D-0016-per-node-source-fidelity/04-inline-span-offsets.md` | D |
| `docs/planning/decisions/D-0016-per-node-source-fidelity/05-fallthrough-typed-mdast-raw.md` | D |
| `docs/planning/decisions/D-0016-per-node-source-fidelity/06-composition-not-inheritance.md` | D |
| `docs/planning/tasks/T-U6W3-document-moon-npm-script-wrapping.md` | M |
| `packages/core/moon.yml` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/176

## Spawned follow-ups

- none
