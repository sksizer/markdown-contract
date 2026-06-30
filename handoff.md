# Handoff — Dialect referential-integrity docRules: dead in-doc anchors and dangling vault wikilinks

_Task: `T-DREF-dialect-referential-integrity`. PR: <https://github.com/sksizer/markdown-contract/pull/102>._

## Summary

Added two dialect referential-integrity test compositions over existing primitives (no engine changes): an in-doc dead-anchor validation fixture (v26) pairing extractVaultRefs + doc.byAnchor, and a cross-document warn-level wikilink-existence runCorpus block in src/runner/corpus.test.ts.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-CCON-catalog-consume-as-data.md` | M |
| `docs/planning/tasks/T-DREF-dialect-referential-integrity.md` | M |
| `docs/planning/tasks/T-ZLND-web-ui-prototype-app.md` | M |

## Quality checks

OK 2/2 (npm run test: 569 tests passed; npm run typecheck clean)

## PR

https://github.com/sksizer/markdown-contract/pull/102

## Spawned follow-ups

- `T-A1SR-quality-gate-resolves-superproject-baseline`
