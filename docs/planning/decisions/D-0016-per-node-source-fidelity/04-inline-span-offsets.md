> Example 04 for [[D-0016-per-node-source-fidelity|D-0016]] — inline-depth raw: positioned inline
> spans. Non-normative; the decision wins.

# 04 · Inline — placeholder span offsets

## Affordance

`paragraph.spans()` (and the cell equivalent) exposes **positioned inline segments** — each with a
`kind` (`text` / `code` / …), its `value`, and its `range`. A consumer scanning prose for a pattern
gets each match's exact offset *and* can tell whether it sits inside an inline-code span — without
re-reading raw lines or hand-rolling code-span masking. This is the finest (and costliest) tier; see
Notes.

## Input

```md
Replace <owner> before review; leave `<placeholder>` alone.
```

`<owner>` is an unfilled placeholder to flag; `<placeholder>` is inside inline code and must be
skipped.

## How inline code is represented

Inline code is its **own mdast node** — `inlineCode`, a phrasing *leaf* — distinct from a fenced
**block** code node (`code`). It has no `children`; its content is a raw string in `value`, and (as
in [03](./03-verbatim-table-cells.md)) mdast stores that `value` with the backticks stripped. The
input above parses to this phrasing sequence:

```ts
[
  { type: "text",       value: "Replace <owner> before review; leave " },
  { type: "inlineCode", value: "<placeholder>" },   // ← leaf: no children, no backticks in value
  { type: "text",       value: " alone." },
]
```

`spans()` is the positioned projection of exactly this sequence: each `inlineCode` becomes a span
with `kind: "code"`, each `text` a `kind: "text"` span, every span carrying its own `range`. That is
why the consumer below can skip a whole code span in one `kind === "code"` check.

## Consumer code

```ts
const tree = parse(source);
const para = tree.root.sections[0].blocks.find((b) => b.kind === "paragraph")!;

const PLACEHOLDER = /<[^>]+>/g;
const hits: { text: string; range: Range }[] = [];

for (const span of para.spans()) {
  if (span.kind === "code") continue;             // inline code is not prose — skip it wholesale
  for (const m of span.value.matchAll(PLACEHOLDER)) {
    hits.push({
      text: m[0],                                 // "<owner>"
      range: offsetWithin(span.range, m.index!),  // absolute source offset, from the span's range
    });
  }
}

hits;   // [{ text: "<owner>", range: { start: 8, end: 15 } }]
//        "<placeholder>" is inside a kind:"code" span → never seen
```

## Before / after

```ts
// before — scan-placeholders today: split raw lines, run a masking pass to blank out inline code,
// then regex the masked line and back-compute the column from the raw line
const masked = maskInlineCode(rawLine);            // hand-rolled `…` masking
for (const m of masked.matchAll(PLACEHOLDER)) {
  const col = m.index!;                            // column re-derived against the raw line
  report(rawLine.slice(col, col + m[0].length), lineNo, col);
}

// after — the projection already knows which spans are code and where each span sits
for (const span of para.spans()) { /* …as above… */ }   // (above)
```

## Why it matters

`scan-placeholders` (PR #519) needs both the column offset of each `<…>` and inline-code awareness,
so today it keeps the raw lines, runs its own `maskInlineCode`, and re-computes offsets by hand —
the exact "left the tree, re-read the bytes" pattern, at the inline layer. Positioned spans remove
the masking and the offset arithmetic.

## Notes

- **This is the costly tier.** The projection currently flattens inline phrasing to one string
  (`paragraph.text`), discarding per-span positions; surfacing spans means keeping them and growing
  `SourcePos` with `end`. See the decision's depth-ladder cost table.
- **M-0011 is the emerging form.** The structured-cells milestone adds an `inlineSpans` overlay of
  per-cell / per-paragraph inline-code byte ranges (PR #100). Whether that generalizes to a full
  `spans()` accessor or stays a cell-local overlay is the decision's Open question; this example
  shows the target shape.
