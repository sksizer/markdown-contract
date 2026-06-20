> Question A4 for [[D-0014-markdown-structure-validation|D-0014]] — proposed-shape.md self-bugs.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# A4 · Doc self-bugs (quick)

**Surfaced by:** [[16-cross-plane-docrule|16]], [[18b-read-throws-on-error|18b]].

Two inconsistencies the example suite caught *inside* proposed-shape.md. Not API design — defects to
fix. *Surfaced: 16, 18b.*

## Bug 1 — the model key name

§4 returns `{ findings, value }`; §6 destructures `{ findings, doc }`. Same field, two names.

**Recommend `doc`.** It reads better at call sites
(`const { findings, doc } = …; doc.body.summary`), the OOM *is* the document model, and every §6
example already uses `doc.body.…`. Rename §4's `value` → `doc`
(`validate(source) → { findings, doc? }`; `read(source) → doc`). `doc` is still undefined iff an
error-level finding exists (that part is F1).

## Bug 2 — `Ctx` is referenced but never defined

`rule(id, fn(node, ctx))` and `docRule(id, fn(doc, ctx))` both take a `ctx`, but its shape is never
given. The example rule callbacks returned bare `{ id, level, message }` objects, while `Finding`
requires `path` + `pos` — so a rule had no canonical way to emit a well-formed finding (the rollup
flagged this for 16/16a/20a too).

**Recommend** a minimal `Ctx` whose job is a finding *factory* that stamps the boilerplate:

```ts
interface Ctx {
  path: string;                       // the document path, stamped onto findings
  finding(f: {
    id: string;                       // a registry key (A1)
    message: string;
    level?: Level;                    // defaults from the registry (A1) if omitted
    pos?: SourcePos;                  // defaults per A2 (nearest container) if omitted
  }): Finding;
}
```

A rule returns `Finding[]` built via `ctx.finding(...)`; the engine fills `path`, the registry
default `level`, and the A2 pos fallback. This also gives the cross-plane item (16) its canonical
emit path, so 16 only has to decide the *default pos* for a no-node cross-plane finding.

## Decision

**Resolved (2026-06-19).** Bug 1: the model key is **`doc`** — rename §4's `value` → `doc`
(`validate → { findings, doc? }`, `read → doc`). Bug 2: define **`Ctx`** as the rule-author finding
factory — `{ path: string; finding({ id, message, level?, pos? }): Finding }` — passed to `rule()` /
`docRule()` callbacks; the engine fills `path`, the registry-default `level` (A1), and the A2 pos
fallback, all overridable. Engine-internal findings (`structure/*`, `content/*`, `frontmatter/*`)
are constructed by the engine directly, not via `ctx` — the factory exists so custom-rule findings
come out with identical shape and defaulting. Fold into proposed-shape.md §3/§4 at H1.
