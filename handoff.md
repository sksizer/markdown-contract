# Handoff — Retire or reconcile the legacy VaultDashboard component now that pages/index.vue is the dashboard

_Task: `T-8ZKX-retire-legacy-vaultdashboard-component`. PR: <https://github.com/sksizer/markdown-contract/pull/226>._

## Summary

Retired the orphaned legacy VaultDashboard dashboard plus the leaves its removal orphaned (VaultStatusCard, FindingsList, RunSummary) and all four Storybook stories in apps/daemon-web-prototype (8 files deleted, 741 lines); reworded the FindingsList reference in DriftView.vue's doc comment (no behavior change); kept the still-referenced VaultSummary type; corrected an imprecise path citation in the task's Discovery context.

## Files changed

| Path | Role |
|---|---|
| `apps/daemon-web-prototype/components/DriftView.vue` | M |
| `apps/daemon-web-prototype/components/FindingsList.stories.ts` | D |
| `apps/daemon-web-prototype/components/FindingsList.vue` | D |
| `apps/daemon-web-prototype/components/RunSummary.stories.ts` | D |
| `apps/daemon-web-prototype/components/RunSummary.vue` | D |
| `apps/daemon-web-prototype/components/VaultDashboard.stories.ts` | D |
| `apps/daemon-web-prototype/components/VaultDashboard.vue` | D |
| `apps/daemon-web-prototype/components/VaultStatusCard.stories.ts` | D |
| `apps/daemon-web-prototype/components/VaultStatusCard.vue` | D |
| `docs/planning/tasks/T-8ZKX-retire-legacy-vaultdashboard-component.md` | M |

## Quality checks

OK 6/6

## PR

https://github.com/sksizer/markdown-contract/pull/226

## Spawned follow-ups

- `T-T5JW-refresh-prototype-doc-component-examples`
- `T-6S2N-path-citations-tolerate-basename-suffix`
