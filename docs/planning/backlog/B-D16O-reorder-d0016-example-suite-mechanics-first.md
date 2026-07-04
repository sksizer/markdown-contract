---
type: backlog
schema_version: '1'
id: B-D16O
tags:
- docs
- decisions
last_reviewed: '2026-07-04'
---

# Reorder the D-0016 example suite so cross-cutting mechanics precede the per-node examples

After all eleven D-0016 example PRs land, do a single reordering pass over the example suite
(`docs/planning/decisions/D-0016-per-node-source-fidelity/`). Today the README runs the depth ladder
(01 document → 02 section → 03 cell → 04 inline) first, then the cross-cutting mechanics (05
fallthrough, 06 composition, 07 range-serialization, 08 immutability, 09 structured cells). Review
feedback (PRs #162, #164) is that the system-level / mechanics descriptions frame everything else and
should come first.

Preferred shape: split the README into a **Concepts** group (the mechanics) and a **Worked examples**
group (the depth ladder), rather than a flat renumber — the depth ladder is a deliberate teaching
sequence (the same per-node `range` primitive at each granularity) and should stay contiguous and in
order.

Deferred to a single pass because renumbering files now would collide across the in-flight example
branches. Do it once they are all merged.
