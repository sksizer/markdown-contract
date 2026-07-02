> Example 04 for [[D-0016-per-node-source-fidelity|D-0016]] — nodes are immutable; accessors return
> readonly views. Non-normative; the decision wins.

# 04 · Immutability

## Affordance

The projection is **read-only** (consistent with [[D-0007-engine-scope-and-fidelity]]): node fields
are `readonly`, arrays are `ReadonlyArray`, and `mdast()` returns a `Readonly<…>` view. A consumer
inspects; it never mutates. This makes the tree safe to share across consumers and closes the one
real hazard of exposing the mdast segment.

## Consumer code

```ts
const tree = parse(source);
const table = tree.root.sections[0].blocks[0];

// mutation is a type error, not a footgun
table.rows.push(["x", "y"]);        // ✗ TS2339 — rows is ReadonlyArray<ReadonlyArray<string>>
table.mdast().children.pop();       // ✗ TS2540 — mdast() returns Readonly<Mdast.Table>
// (table as any).kind = "list"     // no supported mutation path — nodes are frozen-by-contract

// safe sharing: two consumers over one immutable tree can't corrupt each other
const findings = lint(tree);
const summary = summarize(tree);    // sees exactly the tree `lint` saw
```

## Why it matters

Immutability and the accessor-function choice reinforce each other. If `mdast` were a live field
handing back the shared mutable mdast node, a consumer could reach in and corrupt the tree for
everyone else. An accessor that returns a **readonly** view removes that class of bug — the escape
hatch is a read, never a handle. And read-only is the posture the CLI exit code and CI gate already
depend on (D-0007): the worst case is a wrong finding, never a damaged tree.

## Notes

- **Compile-time only, today.** Enforcement is the type system alone — `readonly` fields,
  `ReadonlyArray`, `Readonly<…>`. There is **no runtime enforcement**: nothing is frozen and nothing
  is copied, so a consumer who casts through `any` can still mutate. `readonly` types are cheap and
  sufficient to start ("used that way for now").
- **No defensive copy.** `mdast()` hands back the **same shared node**, typed as readonly
  (composition, by reference — example 02); it is not a clone. A copy would defeat example 03's memory
  model (O(nodes) + one retained source) and the safe-sharing property above. The optional
  defense-in-depth escalation is runtime `Object.freeze` (which would need to be deep to fully hold),
  **not** copying; it has a cost, so it is not the default.
- Immutability is what makes the fallthrough (example 01) and composition (example 02) safe: sharing
  the mdast segment by reference is fine precisely because no one can mutate it.
