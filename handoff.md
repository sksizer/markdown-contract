# Handoff — Text-constraint dogfood + final closeout

_Task: `T-TXFX-text-constraint-fixtures`. PR: <https://github.com/sksizer/markdown-contract/pull/95>._

## Summary

Added a section-scoped requires to contracts/decision.contract.yaml dogfooding the declarative text-constraint vocabulary against the live decision corpus (every decision's References section must cite at least one related entity as a [[wikilink]]); markdown-contract validate docs/planning and the full vitest suite are green.

## Files changed

| Path | Role |
|---|---|
| `contracts/decision.contract.yaml` | M |
| `docs/planning/tasks/T-TXFX-text-constraint-fixtures.md` | M |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/95

## Spawned follow-ups

- `T-A1SR-quality-gate-resolves-superproject-baseline (upstream sksizer/dev#514, linked-existing)`
