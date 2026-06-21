---
type: decision
schema_version: '1'
id: D-0007
status: open/accepted
title: Engine scope — read-only, repair-free, and LLM-free
created: '2026-06-21'
related:
  - '[[C-0001-contract-validation]]'
  - '[[D-0006-fidelity-and-packaging]]'
  - '[[PR-0001-markdown-contract]]'
  - '[[PR-0002-markdown-contract-cli]]'
tags:
  - architecture
  - scope
  - determinism
need_human_review: true
---
# Engine scope — read-only, repair-free, and LLM-free

## Summary

- The engine is **read-only**: it inspects a document and never mutates or normalizes it. Parse in,
  findings (and a typed model) out — the source bytes are untouched.
- **Repair and normalization are out of scope** — a distinct downstream pass, not the validator's job.
  A finding MAY carry a candidate `fix?`, but applying it is a consumer's choice, not the engine's.
- The engine is **LLM-free**: every finding and candidate is produced by deterministic code, so the
  CLI exit code and the CI gate are reproducible. Any LLM-assisted tier lives strictly outside.
- This is an **engine-posture** decision (what the engine deliberately does *not* do), kept separate
  from how the engine is layered and packaged ([[D-0006-fidelity-and-packaging]]).

^summary

## Context

The engine's determinism is what the CLI exit code and the CI gate rest on, and its read-only posture
is what makes it safe to point at a corpus a team is actively editing. These are non-goals as much as
goals — what the engine refuses to do is load-bearing. They were first recorded inside
[[D-0006-fidelity-and-packaging]]'s fidelity section, but they are a scope/posture decision in their
own right — orthogonal to layering and packaging — so they are lifted here. D-0006 keeps only the
`tree.mdast` retention (fidelity) that is genuinely tied to the mdast layer.

## Decision

- **Read-only.** `parse → validate → read` never writes back: no mutation, no reformatting, no in-place
  normalization. The raw mdast is retained and exposed (`tree.mdast`, see
  [[D-0006-fidelity-and-packaging]]) for analysis, not for rewriting.
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
- **Separation of concerns.** *Describing* a document (validation) and *changing* it (repair) are
  different jobs with different risk profiles; binding them together would couple a safe read to a
  dangerous write.

## Consequences

- The CLI and CI gate are reproducible from the source bytes alone.
- A repair / normalization track, if pursued, is a separate pass that *consumes* findings — it does not
  live in the engine, and this ADR is where that boundary is set.
- An LLM tier, if any, stays outside the engine; the engine never takes a model dependency.

## References

- [[D-0006-fidelity-and-packaging]] — layering, packaging, and `tree.mdast` retention (the fidelity
  half this decision was lifted out of).
- [[C-0001-contract-validation]] — the validation capability this posture governs.
- [[PR-0001-markdown-contract]] — the library product.
- [[PR-0002-markdown-contract-cli]] — the CLI product.
- `provenance/d0014/questions/F1-read-and-value.md` — `tree.mdast` retention / read doors.
