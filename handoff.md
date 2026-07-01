# Handoff — Validate published-package hygiene with publint and are-the-types-wrong

_Task: `T-L77L-package-publish-hygiene`. PR: <https://github.com/sksizer/markdown-contract/pull/144>._

## Summary

Added publint + @arethetypeswrong/cli package-hygiene linters to the publishable packages/core, wrapped in a cached moon package-check task (deps: ['build']) and gated in CI via a dedicated package-quality.yml workflow plus an sdlc.yaml quality_checks entry. publint reports 0 errors; attw passes both entry points (. and ./declarative) under the esm-only profile; npm pack from packages/core stays clean (no workspace:* refs, T-WKSP baseline preserved).

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/package-quality.yml` | A |
| `bun.lock` | M |
| `docs/planning/backlog/B-L0CK-bun-lock-configversion-churn-from-local-proto-bun.md` | A |
| `docs/planning/tasks/T-L77L-package-publish-hygiene.md` | M |
| `packages/core/moon.yml` | M |
| `packages/core/package.json` | M |
| `sdlc.yaml` | M |

## Quality checks

OK 4/4 (baseline-gated; no new drift)

## PR

https://github.com/sksizer/markdown-contract/pull/144

## Spawned follow-ups

- `B-L0CK-bun-lock-configversion-churn-from-local-proto-bun`
