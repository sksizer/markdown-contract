> Example 05 for [[D-0014-markdown-structure-validation|D-0014]] — Strict order + gap window.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 05 · Strict order + gap window

## Capability

`LevelOpts` with `order: "strict"` and `allowUnknown: false`, plus a `gap()` marker. Strict pins the
recognized sections in declared order with no unknowns between them; `allowUnknown: false` forbids
extras everywhere a marker does not say otherwise; `gap()` reopens one window. Together they encode
a locked prefix followed by an open tail — the two knobs are independent (proposed-shape.md §3
"Ordering and unknown sections").

## Use case

A document class with a fixed, ordered opening — say a status page that must lead with
`Title → Overview → Status` — but that tolerates arbitrary extra sections afterward, then still
anchors a known trailing section if present. The strict prefix guarantees the lead; the gap absorbs
whatever a team adds; the optional tail stays addressable by name.

## Sample document

```md
## Title

Q2 platform review.

## Overview

Where the platform stands this quarter.

## Status

On track.

## Risks

Capacity headroom is thin.

## Appendix

Source dashboards.
```

## Proposed contract

```ts
import { contract, sections, section, optional, gap } from "markdown-contract";

export const StatusContract = contract({
  body: sections({ order: "strict", allowUnknown: false }, [
    section("Title"),
    section("Overview"),
    section("Status"),
    gap(),                       // extras permitted only from here onward
    optional(section("Appendix")),
  ]),
});
```

## Expected findings

PASS — the sample document above. The strict contiguous prefix `[Title, Overview, Status]` matches
in order, `Risks` lands in the `gap()` window, and `Appendix` still anchors after the gap.

```jsonc
// StatusContract.validate(source, { path: "status.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "title": {}, "overview": {}, "status": {},
                       "appendix": {},
                       "unknown": [ { /* Risks SectionView */ } ] } } }
```

A consumer reads the locked sections by name and the gap-admitted extras off `body.unknown`:

```ts
const doc = StatusContract.read(source, { path: "status.md" });
doc.body.status.text();          // "On track."
doc.body.appendix.text();        // "Source dashboards."
doc.body.unknown.map((s) => s.name);  // ["Risks"]
```

FAIL — move `Risks` ahead of the gap, into the strict prefix:
`[Title, Risks, Overview, Status, Appendix]`. `Risks` is an unknown section sitting before `gap()`,
where `allowUnknown: false` and `order: "strict"` forbid it.

```jsonc
[
  { "id": "structure/section-order", "level": "error",
    "path": "status.md", "pos": { "line": 5 },
    "message": "‘Risks’ appears in the strict prefix before gap(); no unknown sections are permitted there" }
]
```

## Gaps & questions

The contract itself is fully expressible — every line uses documented API, and the §3 walkthrough
matches this case exactly. The gap is in the *finding vocabulary*: proposed-shape.md documents
`structure/section-order` (for declared-order violations) but never names the finding for an unknown
section appearing inside a strict, `allowUnknown: false` prefix. The two are distinguishable causes
and a consumer would want to branch on them.

- Smallest delta: enumerate a `structure/strict-prefix-unknown` finding id (or state that the strict
  prefix reuses `structure/section-order`) in the §4 Finding-id roster.
- Open question: is an unknown-before-gap a kind of order violation (reuse
  `structure/section-order`) or its own id, and what `pos` does it carry — the offending unknown
  heading, or the `gap()` slot?
