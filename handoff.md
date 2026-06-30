# Handoff — Declarative front-end — `requires` / `forbids` in YAML

_Task: `T-TXYL-declarative-requires-forbids`. PR: <https://github.com/sksizer/markdown-contract/pull/87>._

## Summary

Declarative requires/forbids match-spec vocabulary for *.contract.yaml: src/declarative/text.ts closed-vocabulary compiler onto the TS text builders, node-local + body-root docRule wiring (body.ts/load.ts), compile-time consistency checks (vocab/duplicate/contradiction/max<min as DeclarativeError), 4 .contract.yaml parity peers, isV1Plane text/* parity, IMPLEMENTED[text-yaml]=true.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-TXYL-declarative-requires-forbids.md` | M |
| `src/declarative/body.ts` | M |
| `src/declarative/load.ts` | M |
| `src/declarative/text.test.ts` | A |
| `src/declarative/text.ts` | A |
| `tests/components.ts` | M |
| `tests/fixtures/validation/22-text-requires-section.contract.yaml` | A |
| `tests/fixtures/validation/22-text-requires-section.ts` | M |
| `tests/fixtures/validation/23-text-forbids-body-root.contract.yaml` | A |
| `tests/fixtures/validation/23-text-forbids-body-root.ts` | M |
| `tests/fixtures/validation/24-text-requires-count.contract.yaml` | A |
| `tests/fixtures/validation/24-text-requires-count.ts` | M |
| `tests/fixtures/validation/25-text-regex.contract.yaml` | A |
| `tests/fixtures/validation/25-text-regex.ts` | M |
| `tests/yaml-parity.test.ts` | M |

## Quality checks

OK 2/2

## PR

https://github.com/sksizer/markdown-contract/pull/87

## Spawned follow-ups

- none
