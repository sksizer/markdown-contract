> Question F4 for [[D-0014-markdown-structure-validation|D-0014]] — dual-key (exact + camelCase) OOM
> access and the collision rule. Part of the open-decision review (see ../review-checklist.md).
> Non-normative; records the decision, folded into [proposed-shape.md](../proposed-shape.md) (§6) at
> step H1.

# F4 · camelCase collision

**Surfaced by:** [[18a-camelcase-key-collision|18a]].

## The question

§6's typed model gives every declared section **two** keys — exact bracket and lowerCamelCase
dotted:

```ts
doc.body["Files to touch"]   // exact heading text
doc.body.filesToTouch        // generated lowerCamelCase
```

Two *distinct* heading names can collide in camelCase (`"Files to touch"` and `"Files-to-touch"`
both → `filesToTouch`). Four loose ends: **(1)** is a collision a build-time throw or a lazy
per-document finding? **(2)** is it checked per level or across the whole tree? **(3)** the exact
heading→camelCase normalization rule (and which languages); **(4)** the *runtime* mirror — a
document (non-contract) peer whose key collides with a declared section.

## Recommendation

**1. Build-time throw, not a document finding.** A camelCase collision is a property of the
**contract** — two *declared* names that normalize to the same key — knowable when `contract({...})`
is constructed, before any document exists. So it throws at contract-build time
(`contract/key-collision`, the contract-authoring area, *not* a per-document `Finding`). A lazy
finding would re-report the same authoring bug on every document and blame the document for the
contract's defect. (This matches §6's existing line: "a contract that declares two distinct names
colliding in lowerCamelCase is a contract-build error, caught at definition time.")

- A *document* repeating one declared section is a different thing — `structure/duplicate-section`
  (B2), a document finding, not F4.
- **Unknown** sections (gap()/allowUnknown) get **no** camelCase key (they live in `unknown[]` /
  `.section(name)`), so they cannot collide in the typed model. F4 is purely about declared names.

**2. Scope: per sibling level, not whole tree.** camelCase keys are namespaced by their parent —
`doc.body.filesToTouch` and `doc.body.decision.filesToTouch` are different objects. So the collision
check runs **within each `sections([...])` sibling group**, matching how keys are actually scoped;
a whole-tree check would falsely flag non-colliding cross-level names.

**3. Pin the normalization rule — Unicode-aware, not ASCII.** Deterministic: split the heading on
runs of non-letter/non-number with **Unicode property escapes** — `/[^\p{L}\p{N}]+/u` — lowercase
the first word, upper-case the first letter of each subsequent word, concatenate (standard lodash
`camelCase` shape). Using `\p{L}\p{N}` rather than `[A-Za-z0-9]` buys **most languages for free** —
accented Latin, Cyrillic, Greek, every *case-bearing* script — so there is no need to start
English-only. Use **locale-independent** case mapping (avoid the Turkish dotted/dotless-i trap) so
the key is deterministic regardless of host locale.

| Heading | `→` key |
|---|---|
| `Files to touch` | `filesToTouch` |
| `Goal / Problem statement` | `goalProblemStatement` |
| `Café déjà vu` | `caféDéjàVu` |

Two graceful fallbacks, both to **exact bracket + `.section(name)`** (the always-present canonical
door — the dotted key is only a convenience, never the sole access):

- a heading that normalizes to an **invalid JS identifier** (leading digit, or empty after
  stripping);
- a **caseless script** (CJK, Arabic, Hebrew) where camelCase is meaningless → no dotted alias.

**4. Runtime mirror — `structure/key-collision` (document finding; new).** The build-time throw only
catches *contract × contract*. A document can collide too: an **unknown** (`gap()`/`allowUnknown`)
section — a "non-contract peer" — whose name produces the **same camelCase key** as a declared
section (or as another sibling) while differing in *exact* text. We do **not** have this today.
Emit **`structure/key-collision`** (`error` by default) when two sections in the same sibling scope
yield the same camelCase key but differ in exact heading. `error`, because a non-contract peer
shadowing a declared key is a structural fault — block the typed model (per F1, an error means no
`doc` until it's fixed) rather than ship an ambiguous document. (Exact-bracket access still
disambiguates, so nothing is *broken*; the default simply treats the near-identical heading as a
fault to fix. Downgradable per-node to `warn` via the deferred severity override.)

This complements **B2** (`structure/duplicate-section`, fired on *identical* heading text). Together
they pin the dual-access invariant: within any sibling scope, **unique exact name** (B2) + **unique
camelCase key** (`structure/key-collision`) ⇒ both access styles are always unambiguous.

| Collision | Plane / when | id | level |
|---|---|---|---|
| two *declared* names → same key | contract, build-time | `contract/key-collision` | throw |
| two document sections, *identical* heading | document, runtime | `structure/duplicate-section` (B2) | error |
| two document sections, *distinct* headings → same key | document, runtime | `structure/key-collision` (new) | error |

## Decision

**Resolved (2026-06-19).** **(1)** A camelCase collision between two *declared* names is a
**build-time throw** (`contract/key-collision`, contract-authoring area), not a per-document
finding. **(2)** Checked **per sibling level** (each `sections([...])` group), matching how keys are
scoped — not whole-tree. **(3)** Normalization is **Unicode-aware** — split on `/[^\p{L}\p{N}]+/u`,
locale-independent casing, lodash-`camelCase` shape — so all case-bearing scripts work without an
English restriction; invalid-identifier and caseless-script headings fall back to exact-bracket +
`.section(name)` (no dotted alias, no error). **(4)** New runtime mirror
**`structure/key-collision`** (`error` by default, downgradable per-node) fires when two *document*
sections in one sibling scope share a camelCase key but differ in exact heading (the
unknown-peer-shadows-declared gap), complementing B2's identical-heading
`structure/duplicate-section`; together they guarantee a unique exact name + unique key per scope.
Fold into proposed-shape.md §6 at H1.
