# Handoff — Dialect edge cases: section-id `byAnchor` negative and `#^anchor` fragment value

_Task: `T-DANF-dialect-anchor-fragment-edges`. PR: <https://github.com/sksizer/markdown-contract/pull/94>._

## Summary

Added two coverage-only dialect/model unit assertions: #^anchor wikilink fragment value (^id retained) and the section-id byAnchor-negative vs SectionView.anchors split. No engine changes.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-DANF-dialect-anchor-fragment-edges.md` | M |
| `docs/planning/tasks/T-IOUT-init-out-placement.md` | M |
| `src/core/dialect/wikilinks.test.ts` | M |
| `src/core/model.test.ts` | M |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/94

## Spawned follow-ups

- `T-OZ6A-readiness-gate-checks-symbol-reachability`
