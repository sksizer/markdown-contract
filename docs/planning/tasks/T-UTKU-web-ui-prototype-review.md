---
type: task
schema_version: '5'
id: T-UTKU
status: in-progress
created: '2026-06-30'
related:
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
- '[[T-6RFC-web-ui-vault-dashboard]]'
- '[[T-4CUI-web-ui-vault-detail-findings]]'
- '[[T-5QJV-web-ui-vault-registry]]'
- '[[T-HHLC-web-ui-drift-view]]'
- '[[T-0P0U-web-ui-live-status-sse]]'
tags:
- web-ui
- prototype
- review
need_human_review: false
impact: high
complexity: small
autonomy: supervised
readiness_verified_at: '2026-07-01T05:08:08Z'
last_reviewed: '2026-07-01'
---
# Prototype review & decide-after gate

## Goal

The **decide-after gate** for M-0009 (the "prototype-first, decide after" call).
Review the assembled prototype and its Storybook variants for IA/UX, pick the
winning variant per surface, capture gaps, and **decide whether M-0009 extends to
wire the real daemon or a follow-up milestone does**. This is the milestone's exit
decision.

## Today

| Location | Role today |
|---|---|
| `prototype/web-ui/` | the assembled prototype + Storybook variants from the surface tasks, ready to review |
| `docs/planning/milestones/M-0009-local-web-ui-vault-dashboard.md` | the milestone this review's verdict feeds back into |

## Proposed

A written review recording: the **chosen variant per component/screen**, an IA
verdict across the full flow (dashboard → vault → contract → finding; drift;
registry; live updates), a **gap list** (including deferred surfaces — history /
trends, settings), and a **go/no-go recommendation** on extending M-0009 to
daemon-wiring vs opening a follow-up "make it real" milestone — noting what the
stable JSON API ([[T-D7X1-web-ui-mock-api-shapes]]) must expose for that.

## Approach

1. Walk every surface's Storybook variants; select the winning variant per component/screen.
2. Assess the IA/navigation end to end across all surfaces.
3. Capture gaps and unaddressed surfaces (history/trends, settings).
4. Record the decide-after recommendation (extend M-0009 vs new milestone) and the API-seam implications; link it from M-0009.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/planning/milestones/M-0009-local-web-ui-vault-dashboard.md` | modify | record the review verdict + decide-after recommendation |
| `prototype/web-ui/REVIEW.md` | new | chosen variants, IA verdict, gap list |

## Acceptance criteria

- [ ] AC-1: A review doc records the chosen variant per surface and an IA verdict.
- [ ] AC-2: A gap list exists, including deferred surfaces (history / trends, settings).
- [ ] AC-3: A go/no-go recommendation on M-0009 scope extension is recorded and linked from the milestone.

## Out of scope

- Implementing the chosen direction; building the daemon / wiring the real runner.

## Dependencies

- All five surface tasks: [[T-6RFC-web-ui-vault-dashboard]], [[T-4CUI-web-ui-vault-detail-findings]], [[T-5QJV-web-ui-vault-registry]], [[T-HHLC-web-ui-drift-view]], [[T-0P0U-web-ui-live-status-sse]] (which in turn build on the foundation tasks).

## Discovery context

- Created in the M-0009 planning session (2026-06-30); this gate realizes the "prototype-first, decide after" scope choice for the milestone.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-01. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — authored `prototype/web-ui/REVIEW.md` §1 (chosen-variant
  table + per-surface rationale) and §2 (end-to-end IA verdict); presence
  grep-verified. The variant judgments themselves are deferred-user.
- AC-2: agent-manual — `REVIEW.md` §3 gap list with an explicit "Deferred
  surfaces" subsection naming history/trends and settings, plus not-wired,
  API-seam, and tech-debt gaps.
- AC-3: agent-manual — `REVIEW.md` §5 go/no-go recommendation + the M-0009
  "Review verdict (decide-after gate)" section linking `REVIEW.md` and recording
  the recommendation; the review-gate success-criterion box is checked. The
  go/no-go decision is deferred-user to ratify.

### What worked

- Three parallel `Explore` agents mapped the 18-story-file / 78-variant
  prototype concretely and fast, which made the variant selection well-grounded
  rather than impressionistic.
- The baseline-gated quality gate cleanly subtracted the pre-existing typecheck
  drift, so the doc-only change gated green (`OK 3/3`) without manual triage.
- The prototype's own decoupling and explicit disclaimers (README "Boundary",
  the `types/api.ts` seam header mirroring D-0012 §D3) made the API-seam
  requirements straightforward to state.

### Friction and automation gaps

All friction hit this run was **already tracked** — no new follow-up docs were
spawned (honoring the consolidation directive to avoid PR-queue sprawl):

- Step 7's quality gate defaulted `--baseline-dir` to the worktree's
  `.sdlc/quality-baselines/` while Step 3a captured the baseline into the main
  repo's — the gate aborted "baseline not found" until `--baseline-dir
  <main-repo>/.sdlc/quality-baselines` was passed manually. Already captured as
  [[B-HVL1-worktree-quality-baseline-dir-resolution]].
- Step 3b's permissions probe reported false-positive gaps
  (`bun`/`npm`/`Write`/`Edit`) despite all four working in this harness. Already
  captured as [[B-PFPB-permissions-probe-false-positive]].
- The review reconfirms the two-data-model tech debt (retire the `VaultSummary`
  generation: `VaultDashboard`/`VaultStatusCard`/`RunSummary`/`FindingsList`),
  already captured as [[B-8ZKX-retire-legacy-vaultdashboard-component]].
- Pre-existing root `npm run typecheck` failure (`tests/yaml-parity.test.ts`
  `context.annotate` TS2339 ×2) is owned by in-flight
  [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]]; the baseline correctly
  subtracted it, so it never gated this doc-only change.
