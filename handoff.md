# Handoff — Note the lefthook pre-push manual-run caveat (needs --all-files without unpushed commits)

_Task: `T-TH8U-document-lefthook-prepush-run-caveat`. PR: <https://github.com/sksizer/markdown-contract/pull/238>._

## Summary

Documented the lefthook pre-push manual-run caveat in lefthook.yml (pre-push comment block) and README.md (Git hooks bullet): bunx lefthook run pre-push skips its gates on a branch with no unpushed commits and needs --all-files (or a real git push) to exercise by hand.

## Files changed

| Path | Role |
|---|---|
| `README.md` | M |
| `docs/planning/tasks/T-TH8U-document-lefthook-prepush-run-caveat.md` | M |
| `lefthook.yml` | M |

## Quality checks

OK 6/6

## PR

https://github.com/sksizer/markdown-contract/pull/238

## Spawned follow-ups

- `T-F1WJ-quality-run-resolves-superproject-baseline`
