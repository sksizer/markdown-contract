> Question D3 for [[D-0014-markdown-structure-validation|D-0014]] — a skipped heading level (H2→H4).
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# D3 · heading-depth jump

**Surfaced by:** [[14a-skipped-heading-level|14a]].

## The question

A document jumps H2 → H4, skipping H3. Two bits: **(1)** how the projection *nests* it, and **(2)**
whether the skip is a finding (and at what level).

## Part 1 — projection: attach as a direct child

A heading deeper than parent+1 **attaches as a direct child of its nearest shallower ancestor** — no
synthesized intermediate (a phantom H3 would invent structure the author didn't write). So an H4
under an H2-with-no-H3 becomes a direct child section of the H2. Committed — the projection has to
do *something*, and this is the least-surprising.

## Part 2 — the finding: emit `structure/heading-depth-jump` (warn)

A skipped level isn't *only* formatting here — it changes how the matcher nests and matches, so it
can cascade into confusing findings. With attach-as-child (Part 1) + name-based matching, a section
that lands at the wrong nesting level is matched against the **wrong parent's grammar**:

```text
## Section A      (H2)
#### Subsub       (H4 — meant under a missing H3)
```

`Subsub` becomes a direct child of `Section A` and is matched against *its* `children:` — surfacing
a spurious `structure/unknown-section` (or `section-missing`) that never names the real cause. The
mirror case (a uniformly too-shallow doc) turns intended children into siblings → a cascade of
missing-child + unexpected-sibling findings.

So emit `structure/heading-depth-jump` (`warn`) at the deep heading: it names the root cause so the
downstream findings are interpretable. Emit it **even though rumdl's `MD001` overlaps** — the
structure validator must be **self-contained** (its output interpretable without assuming the
formatter also ran), and the two serve different gates with different messages (MD001: "fix heading
increments"; ours: "this skip affected nesting/validation"). Non-gating and overridable, so the
overlap is benign.

- **id** `structure/heading-depth-jump`, **level** `warn`, **pos** the deep heading.

(If a contract genuinely needs a specific nesting depth, that's the grammar's `children:` — a
separate, intentional thing from "the author skipped a level.")

## Decision

**Resolved (2026-06-19).** **Part 1:** a heading deeper than parent+1 attaches as a direct child of
the nearest shallower ancestor (no synthesized intermediate). **Part 2:** emit
`structure/heading-depth-jump` (`warn`, at the deep heading) — the skip is structurally significant
(it can cascade into confusing wrong-level matches), so the validator names the root cause and stays
self-contained; benign overlap with rumdl `MD001` accepted (different gate/message). Overridable per
contract. Fold into proposed-shape.md at H1 (§2 attach behavior + the registry entry). _(Reversed
the initial "defer, emit nothing" rec — the depth jump affects our matching, not just formatting.)_
