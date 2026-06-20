> Example 05b for [[D-0014-markdown-structure-validation|D-0014]] — gap({min,max}) bounds the
> window. Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 05b · gap({min,max}) bounds the window

## Capability

`gap({ min, max })` — the bounded form of the `gap()` marker introduced in step 05. A bare `gap()`
admits any number of unknown sections in its window; `min`/`max` bound that admit-count. Too few
extras violates `min`, too many violates `max` (proposed-shape.md §3, "`gap({ min, max })` bounds
how many extras the window admits"). This edge stresses both bound violations against the same
contract.

## Use case

A document class that requires a fixed prefix, then *between one and two* free-form extra sections
before a known trailing section — e.g. a release note that must carry `Summary → Highlights`, then
one or two team-authored callout sections, then `Sign-off`. Zero callouts is too thin; three is
clutter. The bounded gap encodes that "1 or 2 extras here" window directly.

## Sample document

```md
## Summary

Release 4.2 ships the new ingest path.

## Highlights

Throughput up 30%.

## Migration notes

Re-run the index build once after upgrading.

## Sign-off

Approved by platform.
```

## Proposed contract

```ts
import { contract, sections, section, gap } from "markdown-contract";

export const ReleaseContract = contract({
  body: sections({ order: "strict", allowUnknown: false }, [
    section("Summary"),
    section("Highlights"),
    gap({ min: 1, max: 2 }),     // 1 or 2 free-form extra sections permitted here
    section("Sign-off"),
  ]),
});
```

## Expected findings

PASS — the sample document above. `[Summary, Highlights]` matches the strict prefix in order, the
single extra `Migration notes` lands in the gap (1 is within `[1, 2]`), and `Sign-off` anchors after
it.

```jsonc
// ReleaseContract.validate(source, { path: "release.md" })
{ "findings": [],
  "value": { "frontmatter": {},
             "body": { "summary": {}, "highlights": {}, "signOff": {},
                       "unknown": [ { /* Migration notes SectionView */ } ] } } }
```

A consumer reads the locked sections by name and the gap-admitted extras off `body.unknown`:

```ts
const doc = ReleaseContract.read(source, { path: "release.md" });
doc.body.summary.text();              // "Release 4.2 ships the new ingest path."
doc.body.unknown.map((s) => s.name);  // ["Migration notes"]
```

FAIL (doc A — below `min`) — drop `Migration notes`, leaving zero extras in the window:
`[Summary, Highlights, Sign-off]`. The gap admits 0, but `min: 1` requires at least one.

```jsonc
[
  { "id": "structure/gap-count", "level": "error",
    "path": "release.md", "pos": { "line": 11 },
    "message": "gap admitted 0 unknown sections; expected at least 1" }
]
```

FAIL (doc B — above `max`) — insert three extras in the window:
`[Summary, Highlights, Migration notes, Known issues, Rollback, Sign-off]`. The gap admits 3, but
`max: 2` caps it at two.

```jsonc
[
  { "id": "structure/gap-count", "level": "error",
    "path": "release.md", "pos": { "line": 11 },
    "message": "gap admitted 3 unknown sections; expected at most 2" }
]
```

## Gaps & questions

The contract is expressible — `gap({ min, max })` is documented API (proposed-shape.md §3, line
196). The gap is in the *finding vocabulary*: proposed-shape.md states the bounds exist but never
names the finding id, message, or `pos` for a count-out-of-range violation. The §4 Finding roster
has no entry for it (it lists `structure/section-missing`, `structure/section-order`,
`structure/anchor-missing`, `structure/duplicate-section`, but nothing for gap bounds). The id and
message used above are therefore invented, not documented.

- Smallest delta: enumerate a `structure/gap-count` finding id in the §4 Finding-id roster, with a
  canonical message template carrying the admitted count and the violated bound (e.g.
  `"gap admitted {n} unknown sections; expected at {least|most} {bound}"`).
- Open question: what `pos` does the finding carry — the `gap()` slot's anchoring position (e.g. the
  first heading after the gap, used above), the first/last offending extra heading, or the section
  preceding the window? And is one finding emitted per violated bound, or one combined finding when
  a single window could (in principle) violate neither but a malformed `{min > max}` contract is
  given?
