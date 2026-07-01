> Provenance bundle for [[D-0016-per-node-source-fidelity|D-0016]] — worked API examples for the
> proposed per-node source-fidelity model. Non-normative; the decision wins.

# D-0016 provenance — per-node source fidelity

[[D-0016-per-node-source-fidelity|D-0016]] proposes exposing three views of the same span at
**every projection node** — the **raw source** bytes, the **mdast segment**, and the **typed
model** — with a per-node `range` as the serializable primitive, reached by lazy accessor functions
over an immutable tree, **by composition** (never by extending mdast).

This bundle holds the worked examples that motivate and pin the shape.

- **[examples/](./examples/)** — API use cases: code + expected reads + rationale. Read in numeric
  order. Index: [examples/README.md](./examples/README.md).

The decision record is [[D-0016-per-node-source-fidelity]]. The cell/inline-depth embodiment already
in flight is the structured-cells milestone (M-0011, PR #100), which these examples reconcile with.
