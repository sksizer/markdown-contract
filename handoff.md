# Handoff — Prototype: live-status & SSE UX (watching, loading, errors)

_Task: `T-0P0U-web-ui-live-status-sse`. PR: <https://github.com/sksizer/markdown-contract/pull/122>._

## Summary

Mock SSE event-stream driver (mocks/event-stream.ts) + WatchIndicator.vue watching-toggle/connection indicator + stories with 3 update-landing variants (silent flip, toast, row highlight); prototype vue-tsc and root quality both green.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-0P0U-web-ui-live-status-sse.md` | M |
| `prototype/web-ui/components/WatchIndicator.stories.ts` | A |
| `prototype/web-ui/components/WatchIndicator.vue` | A |
| `prototype/web-ui/mocks/event-stream.ts` | A |

## Quality checks

OK 2/2 (baseline-gated)

## PR

https://github.com/sksizer/markdown-contract/pull/122

## Spawned follow-ups

- `reconcile-ensure-ready-pass-path-flags`
