> Example 03 for [[D-0016-per-node-source-fidelity|D-0016]] — `range` is the serializable primitive;
> `raw()` / `mdast()` are lazy and live-only. Non-normative; the decision wins.

# 03 · `range` as the serializable primitive

## Affordance

`node.range` (source offsets) is **plain data** — the one thing that must be stored and that survives
serialization. `raw()` and `mdast()` are **lazy accessor functions**: they compute on demand
in-process and, being methods, drop out of `JSON.stringify` on their own. Over the daemon / web-UI
boundary the tree serializes as data (`range` + the typed scalars); a client re-derives `raw` from
`range` + the source string.

## Consumer code

```ts
const tree = parse(source);
const table = tree.root.sections[0].blocks[0];

// in-process — the lazy accessors work
table.raw();                       // "| Location | … |"   (slices source at table.range)
table.mdast();                     // Mdast.Table

// serialize — methods vanish, data remains
const wire = JSON.parse(JSON.stringify(tree));
wire.root.sections[0].blocks[0];
// { kind: "table", columns: [...], rows: [...], range: { start: 42, end: 118 } }
//   ↑ raw / mdast (methods) are absent; range (data) is present

// far side (daemon → web-UI): re-derive raw from range + source, no re-parse
sliceOf(source, wire.root.sections[0].blocks[0].range);   // "| Location | … |"  — identical bytes
// …or rehydrate the whole tree so the accessors return:
rehydrate(wire, source).root.sections[0].blocks[0].raw(); // same
```

## Why it matters

This resolves the tension a naive design would hit: if `raw` were an eager per-node string field, the
serialized tree would carry the source many times over (a section's raw contains its paragraphs'
contains their spans'), and memory would be O(depth × size). Keeping `range` as the primitive and
`raw`/`mdast` as derived accessors makes memory O(nodes) + one retained source, and makes the wire
shape small and self-consistent. It's exactly tree-sitter's model — nodes store byte ranges; text is
a lazy slice of the source buffer — and it's why the [[D-0012-distribution-single-exec-and-web-ui]]
JSON API stays clean.

## Notes

- A rehydrated tree *without* the source can still carry `range` (for diagnostics, jump-to-source),
  it just can't answer `raw()` until given the source.
- Open (decision): method-on-node (`node.raw()`) vs a free `sliceOf(source, node.range)` helper — the
  latter keeps nodes pure serializable data with no methods at all.
