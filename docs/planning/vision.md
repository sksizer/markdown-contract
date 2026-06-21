# Vision — markdown-contract

Markdown is the cheapest durable format a team will actually keep writing. The moment
you also want to *trust* its structure or *read it as data*, you reach for ad-hoc
regex, a bespoke linter, or a heavyweight CMS. markdown-contract is the missing
middle: declare a per-type **contract** and get back both **validation** (structural
and content findings with source positions) and a **typed model** you can read — from
one parse.

## The bet

- **One parse, three cooperating mechanisms.** A structure plane (a regular tree
  grammar over sections *and* block kinds), a content plane (Zod over each block's
  data), and a named-rule registry for cross-node / cross-file constraints. Schema
  languages and tree grammars are formally incomparable (Murata) — so we never force
  one to do the other's job.
- **Validation and consumption are the same contract.** The contract that *checks* a
  document also *types* it: `validate()` for findings, `read()` for a typed model.
- **Generic and reusable.** Not welded to any one corpus. A declarative dir→contract
  config validates an arbitrary tree; the engine carries no repo knowledge.

## Proof by dogfooding

The first and hardest consumer is an SDLC planning corpus — decisions, tasks,
milestones, drivers — each a markdown + frontmatter entity with real structural
rules. This project **self-hosts** on that very system: it manages its own planning
with SDLC, and validating that corpus end-to-end is the flagship use-case driver.

## Out of scope

We *validate* rendered markdown; we do not generate it from templates, and we do not
own formatting (a separate concern). Read-only and round-trip-preserving.

> Status: **v0.1.0 shipped** — the two-plane contract engine and CLI are on `main`
> ([`M-0001`](milestones/M-0001-initial-contract-engine-and-cli.md), 275 tests green).
> Next: dogfood the engine on this project's own SDLC planning corpus
> ([`DR-0005`](drivers/DR-0005-validate-sdlc-corpus.md)). Design grounding —
> [`proposed-shape.md`](../../provenance/d0014/proposed-shape.md),
> [`review-checklist.md`](../../provenance/d0014/review-checklist.md).
