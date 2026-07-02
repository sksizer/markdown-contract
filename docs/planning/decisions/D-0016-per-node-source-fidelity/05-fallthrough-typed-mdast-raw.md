> Example 05 for [[D-0016-per-node-source-fidelity|D-0016]] — the three-tier fallthrough guarantee.
> Non-normative; the decision wins.

# 05 · Fallthrough — typed → mdast → raw

## Affordance

Every node offers three views, so a consumer can always **fall through** to a lower one when the
higher doesn't carry what it needs:

> typed model → (if unmodelled) `mdast()` segment → (if that's not enough) `raw()` bytes

and every step is **local to the node** — no re-walk from `tree.mdast` at the root. The typed model
stays deliberately lean (it doesn't model links, images, nested emphasis); the fallthrough is what
lets it stay lean without ever stranding a consumer.

## Input

```md
See [the spec](https://example.com/spec) and `parse()`.
```

## Consumer code

```ts
const tree = parse(source);
const para = tree.root.sections[0].blocks.find((b) => b.kind === "paragraph")!;

// tier 1 — typed model: flattened text. Good for prose; the link URL and the backticks are gone.
para.text;                 // "See the spec and parse()."

// tier 2 — mdast segment: a construct the typed model doesn't cover, reached locally
const link = para.mdast().children.find((n): n is Mdast.Link => n.type === "link");
link?.url;                 // "https://example.com/spec"
link?.children;            // [{ type: "text", value: "the spec" }]

// tier 3 — raw bytes: when even mdast isn't the shape you want (diffing, byte-exact rewrite)
para.raw();                // "See [the spec](https://example.com/spec) and `parse()`."
```

## Why it matters

Without the fallthrough, "I need a link URL" forces the consumer out of the projection and back to
`parse(source).mdast`, then a manual walk *from the root* to re-find this paragraph. With `para.mdast()`
the segment is already in hand — the projection node and its layer-0 subtree are the same span. This
is the composition escape hatch (example 06) doing real work: the OOM never has to model every
markdown construct, because the tier below is always one call away and always local.

## Notes

- The tiers form a **spectrum of interpretation**, not a call sequence or a nesting: typed model
  (most opinionated, contract-shaped) → mdast (syntax, generic) → raw (bytes, zero interpretation).
  All three are **peer accessors on the same node** (`para.text`, `para.mdast()`, `para.raw()`) — you
  reach for whichever tier you need. "Fallthrough" names the *guarantee* that a lower tier is always
  one call away, not an order you must step through.
- `mdast()` returns a **readonly** view (example 08) — the fallthrough is a read, never a handle to
  mutate the shared tree.
