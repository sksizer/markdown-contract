---
type: decision
schema_version: '1'
id: D-0007
status: open/accepted
title: Engine scope and fidelity — read-only, mdast-retained, repair-free, LLM-free
created: '2026-06-21'
related:
  - '[[C-0001-contract-validation]]'
  - '[[C-0004-dialect-aware-projection]]'
  - '[[D-0006-packaging]]'
  - '[[PR-0001-markdown-contract]]'
  - '[[PR-0002-markdown-contract-cli]]'
tags:
  - architecture
  - scope
  - fidelity
  - determinism
need_human_review: true
---
# Engine scope and fidelity — read-only, mdast-retained, repair-free, LLM-free

## Summary

- The engine is **read-only**: it inspects a document and never mutates or normalizes it. Parse in,
  findings (and a typed model) out — the source bytes are untouched.
- **Fidelity (F1).** The raw mdast is retained and exposed as `tree.mdast`, so the parse is
  round-trippable and constructs the projection does not model stay analysable — the retain-don't-rewrite
  half of read-only.
- **Repair and normalization are out of scope** — a distinct downstream pass, not the validator's job.
  A finding MAY carry a candidate `fix?`, but applying it is a consumer's choice, not the engine's.
- The engine is **LLM-free**: every finding and candidate is produced by deterministic code, so the
  CLI exit code and the CI gate are reproducible. Any LLM-assisted tier lives strictly outside.
- This is an **engine-posture** decision (what the engine does *to* a document and what it deliberately
  does *not* do), kept separate from how the engine is layered and packaged ([[D-0006-packaging]]).

^summary

## Context

The engine's determinism is what the CLI exit code and the CI gate rest on, and its read-only posture
is what makes it safe to point at a corpus a team is actively editing. These are non-goals as much as
goals — what the engine refuses to do is load-bearing. Read-only and fidelity are two sides of one coin:
the engine keeps everything (the raw mdast is retained, not discarded) precisely so it never has to
rewrite anything. This posture was first recorded inside the packaging ADR's fidelity section, but it is
a scope decision in its own right — orthogonal to layering and packaging — so it lives here, and
[[D-0006-packaging]] keeps only how the engine is shipped.

## Decision

- **Read-only.** `parse → validate → read` never writes back: no mutation, no reformatting, no in-place
  normalization. The source bytes a consumer hands in are returned untouched.
- **Fidelity (F1).** The raw mdast is **retained and exposed** as `tree.mdast`, not discarded after
  projection. It is the round-trip-fidelity layer and the escape hatch for analysing constructs the
  projection does not model — read, never rewrite.
- **Repair is a separate pass.** Normalization / auto-fix is explicitly downstream and out of this
  engine's scope. A `Finding` may carry a candidate `fix?`, but the engine only *describes* it; an
  applier — a different tool or pass — decides whether to act.
- **LLM-free.** Findings and candidate fixes are emitted by deterministic code only. No model call sits
  on the validation path. A future LLM-assisted tier, if any, wraps the engine from outside and never
  becomes a dependency of a finding.

## Why

- **Determinism is the contract.** A validator the CLI exit code and CI gate depend on must give the
  same answer for the same bytes every run; an LLM on the path would forfeit that.
- **Safe on a live corpus.** Read-only means pointing the engine at docs a team is editing can never
  corrupt them — the worst case is a wrong finding, never a damaged file.
- **Retain, don't rewrite.** Exposing `tree.mdast` keeps a fidelity / analysis escape hatch without ever
  mutating the source; fidelity and read-only reinforce each other rather than competing.
- **Separation of concerns.** *Describing* a document (validation) and *changing* it (repair) are
  different jobs with different risk profiles; binding them together would couple a safe read to a
  dangerous write.

## Consequences

- The CLI and CI gate are reproducible from the source bytes alone.
- A repair / normalization track, if pursued, is a separate pass that *consumes* findings — it does not
  live in the engine, and this ADR is where that boundary is set.
- `tree.mdast` being retained lets in-process consumers analyse unmodelled constructs without a re-parse.
- An LLM tier, if any, stays outside the engine; the engine never takes a model dependency.

## References

- [[D-0006-packaging]] — how the engine is layered and shipped (the packaging half this decision was
  separated from).
- [[C-0001-contract-validation]] — the validation capability this posture governs.
- [[C-0004-dialect-aware-projection]] — the projection that produces (and retains) the `tree.mdast`.
- [[PR-0001-markdown-contract]] — the library product.
- [[PR-0002-markdown-contract-cli]] — the CLI product.
- `provenance/d0014/questions/F1-read-and-value.md` — `tree.mdast` retention / read doors.
