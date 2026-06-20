> Example suite for [[D-0014-markdown-structure-validation|D-0014]] — graded, additive
> contracts that exercise the proposed API (proposed-shape.md). Non-normative; for review;
> read in numeric order.

# D-0014 example suite — index

The suite is an additive main spine with edge-case branches. Each main step introduces one
capability; its lettered branches probe failures and corners of that step. Read in numeric order:
each file is a use case + sample document + proposed contract + expected findings + gaps.

## Index

| # | Example | Capability | Grounding | Expressible |
|---|---|---|---|---|
| 01 | [Single required section](./01-single-required-section.md) | one required H2 | synthetic | fully |
| 01a | [Required section absent](./01a-single-section-missing.md) | structure/section-missing finding | synthetic | partial |
| 02 | [Multiple required sections](./02-multiple-required-sequence.md) | a sequence of several required section() specs | synthetic | fully |
| 02a | [One of several required missing](./02a-one-of-several-missing.md) | per-section section-missing, others pass | synthetic | partial |
| 03 | [Optional sections](./03-optional-sections.md) | optional(section(...)) present-or-absent | synthetic | fully |
| 03a | [Duplicate section heading](./03a-duplicate-section.md) | structure/duplicate-section finding | synthetic | fully |
| 04 | [Ordering: recognized-relative](./04-recognized-relative-order.md) | order='recognized-relative', allowUnknown:true | synthetic | fully |
| 04a | [Recognized sections out of order](./04a-recognized-relative-out-of-order.md) | structure/section-order under recognized-relative | synthetic | fully |
| 05 | [Strict order + gap window](./05-strict-prefix-gap-tail.md) | order='strict', allowUnknown:false, gap() tail | synthetic | partial |
| 05a | [Unknown inside the strict prefix](./05a-strict-prefix-violated.md) | strict-prefix violation (unknown before gap()) | synthetic | fully |
| 05b | [gap({min,max}) bounds the window](./05b-gap-bounds.md) | gap({min,max}) admit-count bounds | synthetic | partial |
| 06 | [Alias sets via oneOf](./06-alias-sets-oneof.md) | oneOf([names]) interchangeable spellings | synthetic | fully |
| 06a | [No alias spelling present](./06a-oneof-none-present.md) | section-missing when no oneOf member appears | synthetic | partial |
| 06b | [Two alias members both present](./06b-oneof-two-members-present.md) | duplicate/ambiguous when two oneOf members appear | synthetic | partial |
| 07 | [Frontmatter only (Zod)](./07-frontmatter-only-zod.md) | contract({ frontmatter: ZodType }) | synthetic | fully |
| 07a | [Frontmatter enum + extra key](./07a-frontmatter-enum-and-unknown-key.md) | frontmatter/enum + strict() unknown-key findings | synthetic | partial |
| 08 | [Unified frontmatter + body](./08-frontmatter-plus-body-one-pass.md) | frontmatter (Zod) + body validated in one call | synthetic | fully |
| 08a | [Both planes fail, merged](./08a-both-planes-fail-merged.md) | merged findings, ordered by pos | synthetic | fully |
| 09 | [Section leaf: maxWords + anchor](./09-section-content-leaf-maxwords-anchor.md) | section({ content: maxWords(n), anchor }) | synthetic | fully |
| 09a | [maxWords exceeded](./09a-maxwords-exceeded.md) | content leaf Zod failure (word budget) | synthetic | fully |
| 09b | [Required ^anchor absent](./09b-anchor-missing.md) | structure/anchor-missing finding | synthetic | fully |
| 10 | [Table leaf: columns + minRows](./10-table-leaf-columns-minrows.md) | table({ columns, minRows }) | synthetic | fully |
| 10a | [Empty table / below minRows](./10a-table-empty-and-minrows.md) | table minRows violation | synthetic | partial |
| 10b | [Table missing a column](./10b-table-missing-column.md) | content/table/column-missing | synthetic | partial |
| 10c | [Table with an extra column](./10c-table-extra-column.md) | content/table/column-extra (extraColumns) | synthetic | partial |
| 11 | [Typed cells: enum / pattern](./11-typed-cells-enum-pattern.md) | table({ cells: { Col: z.enum/regex } }) | synthetic | partial |
| 11a | [Cell enum violation](./11a-cell-enum-violation.md) | per-cell enum finding localized to the row | synthetic | partial |
| 12 | [List leaf: checkbox + minItems](./12-list-leaf-checkbox-minitems.md) | list({ everyItem: 'checkbox', minItems }) | synthetic | fully |
| 12a | [Non-checkbox AC item](./12a-non-checkbox-list-item.md) | list everyItem:'checkbox' violation | synthetic | partial |
| 12b | [List below minItems](./12b-list-below-minitems.md) | list minItems violation | synthetic | fully |
| 13 | [Code leaf: language](./13-code-leaf-lang.md) | code({ lang }) | synthetic | fully |
| 13a | [Code block wrong/absent language](./13a-code-wrong-lang.md) | code lang-mismatch finding | synthetic | fully |
| 14 | [Nested children (subsections)](./14-nested-children-subsections.md) | section({ children: sections(...) }) | synthetic | fully |
| 14a | [Skipped heading level (H2 to H4)](./14a-skipped-heading-level.md) | projection edge: heading-depth jump H2→H4 | synthetic | partial |
| 14b | [Content before first sub-heading](./14b-content-before-first-subheading.md) | projection edge: blocks before first child heading | synthetic | partial |
| 15 | [Multiple anchored tables in one section](./15-multiple-anchored-tables-one-section.md) | content record: named tables bound by ^anchor | synthetic | fully |
| 15a | [Declared anchor absent](./15a-declared-anchor-absent.md) | structure/anchor-missing (declared anchor absent) | synthetic | partial |
| 15b | [Undeclared anchor, dynamic access](./15b-undeclared-anchor-dynamic-access.md) | OOM byAnchor() for an undeclared anchor | synthetic | partial |
| 16 | [Cross-plane docRule](./16-cross-plane-docrule.md) | docRule(id, fn(doc)) gating a body section (post-mortem is the live example) | synthetic | partial |
| 16a | [docRule violation fires](./16a-docrule-violation.md) | cross-plane rule emitting a finding | synthetic | partial |
| 17 | [Node-level custom rule](./17-node-level-custom-rule.md) | section({ rules: [rule(id, fn)] }) | synthetic | fully |
| 17a | [Node rule violation localizes](./17a-node-rule-violation-with-pos.md) | custom rule finding carries node SourcePos | synthetic | fully |
| 18 | [OOM: typed rows, byAnchor, dual-key](./18-oom-consumption-typed-views.md) | Infer<Contract> typed rows, column(), find(), byAnchor | synthetic | fully |
| 18a | [camelCase key collision](./18a-camelcase-key-collision.md) | contract-build collision on shared camelCase key | synthetic | partial |
| 18b | [read() throws on error](./18b-read-throws-on-error.md) | Contract.read() error-door vs validate() | synthetic | partial |
| 19 | [Real Decision contract end-to-end](./19-real-decision-contract-end-to-end.md) | full Decision contract on a real doc | real | fully |
| 19a | [Real Decision, §5.3 failure trio](./19a-real-decision-three-findings.md) | frontmatter/enum + anchor-missing + section-order | real | fully |
| 19b | [Decision body alias (Recommendation)](./19b-real-decision-alias-recommendation.md) | oneOf/alias on the real Decision body | real | fully |
| 20 | [Real Task contract end-to-end](./20-real-task-contract-end-to-end.md) | full Task contract on a real doc | real | partial |
| 20a | [Closed task missing Completion note](./20a-real-task-closed-without-completion-note.md) | closed/* ⇒ completion_note frontmatter conditional | real | fully |
| 20b | [Real task, non-checkbox ACs](./20b-real-task-non-checkbox-acs.md) | list everyItem:'checkbox' on real ACs | real | fully |
| 21 | [Real Milestone / SKILL.md doc-type](./21-real-milestone-or-skill-doctype.md) | a third real entity contract | real | partial |
| 21a | [Table inside a blockquote / list item](./21a-table-inside-blockquote-or-list.md) | projection edge: table nested in blockquote/list | real | partial |
| 21b | [Code fence containing a ## line](./21b-fence-contains-heading-line.md) | fence-awareness: '## ' in a code fence is not a heading | real | partial |

## Gaps & proposed API deltas

Aggregated across all cases, deduped, grouped by API area.

### Grammar

| Gap | Smallest delta | Surfaced by |
|---|---|---|
| `structure/section-missing` id for an absent required section/alias group is never enumerated; only section-order, anchor-missing, duplicate-section are named. | Add a finding-id registry row pinning `structure/section-missing` (level error). | 01a, 02a, 06a, 08a, 14b |
| Absence-class findings have no offending node, so `pos` (a required SourcePos) is undefined for section-missing. | Make `Finding.pos` optional, or document a fallback: first body heading → document line 1; a missing subsection localizes to its parent heading. | 01a, 02a, 06a, 14b |
| `structure/duplicate-section` doesn't say which of the two headings carries pos. | Fix pos to the second (later) occurrence. | 03a |
| Unknown section inside the strict prefix (before gap()) has no named finding id. | Add `structure/strict-prefix-unknown`, or state it reuses `structure/section-order` at the offending heading. | 05 |
| `gap({min,max})` count-out-of-range has no id, message, or pos. | Add `structure/gap-count` with a message carrying admitted count and violated bound; define its pos. | 05b |
| Two distinct members of one oneOf alias set both appearing has no finding id (duplicate-section covers identical text only). | Reuse `structure/duplicate-section` or mint `structure/oneOf-ambiguous`, emitted at the second member. | 06b |
| Unpermitted unknown section under allowUnknown:false has no named id. | Add `structure/unknown-section`, or state it folds into `structure/section-order`. | 21b |
| `contract(...)` is typed as total but §6 asserts a colliding-name contract is a build error; no error type or camelCase normalization rule. | Document a thrown `ContractBuildError` (id, message, colliding names) and pin the camelCase normalization (split on non-alphanumeric, lowerCamel-join). | 18a |

### Leaves

| Gap | Smallest delta | Surfaced by |
|---|---|---|
| Content-leaf (table/list/code/maxWords/cell) Zod failures have no documented finding-id namespace, message shape, or default level. | Add a `content/*` finding-id table (content/max-words, content/table-min-rows, content/column-mismatch, content/every-item, content/min-items, content/code-lang, table/cell), each with default level. | 09a, 10a, 10b, 11, 11a, 12a, 13, 13a, 18, 20b |
| Per-row / per-item / per-cell pos: a whole-leaf Zod schema yields an issue `path` ([rowIndex, column] / item index), not a SourcePos; remap to a line is the deferred S7 question. | Specify leaf Zod issue path-head remaps to `TableView.rowPos(i)` / the item's pos; give `ListItem` a `pos: SourcePos`. | 11, 11a, 12a, 20b |
| `table()` can only assert a lower-bound column set; no knob forbids extra/undeclared columns (OOM accepts and types them as string), so reporting an extra column is unreachable. | Add `extraColumns?: "ignore" \| "error"` to `table()` (default "ignore"); on "error" emit `table/column-extra`. | 10c |
| Missing-declared vs extra/undeclared column: one directional id or two. | Decide `table/column-mismatch` (directional message) vs `table/missing-column` + `table/extra-column`; keep 10b/10c consistent. | 10b, 10c |
| Absent code-fence language vs wrong tag collapse to one rejection, but shared id/message/level is undocumented. | Note `code({ lang })` rejects `lang: null` and any non-match alike, rendering received value as the tag or 'none'. | 13a |
| `gap()` takes no per-admitted-section content spec, so "every free-named subsection must be a checkbox list" is inexpressible. | Let `gap()` accept `{ each: section(...) }`, or steer to a parent-node `rule()` walking `node.sections`. | 21 |
| "Declared content leaf finds no matching block" (e.g. a section with no table) has no finding id. | Add `structure/table-missing` (+ list/code siblings), level error, at the section heading. | 21a |

### Projection

| Gap | Smallest delta | Surfaced by |
|---|---|---|
| No rule for a heading deeper than parent+1 (H2 then H4) — attach behavior and any depth-jump finding are undefined (S6 defers). | Pin: attach a heading deeper than parent as a direct child (no synthesized intermediate); add `structure/heading-depth-jump` (warn) at the deep heading. | 14a |
| No projection rule for a table/list/code wrapped in a blockquote or list item; BlockNode union has no such kind (S6 defers). | Pin: a block whose nearest ancestor is a blockquote/listItem is not promoted to a section-level BlockNode; reachable only via flattened text. | 21a |
| Fence-awareness ('## ' inside a fenced code block is not a heading) is an S6 open question, not a committed §2 invariant. | Add one sentence to §2 Layer 1: fenced `code` value is opaque, never re-scanned for `#` headings. | 21b |

### Frontmatter

| Gap | Smallest delta | Surfaced by |
|---|---|---|
| Frontmatter finding-id namespace is underspecified: only `frontmatter/enum` is named; no id for a `.strict()` unknown-key rejection. | Reserve `frontmatter/enum`, `frontmatter/unknown-key`, `frontmatter/type`, `frontmatter/required`. | 07a |
| Per-key frontmatter line mapping: `DocTree.frontmatter.pos` is one SourcePos for the whole block, but findings want per-key lines (S7 remap). | Add a key→line index to `DocTree.frontmatter` (e.g. `keyLines: Record<string, number>` or `lineForPath()`). | 07a |
| Merged frontmatter+body findings order is implied (ascending pos.line) but never stated; tie-break and stability undefined. | Document in §4: sorted by ascending pos.line, frontmatter before body on ties, stable across runs. | 08a, 19a |

### OOM

| Gap | Smallest delta | Surfaced by |
|---|---|---|
| `Contract.read()` throws on error-level findings but the thrown type and recovery path are unspecified. | Pin `class ContractError extends Error { findings: Finding[] }`; state it throws on error only. | 18, 18b |
| `validate`'s `value?` is typed optional but the doc never says it is undefined iff an error-level finding exists. | State: `value` is undefined iff `findings` contains a `level: "error"` entry. | 18b |
| §4 returns `{ findings, value }`; §6 destructures `{ findings, doc }` — the model field key is inconsistent. | Reconcile to one key name everywhere. | 18b |
| `byAnchor` has two documented return types: §6 promises `TableView<Record<string,string>>` at doc root, but `SectionView.byAnchor` returns `BlockView \| undefined`. | Add an explicit doc-root `byAnchor(id): BlockView \| undefined` with documented narrowing to TableView for table blocks, or a typed `byAnchorTable()`. | 15b |
| A content-record table binding whose declared `anchor` resolves to no block has no documented finding (id/level/pos). | Document the finding: reuse `structure/anchor-missing` vs new `content/anchor-not-found`, level, and pos (owning section heading). | 15a |

### Cross-plane rules

| Gap | Smallest delta | Surfaced by |
|---|---|---|
| `docRule`/`rule` callbacks return `{id, level, message}` only, but `Finding` requires `path` and `pos`; the `Ctx` type is never defined, so a positioned finding has no canonical form. | Define `Ctx` with a `ctx.finding({id, level, message, pos?})` factory that stamps path and a default pos; let callbacks return partial findings auto-filled by the engine. | 16, 16a, 20a |
| A cross-plane finding with no naturally offending node (an absent section) has no default pos. | Document: default to the frontmatter field the predicate read, else line 1. | 16, 16a, 20a |

### Modelling fidelity (real-corpus)

| Gap | Smallest delta | Surfaced by |
|---|---|---|
| §5.2 Files-to-touch Kind enum is `add\|modify\|delete` but the live Task template uses `new\|modify\|delete`. | Align §5.2 to `z.enum(["new","modify","delete"])` (or change the template). No API change. | 20 |
| §5.2 lists `oneOf(["Today","Current state"])` as required, but the template marks `## Today` optional, so a well-formed open task would fail. | Wrap in `optional(...)` — `optional(oneOf([...]))`. The SectionOpts.optional flag already exists. | 20 |
| Real corpus records completion in frontmatter (`completion_note`), not a `## Completion note` body section, so §5.2's body-gating docRule doesn't match the corpus. | No API change. Document a frontmatter-field docRule variant beside the body-section one. | 20a |

## Open questions

Aggregated, deduped, tagged with the case ids that raised each.

- Where does an absent required section's `pos` point — first body heading, document line 1, the
  parent heading whose children grammar failed, or the expected ordered position (which order:none
  lacks)? Or should pos become optional for absence-class findings? [01a, 02a, 06a, 14b, 18b]
- Is `structure/section-missing` the canonical id for an absent required section, or is another
  spelling (e.g. `structure/missing-section`) preferred? [08a]
- For `structure/duplicate-section`, localize to the first occurrence, the second, or one finding
  per duplicate? [03a]
- Is an unknown section before gap() (strict, allowUnknown:false) reported as
  `structure/section-order` or its own id, and what pos does it carry — the offending heading or the
  gap() slot? [05]
- What pos does a gap-count finding carry, is one finding emitted per violated bound, and how is a
  malformed `min > max` contract surfaced (build error vs document finding)? [05b]
- Reuse `structure/duplicate-section` for a cross-alias collision or mint
  `structure/oneOf-ambiguous`, and which member (first binding or second) carries pos? [06b]
- For an absent oneOf, does the section-missing message list all spellings (pipe-joined) or only the
  canonical first-declared one, and is it one group finding or one per member? [06a]
- Do content-leaf Zod failures use one flat `content/*` namespace or per-leaf ids (table/*, list/*,
  code/*), and should each leaf get a routable id or a single umbrella `content/zod`? [09a, 11, 11a,
  12a, 13, 13a, 20b]
- When a table fails both column-mismatch and minRows, one merged finding or one per assertion, and
  at what position (table block or offending row)? [10a]
- Is a missing declared column the same id as an extra/undeclared column, or two distinct ids?
  [10b, 10c]
- Should the extra-column policy live on `table()` per-contract or be a level-wide strictness
  toggle, and default to warn rather than error given the OOM already tolerates extra columns? [10c]
- Should a cell finding emit one per failing cell or aggregate per row/column, and ever localize to
  the cell (SourcePos.col) rather than the whole row — v1 or deferred? [11, 11a]
- Does the S7 Zod-issue-to-line remap cover leaf cell/item paths ([rowIndex, column], item index),
  not just section paths? [11, 11a, 20b]
- Should a list `everyItem` leaf emit one finding per failing item or a single list-level finding
  naming the offenders, and expose per-item SourcePos to leaf Zod schemas? [12a, 20b]
- Should an absent code-fence info-string be a softer warn than an actively wrong language, given
  level is contract data not a call-site choice? [13a]
- Should a skipped heading level be a hard error or a warn that still lets the named section match
  its child-grammar slot? (S6 decides.) [14a]
- Should an unresolved declared content-record anchor be `error` or `warn`, and reuse
  `structure/anchor-missing` or warrant `content/anchor-not-found`? [15a]
- Does doc-root `byAnchor` return undefined for a missing anchor, search all sections or only
  root-level, and is it a distinct table-narrowed signature or does BlockView narrow to TableView?
  [15b]
- For a cross-plane finding with no offending node, what is the default pos — frontmatter block,
  document end, or must the rule author always supply pos? Should rules emit via a
  `ctx.finding(...)` factory rather than a bare object literal? [16, 16a, 20a]
- Should `Contract.read()` throw on warn-level findings too, or only error, and is the recovery path
  the thrown `ContractError.findings` or a re-run of validate()? [18, 18b]
- Should the camelCase collision be a hard build-time throw or a lazy `contract/key-collision`
  finding, does the guard run per level or across the whole tree, and reuse the Finding shape or a
  distinct exception? [18a]
- For merged findings, do same-line ties break by plane (frontmatter first) or emission order, is
  the sort stable, and when several recognized sections are jointly out of order, one section-order
  finding per displaced section or a single one for the first inversion? [08a, 19a]
- Should the real TaskContract require the Today / Current state section, which Kind enum is
  canonical (add|modify|delete vs new|modify|delete), and should Files-to-touch be required
  non-empty (minRows: 1)? [20]
- Should the Deliverables Tasks alias and free-named H3 categories be modelled exactly as the
  lenient milestone schema, or should SDLC require a tighter contract (e.g. at least one H3)? Is
  per-entry content enforcement on gap()-admitted subsections in scope for v1 or a parent `rule()`?
  (S6 decides.) [21]
- Should a table authored inside a blockquote/list item be a hard error, a warn that flattens and
  still validates, or silently hoisted with no finding? (Governs the symmetric list/code cases; S6
  decides.) [21a]
- Should fence-awareness be promoted from an S6 open question to a committed §2 invariant before the
  contract API ships, and is an unpermitted unknown section its own id or folded into
  `structure/section-order`? [21b]

## Additive-coherence check

No ordering issues found. Each main step introduces its capability before any branch or later step
relies on it: sections/section (01) precede sequences (02) and optional (03); ordering knobs (04–05)
precede alias sets (06); the frontmatter plane (07) precedes the unified pass (08); content leaves
(09–13) precede nested children (14) and anchored-table records (15); cross-plane and node rules
(16–17) precede OOM consumption (18); the real-corpus contracts (19–21) compose only capabilities
introduced earlier in the spine.
