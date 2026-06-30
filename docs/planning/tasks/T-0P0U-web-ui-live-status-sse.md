---
type: task
schema_version: '5'
id: T-0P0U
status: planning/draft
created: '2026-06-30'
related:
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
- '[[T-ZLND-web-ui-prototype-app]]'
- '[[T-D7X1-web-ui-mock-api-shapes]]'
- '[[T-S5K8-web-ui-status-design-system]]'
tags:
- web-ui
- prototype
- sse
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
---
# Prototype: live-status & SSE UX (watching, loading, errors)

## Goal

Prototype the **live-status UX** — how a status change lands (badge flip / subtle
re-render / toast), a watching on/off + connection indicator, and the
loading/in-progress and error states — driven by a **mock** event stream. No real
SSE server, watcher, or daemon. Multiple "how an update surfaces" variants live
in Storybook.

## Today

| Location | Role today |
|---|---|
| `prototype/web-ui/mocks/` | the mock SSE event sequence ([[T-D7X1-web-ui-mock-api-shapes]]) this driver replays |
| `prototype/web-ui/pages/index.vue` | the dashboard ([[T-6RFC-web-ui-vault-dashboard]]) whose cards re-render on events |

## Proposed

A mock event-stream driver replaying the mock SSE sequence on a timer; a watching
toggle + connection indicator; validation-running and error treatments; and the
update-landing affordance. **≥2 variants** in Storybook of how an update surfaces
(silent badge flip vs toast vs row highlight). Feeds the dashboard
([[T-6RFC-web-ui-vault-dashboard]]) and detail ([[T-4CUI-web-ui-vault-detail-findings]]).

## Approach

1. Build a mock SSE/event-stream driver that replays the mock event sequence on a timer.
2. Wire the dashboard/detail to re-render on events; build the watching toggle + connection indicator.
3. Build running (in-progress) and error treatments.
4. Author variants: how an update lands — silent badge flip vs toast vs row highlight.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/mocks/event-stream.ts` | new | timer-driven mock event replayer |
| `prototype/web-ui/components/WatchIndicator.vue` | new | watching toggle + connection state |
| `prototype/web-ui/components/WatchIndicator.stories.ts` | new | update-landing variants |

## Acceptance criteria

- [ ] AC-1: A mock event stream drives visible status changes on the dashboard.
- [ ] AC-2: A watching on/off + connection indicator render; running and error states render.
- [ ] AC-3: **≥2 update-landing variants** exist as Storybook stories.

## Out of scope

- A real SSE server / file-watcher / daemon; reconnection/backoff logic; persistence.

## Dependencies

- [[T-ZLND-web-ui-prototype-app]], [[T-D7X1-web-ui-mock-api-shapes]], [[T-S5K8-web-ui-status-design-system]]. Drives [[T-6RFC-web-ui-vault-dashboard]] and [[T-4CUI-web-ui-vault-detail-findings]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); live in-memory status pushed over SSE is the D4 "live status" layer of [[D-0012-distribution-single-exec-and-web-ui]].
