> Example 16 for [[D-0014-markdown-structure-validation|D-0014]] — Cross-plane docRule.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 16 · Cross-plane docRule

## Capability

`docRule(id, fn(doc))` — a rule whose function receives the whole typed document
(`{ frontmatter, body }`), so a frontmatter field can gate a body section. This is the only
construct that sees *both* planes at once; section-local `rule()` sees one node. The rule here is
§5.2's `task/post-mortem-when-worked`: a *worked* status requires a `## Post-mortem` section.
(Completion is *not* a cross-plane rule — `completion_note` is frontmatter-only, so frontmatter Zod
alone enforces it; the post-mortem is the real two-plane case (G3).)

## Use case

A task document. A *worked* task is expected to record a retrospective, so the contract demands a
`## Post-mortem` section once `status` enters the `closed/` family. An *open* task has no such
obligation. Neither plane alone can state this — Zod sees only frontmatter, the body grammar sees
only sections — so it lives in a cross-plane `docRule`.

## Sample document

Doc (a): closed, with the section — passes.

```md
---
id: T-AB12
status: closed/done
title: Wire up the projection cache
---

## Goal

Cache the layer-1 projection so re-validation skips re-parsing.

## Post-mortem

### Acceptance criteria coverage

All three ACs met; cache keyed on source hash.

### What worked

The projection was already positioned, so the cache key fell out for free.

### Friction and automation gaps

None worth filing.
```

Doc (b): open, no section — also passes (rule not triggered).

```md
---
id: T-CD34
status: open/ready
title: Add a byAnchor fast path
---

## Goal

Resolve `^anchor` blocks without scanning every section.
```

## Proposed contract

```ts
import { z } from "zod";
import { contract, sections, oneOf, optional, section, docRule } from "markdown-contract";

const TaskFrontmatter = z.object({
  id: z.string().regex(/^T-[0-9A-Z]{4}$/),
  status: z.enum(["open/ready", "open/blocked", "closed/done", "closed/dropped"]),
  title: z.string().min(1),
}).strict();

const isWorked = (s: string) => s.startsWith("closed/");   // a closed task was worked

export const TaskContract = contract({
  frontmatter: TaskFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),
    optional(section("Post-mortem", {                      // structure declared here; presence gated below
      children: sections({ order: "strict", allowUnknown: false }, [
        section("Acceptance criteria coverage"),
        section("What worked"),
        section("Friction and automation gaps"),
      ]),
    })),
  ]),
  rules: [
    docRule("task/post-mortem-when-worked", (doc, ctx) =>
      isWorked(doc.frontmatter.status) && !doc.body.section("Post-mortem")
        ? [ctx.finding({ id: "task/post-mortem-when-worked",
             message: "a worked task must include a ## Post-mortem section" })]  // ctx fills path/level/pos (A4)
        : []),
  ],
});
```

## Expected findings

PASS — doc (a), closed *with* the section. The `isWorked` guard fires but `body.section(...)`
resolves, so the rule returns `[]`:

```jsonc
{ "findings": [],
  "doc": {
    "frontmatter": { "id": "T-AB12", "status": "closed/done",
                     "title": "Wire up the projection cache" },
    "body": { "goal": {}, "postMortem": {} } } }
```

PASS — doc (b), open *without* the section. `isWorked(...)` is false, the rule short-circuits
before testing the body, so it returns `[]`:

```jsonc
{ "findings": [],
  "doc": {
    "frontmatter": { "id": "T-CD34", "status": "open/ready",
                     "title": "Add a byAnchor fast path" },
    "body": { "goal": {} } } }
```

FAIL — to *fire* the rule, keep doc (a)'s `closed/done` status while deleting its
`## Post-mortem` section. The guard is now true and the body lacks the section:

```jsonc
// TaskContract.validate(source, { path: "docs/planning/tasks/T-AB12.md" }).findings
[
  { "id": "task/post-mortem-when-worked", "level": "error",
    "path": "docs/planning/tasks/T-AB12.md", "pos": { "line": 3 },
    "message": "a worked task must include a ## Post-mortem section" }
]
```

## Gaps & questions

The `docRule` builds its finding through `ctx.finding(...)` (A4), which fills `path`, `level`, and
`pos` so the rule body just names the problem. What stays open is the `pos` a cross-plane finding
*defaults* to when the rule omits one: the FAIL case above guesses `line: 3` (the `status`
frontmatter line), but a missing-section finding could equally point at end-of-document or the
frontmatter block.

- Resolved (A4): the rule returns findings via `ctx.finding({ id, message, level?, pos? })`; the
  engine auto-fills `ctx.path`, the id's registered default `level`, and a default `pos` when
  omitted.
- Open question: what is a cross-plane finding's default `pos` — the frontmatter block, the document
  end, or required-explicit from the rule author?
