---
type: backlog
schema_version: '1'
id: B-RSEC
last_reviewed: '2026-07-04'
tags:
- engine
- oom
- sections
- schema
status: promoted/task
result: '[[T-1TA2-repeatable-sections-as-collections]]'
---
# Repeatable sections: let a heading recur as peers, surfaced as a collection in the model

Today a heading that repeats at one level is an **error**: an exact repeat →
`structure/duplicate-section`, two case/punct-variant peers → `structure/key-collision`
(both error-level, `src/core/structure.ts`). The out-of-model keys each section by its
camelCase key and demands per-level uniqueness, so two same-key peers can't both be
represented — hence the prohibition.

Some documents legitimately want a section to occur many times as peers — a per-entry
`## Entry`, a per-day `## Schedule`, a changelog's repeated `## Release`. The natural
representation is a **collection**: a declared "repeatable" slot that matches every
occurrence and surfaces them as an array in the OOM (`doc.body.entries[]`) rather than a
single keyed field.

**Idea:** add a body-grammar construct for a repeatable section (e.g. `repeat: true` /
`min`/`max` on a `section` node, or a dedicated `each:` node), with engine support in the
structure plane (match N occurrences instead of one), the OOM (an array view keyed by
position or by a sub-field), and the declarative DSL + inferer (recognize "same heading
many times per doc" and emit a repeatable slot instead of erroring).

Surfaced by T-KCOL (`init` heading key-collision handling): the question "what if the same
heading is used multiple times in one document as direct peers?" is the inverse of the
collision the inferer now guards against. T-KCOL keeps the existing per-level-uniqueness
rule and merely stops the inferer from emitting a contract that violates it; this item is
the larger feature that would make repeated peers a first-class, validated shape.

Needs a decision record (it changes the OOM contract — D-0005 dual-key access, D-0003
structure) and is a meaningful engine + DSL + inference change. Out of scope for the
T-KCOL crash fix.
