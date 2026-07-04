# Handoff — Extract the M-0008 single-binary prototype into examples/single-binary — minimal two-faces example

_Task: `T-UDPO-extract-single-binary-example`. PR: <https://github.com/sksizer/markdown-contract/pull/205>._

## Summary

Extracted the minimal M-0008 two-faces prototype into examples/single-binary (combined bin entry, health+validate daemon, embed pipeline, one-page embedded Nuxt SPA, workspace/moon/CI wiring, canonical README) and re-pointed the seven M-0008 planning docs

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | M |
| `.moon/workspace.yml` | M |
| `bun.lock` | M |
| `docs/planning/milestones/M-0008-single-exec-distribution.md` | M |
| `docs/planning/tasks/T-BMTX-bun-compile-matrix.md` | M |
| `docs/planning/tasks/T-DEMO-end-to-end-feasibility-demo.md` | M |
| `docs/planning/tasks/T-RELS-release-channels.md` | M |
| `docs/planning/tasks/T-SPAE-spa-embed.md` | M |
| `docs/planning/tasks/T-UDPO-extract-single-binary-example.md` | M |
| `docs/planning/tasks/T-UTKU-web-ui-prototype-review.md` | M |
| `docs/planning/tasks/T-WEBU-nuxt-spa-ui.md` | M |
| `examples/single-binary/.gitignore` | A |
| `examples/single-binary/README.md` | A |
| `examples/single-binary/moon.yml` | A |
| `examples/single-binary/package.json` | A |
| `examples/single-binary/scripts/gen-assets.ts` | A |
| `examples/single-binary/src/bin.ts` | A |
| `examples/single-binary/src/daemon/assets.gen.ts` | A |
| `examples/single-binary/src/daemon/fixtures/vault/bad.md` | A |
| `examples/single-binary/src/daemon/fixtures/vault/good.md` | A |
| `examples/single-binary/src/daemon/fixtures/vault/markdown-contract.yaml` | A |
| `examples/single-binary/src/daemon/fixtures/vault/note.contract.yaml` | A |
| `examples/single-binary/src/daemon/index.ts` | A |
| `examples/single-binary/src/daemon/routes.test.ts` | A |
| `examples/single-binary/src/daemon/routes.ts` | A |
| `examples/single-binary/src/daemon/server.test.ts` | A |
| `examples/single-binary/src/daemon/server.ts` | A |
| `examples/single-binary/src/daemon/static.test.ts` | A |
| `examples/single-binary/src/daemon/static.ts` | A |
| `examples/single-binary/tsconfig.json` | A |
| `examples/single-binary/types/api.ts` | A |
| `examples/single-binary/ui/app.vue` | A |
| `examples/single-binary/ui/assets/css/main.css` | A |
| `examples/single-binary/ui/components/kit/EmptyState.vue` | A |
| `examples/single-binary/ui/components/kit/ErrorState.vue` | A |
| `examples/single-binary/ui/components/kit/FindingRow.vue` | A |
| `examples/single-binary/ui/components/kit/LoadingState.vue` | A |
| `examples/single-binary/ui/components/kit/SeverityBadge.vue` | A |
| `examples/single-binary/ui/components/kit/StatusBadge.vue` | A |
| `examples/single-binary/ui/design/tokens.ts` | A |
| `examples/single-binary/ui/lib/findings.ts` | A |
| `examples/single-binary/ui/nuxt.config.ts` | A |
| `examples/single-binary/ui/pages/index.vue` | A |
| `examples/single-binary/ui/public/favicon.svg` | A |
| `examples/single-binary/ui/tsconfig.json` | A |
| `examples/single-binary/ui/types/index.ts` | A |
| `knip.json` | M |
| `package.json` | M |

## Quality checks

OK 5/5 baseline-gated; post-rebase re-run flagged 6 moon decoration lines, proven false-positive (branch touches nothing core:lint covers)

## PR

https://github.com/sksizer/markdown-contract/pull/205

## Spawned follow-ups

- `T-UFUX-core-biome-warning-cleanup`
- `T-WG6B-quality-run-stream-verb-output`
- `T-TLJW-location-grammar-bracket-escaping`
- `T-LCTU-task-amend-on-main-verb`
- `T-6KS9-orchestrate-periodic-entities-audit`
- `T-BDKN-close-out-regenerates-docs-index`
- `T-0AM0-preflight-probe-honors-runtime-edit-grant`
