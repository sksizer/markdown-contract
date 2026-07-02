# Handoff — Adopt Biome for lint, format, and per-function complexity gating

_Task: `T-0MVN-biome-lint-format`. PR: <https://github.com/sksizer/markdown-contract/pull/169>._

## Summary

Adopt Biome as the enforced lint/format/import-organization gate for packages/core: mechanical format pass (51 files) + import organize (~90 files), 8 lint errors resolved, complexity promoted to error (ceiling 46), moon core:lint wired into CI and sdlc.yaml. Full suite green under Node.

## Files changed

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | M |
| `biome.json` | D |
| `biome.jsonc` | A |
| `docs/planning/tasks/T-0MVN-biome-lint-format.md` | M |
| `docs/planning/tasks/T-1C0J-remove-stale-eslint-disable-comments.md` | A |
| `docs/planning/tasks/T-D8TE-ratchet-biome-complexity-ceiling.md` | A |
| `packages/core/moon.yml` | M |
| `packages/core/package.json` | M |
| `packages/core/src/cli/format.test.ts` | M |
| `packages/core/src/cli/index.test.ts` | M |
| `packages/core/src/cli/index.ts` | M |
| `packages/core/src/cli/run.ts` | M |
| `packages/core/src/core/content.test.ts` | M |
| `packages/core/src/core/content.ts` | M |
| `packages/core/src/core/dialect/anchors.ts` | M |
| `packages/core/src/core/finding.test.ts` | M |
| `packages/core/src/core/frontmatter.ts` | M |
| `packages/core/src/core/grammar.ts` | M |
| `packages/core/src/core/index.ts` | M |
| `packages/core/src/core/model.test.ts` | M |
| `packages/core/src/core/navigate.test.ts` | M |
| `packages/core/src/core/presets.test.ts` | M |
| `packages/core/src/core/projection.test.ts` | M |
| `packages/core/src/core/projection.ts` | M |
| `packages/core/src/core/registry.test.ts` | M |
| `packages/core/src/core/structure.test.ts` | M |
| `packages/core/src/core/structure.ts` | M |
| `packages/core/src/core/table-source.ts` | M |
| `packages/core/src/core/text-constraints.test.ts` | M |
| `packages/core/src/core/text-constraints.ts` | M |
| `packages/core/src/core/text-match.test.ts` | M |
| `packages/core/src/core/text-match.ts` | M |
| `packages/core/src/core/types.ts` | M |
| `packages/core/src/core/validate.test.ts` | M |
| `packages/core/src/core/validate.ts` | M |
| `packages/core/src/declarative/body.test.ts` | M |
| `packages/core/src/declarative/body.ts` | M |
| `packages/core/src/declarative/config.test.ts` | M |
| `packages/core/src/declarative/config.ts` | M |
| `packages/core/src/declarative/index.ts` | M |
| `packages/core/src/declarative/infer.test.ts` | M |
| `packages/core/src/declarative/infer.ts` | M |
| `packages/core/src/declarative/load.test.ts` | M |
| `packages/core/src/declarative/load.ts` | M |
| `packages/core/src/declarative/parse.ts` | M |
| `packages/core/src/declarative/schema.test.ts` | M |
| `packages/core/src/declarative/schema.ts` | M |
| `packages/core/src/declarative/text.test.ts` | M |
| `packages/core/src/declarative/text.ts` | M |
| `packages/core/src/index.test.ts` | M |
| `packages/core/src/index.ts` | M |
| `packages/core/src/runner/corpus.test.ts` | M |
| `packages/core/src/runner/corpus.ts` | M |
| `packages/core/src/runner/index.ts` | M |
| `packages/core/tests/fixtures/consumption/02-validate-doc-and-tree.ts` | M |
| `packages/core/tests/fixtures/consumption/03-dual-key-section-access.ts` | M |
| `packages/core/tests/fixtures/consumption/04-sectionview-content.ts` | M |
| `packages/core/tests/fixtures/consumption/05-tableview-typed-rows.ts` | M |
| `packages/core/tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts` | M |
| `packages/core/tests/fixtures/consumption/08-nested-subsections.ts` | M |
| `packages/core/tests/fixtures/consumption/10-contracterror-door.ts` | M |
| `packages/core/tests/fixtures/consumption/11-real-task-consumed.ts` | M |
| `packages/core/tests/fixtures/validation/01a-single-section-missing.ts` | M |
| `packages/core/tests/fixtures/validation/02-multiple-required-sequence.ts` | M |
| `packages/core/tests/fixtures/validation/02a-one-of-several-missing.ts` | M |
| `packages/core/tests/fixtures/validation/03-optional-sections.ts` | M |
| `packages/core/tests/fixtures/validation/03a-duplicate-section.ts` | M |
| `packages/core/tests/fixtures/validation/04-recognized-relative-order.ts` | M |
| `packages/core/tests/fixtures/validation/04a-recognized-relative-out-of-order.ts` | M |
| `packages/core/tests/fixtures/validation/05-strict-prefix-gap-tail.ts` | M |
| `packages/core/tests/fixtures/validation/05a-strict-prefix-violated.ts` | M |
| `packages/core/tests/fixtures/validation/05b-gap-bounds.ts` | M |
| `packages/core/tests/fixtures/validation/06-alias-sets-oneof.ts` | M |
| `packages/core/tests/fixtures/validation/06a-oneof-none-present.ts` | M |
| `packages/core/tests/fixtures/validation/06b-oneof-two-members-present.ts` | M |
| `packages/core/tests/fixtures/validation/07-frontmatter-only-zod.ts` | M |
| `packages/core/tests/fixtures/validation/07a-frontmatter-enum-and-unknown-key.ts` | M |
| `packages/core/tests/fixtures/validation/08-frontmatter-plus-body-one-pass.ts` | M |
| `packages/core/tests/fixtures/validation/08a-both-planes-fail-merged.ts` | M |
| `packages/core/tests/fixtures/validation/09-section-content-leaf-maxwords-anchor.ts` | M |
| `packages/core/tests/fixtures/validation/09a-maxwords-exceeded.ts` | M |
| `packages/core/tests/fixtures/validation/09b-anchor-missing.ts` | M |
| `packages/core/tests/fixtures/validation/10-table-leaf-columns-minrows.ts` | M |
| `packages/core/tests/fixtures/validation/10a-table-empty-and-minrows.ts` | M |
| `packages/core/tests/fixtures/validation/10b-table-missing-column.ts` | M |
| `packages/core/tests/fixtures/validation/10c-table-extra-column.ts` | M |
| `packages/core/tests/fixtures/validation/11-typed-cells-enum-pattern.ts` | M |
| `packages/core/tests/fixtures/validation/11a-cell-enum-violation.ts` | M |
| `packages/core/tests/fixtures/validation/12-list-leaf-checkbox-minitems.ts` | M |
| `packages/core/tests/fixtures/validation/12a-non-checkbox-list-item.ts` | M |
| `packages/core/tests/fixtures/validation/12b-list-below-minitems.ts` | M |
| `packages/core/tests/fixtures/validation/13-code-leaf-lang.ts` | M |
| `packages/core/tests/fixtures/validation/13a-code-wrong-lang.ts` | M |
| `packages/core/tests/fixtures/validation/14-nested-children-subsections.ts` | M |
| `packages/core/tests/fixtures/validation/14a-skipped-heading-level.ts` | M |
| `packages/core/tests/fixtures/validation/14b-content-before-first-subheading.ts` | M |
| `packages/core/tests/fixtures/validation/15-multiple-anchored-tables-one-section.ts` | M |
| `packages/core/tests/fixtures/validation/15a-declared-anchor-absent.ts` | M |
| `packages/core/tests/fixtures/validation/15b-undeclared-anchor-dynamic-access.ts` | M |
| `packages/core/tests/fixtures/validation/16-cross-plane-docrule.ts` | M |
| `packages/core/tests/fixtures/validation/16a-docrule-violation.ts` | M |
| `packages/core/tests/fixtures/validation/17-node-level-custom-rule.ts` | M |
| `packages/core/tests/fixtures/validation/17a-node-rule-violation-with-pos.ts` | M |
| `packages/core/tests/fixtures/validation/18-oom-consumption-typed-views.ts` | M |
| `packages/core/tests/fixtures/validation/18a-camelcase-key-collision.ts` | M |
| `packages/core/tests/fixtures/validation/18b-read-throws-on-error.ts` | M |
| `packages/core/tests/fixtures/validation/19-real-decision-contract-end-to-end.ts` | M |
| `packages/core/tests/fixtures/validation/19a-real-decision-three-findings.ts` | M |
| `packages/core/tests/fixtures/validation/19b-real-decision-alias-recommendation.ts` | M |
| `packages/core/tests/fixtures/validation/20-real-task-contract-end-to-end.ts` | M |
| `packages/core/tests/fixtures/validation/20a-real-task-closed-without-completion-note.ts` | M |
| `packages/core/tests/fixtures/validation/20b-real-task-non-checkbox-acs.ts` | M |
| `packages/core/tests/fixtures/validation/21-real-milestone-or-skill-doctype.ts` | M |
| `packages/core/tests/fixtures/validation/21a-table-inside-blockquote-or-list.ts` | M |
| `packages/core/tests/fixtures/validation/21b-fence-contains-heading-line.ts` | M |
| `packages/core/tests/fixtures/validation/22-text-requires-section.ts` | M |
| `packages/core/tests/fixtures/validation/23-text-forbids-body-root.ts` | M |
| `packages/core/tests/fixtures/validation/24-text-requires-count.ts` | M |
| `packages/core/tests/fixtures/validation/25-text-regex.ts` | M |
| `packages/core/tests/fixtures/validation/26-in-doc-dead-anchor.ts` | M |
| `packages/core/tests/fixtures/validation/index.ts` | M |
| `packages/core/tests/harness.ts` | M |
| `packages/core/tests/inference.cli.test.ts` | M |
| `packages/core/tests/yaml-parity.test.ts` | M |
| `sdlc.yaml` | M |

## Quality checks

OK 5/5

## PR

https://github.com/sksizer/markdown-contract/pull/169

## Spawned follow-ups

- `T-D8TE-ratchet-biome-complexity-ceiling`
- `T-1C0J-remove-stale-eslint-disable-comments`
