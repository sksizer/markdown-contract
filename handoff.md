# Handoff — Extract engineering conventions into a human-facing CONVENTIONS.md

_Task: `T-NCC9-conventions-md-extraction`. PR: <https://github.com/sksizer/markdown-contract/pull/236>._

## Summary

Extracted the three engineering-convention sections from CLAUDE.md into a new human-facing CONVENTIONS.md (moved verbatim); CLAUDE.md now imports it via @CONVENTIONS.md and keeps only the agent-facing authorship rules; README links CONVENTIONS.md from the Library health baseline section.

## Files changed

| Path | Role |
|---|---|
| `CLAUDE.md` | M |
| `CONVENTIONS.md` | A |
| `README.md` | M |
| `docs/planning/tasks/T-NCC9-conventions-md-extraction.md` | M |

## Quality checks

OK 6/6 (baseline-gated; no new drift)

## PR

https://github.com/sksizer/markdown-contract/pull/236

## Spawned follow-ups

- `assert-claude-md-import-resolves`
- `T-44OO-plugin-scripts-self-discover-project-root`
