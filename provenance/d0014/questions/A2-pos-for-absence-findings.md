> Question A2 for [[D-0014-markdown-structure-validation|D-0014]] — `pos` for absence-class findings.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# A2 · `pos` for absence-class findings

**Surfaced by:** [[01a-single-section-missing|01a]], [[02a-one-of-several-missing|02a]],
[[06a-oneof-none-present|06a]], [[14b-content-before-first-subheading|14b]],
[[16-cross-plane-docrule|16]], [[18b-read-throws-on-error|18b]].

## The question

`Finding.pos` is currently **required** (`pos: SourcePos`, §4). But a whole class of findings is
about something that *isn't there* — a missing required section, an absent `^anchor`, a declared
column or table that doesn't exist, a cross-plane rule that fires because a section is absent. There
is no offending node to point at, so `pos` has nothing to hold. Do we make `pos` optional, or define
a fallback rule for where the line points?

## Why it matters

Foundational: B1 (`section-missing`), B2 (`duplicate-section` pos), C1/C5 (a declared leaf with no
matching block), F3 (declared anchor resolves to nothing), and the cross-plane rules (16) all
inherit whatever we decide here. It also changes the `Finding` type signature in §4.

## Evidence from the suite

Surfaced by **01a, 02a, 06a, 14b, 16, 18b**. The rollup names it directly: "Absence-class findings
have no offending node, so `pos` (a required SourcePos) is undefined for section-missing." Several
authors invented their own fallback (line 1; the parent heading), which is the divergence to settle.

## Options

| Option | Behaviour | Trade-off |
|---|---|---|
| 1. `pos` required + sentinel | always emit a line; use `1` (or doc end) when there's no node | fake precision — a clickable line that's wrong; consumers can't tell "real" from "filler" |
| 2. `pos` optional, omit on absence | `pos?: SourcePos`; absent → document-level finding (no line) | honest and standard (LSP/eslint allow file-level diagnostics); every consumer must handle `undefined` |
| 3. `pos` optional + nearest-container fallback (**recommended**) | optional, but localize to the nearest node that *does* exist; omit only when there's genuinely no container | clickable when a sensible anchor exists, honest (`undefined`) when not; one rule to specify |

## Recommended resolution

**Option 3.** Make `pos` optional (`pos?: SourcePos`), and define a single best-effort localization
rule — a finding points at the nearest existing node that *contains* the absence:

- missing **subsection** → the parent section's heading;
- missing **`^anchor`** → the owning section's heading;
- declared **leaf/column with no matching block** → the section's heading (or the block's pos if the
  block exists but is wrong);
- missing **top-level section** with no container (e.g. `order: none`, or an empty doc) → `pos`
  omitted: a *document-level* finding;
- **cross-plane** finding with no node → defer the precise anchor to E2 (the frontmatter key the
  predicate read); until then, omitted / document-level.

Net: `Finding.pos?: SourcePos`; present and pointing at the nearest container whenever one exists;
omitted (document-level) only when nothing contains the absence. This is the rule B1/B2/C/F3/16 then
reference instead of each re-deciding.

## Decision

**Resolved (2026-06-19): Option 3.** `Finding.pos` becomes optional (`pos?: SourcePos`). A finding
localizes to the nearest *existing* container — missing subsection → parent heading; missing
`^anchor` → owning section heading; a declared leaf/column with no matching block → the section
heading (or the block's pos if it exists but is wrong). `pos` is omitted (a document-level finding)
only when nothing contains the absence (a missing top-level section under `order: none`, or an empty
doc). Cross-plane no-node pos defers to E2. Fold into proposed-shape.md §4 (`Finding.pos` optional +
this localization rule) at H1.
