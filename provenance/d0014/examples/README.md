> Example suite for [[D-0014-markdown-structure-validation|D-0014]] — two tiers exercising the
> proposed API (proposed-shape.md). Non-normative; for review.

# D-0014 example suite

Two additive tiers, mirroring the architecture — OOM is additive *above* validation, so the example
layout says the same thing the dependency arrow does:

- **[validation/](./validation/)** — the matcher + contract API. 54 graded cases (the 01–21 main
  spine + lettered edge branches), plus the deduped gap rollup and open questions. Start here; read
  in numeric order. Index: [validation/README.md](./validation/README.md).
- **[consumption/](./consumption/)** — the OOM typed-model access layer: how a consumer *reads* a
  validated document (`doc.body.*`, table iteration, `byAnchor`, derived objects). 11 graded cases,
  each linking down to the validation example whose contract it consumes. Open decisions it
  surfaces: [review-checklist.md](../review-checklist.md).

Both tiers number from `01` within their directory — the directory is the namespace.
