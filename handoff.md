# Handoff — Finalize the CLI Quickstart catalog category as verified YAML (`cli`)

_Task: `T-CCLI-catalog-cli`. PR: <https://github.com/sksizer/markdown-contract/pull/112>._

## Summary

Converted CLI Quickstart examples CLI-01..CLI-12 to verified docs/catalog/cli.yaml (12 entries, full schema, real CLI output) and applied the four finding-id corrections in cli.yaml + example-catalog.md.

## Files changed

| Path | Role |
|---|---|
| `docs/catalog/cli.yaml` | A |
| `docs/example-catalog.md` | M |
| `docs/planning/tasks/T-CCLI-catalog-cli.md` | M |
| `docs/planning/tasks/T-NBXH-catalog-artifact-verb-output-roundtrip.md` | M |

## Quality checks

OK 2/2 (npm run test, npm run typecheck; baseline-gated, zero new drift)

## PR

https://github.com/sksizer/markdown-contract/pull/112

## Spawned follow-ups

- `T-F1WJ-quality-run-resolves-superproject-baseline (upstream sdlc, PR sksizer/dev#530)`
- `T-NBXH-catalog-artifact-verb-output-roundtrip (linked-existing)`
