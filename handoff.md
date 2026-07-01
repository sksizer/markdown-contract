# Handoff — Add Dependabot updates and a dependency-audit CI step

_Task: `T-LCA7-dependency-updates-audit`. PR: <https://github.com/sksizer/markdown-contract/pull/138>._

## Summary

Add Dependabot (npm + github-actions, weekly grouped) and a bun-audit vulnerability CI gate (bun audit --audit-level=high, blocks on high/critical) plus an additive audit npm script; npm->bun adaptation for the Bun-workspace layout (no package-lock.json).

## Files changed

| Path | Role |
|---|---|
| `.github/dependabot.yml` | A |
| `.github/workflows/audit.yml` | A |
| `docs/planning/backlog/B-BUNZ-readiness-crosscheck-package-manager-layout.md` | A |
| `docs/planning/tasks/T-LCA7-dependency-updates-audit.md` | M |
| `package.json` | M |

## Quality checks

OK 3/3

## PR

https://github.com/sksizer/markdown-contract/pull/138

## Spawned follow-ups

- `B-BUNZ-readiness-crosscheck-package-manager-layout`
