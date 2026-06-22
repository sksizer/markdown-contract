# YAML contract mapping — fixture corpus

An exploratory mapping of the TypeScript fixture corpus (`tests/fixtures/{validation,consumption}/*.ts`) onto the declarative **v1 YAML contract DSL**. Beside each fixture's `.ts` and `.md` files there is now a `<stem>.contract.yaml` peer — the v1-YAML expression of that fixture's contract. This table records, per fixture, whether the translation is **full** (every feature expressible in v1) or **partial** (the structural/schema skeleton is captured but one or more features were dropped, each flagged with a `# GAP:` comment in the peer), and why.

> The v1 YAML loader is not built yet — it is planned in milestone **M-0002** and specified in decision **D-0008** (`docs/planning/decisions/D-0008-declarative-contract-dsl.md`). These peers, and the pending parity test (`tests/yaml-parity.test.ts`), are forward-looking: they fix the target shape and document the coverage v1 will deliver, and the parity test activates once `markdown-contract/declarative` lands. v1 deliberately excludes the **code escape hatch** (`$ref`) and **cross-cutting rules** (`rule` / `docRule`) — see D-0008 § Out of scope — so every gap below is one of those deferred features.

## Coverage

| Tier | Count |
|---|---|
| Total fixtures | 65 |
| **Full** — pure declarative v1 YAML | 57 |
| **Partial** — skeleton + `# GAP:` comments | 8 |
| **None** | 0 |

54 validation + 11 consumption. **88% (57/65)** of the corpus is fully expressible in pure declarative v1 YAML; the remaining 8 carry exactly the features v1 defers.

## Gaps — what v1 YAML cannot express

Every gap is one of the two deferred features. The peer still captures the full structural + schema skeleton; only the listed behavior is dropped.

### Cross-cutting / node rules — `rule()` / `docRule()` (7 fixtures)

These contracts hinge on a custom function (a cross-plane `docRule` or a node-level `rule`) that v1 cannot serialize. The YAML peer expresses the structure; the rule's checked behavior is noted in a `# GAP:` comment and listed here.

- **c11** (`11-real-task-consumed`) — docRule("task/post-mortem-when-worked")
- **v16** (`16-cross-plane-docrule`) — docRule("task/post-mortem-when-worked", fn)
- **v16a** (`16a-docrule-violation`) — docRule("task/post-mortem-when-worked", fn)
- **v17** (`17-node-level-custom-rule`) — rule("summary/mentions-outcome", fn)
- **v17a** (`17a-node-rule-violation-with-pos`) — rule("summary/names-contract", fn)
- **v20** (`20-real-task-contract-end-to-end`) — docRule("task/post-mortem-when-worked", fn)
- **v20b** (`20b-real-task-non-checkbox-acs`) — docRule("task/completion-note-when-closed")

### Frontmatter refinement / `z.unknown()` (1 fixture)

- **v20a** (`20a-real-task-closed-without-completion-note`) — `.refine()` on the frontmatter object (closed/* ⇒ completion_note). The two `z.unknown()` fields (`created`, `last_reviewed`) are approximated as optional strings: v1 has no "any" type, and under `strict` an undeclared key would read as `frontmatter/unknown-key`, so they are declared rather than dropped.

## Per-fixture table

`val` = validation, `con` = consumption. `v1` = feasibility; `gaps` = the dropped feature(s), `—` when none.

| id | kind | fixture | v1 | gaps |
|---|---|---|---|---|
| v01 | val | `01-single-required-section` | full | — |
| v01a | val | `01a-single-section-missing` | full | — |
| v02 | val | `02-multiple-required-sequence` | full | — |
| v02a | val | `02a-one-of-several-missing` | full | — |
| v03 | val | `03-optional-sections` | full | — |
| v03a | val | `03a-duplicate-section` | full | — |
| v04 | val | `04-recognized-relative-order` | full | — |
| v04a | val | `04a-recognized-relative-out-of-order` | full | — |
| v05 | val | `05-strict-prefix-gap-tail` | full | — |
| v05a | val | `05a-strict-prefix-violated` | full | — |
| v05b | val | `05b-gap-bounds` | full | — |
| v06 | val | `06-alias-sets-oneof` | full | — |
| v06a | val | `06a-oneof-none-present` | full | — |
| v06b | val | `06b-oneof-two-members-present` | full | — |
| v07 | val | `07-frontmatter-only-zod` | full | — |
| v07a | val | `07a-frontmatter-enum-and-unknown-key` | full | — |
| v08 | val | `08-frontmatter-plus-body-one-pass` | full | — |
| v08a | val | `08a-both-planes-fail-merged` | full | — |
| v09 | val | `09-section-content-leaf-maxwords-anchor` | full | — |
| v09a | val | `09a-maxwords-exceeded` | full | — |
| v09b | val | `09b-anchor-missing` | full | — |
| v10 | val | `10-table-leaf-columns-minrows` | full | — |
| v10a | val | `10a-table-empty-and-minrows` | full | — |
| v10b | val | `10b-table-missing-column` | full | — |
| v10c | val | `10c-table-extra-column` | full | — |
| v11 | val | `11-typed-cells-enum-pattern` | full | — |
| v11a | val | `11a-cell-enum-violation` | full | — |
| v12 | val | `12-list-leaf-checkbox-minitems` | full | — |
| v12a | val | `12a-non-checkbox-list-item` | full | — |
| v12b | val | `12b-list-below-minitems` | full | — |
| v13 | val | `13-code-leaf-lang` | full | — |
| v13a | val | `13a-code-wrong-lang` | full | — |
| v14 | val | `14-nested-children-subsections` | full | — |
| v14a | val | `14a-skipped-heading-level` | full | — |
| v14b | val | `14b-content-before-first-subheading` | full | — |
| v15 | val | `15-multiple-anchored-tables-one-section` | full | — |
| v15a | val | `15a-declared-anchor-absent` | full | — |
| v15b | val | `15b-undeclared-anchor-dynamic-access` | full | — |
| v16 | val | `16-cross-plane-docrule` | partial | docRule |
| v16a | val | `16a-docrule-violation` | partial | docRule |
| v17 | val | `17-node-level-custom-rule` | partial | rule |
| v17a | val | `17a-node-rule-violation-with-pos` | partial | docRule |
| v18 | val | `18-oom-consumption-typed-views` | full | — |
| v18a | val | `18a-camelcase-key-collision` | full | — |
| v18b | val | `18b-read-throws-on-error` | full | — |
| v19 | val | `19-real-decision-contract-end-to-end` | full | — |
| v19a | val | `19a-real-decision-three-findings` | full | — |
| v19b | val | `19b-real-decision-alias-recommendation` | full | — |
| v20 | val | `20-real-task-contract-end-to-end` | partial | docRule |
| v20a | val | `20a-real-task-closed-without-completion-note` | partial | z.unknown, refine |
| v20b | val | `20b-real-task-non-checkbox-acs` | partial | docRule |
| v21 | val | `21-real-milestone-or-skill-doctype` | full | — |
| v21a | val | `21a-table-inside-blockquote-or-list` | full | — |
| v21b | val | `21b-fence-contains-heading-line` | full | — |
| c01 | con | `01-read-the-model-door` | full | — |
| c02 | con | `02-validate-doc-and-tree` | full | — |
| c03 | con | `03-dual-key-section-access` | full | — |
| c04 | con | `04-sectionview-content` | full | — |
| c05 | con | `05-tableview-typed-rows` | full | — |
| c06 | con | `06-named-tables-content-record` | full | — |
| c07 | con | `07-byanchor-declared-vs-dynamic` | full | — |
| c08 | con | `08-nested-subsections` | full | — |
| c09 | con | `09-unknown-sections` | full | — |
| c10 | con | `10-contracterror-door` | full | — |
| c11 | con | `11-real-task-consumed` | partial | docRule |

## Method

- One `<stem>.contract.yaml` peer per fixture, beside its `<stem>.ts` + `<stem>*.md`.
- Translation follows the D-0008 mapping: the closed schema vocabulary (`type` / `enum` / `const` / `min` / `max` / `pattern` / `format` / `array` / `object` / `optional` / `default` / `nullable`) ⇐ Zod; the body grammar (`sections` / `section` / `aliases` / `oneOf` / `optional` / `gap` / `children` / `anchor`); and the content leaves (`table` / `list` / `code` / `maxWords`). Table `cells` and frontmatter fields that use `z.enum` / `z.string().regex()` / `z.literal()` map straight into the closed vocabulary — they are **not** gaps.
- A feature that cannot reduce to that vocabulary — `.refine()` / `.superRefine()` / `z.unknown()`, or any `rule()` / `docRule()` — is dropped and marked `# GAP:` in the peer (no `$ref` or `rules:` is invented; both are deferred past v1).
- Every peer parses as YAML and carries `mcVersion: 1` / `kind: contract`.
