# Handoff — Repeatable sections: let a heading recur as peers, surfaced as a collection in the model

_Task: `T-1TA2-repeatable-sections-as-collections`. PR: <https://github.com/sksizer/markdown-contract/pull/224>._

## Summary

Documented the repeatable-section construct (D-0017) in the hand-authored Starlight guides (how-it-works.md, getting-started.md), addressing sksizer's docs-update review comment on PR #224.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | M |
| `.github/workflows/knip.yml` | M |
| `.moon/workspace.yml` | M |
| `README.md` | M |
| `apps/daemon-web-prototype/components/DriftView.vue` | M |
| `apps/daemon-web-prototype/components/FindingsList.stories.ts` | A |
| `apps/daemon-web-prototype/components/FindingsList.vue` | A |
| `apps/daemon-web-prototype/components/RunSummary.stories.ts` | A |
| `apps/daemon-web-prototype/components/RunSummary.vue` | A |
| `apps/daemon-web-prototype/components/VaultDashboard.stories.ts` | A |
| `apps/daemon-web-prototype/components/VaultDashboard.vue` | A |
| `apps/daemon-web-prototype/components/VaultStatusCard.stories.ts` | A |
| `apps/daemon-web-prototype/components/VaultStatusCard.vue` | A |
| `bun.lock` | M |
| `docs/planning/decisions/D-0017-repeatable-sections.md` | A |
| `docs/planning/tasks/T-1C0J-remove-stale-eslint-disable-comments.md` | M |
| `docs/planning/tasks/T-1TA2-repeatable-sections-as-collections.md` | M |
| `docs/planning/tasks/T-6WHH-assert-pinned-moon-version.md` | M |
| `docs/planning/tasks/T-8ZKX-retire-legacy-vaultdashboard-component.md` | M |
| `docs/planning/tasks/T-OX98-typed-row-source-coordinate-handle.md` | M |
| `docs/planning/tasks/T-SCDF-structured-cells-dogfood.md` | M |
| `docs/planning/tasks/T-SQFB-document-moon-runinci-dedicated-workflow.md` | M |
| `docs/planning/tasks/T-T5JW-refresh-prototype-doc-component-examples.md` | D |
| `examples/single-binary-nitro/.gitignore` | D |
| `examples/single-binary-nitro/README.md` | D |
| `examples/single-binary-nitro/moon.yml` | D |
| `examples/single-binary-nitro/package.json` | D |
| `examples/single-binary-nitro/src/bin.ts` | D |
| `examples/single-binary-nitro/tsconfig.json` | D |
| `examples/single-binary-nitro/types/api.ts` | D |
| `examples/single-binary-nitro/ui/app.vue` | D |
| `examples/single-binary-nitro/ui/assets/css/main.css` | D |
| `examples/single-binary-nitro/ui/components/kit/EmptyState.vue` | D |
| `examples/single-binary-nitro/ui/components/kit/ErrorState.vue` | D |
| `examples/single-binary-nitro/ui/components/kit/FindingRow.vue` | D |
| `examples/single-binary-nitro/ui/components/kit/LoadingState.vue` | D |
| `examples/single-binary-nitro/ui/components/kit/SeverityBadge.vue` | D |
| `examples/single-binary-nitro/ui/components/kit/StatusBadge.vue` | D |
| `examples/single-binary-nitro/ui/design/tokens.ts` | D |
| `examples/single-binary-nitro/ui/lib/findings.ts` | D |
| `examples/single-binary-nitro/ui/nuxt.config.ts` | D |
| `examples/single-binary-nitro/ui/pages/index.vue` | D |
| `examples/single-binary-nitro/ui/public/favicon.svg` | D |
| `examples/single-binary-nitro/ui/server/api/health.get.ts` | D |
| `examples/single-binary-nitro/ui/server/api/validate.post.ts` | D |
| `examples/single-binary-nitro/ui/server/utils/fixtures/vault/bad.md` | D |
| `examples/single-binary-nitro/ui/server/utils/fixtures/vault/good.md` | D |
| `examples/single-binary-nitro/ui/server/utils/fixtures/vault/markdown-contract.yaml` | D |
| `examples/single-binary-nitro/ui/server/utils/fixtures/vault/note.contract.yaml` | D |
| `examples/single-binary-nitro/ui/server/utils/validate-vault.test.ts` | D |
| `examples/single-binary-nitro/ui/server/utils/validate-vault.ts` | D |
| `examples/single-binary-nitro/ui/tsconfig.json` | D |
| `examples/single-binary-nitro/ui/types/index.ts` | D |
| `knip.json` | M |
| `packages/core/src/core/grammar.test.ts` | M |
| `packages/core/src/core/grammar.ts` | M |
| `packages/core/src/core/model.test.ts` | M |
| `packages/core/src/core/model.ts` | M |
| `packages/core/src/core/registry.ts` | M |
| `packages/core/src/core/structure.test.ts` | M |
| `packages/core/src/core/structure.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/src/declarative/body.test.ts` | M |
| `packages/core/src/declarative/body.ts` | M |
| `packages/core/src/declarative/infer.test.ts` | M |
| `packages/core/src/declarative/infer.ts` | M |
| `packages/core/tests/FIXTURES.md` | M |
| `packages/core/tests/fixtures/consumption/01-read-the-model-door.ts` | M |
| `packages/core/tests/fixtures/consumption/02-validate-doc-and-tree.ts` | M |
| `packages/core/tests/fixtures/consumption/03-dual-key-section-access.ts` | M |
| `packages/core/tests/fixtures/consumption/04-sectionview-content.ts` | M |
| `packages/core/tests/fixtures/consumption/05-tableview-typed-rows.ts` | M |
| `packages/core/tests/fixtures/consumption/06-named-tables-content-record.ts` | M |
| `packages/core/tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts` | M |
| `packages/core/tests/fixtures/consumption/08-nested-subsections.ts` | M |
| `packages/core/tests/fixtures/consumption/09-unknown-sections.ts` | M |
| `packages/core/tests/fixtures/consumption/11-real-task-consumed.ts` | M |
| `packages/core/tests/fixtures/consumption/16-typed-task-contract.md` | D |
| `packages/core/tests/fixtures/consumption/16-typed-task-contract.ts` | D |
| `packages/core/tests/fixtures/consumption/index.ts` | M |
| `sites/docs/src/content/docs/getting-started.md` | M |
| `sites/docs/src/content/docs/how-it-works.md` | M |

## Quality checks

5/6 OK (build,typecheck,test,package-check,lint:deps); core:lint FAIL is a pre-existing ENOBUFS/maxBuffer false-positive unrelated to the docs-only edits (moon run core:lint exits 0 directly). Pre-push gates green: 722/722 tests.

## PR

https://github.com/sksizer/markdown-contract/pull/224

## Spawned follow-ups

- none
