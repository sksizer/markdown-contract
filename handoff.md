# Handoff — Split the repo into a Bun workspace — `packages/core` (+ `apps/web` placeholder)

_Task: `T-WKSP-bun-workspace-split`. PR: <https://github.com/sksizer/markdown-contract/pull/135>._

## Summary

Bun workspace split: library moved to packages/core, apps/web placeholder added; moon toolchains split (build/typecheck on bun, test/coverage on node); Bun canonical dev PM (bun.lock committed, package-lock.json deleted); CI on setup-bun+bun install; npm artifact from packages/core unchanged (identical 135-entry pack, no workspace:* refs); Bun-API guard test added.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | M |
| `.gitignore` | M |
| `.moon/toolchains.yml` | M |
| `.moon/workspace.yml` | M |
| `README.md` | M |
| `apps/web/README.md` | A |
| `apps/web/package.json` | A |
| `bun.lock` | A |
| `docs/planning/backlog/B-QF64-assert-pinned-moon-version.md` | A |
| `docs/planning/backlog/B-UHOH-vendor-c0004-projection-fixture.md` | A |
| `docs/planning/tasks/T-WKSP-bun-workspace-split.md` | M |
| `moon.yml` | D |
| `package-lock.json` | D |
| `package.json` | M |
| `packages/core/LICENSE` | A |
| `packages/core/README.md` | A |
| `packages/core/moon.yml` | A |
| `packages/core/package.json` | A |
| `src/cli/format.test.ts	packages/core/src/cli/format.test.ts` | R100 |
| `src/cli/format.ts	packages/core/src/cli/format.ts` | R100 |
| `src/cli/index.test.ts	packages/core/src/cli/index.test.ts` | R100 |
| `src/cli/index.ts	packages/core/src/cli/index.ts` | R100 |
| `src/cli/run.ts	packages/core/src/cli/run.ts` | R100 |
| `src/core/camel.test.ts	packages/core/src/core/camel.test.ts` | R100 |
| `src/core/camel.ts	packages/core/src/core/camel.ts` | R100 |
| `src/core/content.test.ts	packages/core/src/core/content.test.ts` | R100 |
| `src/core/content.ts	packages/core/src/core/content.ts` | R100 |
| `src/core/dialect/anchors.test.ts	packages/core/src/core/dialect/anchors.test.ts` | R100 |
| `src/core/dialect/anchors.ts	packages/core/src/core/dialect/anchors.ts` | R100 |
| `src/core/dialect/index.ts	packages/core/src/core/dialect/index.ts` | R100 |
| `src/core/dialect/wikilinks.test.ts	packages/core/src/core/dialect/wikilinks.test.ts` | R100 |
| `src/core/dialect/wikilinks.ts	packages/core/src/core/dialect/wikilinks.ts` | R100 |
| `src/core/finding.test.ts	packages/core/src/core/finding.test.ts` | R100 |
| `src/core/finding.ts	packages/core/src/core/finding.ts` | R100 |
| `src/core/grammar.test.ts	packages/core/src/core/grammar.test.ts` | R100 |
| `src/core/grammar.ts	packages/core/src/core/grammar.ts` | R100 |
| `src/core/index.ts	packages/core/src/core/index.ts` | R100 |
| `src/core/leaves.test.ts	packages/core/src/core/leaves.test.ts` | R100 |
| `src/core/leaves.ts	packages/core/src/core/leaves.ts` | R100 |
| `src/core/model.test.ts	packages/core/src/core/model.test.ts` | R100 |
| `src/core/model.ts	packages/core/src/core/model.ts` | R100 |
| `src/core/projection.test.ts	packages/core/src/core/projection.test.ts` | R097 |
| `src/core/projection.ts	packages/core/src/core/projection.ts` | R100 |
| `src/core/registry.test.ts	packages/core/src/core/registry.test.ts` | R100 |
| `src/core/registry.ts	packages/core/src/core/registry.ts` | R100 |
| `src/core/structure.test.ts	packages/core/src/core/structure.test.ts` | R100 |
| `src/core/structure.ts	packages/core/src/core/structure.ts` | R100 |
| `src/core/text-constraints.test.ts	packages/core/src/core/text-constraints.test.ts` | R100 |
| `src/core/text-constraints.ts	packages/core/src/core/text-constraints.ts` | R100 |
| `src/core/text-match.test.ts	packages/core/src/core/text-match.test.ts` | R100 |
| `src/core/text-match.ts	packages/core/src/core/text-match.ts` | R100 |
| `src/core/types.ts	packages/core/src/core/types.ts` | R100 |
| `src/core/validate.test.ts	packages/core/src/core/validate.test.ts` | R100 |
| `src/core/validate.ts	packages/core/src/core/validate.ts` | R100 |
| `src/declarative/body.test.ts	packages/core/src/declarative/body.test.ts` | R100 |
| `src/declarative/body.ts	packages/core/src/declarative/body.ts` | R100 |
| `src/declarative/config.test.ts	packages/core/src/declarative/config.test.ts` | R100 |
| `src/declarative/config.ts	packages/core/src/declarative/config.ts` | R100 |
| `src/declarative/constants.ts	packages/core/src/declarative/constants.ts` | R100 |
| `src/declarative/errors.ts	packages/core/src/declarative/errors.ts` | R100 |
| `src/declarative/index.ts	packages/core/src/declarative/index.ts` | R100 |
| `src/declarative/infer.test.ts	packages/core/src/declarative/infer.test.ts` | R100 |
| `src/declarative/infer.ts	packages/core/src/declarative/infer.ts` | R100 |
| `src/declarative/load.test.ts	packages/core/src/declarative/load.test.ts` | R100 |
| `src/declarative/load.ts	packages/core/src/declarative/load.ts` | R100 |
| `src/declarative/parse.ts	packages/core/src/declarative/parse.ts` | R100 |
| `src/declarative/schema.test.ts	packages/core/src/declarative/schema.test.ts` | R100 |
| `src/declarative/schema.ts	packages/core/src/declarative/schema.ts` | R100 |
| `src/declarative/text.test.ts	packages/core/src/declarative/text.test.ts` | R100 |
| `src/declarative/text.ts	packages/core/src/declarative/text.ts` | R100 |
| `src/index.test.ts	packages/core/src/index.test.ts` | R100 |
| `src/index.ts	packages/core/src/index.ts` | R100 |
| `src/runner/corpus.test.ts	packages/core/src/runner/corpus.test.ts` | R100 |
| `src/runner/corpus.ts	packages/core/src/runner/corpus.ts` | R100 |
| `src/runner/index.ts	packages/core/src/runner/index.ts` | R100 |
| `tests/FIXTURES.md	packages/core/tests/FIXTURES.md` | R100 |
| `tests/components.ts	packages/core/tests/components.ts` | R100 |
| `tests/consumption.test.ts	packages/core/tests/consumption.test.ts` | R100 |
| `tests/fixtures/YAML-MAPPING.md	packages/core/tests/fixtures/YAML-MAPPING.md` | R100 |
| `tests/fixtures/consumption/01-read-the-model-door.contract.yaml	packages/core/tests/fixtures/consumption/01-read-the-model-door.contract.yaml` | R100 |
| `tests/fixtures/consumption/01-read-the-model-door.md	packages/core/tests/fixtures/consumption/01-read-the-model-door.md` | R100 |
| `tests/fixtures/consumption/01-read-the-model-door.ts	packages/core/tests/fixtures/consumption/01-read-the-model-door.ts` | R100 |
| `tests/fixtures/consumption/02-validate-doc-and-tree.contract.yaml	packages/core/tests/fixtures/consumption/02-validate-doc-and-tree.contract.yaml` | R100 |
| `tests/fixtures/consumption/02-validate-doc-and-tree.md	packages/core/tests/fixtures/consumption/02-validate-doc-and-tree.md` | R100 |
| `tests/fixtures/consumption/02-validate-doc-and-tree.ts	packages/core/tests/fixtures/consumption/02-validate-doc-and-tree.ts` | R100 |
| `tests/fixtures/consumption/03-dual-key-section-access.contract.yaml	packages/core/tests/fixtures/consumption/03-dual-key-section-access.contract.yaml` | R100 |
| `tests/fixtures/consumption/03-dual-key-section-access.md	packages/core/tests/fixtures/consumption/03-dual-key-section-access.md` | R100 |
| `tests/fixtures/consumption/03-dual-key-section-access.ts	packages/core/tests/fixtures/consumption/03-dual-key-section-access.ts` | R100 |
| `tests/fixtures/consumption/04-sectionview-content.contract.yaml	packages/core/tests/fixtures/consumption/04-sectionview-content.contract.yaml` | R100 |
| `tests/fixtures/consumption/04-sectionview-content.md	packages/core/tests/fixtures/consumption/04-sectionview-content.md` | R100 |
| `tests/fixtures/consumption/04-sectionview-content.ts	packages/core/tests/fixtures/consumption/04-sectionview-content.ts` | R100 |
| `tests/fixtures/consumption/05-tableview-typed-rows.contract.yaml	packages/core/tests/fixtures/consumption/05-tableview-typed-rows.contract.yaml` | R100 |
| `tests/fixtures/consumption/05-tableview-typed-rows.md	packages/core/tests/fixtures/consumption/05-tableview-typed-rows.md` | R100 |
| `tests/fixtures/consumption/05-tableview-typed-rows.ts	packages/core/tests/fixtures/consumption/05-tableview-typed-rows.ts` | R100 |
| `tests/fixtures/consumption/06-named-tables-content-record.contract.yaml	packages/core/tests/fixtures/consumption/06-named-tables-content-record.contract.yaml` | R100 |
| `tests/fixtures/consumption/06-named-tables-content-record.md	packages/core/tests/fixtures/consumption/06-named-tables-content-record.md` | R100 |
| `tests/fixtures/consumption/06-named-tables-content-record.ts	packages/core/tests/fixtures/consumption/06-named-tables-content-record.ts` | R100 |
| `tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.contract.yaml	packages/core/tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.contract.yaml` | R100 |
| `tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.md	packages/core/tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.md` | R100 |
| `tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts	packages/core/tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts` | R100 |
| `tests/fixtures/consumption/08-nested-subsections.contract.yaml	packages/core/tests/fixtures/consumption/08-nested-subsections.contract.yaml` | R100 |
| `tests/fixtures/consumption/08-nested-subsections.md	packages/core/tests/fixtures/consumption/08-nested-subsections.md` | R100 |
| `tests/fixtures/consumption/08-nested-subsections.ts	packages/core/tests/fixtures/consumption/08-nested-subsections.ts` | R100 |
| `tests/fixtures/consumption/09-unknown-sections.contract.yaml	packages/core/tests/fixtures/consumption/09-unknown-sections.contract.yaml` | R100 |
| `tests/fixtures/consumption/09-unknown-sections.md	packages/core/tests/fixtures/consumption/09-unknown-sections.md` | R100 |
| `tests/fixtures/consumption/09-unknown-sections.ts	packages/core/tests/fixtures/consumption/09-unknown-sections.ts` | R100 |
| `tests/fixtures/consumption/10-contracterror-door.contract.yaml	packages/core/tests/fixtures/consumption/10-contracterror-door.contract.yaml` | R100 |
| `tests/fixtures/consumption/10-contracterror-door.md	packages/core/tests/fixtures/consumption/10-contracterror-door.md` | R100 |
| `tests/fixtures/consumption/10-contracterror-door.ts	packages/core/tests/fixtures/consumption/10-contracterror-door.ts` | R100 |
| `tests/fixtures/consumption/11-real-task-consumed.contract.yaml	packages/core/tests/fixtures/consumption/11-real-task-consumed.contract.yaml` | R100 |
| `tests/fixtures/consumption/11-real-task-consumed.md	packages/core/tests/fixtures/consumption/11-real-task-consumed.md` | R100 |
| `tests/fixtures/consumption/11-real-task-consumed.ts	packages/core/tests/fixtures/consumption/11-real-task-consumed.ts` | R100 |
| `tests/fixtures/consumption/index.ts	packages/core/tests/fixtures/consumption/index.ts` | R100 |
| `tests/fixtures/corpus/decisions/D-0001-clean.md	packages/core/tests/fixtures/corpus/decisions/D-0001-clean.md` | R100 |
| `tests/fixtures/corpus/decisions/D-0002-bad.md	packages/core/tests/fixtures/corpus/decisions/D-0002-bad.md` | R100 |
| `tests/fixtures/corpus/markdown-contract.config.mjs	packages/core/tests/fixtures/corpus/markdown-contract.config.mjs` | R100 |
| `tests/fixtures/corpus/tasks/T-0001-clean.md	packages/core/tests/fixtures/corpus/tasks/T-0001-clean.md` | R100 |
| `tests/fixtures/infer/01-flat-uniform/fixture.ts	packages/core/tests/fixtures/infer/01-flat-uniform/fixture.ts` | R100 |
| `tests/fixtures/infer/01-flat-uniform/vault/alpha.md	packages/core/tests/fixtures/infer/01-flat-uniform/vault/alpha.md` | R100 |
| `tests/fixtures/infer/01-flat-uniform/vault/beta.md	packages/core/tests/fixtures/infer/01-flat-uniform/vault/beta.md` | R100 |
| `tests/fixtures/infer/01-flat-uniform/vault/gamma.md	packages/core/tests/fixtures/infer/01-flat-uniform/vault/gamma.md` | R100 |
| `tests/fixtures/infer/02-optional-sections/fixture.ts	packages/core/tests/fixtures/infer/02-optional-sections/fixture.ts` | R100 |
| `tests/fixtures/infer/02-optional-sections/vault/four.md	packages/core/tests/fixtures/infer/02-optional-sections/vault/four.md` | R100 |
| `tests/fixtures/infer/02-optional-sections/vault/one.md	packages/core/tests/fixtures/infer/02-optional-sections/vault/one.md` | R100 |
| `tests/fixtures/infer/02-optional-sections/vault/three.md	packages/core/tests/fixtures/infer/02-optional-sections/vault/three.md` | R100 |
| `tests/fixtures/infer/02-optional-sections/vault/two.md	packages/core/tests/fixtures/infer/02-optional-sections/vault/two.md` | R100 |
| `tests/fixtures/infer/03-order-recognized/fixture.ts	packages/core/tests/fixtures/infer/03-order-recognized/fixture.ts` | R100 |
| `tests/fixtures/infer/03-order-recognized/vault/one.md	packages/core/tests/fixtures/infer/03-order-recognized/vault/one.md` | R100 |
| `tests/fixtures/infer/03-order-recognized/vault/three.md	packages/core/tests/fixtures/infer/03-order-recognized/vault/three.md` | R100 |
| `tests/fixtures/infer/03-order-recognized/vault/two.md	packages/core/tests/fixtures/infer/03-order-recognized/vault/two.md` | R100 |
| `tests/fixtures/infer/04-order-strict/fixture.ts	packages/core/tests/fixtures/infer/04-order-strict/fixture.ts` | R100 |
| `tests/fixtures/infer/04-order-strict/vault/one.md	packages/core/tests/fixtures/infer/04-order-strict/vault/one.md` | R100 |
| `tests/fixtures/infer/04-order-strict/vault/three.md	packages/core/tests/fixtures/infer/04-order-strict/vault/three.md` | R100 |
| `tests/fixtures/infer/04-order-strict/vault/two.md	packages/core/tests/fixtures/infer/04-order-strict/vault/two.md` | R100 |
| `tests/fixtures/infer/05-order-conflict/fixture.ts	packages/core/tests/fixtures/infer/05-order-conflict/fixture.ts` | R100 |
| `tests/fixtures/infer/05-order-conflict/vault/one.md	packages/core/tests/fixtures/infer/05-order-conflict/vault/one.md` | R100 |
| `tests/fixtures/infer/05-order-conflict/vault/two.md	packages/core/tests/fixtures/infer/05-order-conflict/vault/two.md` | R100 |
| `tests/fixtures/infer/06-frontmatter-values/fixture.ts	packages/core/tests/fixtures/infer/06-frontmatter-values/fixture.ts` | R100 |
| `tests/fixtures/infer/06-frontmatter-values/vault/f1.md	packages/core/tests/fixtures/infer/06-frontmatter-values/vault/f1.md` | R100 |
| `tests/fixtures/infer/06-frontmatter-values/vault/f2.md	packages/core/tests/fixtures/infer/06-frontmatter-values/vault/f2.md` | R100 |
| `tests/fixtures/infer/06-frontmatter-values/vault/f3.md	packages/core/tests/fixtures/infer/06-frontmatter-values/vault/f3.md` | R100 |
| `tests/fixtures/infer/06-frontmatter-values/vault/f4.md	packages/core/tests/fixtures/infer/06-frontmatter-values/vault/f4.md` | R100 |
| `tests/fixtures/infer/06-frontmatter-values/vault/f5.md	packages/core/tests/fixtures/infer/06-frontmatter-values/vault/f5.md` | R100 |
| `tests/fixtures/infer/06-frontmatter-values/vault/f6.md	packages/core/tests/fixtures/infer/06-frontmatter-values/vault/f6.md` | R100 |
| `tests/fixtures/infer/07-tree-depth1/fixture.ts	packages/core/tests/fixtures/infer/07-tree-depth1/fixture.ts` | R100 |
| `tests/fixtures/infer/07-tree-depth1/vault/api/orders.md	packages/core/tests/fixtures/infer/07-tree-depth1/vault/api/orders.md` | R100 |
| `tests/fixtures/infer/07-tree-depth1/vault/api/users.md	packages/core/tests/fixtures/infer/07-tree-depth1/vault/api/users.md` | R100 |
| `tests/fixtures/infer/07-tree-depth1/vault/guides/advanced.md	packages/core/tests/fixtures/infer/07-tree-depth1/vault/guides/advanced.md` | R100 |
| `tests/fixtures/infer/07-tree-depth1/vault/guides/getting-started.md	packages/core/tests/fixtures/infer/07-tree-depth1/vault/guides/getting-started.md` | R100 |
| `tests/fixtures/infer/08-tree-depth2/fixture.ts	packages/core/tests/fixtures/infer/08-tree-depth2/fixture.ts` | R100 |
| `tests/fixtures/infer/08-tree-depth2/vault/api/v1/users.md	packages/core/tests/fixtures/infer/08-tree-depth2/vault/api/v1/users.md` | R100 |
| `tests/fixtures/infer/08-tree-depth2/vault/api/v2/users.md	packages/core/tests/fixtures/infer/08-tree-depth2/vault/api/v2/users.md` | R100 |
| `tests/fixtures/infer/08-tree-depth2/vault/web/v1/home.md	packages/core/tests/fixtures/infer/08-tree-depth2/vault/web/v1/home.md` | R100 |
| `tests/fixtures/infer/09-root-and-subdirs/fixture.ts	packages/core/tests/fixtures/infer/09-root-and-subdirs/fixture.ts` | R100 |
| `tests/fixtures/infer/09-root-and-subdirs/vault/about.md	packages/core/tests/fixtures/infer/09-root-and-subdirs/vault/about.md` | R100 |
| `tests/fixtures/infer/09-root-and-subdirs/vault/guides/setup.md	packages/core/tests/fixtures/infer/09-root-and-subdirs/vault/guides/setup.md` | R100 |
| `tests/fixtures/infer/09-root-and-subdirs/vault/index.md	packages/core/tests/fixtures/infer/09-root-and-subdirs/vault/index.md` | R100 |
| `tests/fixtures/infer/09-root-and-subdirs/vault/reference/cli.md	packages/core/tests/fixtures/infer/09-root-and-subdirs/vault/reference/cli.md` | R100 |
| `tests/fixtures/infer/10-stranded-depth/fixture.ts	packages/core/tests/fixtures/infer/10-stranded-depth/fixture.ts` | R100 |
| `tests/fixtures/infer/10-stranded-depth/vault/api/overview.md	packages/core/tests/fixtures/infer/10-stranded-depth/vault/api/overview.md` | R100 |
| `tests/fixtures/infer/10-stranded-depth/vault/api/v1/users.md	packages/core/tests/fixtures/infer/10-stranded-depth/vault/api/v1/users.md` | R100 |
| `tests/fixtures/infer/10-stranded-depth/vault/web/v1/home.md	packages/core/tests/fixtures/infer/10-stranded-depth/vault/web/v1/home.md` | R100 |
| `tests/fixtures/infer/11-relax/fixture.ts	packages/core/tests/fixtures/infer/11-relax/fixture.ts` | R100 |
| `tests/fixtures/infer/11-relax/vault/r1.md	packages/core/tests/fixtures/infer/11-relax/vault/r1.md` | R100 |
| `tests/fixtures/infer/11-relax/vault/r2.md	packages/core/tests/fixtures/infer/11-relax/vault/r2.md` | R100 |
| `tests/fixtures/infer/11-relax/vault/r3.md	packages/core/tests/fixtures/infer/11-relax/vault/r3.md` | R100 |
| `tests/fixtures/infer/_assert.ts	packages/core/tests/fixtures/infer/_assert.ts` | R100 |
| `tests/fixtures/infer/index.ts	packages/core/tests/fixtures/infer/index.ts` | R100 |
| `tests/fixtures/validation/01-single-required-section.contract.yaml	packages/core/tests/fixtures/validation/01-single-required-section.contract.yaml` | R100 |
| `tests/fixtures/validation/01-single-required-section.fail.md	packages/core/tests/fixtures/validation/01-single-required-section.fail.md` | R100 |
| `tests/fixtures/validation/01-single-required-section.pass.md	packages/core/tests/fixtures/validation/01-single-required-section.pass.md` | R100 |
| `tests/fixtures/validation/01-single-required-section.ts	packages/core/tests/fixtures/validation/01-single-required-section.ts` | R100 |
| `tests/fixtures/validation/01a-single-section-missing.contract.yaml	packages/core/tests/fixtures/validation/01a-single-section-missing.contract.yaml` | R100 |
| `tests/fixtures/validation/01a-single-section-missing.fail.md	packages/core/tests/fixtures/validation/01a-single-section-missing.fail.md` | R100 |
| `tests/fixtures/validation/01a-single-section-missing.pass.md	packages/core/tests/fixtures/validation/01a-single-section-missing.pass.md` | R100 |
| `tests/fixtures/validation/01a-single-section-missing.ts	packages/core/tests/fixtures/validation/01a-single-section-missing.ts` | R100 |
| `tests/fixtures/validation/02-multiple-required-sequence.contract.yaml	packages/core/tests/fixtures/validation/02-multiple-required-sequence.contract.yaml` | R100 |
| `tests/fixtures/validation/02-multiple-required-sequence.fail.md	packages/core/tests/fixtures/validation/02-multiple-required-sequence.fail.md` | R100 |
| `tests/fixtures/validation/02-multiple-required-sequence.pass.md	packages/core/tests/fixtures/validation/02-multiple-required-sequence.pass.md` | R100 |
| `tests/fixtures/validation/02-multiple-required-sequence.ts	packages/core/tests/fixtures/validation/02-multiple-required-sequence.ts` | R100 |
| `tests/fixtures/validation/02a-one-of-several-missing.contract.yaml	packages/core/tests/fixtures/validation/02a-one-of-several-missing.contract.yaml` | R100 |
| `tests/fixtures/validation/02a-one-of-several-missing.fail.md	packages/core/tests/fixtures/validation/02a-one-of-several-missing.fail.md` | R100 |
| `tests/fixtures/validation/02a-one-of-several-missing.pass.md	packages/core/tests/fixtures/validation/02a-one-of-several-missing.pass.md` | R100 |
| `tests/fixtures/validation/02a-one-of-several-missing.ts	packages/core/tests/fixtures/validation/02a-one-of-several-missing.ts` | R100 |
| `tests/fixtures/validation/03-optional-sections.contract.yaml	packages/core/tests/fixtures/validation/03-optional-sections.contract.yaml` | R100 |
| `tests/fixtures/validation/03-optional-sections.fail.md	packages/core/tests/fixtures/validation/03-optional-sections.fail.md` | R100 |
| `tests/fixtures/validation/03-optional-sections.pass-1.md	packages/core/tests/fixtures/validation/03-optional-sections.pass-1.md` | R100 |
| `tests/fixtures/validation/03-optional-sections.pass-2.md	packages/core/tests/fixtures/validation/03-optional-sections.pass-2.md` | R100 |
| `tests/fixtures/validation/03-optional-sections.ts	packages/core/tests/fixtures/validation/03-optional-sections.ts` | R100 |
| `tests/fixtures/validation/03a-duplicate-section.contract.yaml	packages/core/tests/fixtures/validation/03a-duplicate-section.contract.yaml` | R100 |
| `tests/fixtures/validation/03a-duplicate-section.fail.md	packages/core/tests/fixtures/validation/03a-duplicate-section.fail.md` | R100 |
| `tests/fixtures/validation/03a-duplicate-section.pass.md	packages/core/tests/fixtures/validation/03a-duplicate-section.pass.md` | R100 |
| `tests/fixtures/validation/03a-duplicate-section.ts	packages/core/tests/fixtures/validation/03a-duplicate-section.ts` | R100 |
| `tests/fixtures/validation/04-recognized-relative-order.contract.yaml	packages/core/tests/fixtures/validation/04-recognized-relative-order.contract.yaml` | R100 |
| `tests/fixtures/validation/04-recognized-relative-order.fail.md	packages/core/tests/fixtures/validation/04-recognized-relative-order.fail.md` | R100 |
| `tests/fixtures/validation/04-recognized-relative-order.pass.md	packages/core/tests/fixtures/validation/04-recognized-relative-order.pass.md` | R100 |
| `tests/fixtures/validation/04-recognized-relative-order.ts	packages/core/tests/fixtures/validation/04-recognized-relative-order.ts` | R100 |
| `tests/fixtures/validation/04a-recognized-relative-out-of-order.contract.yaml	packages/core/tests/fixtures/validation/04a-recognized-relative-out-of-order.contract.yaml` | R100 |
| `tests/fixtures/validation/04a-recognized-relative-out-of-order.fail.md	packages/core/tests/fixtures/validation/04a-recognized-relative-out-of-order.fail.md` | R100 |
| `tests/fixtures/validation/04a-recognized-relative-out-of-order.pass.md	packages/core/tests/fixtures/validation/04a-recognized-relative-out-of-order.pass.md` | R100 |
| `tests/fixtures/validation/04a-recognized-relative-out-of-order.ts	packages/core/tests/fixtures/validation/04a-recognized-relative-out-of-order.ts` | R100 |
| `tests/fixtures/validation/05-strict-prefix-gap-tail.contract.yaml	packages/core/tests/fixtures/validation/05-strict-prefix-gap-tail.contract.yaml` | R100 |
| `tests/fixtures/validation/05-strict-prefix-gap-tail.fail.md	packages/core/tests/fixtures/validation/05-strict-prefix-gap-tail.fail.md` | R100 |
| `tests/fixtures/validation/05-strict-prefix-gap-tail.pass.md	packages/core/tests/fixtures/validation/05-strict-prefix-gap-tail.pass.md` | R100 |
| `tests/fixtures/validation/05-strict-prefix-gap-tail.ts	packages/core/tests/fixtures/validation/05-strict-prefix-gap-tail.ts` | R100 |
| `tests/fixtures/validation/05a-strict-prefix-violated.contract.yaml	packages/core/tests/fixtures/validation/05a-strict-prefix-violated.contract.yaml` | R100 |
| `tests/fixtures/validation/05a-strict-prefix-violated.fail.md	packages/core/tests/fixtures/validation/05a-strict-prefix-violated.fail.md` | R100 |
| `tests/fixtures/validation/05a-strict-prefix-violated.pass.md	packages/core/tests/fixtures/validation/05a-strict-prefix-violated.pass.md` | R100 |
| `tests/fixtures/validation/05a-strict-prefix-violated.ts	packages/core/tests/fixtures/validation/05a-strict-prefix-violated.ts` | R100 |
| `tests/fixtures/validation/05b-gap-bounds.contract.yaml	packages/core/tests/fixtures/validation/05b-gap-bounds.contract.yaml` | R100 |
| `tests/fixtures/validation/05b-gap-bounds.fail-1.md	packages/core/tests/fixtures/validation/05b-gap-bounds.fail-1.md` | R100 |
| `tests/fixtures/validation/05b-gap-bounds.fail-2.md	packages/core/tests/fixtures/validation/05b-gap-bounds.fail-2.md` | R100 |
| `tests/fixtures/validation/05b-gap-bounds.pass.md	packages/core/tests/fixtures/validation/05b-gap-bounds.pass.md` | R100 |
| `tests/fixtures/validation/05b-gap-bounds.ts	packages/core/tests/fixtures/validation/05b-gap-bounds.ts` | R100 |
| `tests/fixtures/validation/06-alias-sets-oneof.contract.yaml	packages/core/tests/fixtures/validation/06-alias-sets-oneof.contract.yaml` | R100 |
| `tests/fixtures/validation/06-alias-sets-oneof.fail.md	packages/core/tests/fixtures/validation/06-alias-sets-oneof.fail.md` | R100 |
| `tests/fixtures/validation/06-alias-sets-oneof.pass-1.md	packages/core/tests/fixtures/validation/06-alias-sets-oneof.pass-1.md` | R100 |
| `tests/fixtures/validation/06-alias-sets-oneof.pass-2.md	packages/core/tests/fixtures/validation/06-alias-sets-oneof.pass-2.md` | R100 |
| `tests/fixtures/validation/06-alias-sets-oneof.ts	packages/core/tests/fixtures/validation/06-alias-sets-oneof.ts` | R100 |
| `tests/fixtures/validation/06a-oneof-none-present.contract.yaml	packages/core/tests/fixtures/validation/06a-oneof-none-present.contract.yaml` | R100 |
| `tests/fixtures/validation/06a-oneof-none-present.fail.md	packages/core/tests/fixtures/validation/06a-oneof-none-present.fail.md` | R100 |
| `tests/fixtures/validation/06a-oneof-none-present.pass.md	packages/core/tests/fixtures/validation/06a-oneof-none-present.pass.md` | R100 |
| `tests/fixtures/validation/06a-oneof-none-present.ts	packages/core/tests/fixtures/validation/06a-oneof-none-present.ts` | R100 |
| `tests/fixtures/validation/06b-oneof-two-members-present.contract.yaml	packages/core/tests/fixtures/validation/06b-oneof-two-members-present.contract.yaml` | R100 |
| `tests/fixtures/validation/06b-oneof-two-members-present.fail.md	packages/core/tests/fixtures/validation/06b-oneof-two-members-present.fail.md` | R100 |
| `tests/fixtures/validation/06b-oneof-two-members-present.pass.md	packages/core/tests/fixtures/validation/06b-oneof-two-members-present.pass.md` | R100 |
| `tests/fixtures/validation/06b-oneof-two-members-present.ts	packages/core/tests/fixtures/validation/06b-oneof-two-members-present.ts` | R100 |
| `tests/fixtures/validation/07-frontmatter-only-zod.contract.yaml	packages/core/tests/fixtures/validation/07-frontmatter-only-zod.contract.yaml` | R100 |
| `tests/fixtures/validation/07-frontmatter-only-zod.fail.md	packages/core/tests/fixtures/validation/07-frontmatter-only-zod.fail.md` | R100 |
| `tests/fixtures/validation/07-frontmatter-only-zod.pass.md	packages/core/tests/fixtures/validation/07-frontmatter-only-zod.pass.md` | R100 |
| `tests/fixtures/validation/07-frontmatter-only-zod.ts	packages/core/tests/fixtures/validation/07-frontmatter-only-zod.ts` | R100 |
| `tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.contract.yaml	packages/core/tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.contract.yaml` | R100 |
| `tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.fail.md	packages/core/tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.fail.md` | R100 |
| `tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.pass.md	packages/core/tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.pass.md` | R100 |
| `tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.ts	packages/core/tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.ts` | R100 |
| `tests/fixtures/validation/08-frontmatter-plus-body-one-pass.contract.yaml	packages/core/tests/fixtures/validation/08-frontmatter-plus-body-one-pass.contract.yaml` | R100 |
| `tests/fixtures/validation/08-frontmatter-plus-body-one-pass.fail.md	packages/core/tests/fixtures/validation/08-frontmatter-plus-body-one-pass.fail.md` | R100 |
| `tests/fixtures/validation/08-frontmatter-plus-body-one-pass.pass.md	packages/core/tests/fixtures/validation/08-frontmatter-plus-body-one-pass.pass.md` | R100 |
| `tests/fixtures/validation/08-frontmatter-plus-body-one-pass.ts	packages/core/tests/fixtures/validation/08-frontmatter-plus-body-one-pass.ts` | R100 |
| `tests/fixtures/validation/08a-both-planes-fail-merged.contract.yaml	packages/core/tests/fixtures/validation/08a-both-planes-fail-merged.contract.yaml` | R100 |
| `tests/fixtures/validation/08a-both-planes-fail-merged.fail.md	packages/core/tests/fixtures/validation/08a-both-planes-fail-merged.fail.md` | R100 |
| `tests/fixtures/validation/08a-both-planes-fail-merged.pass.md	packages/core/tests/fixtures/validation/08a-both-planes-fail-merged.pass.md` | R100 |
| `tests/fixtures/validation/08a-both-planes-fail-merged.ts	packages/core/tests/fixtures/validation/08a-both-planes-fail-merged.ts` | R100 |
| `tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.contract.yaml	packages/core/tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.contract.yaml` | R100 |
| `tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.fail.md	packages/core/tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.fail.md` | R100 |
| `tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.pass.md	packages/core/tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.pass.md` | R100 |
| `tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.ts	packages/core/tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.ts` | R100 |
| `tests/fixtures/validation/09a-maxwords-exceeded.contract.yaml	packages/core/tests/fixtures/validation/09a-maxwords-exceeded.contract.yaml` | R100 |
| `tests/fixtures/validation/09a-maxwords-exceeded.fail.md	packages/core/tests/fixtures/validation/09a-maxwords-exceeded.fail.md` | R100 |
| `tests/fixtures/validation/09a-maxwords-exceeded.pass.md	packages/core/tests/fixtures/validation/09a-maxwords-exceeded.pass.md` | R100 |
| `tests/fixtures/validation/09a-maxwords-exceeded.ts	packages/core/tests/fixtures/validation/09a-maxwords-exceeded.ts` | R100 |
| `tests/fixtures/validation/09b-anchor-missing.contract.yaml	packages/core/tests/fixtures/validation/09b-anchor-missing.contract.yaml` | R100 |
| `tests/fixtures/validation/09b-anchor-missing.fail.md	packages/core/tests/fixtures/validation/09b-anchor-missing.fail.md` | R100 |
| `tests/fixtures/validation/09b-anchor-missing.pass.md	packages/core/tests/fixtures/validation/09b-anchor-missing.pass.md` | R100 |
| `tests/fixtures/validation/09b-anchor-missing.ts	packages/core/tests/fixtures/validation/09b-anchor-missing.ts` | R100 |
| `tests/fixtures/validation/10-table-leaf-columns-minrows.contract.yaml	packages/core/tests/fixtures/validation/10-table-leaf-columns-minrows.contract.yaml` | R100 |
| `tests/fixtures/validation/10-table-leaf-columns-minrows.fail.md	packages/core/tests/fixtures/validation/10-table-leaf-columns-minrows.fail.md` | R100 |
| `tests/fixtures/validation/10-table-leaf-columns-minrows.pass.md	packages/core/tests/fixtures/validation/10-table-leaf-columns-minrows.pass.md` | R100 |
| `tests/fixtures/validation/10-table-leaf-columns-minrows.ts	packages/core/tests/fixtures/validation/10-table-leaf-columns-minrows.ts` | R100 |
| `tests/fixtures/validation/10a-table-empty-and-minrows.contract.yaml	packages/core/tests/fixtures/validation/10a-table-empty-and-minrows.contract.yaml` | R100 |
| `tests/fixtures/validation/10a-table-empty-and-minrows.fail.md	packages/core/tests/fixtures/validation/10a-table-empty-and-minrows.fail.md` | R100 |
| `tests/fixtures/validation/10a-table-empty-and-minrows.pass.md	packages/core/tests/fixtures/validation/10a-table-empty-and-minrows.pass.md` | R100 |
| `tests/fixtures/validation/10a-table-empty-and-minrows.ts	packages/core/tests/fixtures/validation/10a-table-empty-and-minrows.ts` | R100 |
| `tests/fixtures/validation/10b-table-missing-column.contract.yaml	packages/core/tests/fixtures/validation/10b-table-missing-column.contract.yaml` | R100 |
| `tests/fixtures/validation/10b-table-missing-column.fail.md	packages/core/tests/fixtures/validation/10b-table-missing-column.fail.md` | R100 |
| `tests/fixtures/validation/10b-table-missing-column.pass.md	packages/core/tests/fixtures/validation/10b-table-missing-column.pass.md` | R100 |
| `tests/fixtures/validation/10b-table-missing-column.ts	packages/core/tests/fixtures/validation/10b-table-missing-column.ts` | R100 |
| `tests/fixtures/validation/10c-table-extra-column.contract.yaml	packages/core/tests/fixtures/validation/10c-table-extra-column.contract.yaml` | R100 |
| `tests/fixtures/validation/10c-table-extra-column.fail.md	packages/core/tests/fixtures/validation/10c-table-extra-column.fail.md` | R100 |
| `tests/fixtures/validation/10c-table-extra-column.pass.md	packages/core/tests/fixtures/validation/10c-table-extra-column.pass.md` | R100 |
| `tests/fixtures/validation/10c-table-extra-column.ts	packages/core/tests/fixtures/validation/10c-table-extra-column.ts` | R100 |
| `tests/fixtures/validation/11-typed-cells-enum-pattern.contract.yaml	packages/core/tests/fixtures/validation/11-typed-cells-enum-pattern.contract.yaml` | R100 |
| `tests/fixtures/validation/11-typed-cells-enum-pattern.fail.md	packages/core/tests/fixtures/validation/11-typed-cells-enum-pattern.fail.md` | R100 |
| `tests/fixtures/validation/11-typed-cells-enum-pattern.pass.md	packages/core/tests/fixtures/validation/11-typed-cells-enum-pattern.pass.md` | R100 |
| `tests/fixtures/validation/11-typed-cells-enum-pattern.ts	packages/core/tests/fixtures/validation/11-typed-cells-enum-pattern.ts` | R100 |
| `tests/fixtures/validation/11a-cell-enum-violation.contract.yaml	packages/core/tests/fixtures/validation/11a-cell-enum-violation.contract.yaml` | R100 |
| `tests/fixtures/validation/11a-cell-enum-violation.fail.md	packages/core/tests/fixtures/validation/11a-cell-enum-violation.fail.md` | R100 |
| `tests/fixtures/validation/11a-cell-enum-violation.pass.md	packages/core/tests/fixtures/validation/11a-cell-enum-violation.pass.md` | R100 |
| `tests/fixtures/validation/11a-cell-enum-violation.ts	packages/core/tests/fixtures/validation/11a-cell-enum-violation.ts` | R100 |
| `tests/fixtures/validation/12-list-leaf-checkbox-minitems.contract.yaml	packages/core/tests/fixtures/validation/12-list-leaf-checkbox-minitems.contract.yaml` | R100 |
| `tests/fixtures/validation/12-list-leaf-checkbox-minitems.fail.md	packages/core/tests/fixtures/validation/12-list-leaf-checkbox-minitems.fail.md` | R100 |
| `tests/fixtures/validation/12-list-leaf-checkbox-minitems.pass.md	packages/core/tests/fixtures/validation/12-list-leaf-checkbox-minitems.pass.md` | R100 |
| `tests/fixtures/validation/12-list-leaf-checkbox-minitems.ts	packages/core/tests/fixtures/validation/12-list-leaf-checkbox-minitems.ts` | R100 |
| `tests/fixtures/validation/12a-non-checkbox-list-item.contract.yaml	packages/core/tests/fixtures/validation/12a-non-checkbox-list-item.contract.yaml` | R100 |
| `tests/fixtures/validation/12a-non-checkbox-list-item.fail.md	packages/core/tests/fixtures/validation/12a-non-checkbox-list-item.fail.md` | R100 |
| `tests/fixtures/validation/12a-non-checkbox-list-item.pass.md	packages/core/tests/fixtures/validation/12a-non-checkbox-list-item.pass.md` | R100 |
| `tests/fixtures/validation/12a-non-checkbox-list-item.ts	packages/core/tests/fixtures/validation/12a-non-checkbox-list-item.ts` | R100 |
| `tests/fixtures/validation/12b-list-below-minitems.contract.yaml	packages/core/tests/fixtures/validation/12b-list-below-minitems.contract.yaml` | R100 |
| `tests/fixtures/validation/12b-list-below-minitems.fail.md	packages/core/tests/fixtures/validation/12b-list-below-minitems.fail.md` | R100 |
| `tests/fixtures/validation/12b-list-below-minitems.pass.md	packages/core/tests/fixtures/validation/12b-list-below-minitems.pass.md` | R100 |
| `tests/fixtures/validation/12b-list-below-minitems.ts	packages/core/tests/fixtures/validation/12b-list-below-minitems.ts` | R100 |
| `tests/fixtures/validation/13-code-leaf-lang.contract.yaml	packages/core/tests/fixtures/validation/13-code-leaf-lang.contract.yaml` | R100 |
| `tests/fixtures/validation/13-code-leaf-lang.fail.md	packages/core/tests/fixtures/validation/13-code-leaf-lang.fail.md` | R100 |
| `tests/fixtures/validation/13-code-leaf-lang.pass.md	packages/core/tests/fixtures/validation/13-code-leaf-lang.pass.md` | R100 |
| `tests/fixtures/validation/13-code-leaf-lang.ts	packages/core/tests/fixtures/validation/13-code-leaf-lang.ts` | R100 |
| `tests/fixtures/validation/13a-code-wrong-lang.contract.yaml	packages/core/tests/fixtures/validation/13a-code-wrong-lang.contract.yaml` | R100 |
| `tests/fixtures/validation/13a-code-wrong-lang.fail.md	packages/core/tests/fixtures/validation/13a-code-wrong-lang.fail.md` | R100 |
| `tests/fixtures/validation/13a-code-wrong-lang.pass.md	packages/core/tests/fixtures/validation/13a-code-wrong-lang.pass.md` | R100 |
| `tests/fixtures/validation/13a-code-wrong-lang.ts	packages/core/tests/fixtures/validation/13a-code-wrong-lang.ts` | R100 |
| `tests/fixtures/validation/14-nested-children-subsections.contract.yaml	packages/core/tests/fixtures/validation/14-nested-children-subsections.contract.yaml` | R100 |
| `tests/fixtures/validation/14-nested-children-subsections.fail.md	packages/core/tests/fixtures/validation/14-nested-children-subsections.fail.md` | R100 |
| `tests/fixtures/validation/14-nested-children-subsections.pass.md	packages/core/tests/fixtures/validation/14-nested-children-subsections.pass.md` | R100 |
| `tests/fixtures/validation/14-nested-children-subsections.ts	packages/core/tests/fixtures/validation/14-nested-children-subsections.ts` | R100 |
| `tests/fixtures/validation/14a-skipped-heading-level.contract.yaml	packages/core/tests/fixtures/validation/14a-skipped-heading-level.contract.yaml` | R100 |
| `tests/fixtures/validation/14a-skipped-heading-level.fail.md	packages/core/tests/fixtures/validation/14a-skipped-heading-level.fail.md` | R100 |
| `tests/fixtures/validation/14a-skipped-heading-level.pass.md	packages/core/tests/fixtures/validation/14a-skipped-heading-level.pass.md` | R100 |
| `tests/fixtures/validation/14a-skipped-heading-level.ts	packages/core/tests/fixtures/validation/14a-skipped-heading-level.ts` | R100 |
| `tests/fixtures/validation/14b-content-before-first-subheading.contract.yaml	packages/core/tests/fixtures/validation/14b-content-before-first-subheading.contract.yaml` | R100 |
| `tests/fixtures/validation/14b-content-before-first-subheading.fail.md	packages/core/tests/fixtures/validation/14b-content-before-first-subheading.fail.md` | R100 |
| `tests/fixtures/validation/14b-content-before-first-subheading.pass.md	packages/core/tests/fixtures/validation/14b-content-before-first-subheading.pass.md` | R100 |
| `tests/fixtures/validation/14b-content-before-first-subheading.ts	packages/core/tests/fixtures/validation/14b-content-before-first-subheading.ts` | R100 |
| `tests/fixtures/validation/15-multiple-anchored-tables-one-section.contract.yaml	packages/core/tests/fixtures/validation/15-multiple-anchored-tables-one-section.contract.yaml` | R100 |
| `tests/fixtures/validation/15-multiple-anchored-tables-one-section.fail.md	packages/core/tests/fixtures/validation/15-multiple-anchored-tables-one-section.fail.md` | R100 |
| `tests/fixtures/validation/15-multiple-anchored-tables-one-section.pass.md	packages/core/tests/fixtures/validation/15-multiple-anchored-tables-one-section.pass.md` | R100 |
| `tests/fixtures/validation/15-multiple-anchored-tables-one-section.ts	packages/core/tests/fixtures/validation/15-multiple-anchored-tables-one-section.ts` | R100 |
| `tests/fixtures/validation/15a-declared-anchor-absent.contract.yaml	packages/core/tests/fixtures/validation/15a-declared-anchor-absent.contract.yaml` | R100 |
| `tests/fixtures/validation/15a-declared-anchor-absent.fail.md	packages/core/tests/fixtures/validation/15a-declared-anchor-absent.fail.md` | R100 |
| `tests/fixtures/validation/15a-declared-anchor-absent.pass.md	packages/core/tests/fixtures/validation/15a-declared-anchor-absent.pass.md` | R100 |
| `tests/fixtures/validation/15a-declared-anchor-absent.ts	packages/core/tests/fixtures/validation/15a-declared-anchor-absent.ts` | R100 |
| `tests/fixtures/validation/15b-undeclared-anchor-dynamic-access.contract.yaml	packages/core/tests/fixtures/validation/15b-undeclared-anchor-dynamic-access.contract.yaml` | R100 |
| `tests/fixtures/validation/15b-undeclared-anchor-dynamic-access.md	packages/core/tests/fixtures/validation/15b-undeclared-anchor-dynamic-access.md` | R100 |
| `tests/fixtures/validation/15b-undeclared-anchor-dynamic-access.ts	packages/core/tests/fixtures/validation/15b-undeclared-anchor-dynamic-access.ts` | R100 |
| `tests/fixtures/validation/16-cross-plane-docrule.contract.yaml	packages/core/tests/fixtures/validation/16-cross-plane-docrule.contract.yaml` | R100 |
| `tests/fixtures/validation/16-cross-plane-docrule.fail.md	packages/core/tests/fixtures/validation/16-cross-plane-docrule.fail.md` | R100 |
| `tests/fixtures/validation/16-cross-plane-docrule.pass-1.md	packages/core/tests/fixtures/validation/16-cross-plane-docrule.pass-1.md` | R100 |
| `tests/fixtures/validation/16-cross-plane-docrule.pass-2.md	packages/core/tests/fixtures/validation/16-cross-plane-docrule.pass-2.md` | R100 |
| `tests/fixtures/validation/16-cross-plane-docrule.ts	packages/core/tests/fixtures/validation/16-cross-plane-docrule.ts` | R100 |
| `tests/fixtures/validation/16a-docrule-violation.contract.yaml	packages/core/tests/fixtures/validation/16a-docrule-violation.contract.yaml` | R100 |
| `tests/fixtures/validation/16a-docrule-violation.fail.md	packages/core/tests/fixtures/validation/16a-docrule-violation.fail.md` | R100 |
| `tests/fixtures/validation/16a-docrule-violation.pass.md	packages/core/tests/fixtures/validation/16a-docrule-violation.pass.md` | R100 |
| `tests/fixtures/validation/16a-docrule-violation.ts	packages/core/tests/fixtures/validation/16a-docrule-violation.ts` | R100 |
| `tests/fixtures/validation/17-node-level-custom-rule.contract.yaml	packages/core/tests/fixtures/validation/17-node-level-custom-rule.contract.yaml` | R100 |
| `tests/fixtures/validation/17-node-level-custom-rule.fail.md	packages/core/tests/fixtures/validation/17-node-level-custom-rule.fail.md` | R100 |
| `tests/fixtures/validation/17-node-level-custom-rule.pass.md	packages/core/tests/fixtures/validation/17-node-level-custom-rule.pass.md` | R100 |
| `tests/fixtures/validation/17-node-level-custom-rule.ts	packages/core/tests/fixtures/validation/17-node-level-custom-rule.ts` | R100 |
| `tests/fixtures/validation/17a-node-rule-violation-with-pos.contract.yaml	packages/core/tests/fixtures/validation/17a-node-rule-violation-with-pos.contract.yaml` | R100 |
| `tests/fixtures/validation/17a-node-rule-violation-with-pos.fail.md	packages/core/tests/fixtures/validation/17a-node-rule-violation-with-pos.fail.md` | R100 |
| `tests/fixtures/validation/17a-node-rule-violation-with-pos.pass.md	packages/core/tests/fixtures/validation/17a-node-rule-violation-with-pos.pass.md` | R100 |
| `tests/fixtures/validation/17a-node-rule-violation-with-pos.ts	packages/core/tests/fixtures/validation/17a-node-rule-violation-with-pos.ts` | R100 |
| `tests/fixtures/validation/18-oom-consumption-typed-views.contract.yaml	packages/core/tests/fixtures/validation/18-oom-consumption-typed-views.contract.yaml` | R100 |
| `tests/fixtures/validation/18-oom-consumption-typed-views.fail.md	packages/core/tests/fixtures/validation/18-oom-consumption-typed-views.fail.md` | R100 |
| `tests/fixtures/validation/18-oom-consumption-typed-views.pass.md	packages/core/tests/fixtures/validation/18-oom-consumption-typed-views.pass.md` | R100 |
| `tests/fixtures/validation/18-oom-consumption-typed-views.ts	packages/core/tests/fixtures/validation/18-oom-consumption-typed-views.ts` | R100 |
| `tests/fixtures/validation/18a-camelcase-key-collision.contract.yaml	packages/core/tests/fixtures/validation/18a-camelcase-key-collision.contract.yaml` | R100 |
| `tests/fixtures/validation/18a-camelcase-key-collision.md	packages/core/tests/fixtures/validation/18a-camelcase-key-collision.md` | R100 |
| `tests/fixtures/validation/18a-camelcase-key-collision.ts	packages/core/tests/fixtures/validation/18a-camelcase-key-collision.ts` | R100 |
| `tests/fixtures/validation/18b-read-throws-on-error.contract.yaml	packages/core/tests/fixtures/validation/18b-read-throws-on-error.contract.yaml` | R100 |
| `tests/fixtures/validation/18b-read-throws-on-error.fail.md	packages/core/tests/fixtures/validation/18b-read-throws-on-error.fail.md` | R100 |
| `tests/fixtures/validation/18b-read-throws-on-error.pass.md	packages/core/tests/fixtures/validation/18b-read-throws-on-error.pass.md` | R100 |
| `tests/fixtures/validation/18b-read-throws-on-error.ts	packages/core/tests/fixtures/validation/18b-read-throws-on-error.ts` | R100 |
| `tests/fixtures/validation/19-real-decision-contract-end-to-end.contract.yaml	packages/core/tests/fixtures/validation/19-real-decision-contract-end-to-end.contract.yaml` | R100 |
| `tests/fixtures/validation/19-real-decision-contract-end-to-end.fail.md	packages/core/tests/fixtures/validation/19-real-decision-contract-end-to-end.fail.md` | R100 |
| `tests/fixtures/validation/19-real-decision-contract-end-to-end.pass.md	packages/core/tests/fixtures/validation/19-real-decision-contract-end-to-end.pass.md` | R100 |
| `tests/fixtures/validation/19-real-decision-contract-end-to-end.ts	packages/core/tests/fixtures/validation/19-real-decision-contract-end-to-end.ts` | R100 |
| `tests/fixtures/validation/19a-real-decision-three-findings.contract.yaml	packages/core/tests/fixtures/validation/19a-real-decision-three-findings.contract.yaml` | R100 |
| `tests/fixtures/validation/19a-real-decision-three-findings.fail.md	packages/core/tests/fixtures/validation/19a-real-decision-three-findings.fail.md` | R100 |
| `tests/fixtures/validation/19a-real-decision-three-findings.pass.md	packages/core/tests/fixtures/validation/19a-real-decision-three-findings.pass.md` | R100 |
| `tests/fixtures/validation/19a-real-decision-three-findings.ts	packages/core/tests/fixtures/validation/19a-real-decision-three-findings.ts` | R100 |
| `tests/fixtures/validation/19b-real-decision-alias-recommendation.contract.yaml	packages/core/tests/fixtures/validation/19b-real-decision-alias-recommendation.contract.yaml` | R100 |
| `tests/fixtures/validation/19b-real-decision-alias-recommendation.fail.md	packages/core/tests/fixtures/validation/19b-real-decision-alias-recommendation.fail.md` | R100 |
| `tests/fixtures/validation/19b-real-decision-alias-recommendation.pass.md	packages/core/tests/fixtures/validation/19b-real-decision-alias-recommendation.pass.md` | R100 |
| `tests/fixtures/validation/19b-real-decision-alias-recommendation.ts	packages/core/tests/fixtures/validation/19b-real-decision-alias-recommendation.ts` | R100 |
| `tests/fixtures/validation/20-real-task-contract-end-to-end.contract.yaml	packages/core/tests/fixtures/validation/20-real-task-contract-end-to-end.contract.yaml` | R100 |
| `tests/fixtures/validation/20-real-task-contract-end-to-end.fail.md	packages/core/tests/fixtures/validation/20-real-task-contract-end-to-end.fail.md` | R100 |
| `tests/fixtures/validation/20-real-task-contract-end-to-end.pass.md	packages/core/tests/fixtures/validation/20-real-task-contract-end-to-end.pass.md` | R100 |
| `tests/fixtures/validation/20-real-task-contract-end-to-end.ts	packages/core/tests/fixtures/validation/20-real-task-contract-end-to-end.ts` | R100 |
| `tests/fixtures/validation/20a-real-task-closed-without-completion-note.contract.yaml	packages/core/tests/fixtures/validation/20a-real-task-closed-without-completion-note.contract.yaml` | R100 |
| `tests/fixtures/validation/20a-real-task-closed-without-completion-note.fail.md	packages/core/tests/fixtures/validation/20a-real-task-closed-without-completion-note.fail.md` | R100 |
| `tests/fixtures/validation/20a-real-task-closed-without-completion-note.pass.md	packages/core/tests/fixtures/validation/20a-real-task-closed-without-completion-note.pass.md` | R100 |
| `tests/fixtures/validation/20a-real-task-closed-without-completion-note.ts	packages/core/tests/fixtures/validation/20a-real-task-closed-without-completion-note.ts` | R100 |
| `tests/fixtures/validation/20b-real-task-non-checkbox-acs.contract.yaml	packages/core/tests/fixtures/validation/20b-real-task-non-checkbox-acs.contract.yaml` | R100 |
| `tests/fixtures/validation/20b-real-task-non-checkbox-acs.fail.md	packages/core/tests/fixtures/validation/20b-real-task-non-checkbox-acs.fail.md` | R100 |
| `tests/fixtures/validation/20b-real-task-non-checkbox-acs.pass.md	packages/core/tests/fixtures/validation/20b-real-task-non-checkbox-acs.pass.md` | R100 |
| `tests/fixtures/validation/20b-real-task-non-checkbox-acs.ts	packages/core/tests/fixtures/validation/20b-real-task-non-checkbox-acs.ts` | R100 |
| `tests/fixtures/validation/21-real-milestone-or-skill-doctype.contract.yaml	packages/core/tests/fixtures/validation/21-real-milestone-or-skill-doctype.contract.yaml` | R100 |
| `tests/fixtures/validation/21-real-milestone-or-skill-doctype.fail.md	packages/core/tests/fixtures/validation/21-real-milestone-or-skill-doctype.fail.md` | R100 |
| `tests/fixtures/validation/21-real-milestone-or-skill-doctype.pass.md	packages/core/tests/fixtures/validation/21-real-milestone-or-skill-doctype.pass.md` | R100 |
| `tests/fixtures/validation/21-real-milestone-or-skill-doctype.ts	packages/core/tests/fixtures/validation/21-real-milestone-or-skill-doctype.ts` | R100 |
| `tests/fixtures/validation/21a-table-inside-blockquote-or-list.contract.yaml	packages/core/tests/fixtures/validation/21a-table-inside-blockquote-or-list.contract.yaml` | R100 |
| `tests/fixtures/validation/21a-table-inside-blockquote-or-list.fail.md	packages/core/tests/fixtures/validation/21a-table-inside-blockquote-or-list.fail.md` | R100 |
| `tests/fixtures/validation/21a-table-inside-blockquote-or-list.pass.md	packages/core/tests/fixtures/validation/21a-table-inside-blockquote-or-list.pass.md` | R100 |
| `tests/fixtures/validation/21a-table-inside-blockquote-or-list.ts	packages/core/tests/fixtures/validation/21a-table-inside-blockquote-or-list.ts` | R100 |
| `tests/fixtures/validation/21b-fence-contains-heading-line.contract.yaml	packages/core/tests/fixtures/validation/21b-fence-contains-heading-line.contract.yaml` | R100 |
| `tests/fixtures/validation/21b-fence-contains-heading-line.md	packages/core/tests/fixtures/validation/21b-fence-contains-heading-line.md` | R100 |
| `tests/fixtures/validation/21b-fence-contains-heading-line.ts	packages/core/tests/fixtures/validation/21b-fence-contains-heading-line.ts` | R100 |
| `tests/fixtures/validation/22-text-requires-section.contract.yaml	packages/core/tests/fixtures/validation/22-text-requires-section.contract.yaml` | R100 |
| `tests/fixtures/validation/22-text-requires-section.fail.md	packages/core/tests/fixtures/validation/22-text-requires-section.fail.md` | R100 |
| `tests/fixtures/validation/22-text-requires-section.pass.md	packages/core/tests/fixtures/validation/22-text-requires-section.pass.md` | R100 |
| `tests/fixtures/validation/22-text-requires-section.ts	packages/core/tests/fixtures/validation/22-text-requires-section.ts` | R100 |
| `tests/fixtures/validation/23-text-forbids-body-root.contract.yaml	packages/core/tests/fixtures/validation/23-text-forbids-body-root.contract.yaml` | R100 |
| `tests/fixtures/validation/23-text-forbids-body-root.fail.md	packages/core/tests/fixtures/validation/23-text-forbids-body-root.fail.md` | R100 |
| `tests/fixtures/validation/23-text-forbids-body-root.pass.md	packages/core/tests/fixtures/validation/23-text-forbids-body-root.pass.md` | R100 |
| `tests/fixtures/validation/23-text-forbids-body-root.ts	packages/core/tests/fixtures/validation/23-text-forbids-body-root.ts` | R100 |
| `tests/fixtures/validation/24-text-requires-count.contract.yaml	packages/core/tests/fixtures/validation/24-text-requires-count.contract.yaml` | R100 |
| `tests/fixtures/validation/24-text-requires-count.fail.md	packages/core/tests/fixtures/validation/24-text-requires-count.fail.md` | R100 |
| `tests/fixtures/validation/24-text-requires-count.pass.md	packages/core/tests/fixtures/validation/24-text-requires-count.pass.md` | R100 |
| `tests/fixtures/validation/24-text-requires-count.ts	packages/core/tests/fixtures/validation/24-text-requires-count.ts` | R100 |
| `tests/fixtures/validation/25-text-regex.contract.yaml	packages/core/tests/fixtures/validation/25-text-regex.contract.yaml` | R100 |
| `tests/fixtures/validation/25-text-regex.fail.md	packages/core/tests/fixtures/validation/25-text-regex.fail.md` | R100 |
| `tests/fixtures/validation/25-text-regex.pass.md	packages/core/tests/fixtures/validation/25-text-regex.pass.md` | R100 |
| `tests/fixtures/validation/25-text-regex.ts	packages/core/tests/fixtures/validation/25-text-regex.ts` | R100 |
| `tests/fixtures/validation/26-in-doc-dead-anchor.fail.md	packages/core/tests/fixtures/validation/26-in-doc-dead-anchor.fail.md` | R100 |
| `tests/fixtures/validation/26-in-doc-dead-anchor.pass.md	packages/core/tests/fixtures/validation/26-in-doc-dead-anchor.pass.md` | R100 |
| `tests/fixtures/validation/26-in-doc-dead-anchor.ts	packages/core/tests/fixtures/validation/26-in-doc-dead-anchor.ts` | R100 |
| `tests/fixtures/validation/_part-a.ts	packages/core/tests/fixtures/validation/_part-a.ts` | R100 |
| `tests/fixtures/validation/_part-b.ts	packages/core/tests/fixtures/validation/_part-b.ts` | R100 |
| `tests/fixtures/validation/index.ts	packages/core/tests/fixtures/validation/index.ts` | R100 |
| `tests/harness.ts	packages/core/tests/harness.ts` | R100 |
| `tests/inference.cli.test.ts	packages/core/tests/inference.cli.test.ts` | R100 |
| `tests/inference.test.ts	packages/core/tests/inference.test.ts` | R100 |
| `packages/core/tests/no-bun-only-apis.test.ts` | A |
| `tests/validation.test.ts	packages/core/tests/validation.test.ts` | R100 |
| `tests/yaml-parity.test.ts	packages/core/tests/yaml-parity.test.ts` | R100 |
| `tsconfig.build.json	packages/core/tsconfig.build.json` | R100 |
| `tsconfig.json	packages/core/tsconfig.json` | R100 |
| `vitest.config.ts	packages/core/vitest.config.ts` | R100 |
| `sdlc.yaml` | M |

## Quality checks

OK 3/3 (bunx moon core:build/typecheck/test); 608 tests pass under Node; coverage above thresholds

## PR

https://github.com/sksizer/markdown-contract/pull/135

## Spawned follow-ups

- `B-QF64-assert-pinned-moon-version`
- `B-UHOH-vendor-c0004-projection-fixture`
