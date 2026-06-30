# Handoff — Prototype: config drift view (init --check surface)

_Task: `T-HHLC-web-ui-drift-view`. PR: <https://github.com/sksizer/markdown-contract/pull/121>._

## Summary

Added DriftView.vue (config-drift init --check surface: unified + split presentation of added/removed/changed entries, in-sync panel via EmptyState, advisory-warnings aside) and DriftView.stories.ts (4 fixture-driven Storybook variants over sampleDrift/cleanDrift).

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-HHLC-web-ui-drift-view.md` | M |
| `prototype/web-ui/components/DriftView.stories.ts` | A |
| `prototype/web-ui/components/DriftView.vue` | A |

## Quality checks

OK 2/2 (baseline-gated; npm run test + npm run typecheck)

## PR

https://github.com/sksizer/markdown-contract/pull/121

## Spawned follow-ups

- none
