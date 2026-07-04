# Handoff — Adopt node-template supply-chain hardening: Dependabot cooldown + exact devDependency pins

_Task: `T-A9F0-template-supply-chain-hardening`. PR: <https://github.com/sksizer/markdown-contract/pull/235>._

## Summary

Adopt node-template supply-chain hardening: Dependabot cooldown windows (7/30) on both ecosystems and exact devDependency pins across all five workspace manifests; packages/core runtime deps stay ranged; README baseline gap closed.

## Files changed

| Path | Role |
|---|---|
| `.github/dependabot.yml` | M |
| `README.md` | M |
| `apps/daemon-web-prototype/package.json` | M |
| `apps/web/package.json` | M |
| `docs/planning/tasks/T-A9F0-template-supply-chain-hardening.md` | M |
| `package.json` | M |
| `packages/core/package.json` | M |
| `sites/docs/package.json` | M |

## Quality checks

OK 6/6 (baseline-gated)

## PR

https://github.com/sksizer/markdown-contract/pull/235

## Spawned follow-ups

- `quality-runner-explicit-maxbuffer (upstream sksizer/dev#675)`
- `resolve-superproject-baseline-dir (upstream sksizer/dev#676)`
