# Handoff — Flip knip from report-only to a blocking CI gate

_Task: `T-3L9Q-knip-gating-flip`. PR: <https://github.com/sksizer/markdown-contract/pull/213>._

## Summary

Flip knip to a blocking CI gate: knip.json triage (ignoreExportsUsedInFile, ignoreBinaries scc, drop redundant entries) drives lint:deps to exit 0; delete dead runDaemon/CATEGORY_LABELS/zod; remove continue-on-error from knip.yml; register lint:deps in sdlc.yaml quality_checks.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/knip.yml` | M |
| `apps/web/src/daemon/server.ts` | M |
| `bun.lock` | M |
| `docs/planning/tasks/T-3L9Q-knip-gating-flip.md` | M |
| `knip.json` | M |
| `sdlc.yaml` | M |
| `sites/docs/package.json` | M |
| `sites/docs/scripts/catalog.ts` | M |

## Quality checks

OK 5/5 (baseline-gated)

## PR

https://github.com/sksizer/markdown-contract/pull/213

## Spawned follow-ups

- `T-44OO-plugin-scripts-self-discover-project-root (linked, upstream sksizer/dev)`
