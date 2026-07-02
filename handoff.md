# Handoff — Add scc code metrics — lines of code and cyclomatic complexity reporting

_Task: `T-X07O-code-metrics-scc`. PR: <https://github.com/sksizer/markdown-contract/pull/166>._

## Summary

Added report-only scc code-metrics: dedicated .github/workflows/metrics.yml (pinned SCC_VERSION=v3.5.0, installs the tagged release, writes scc --ci table to the Step Summary, uploads scc --format json --by-file as the code-metrics artifact), a root 'metrics' npm script (scc packages/core/src), and a README '## Code metrics' note. Report-only — no gate; ci.yml untouched. Complements T-0MVN and T-79GV.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/metrics.yml` | A |
| `README.md` | M |
| `docs/planning/tasks/T-X07O-code-metrics-scc.md` | M |
| `package.json` | M |

## Quality checks

OK 4/4 (baseline-gated; 0 new drift)

## PR

https://github.com/sksizer/markdown-contract/pull/166

## Spawned follow-ups

- none
