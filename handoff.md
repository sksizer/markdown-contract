# Handoff — Validate published-package hygiene with publint and are-the-types-wrong

_Task: `T-L77L-package-publish-hygiene`. PR: <https://github.com/sksizer/markdown-contract/pull/144>._

## Summary

Answered the owner's clarifying question on package-quality.yml (line 11): the dedicated workflow is BOTH conflict-avoidance (keeps ci.yml's shared 'moon run :build :typecheck :coverage' line — the one genuine M-0010 coordination point — untouched, mirroring knip.yml/audit.yml) AND a purpose-built package-hygiene hard gate (publint + attw against the built/packed package, own triggers, no continue-on-error). Reply posted via pr-check self-comment wrapper; no code changes.

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

N/A (clarifying-question reply only; no code changes, nothing to build/lint)

## PR

https://github.com/sksizer/markdown-contract/pull/144

## Spawned follow-ups

- none
