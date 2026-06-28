---
type: decision
schema_version: '1'
id: D-0011
status: open/proposed
title: Declarative text constraints — required / forbidden phrase rules compiled to node rules
created: '2026-06-28'
related:
  - '[[C-0009-declarative-text-constraints]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[D-0004-content-plane]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[D-0001-finding-model]]'
  - '[[DR-0005-validate-sdlc-corpus]]'
  - '[[M-0002-declarative-yaml-contracts-v1]]'
tags:
  - yaml
  - dsl
  - declarative
  - rules
  - text-match
need_human_review: true
---

# Declarative text constraints — required / forbidden phrase rules compiled to node rules

## Summary

- Add a **closed, declarative text-match vocabulary** — `requires:` and `forbids:` lists — that a contract attaches to **any section node** (scoping the check to that section's subtree) and to the **body root** (scoping it to the whole document). Each entry asserts a literal substring or a regex is **present** (`requires`) or **absent** (`forbids`), with an optional **occurrence count** (`min` / `max`) and an author `note` that becomes the finding message. This is the declarative form of "this section must mention X" / "this document must never say Y".
- It is **not a second engine and not a general predicate language**. A `requires`/`forbids` block compiles to the runtime's existing node-local `rule` / cross-plane `docRule` machinery ([[C-0005-two-plane-contract-engine]]) — the same machinery a TS author already uses by hand. The package's own fixture `17-node-level-custom-rule.ts` ("the Summary section's prose must mention `outcome`") is structurally this exact check; this decision promotes that one shape from a hand-written predicate to a versioned declarative attribute.
- This is the **narrow, concrete slice** of the rules-in-YAML work that [[D-0008-declarative-contract-dsl]] explicitly deferred ("rules get their own decision when the demand is concrete"). The demand is now concrete: the SDLC plugin ([[DR-0005-validate-sdlc-corpus]]) wants to retire its bespoke `invariants.yaml` SKILL.md prose linter onto contracts, and that linter is **entirely** required-phrase / forbidden-phrase / required-section / required-tool-ref checks. This decision covers text constraints **only**; the general `when`/`require` predicate DSL and the `$ref` code escape hatch stay deferred.
- The vocabulary is **additive within `mcVersion: 1`** — new optional keys on a section node and on the body root, no breaking change, no version bump (per [[D-0008-declarative-contract-dsl]] § Versioning).
- The **central open fork** — resolve at review — is the *surface*: `requires` / `forbids` as **node attributes** (recommended) vs. a **`text` content leaf** vs. a **general declarative rule**. All three are worked below.

^summary

## Context

A contract today expresses three planes declaratively ([[D-0008-declarative-contract-dsl]]): frontmatter (a closed Zod vocabulary), structure (the section grammar), and content (the table / list / code / paragraph leaves). What it **cannot** express declaratively is a constraint on the **prose itself** — "this section must contain the phrase `DONE pr=`", "this document must never contain `}scripts/`". The only declarative text checks are over *structured* content: a list item matching a regex (`list({ everyItem })`) or a table cell matching an enum (`table({ cells })`). Free prose is reachable only through the code escape hatch — a node-local `rule(id, fn)` or a whole-document `docRule(id, fn)` written in TypeScript and built.

[[D-0008-declarative-contract-dsl]] foresaw this. Its § Out of scope defers "cross-cutting `rule` / `docRule`s in YAML", and its Options-considered § *Rules in v1 YAML* weighs two ways they might enter — a reference-by-id to a TS rule, or "an inline `when` / `require` predicate DSL" — and defers both, concluding "rules get their own decision when the demand is concrete (a future format version)."

**The demand is now concrete, and it is narrower than the general predicate language D-0008 was wary of designing.** The SDLC plugin ([[DR-0005-validate-sdlc-corpus]]) runs a hand-rolled SKILL.md prose linter driven by a sidecar `invariants.yaml` next to each skill. Across 14 skills it expresses exactly four constraint kinds:

| `invariants.yaml` kind | what it asserts | this contract |
|---|---|---|
| `required_h2_sections` | an H2 heading exists | already declarative — `section("Notes")` presence |
| `required_phrases` (with `section:`) | a phrase appears within a named section | **`requires:` on that section node** |
| `required_phrases` (no section) | a phrase appears anywhere in the doc | **`requires:` on the body root** |
| `forbidden_phrases` | a phrase appears nowhere in the doc | **`forbids:` on the body root** |
| `required_tool_refs` | a literal string (a CLI verb / script name) appears anywhere | **`requires:` on the body root** (a phrase by another name) |

Three of the four are text-presence / text-absence checks. The fourth is already a structure-plane primitive. None needs a `when` clause, a boolean expression, cross-field arithmetic, or arbitrary code — they are a **closed, finite shape**: *does this literal-or-regex appear (or not) in this scope, the right number of times?* That is small enough to give a first-class, versioned declarative vocabulary, the same way [[D-0004-content-plane]] gave the content plane a closed leaf vocabulary instead of an open expression language.

The runtime already supports this exact check; only the *declarative front-end* is missing. Fixture `tests/fixtures/validation/17-node-level-custom-rule.ts` is a node-local `rule` asserting a section's prose mentions a token, emitting an `error` finding when absent. This decision is "make fixture 17 authorable as YAML, with a count and an absence form."

## Decision

### A closed text-match vocabulary, compiled to the engine's rule machinery

Add two optional keys — `requires` and `forbids` — each a list of **match specs**, authorable in two positions:

- on **any section node** in a `body.sections` list → the check is scoped to that section's **subtree text** (the section and its nested subsections, including code spans and fenced blocks);
- on the **body root** (beside `order` / `allowUnknown` / `sections`) → the check is scoped to the **whole document body**.

A section-scoped block compiles to a node-local `rule(id, fn)`; a body-root block compiles to a `docRule(id, fn)`. The predicate is library-supplied (a text matcher over the bound scope's rendered text), so no contract author writes or builds TypeScript. Findings, positions, and the typed model are produced by the engine unchanged ([[D-0001-finding-model]]) — this is a compiler over existing runtime objects, exactly as [[D-0008-declarative-contract-dsl]] framed the YAML loader itself ("a compiler, not a second engine").

```yaml
mcVersion: 1
kind: contract

body:
  order: recognized-relative
  allowUnknown: true

  # document scope (body root): each list item is one whole-document check
  forbids:
    - pattern: "}scripts/"                    # a retired path class — must appear nowhere
      normalize: false                        # exact bytes (see § Match spec)
      note: "route through the op substrate (sdlc <noun> <verb>)"
    - pattern: "}validators/"                 # a second, independent entry
      normalize: false
  requires:
    - pattern: "sdlc task close-commit"       # a required literal, anywhere in the doc
    - pattern: "conventions/commit-messages.md"

  sections:
    - section: Output contract
      # section scope: each list item is one check over this section's subtree
      requires:
        - pattern: "DONE pr="
          note: "the orchestrator's primary success signal"
        - pattern: "ALREADY-CLOSED"
        - pattern: "STALE-PR pr="
        - regex: "LEASE-(CONFLICT|MISSING) ref="   # a regex entry — matches either marker
          note: "lease failure markers"
        - pattern: "WARNING"
          max: 0                              # the forbids dual — must not appear in THIS section
    - section: Notes        # plain presence — already a structure-plane check
    - section: Failure modes
```

### The match spec — a closed vocabulary

Each entry in `requires` / `forbids` is a YAML map. The vocabulary is closed and finite, mirroring the schema vocabulary of [[D-0008-declarative-contract-dsl]]:

| Key | Meaning | Default |
|---|---|---|
| `pattern` | the literal substring to find | — (one of `pattern` / `regex` required) |
| `regex` | a regular expression to find (alternative to `pattern`) | — |
| `normalize` | collapse runs of whitespace before matching, so prose line-wrapping is tolerated | `true` |
| `ignoreCase` | case-insensitive match | `false` |
| `min` | (`requires` only) minimum number of occurrences | `1` |
| `max` | maximum number of occurrences (`forbids` is sugar for `max: 0`) | unbounded (`requires`) / `0` (`forbids`) |
| `note` | author rationale, appended to the finding message | — |
| `level` | finding severity — `error` \| `warn` | `error` |

`requires` and `forbids` are duals: `forbids: [{ pattern: X }]` is exactly `requires: [{ pattern: X, max: 0, min: 0 }]`, but both spellings exist because the intent reads differently and the finding message differs ("required phrase not found" vs. "forbidden phrase present"). The `min` / `max` pair is the "how many times" knob — present-at-least-once is the default, but `min: 2` or `max: 1` are expressible for the rarer cases.

**Match scope is raw text, including code.** The predicate matches against the bound scope's rendered text **including inline code spans and fenced code blocks** — required markers and CLI invocations routinely live in code fences, so excluding them would miss the most important phrases. (This differs from the structure plane's heading discovery, which ignores fenced regions; text constraints deliberately do not.)

### Multiple entries and scopes

`requires` and `forbids` are **lists** — multiple constraints are multiple list items, and **each item is an independent check that emits its own finding** (there is no combining; N phrases is N entries). The same two keys attach at **two scopes**:

- on a **section node** → the entry matches that section's subtree text;
- on the **body root** → the entry matches the whole document.

A phrase required in one section and a phrase forbidden document-wide are simply entries in different lists. This is a 1:1 map from the `invariants.yaml` this replaces ([[DR-0005-validate-sdlc-corpus]]): a `required_phrases:` list of N becomes a `requires:` list of N — entries that carried a `section:` hint move onto that section node, section-less entries onto the body root — and `forbidden_phrases:` becomes `forbids:` on the body root.

### Findings and positions

- A `requires` miss → an `error`-level finding positioned at the **section's heading line** (section-scoped) or document-level with no `pos` (body root), message `required phrase <repr> not found in <scope>` + the `note`.
- A `forbids` hit → an `error`-level finding positioned at the **line of the offending match**, message `forbidden phrase <repr> present` + the `note`.
- A count violation (`min` / `max`) → `<phrase> found N times, expected …`.
- Finding ids are namespaced under a stable area so they sort into their own plane in the merged finding stream — proposed `text/requires`, `text/forbids`, `text/count` (final id spelling is an open question below).

### Versioning — additive within `mcVersion: 1`

`requires` / `forbids` are **new optional keys** on the section node and the body root. Per [[D-0008-declarative-contract-dsl]] § Versioning, additive keys stay within the current format version — no `mcVersion` bump, and every existing v1 contract keeps validating unchanged.

## The constraint surface — node attributes vs. content leaf vs. general rule (the central fork)

How should a text constraint be *spelled* in YAML? Three candidate surfaces, worked on the same example (the `Output contract` section must contain `DONE pr=`; the document must never contain `}scripts/`). **This is the decision to confirm at review.**

**(A) `requires` / `forbids` node attributes — recommended.**

```yaml
body:
  forbids:
    - pattern: "}scripts/"
      normalize: false
  sections:
    - section: Output contract
      requires:
        - pattern: "DONE pr="
          note: "primary success signal"
```

- **For:** reads as a property *of the node* — "this section requires…"; attaches uniformly at section and body-root level; closest 1:1 map from `invariants.yaml` (a near-mechanical migration); the count/absence knobs sit naturally on the entry.
- **Against:** introduces two new top-level node keys beside the existing `content` / `children` / `optional` / `anchor`.

**(B) A `text` content leaf.**

```yaml
sections:
  - section: Output contract
    content:
      text:
        requires: ["DONE pr="]
```

- **For:** reuses the existing `content:` leaf slot and the `table` / `list` / `code` / `maxWords` vocabulary; no new node-level keys.
- **Against:** a genuine semantic mismatch. Content leaves are a **single-block kind-gate** ([[D-0004-content-plane]]) — they validate *one* projected block (a table, a list). A prose phrase ranges over the **whole section subtree**, not one block, so `text` would be a leaf that isn't a block. And the body-root / whole-document scope has **no** `content:` slot to hang from, so document-global phrases (the bulk of `forbidden_phrases` / `required_tool_refs`) would need a *second* surface anyway. Forcing text-match into the leaf vocabulary muddies what a leaf is.

**(C) A general declarative rule form.**

```yaml
sections:
  - section: Output contract
    rules:
      - id: output/done-marker
        require: { phrase: "DONE pr=" }
```

- **For:** the most general — a step toward the deferred `when` / `require` predicate DSL; one surface for all future rule kinds.
- **Against:** this is precisely the "real expression language to design, parse, document, and version" that [[D-0008-declarative-contract-dsl]] deferred. It pays the cost of generality to express a closed, finite shape. We can always grow into it later; opening the general-rule surface now to ship phrase-match is over-scoped.

**Recommendation: (A).** It is the truest fit for the constraint (a property of a node / the document), the only one that covers both the section and document scopes with one spelling, and the cleanest migration target. (B) breaks the leaf abstraction; (C) prematurely opens the general-predicate surface D-0008 deliberately closed. The match-spec vocabulary and compile-to-`rule`/`docRule` semantics above are independent of which surface wins — only the spelling changes.

## Why

- **The runtime already does this.** Section-scoped and whole-document text checks are exactly `rule` / `docRule`, which ship today (fixture 17 proves the shape). This decision adds a declarative front-end over existing machinery — no engine change, one source of truth for findings.
- **A closed shape deserves a closed vocabulary.** Required/forbidden phrase with a count is finite and well-understood, not an open expression language. Giving it a first-class declarative form — rather than waiting for the general predicate DSL — mirrors how [[D-0004-content-plane]] gave content a closed leaf set instead of arbitrary code.
- **It unblocks a real consumer.** The SDLC plugin's `invariants.yaml` linter ([[DR-0005-validate-sdlc-corpus]]) is *entirely* expressible in this vocabulary, letting that project delete a bespoke matcher and run its skill-prose checks on the same engine that already validates its entity corpus.
- **Additive and reversible.** New optional keys within `mcVersion: 1`; no existing contract changes behavior. If the general rule surface (C) ever lands, `requires`/`forbids` can be re-expressed as sugar over it without a file change.

## Consequences

- **Declarative front-end (`src/declarative/body.ts`).** `sectionOpts(...)` and the body-root level compiler gain `requires` / `forbids` recognition, validated against the closed match-spec vocabulary (a sibling to `compileSchema`), compiling to library-built `rule` / `docRule` specs. A malformed entry is a `DeclarativeError`, consistent with the existing loader.
- **TS-API parity (`src/core`).** A library-supplied predicate builder (e.g. `requires([...])` / `forbids([...])`, or `textRule(...)`) so a combinator-authored contract gets the same checks without hand-writing the predicate — the declarative form compiles to these. Exact API named at implementation.
- **A new finding area (`text/*`).** Registered with default `error` level (overridable per entry via `level`), sorting into its own plane in the merged stream.
- **Closed, maintained surface.** Each match-spec key is a deliberate, versioned addition — the same discipline [[D-0004-content-plane]] imposes on leaves and [[D-0008-declarative-contract-dsl]] on the schema vocabulary.
- **The general predicate DSL stays deferred.** This does *not* ship `when` clauses, boolean composition, or cross-field rules; a contract needing those still authors a TS `docRule`. The boundary is "text presence/absence with a count", nothing wider.

## Options considered

### Surface — node attributes (A) vs. content leaf (B) vs. general rule (C)

Worked in full above (§ The constraint surface). (A) recommended; (B) breaks the single-block leaf abstraction and can't reach document scope; (C) over-scopes into the deferred predicate language. To be confirmed at review.

### Leave it in TypeScript (no declarative form)

A consumer wanting phrase checks writes a `rule` / `docRule` in TS, as today. Rejected for the concrete driver: it keeps "checks as data" out of reach for the exact case with the most demand, and forces a build toolchain on a project (the SDLC plugin) whose every other contract is already pure YAML. The whole value of [[C-0006-declarative-yaml-contracts]] is data-not-code for the common case; phrase-match *is* a common case.

### Generalize to the full predicate DSL now

Design the `when` / `require` expression language D-0008 sketched, and express phrase-match as one operator within it. Rejected as premature: it pays a large design/parse/document/version cost to ship a closed shape, and D-0008 already resolved to defer it until a broader demand than phrase-match appears. Phrase-match does not need it.

### Preserve the `invariants.yaml` matcher asymmetry as fixed defaults

The legacy linter matches *required* phrases whitespace-normalized but *forbidden* phrases raw (exact-byte). Rather than bake that asymmetry into `requires` vs `forbids`, this decision exposes one `normalize` knob (default `true`) so the behavior is explicit per entry, and a migrating forbidden-phrase that needs exact bytes sets `normalize: false`. Cleaner than two hidden defaults; the migration makes the one asymmetric case explicit.

## Open questions

- **Surface (A/B/C)** — the central fork above; resolve at review.
- **Finding id spelling** — `text/requires` / `text/forbids` / `text/count`, or fold count into the requires/forbids ids. Affects how findings sort and how consumers filter.
- **Default `normalize`** — `true` (tolerate prose line-wrapping) is proposed as the default; confirm, and confirm `forbids` shares the same default (with `normalize: false` for exact-byte forbids).
- **`regex` flags** — whether `regex` accepts inline flags / a `flags` key, and how `ignoreCase` composes with a `regex` that sets its own.
- **Count keywords** — ship `min` / `max` now, or start with presence/absence only and add counts on demand? (The migration needs only `min: 1` and `forbids`; counts are speculative generality.)
- **Whole-document `requires` position** — `pos`-less (a document-level finding) vs. anchored at the first heading; affects the human finding render.

## Out of scope

- The general `when` / `require` **predicate DSL** — boolean composition, cross-field / cross-plane conditions — still deferred to a future format version ([[D-0008-declarative-contract-dsl]] § Out of scope).
- The **`$ref` code escape hatch** (a YAML reference to a named TS export) — unchanged, still deferred.
- **Document repair / autofix** — the engine is read-only ([[D-0007-engine-scope-and-fidelity]]); a `requires` miss reports, it does not insert the phrase.
- **Linking / wikilink / inline-element constraints** — "this section must contain a link to X" is a different (inline-addressing) shape; not covered here, reachable via a hand-written `rule` if needed.

## References

- [[C-0009-declarative-text-constraints]] — the capability this decision realizes.
- [[D-0008-declarative-contract-dsl]] — the declarative format this extends; its § Out of scope deferred exactly these rules, and its § Versioning makes the addition additive.
- [[C-0006-declarative-yaml-contracts]] — the authoring capability [[C-0009-declarative-text-constraints]] extends (text constraints as a new authorable construct).
- [[D-0004-content-plane]] — the closed-vocabulary discipline this mirrors (a finite set, not an open language).
- [[C-0005-two-plane-contract-engine]] — the runtime `rule` / `docRule` machinery the declarative form compiles to.
- [[D-0001-finding-model]] — the findings a compiled text constraint emits unchanged.
- [[DR-0005-validate-sdlc-corpus]] — the concrete driver: the SDLC plugin's `invariants.yaml` SKILL.md prose linter, retired onto this vocabulary.
- [[M-0002-declarative-yaml-contracts-v1]] — the milestone whose declarative format this is the first additive extension to.
- Fixture `tests/fixtures/validation/17-node-level-custom-rule.ts` — the hand-written predicate this promotes to a declarative attribute.
