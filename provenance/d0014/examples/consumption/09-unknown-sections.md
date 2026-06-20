> Consumption case 09 for [[D-0014-markdown-structure-validation|D-0014]] — Unknown sections.
> Exercises proposed-shape.md §6; non-normative; that doc wins.

# 09 · Unknown sections

## Affordance

Sections admitted by `gap()` / `allowUnknown` have no declared name, so the contract can give them
no key. §6 collects them in `body.unknown: SectionView[]` — a positional list, read by index or
iteration, not by a dotted/bracket key. This is the door onto content the contract never named.

## Consumes

[v05 — strict prefix + gap tail](../validation/05-strict-prefix-gap-tail.md): a strict, locked
prefix (`Title → Overview → Status`) followed by a `gap()` that admits extras, then an optional
`Appendix`. The sample document slots `Risks` into the gap; reused here by reference.

```ts
// from v05 (reused verbatim) — the gap() admits the unnamed "Risks" section
export const StatusContract = contract({
  body: sections({ order: "strict", allowUnknown: false }, [
    section("Title"),
    section("Overview"),
    section("Status"),
    gap(),                       // ← Risks lands here, unnamed
    optional(section("Appendix")),
  ]),
});
```

## Consumer code + expected reads

```ts
const doc = StatusContract.read(source, { path });

// Declared sections still key normally — dotted camelCase off the contract name
doc.body.status.text();                // "On track."
doc.body.appendix.text();              // "Source dashboards."

// Unknown sections have no contract name ⇒ no key. They land in a positional list (U5).
doc.body.unknown;                      // SectionView[] — gap()/allowUnknown admissions
doc.body.unknown.length;               // 1

const risks = doc.body.unknown[0];     // SectionView — reached by index, not by key
risks.name;                            // "Risks" — heading text is the only handle
risks.pos;                             // { line: 13 } — heading SourcePos, intact
risks.text();                          // "Capacity headroom is thin."

// Iterate when you don't know the count — the contract guarantees none of these names
doc.body.unknown.map((s) => s.name);   // ["Risks"]
```

Each element is a full `SectionView` (§6 "SectionView — content access") — `name`, `pos`,
`text()`, `tables`, `lists`, `byAnchor`, nested `sections`. The contract just couldn't *name* it,
so it is keyed by position, and `name` is the only string handle back to the heading.

## Gaps & open consumption decisions

- **U5 (`body.unknown[]` element shape).** Confirmed `SectionView[]`, reached by index/iteration
  with `name` as the only string handle — there is no contract name to camelCase, so no dotted or
  bracket key is generated. Open: is `unknown` always present (empty `[]` when none admitted, as
  here for a no-extras document) or `undefined`? And does it carry gap-admitted sections only, or
  also `allowUnknown: true` interlopers — both, per §3's "gaps implicit" reading, but §6 should say
  so. See [review-checklist.md](../../review-checklist.md) U5.
- Everything else here (`read()`, dotted-key declared sections, `SectionView.name`/`pos`/`text()`)
  is documented §6.
