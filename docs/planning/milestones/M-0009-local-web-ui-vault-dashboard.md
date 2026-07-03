---
type: milestone
schema_version: '1'
id: M-0009
title: Local web UI & vault dashboard — the bundled daemon surface
status: open/planned
created: '2026-06-28'
related:
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[M-0008-single-exec-distribution]]'
  - '[[T-SPAE-spa-embed-spike]]'
tasks:
  - '[[T-ZLND-web-ui-prototype-app]]'
  - '[[T-D7X1-web-ui-mock-api-shapes]]'
  - '[[T-S5K8-web-ui-status-design-system]]'
  - '[[T-6RFC-web-ui-vault-dashboard]]'
  - '[[T-4CUI-web-ui-vault-detail-findings]]'
  - '[[T-5QJV-web-ui-vault-registry]]'
  - '[[T-HHLC-web-ui-drift-view]]'
  - '[[T-0P0U-web-ui-live-status-sse]]'
  - '[[T-UTKU-web-ui-prototype-review]]'
tags:
  - web-ui
  - dashboard
  - daemon
  - nuxt
  - vue
  - storybook
  - prototype
  - milestone
need_human_review: true
---

# Local web UI & vault dashboard — the bundled daemon surface

## Goal

Hammer out the **entire UI surface** of the local vault dashboard by building a
standalone, mock-data **prototype** in the real Vue/Nuxt stack — with **Storybook
as the harness** for prototyping and comparing multiple variants of every
component and screen — and then decide, behind a review gate, whether the real
daemon-backed UI ships in this milestone or a follow-up. The UI is the hard,
undecided part of [[C-0010-single-binary-and-vault-dashboard]]; this milestone
de-risks it before any daemon/binary wiring.

## Summary

- The local, embedded **web UI / vault dashboard**: in the shipped product a daemon mode that serves a Nuxt SPA (bundled into the same binary) showing the live status of the several managed markdown vaults on a host. Per the capability [[C-0010-single-binary-and-vault-dashboard]] and the web-UI half of [[D-0012-distribution-single-exec-and-web-ui]]. ^summary
- **This milestone is scoped to the UI prototype, not the shipped daemon.** The hard, undecided part of this work is the UI itself, so M-0009 first **prototypes the entire UI surface as a standalone app on mock data**, validates the UX behind a review gate, and *then* decides whether to extend this milestone to wire the real daemon or open a follow-up milestone for it (the **decide-after** gate, [[T-UTKU-web-ui-prototype-review]]).
- **The prototype is a separate app from the single binary.** It is deliberately decoupled from the single-executable / daemon work ([[M-0008-single-exec-distribution]], [[T-SPAE-spa-embed-spike]]): no Nitro, no `runner` wiring, no binary embedding — mock data only. M-0008 ships the CLI-only binary and validates the SPA-embed approach; this milestone owns the UI's shape, which the eventual daemon then hosts.

## Outcome

**Of this milestone:** an interactive, mock-data prototype covering every UI surface of the vault dashboard — built in the real Vue/Nuxt stack, with **Storybook as the harness** for prototyping and comparing multiple variants of each component and screen — plus a written review that picks the winning variants and recommends whether to build the real daemon-backed UI here or in a follow-up.

**Of the eventual feature (gated on the review):** a user runs the binary in daemon mode and opens a local web dashboard that tracks the status of every managed vault/config on the machine — no separate install, the same binary that runs the CLI.

## UI surface inventory

The surfaces the prototype must cover (the "all UI aspects" this milestone hammers out):

**Screens**

- **All-vaults dashboard (home)** — the "are they all green?" view: every registered vault as a status card/row, refresh-all, first-run empty state. → [[T-6RFC-web-ui-vault-dashboard]]
- **Vault detail & findings drill-down** — pass/fail per contract, findings grouped by contract, each finding down to file·line·severity·rule·message. → [[T-4CUI-web-ui-vault-detail-findings]]
- **Register / manage vault** — add (path + config), edit, remove; the daemon reads, never edits docs. → [[T-5QJV-web-ui-vault-registry]]
- **Config drift view** — the `init --check` surface: what inference would change vs the committed config. → [[T-HHLC-web-ui-drift-view]]

**Cross-cutting aspects**

- **Status visual language** — the `green` / `findings` / `drift` / `running` / `error` vocabulary, severity scale, and the shared component kit. The visual spine. → [[T-S5K8-web-ui-status-design-system]]
- **Live-status / SSE UX** — how an update lands, a watching on/off + connection indicator, loading/in-progress and error states. → [[T-0P0U-web-ui-live-status-sse]]
- **The data seam** — the mock JSON payload shapes the UI binds to, mirroring the [[D-0012-distribution-single-exec-and-web-ui]] §D3 API sketch; the proposed stable API the eventual daemon emits. → [[T-D7X1-web-ui-mock-api-shapes]]
- **The app + harness** — the standalone prototype app and the Storybook variant harness everything is built in. → [[T-ZLND-web-ui-prototype-app]]

**Deferred surfaces** (captured, out of the prototype): history / trends (the optional SQLite layer, [[D-0012-distribution-single-exec-and-web-ui]] §D4), and a settings surface (port, open-on-start, watching). The review gate records these as gaps.

## Scope

**In:** a standalone, mock-data **UI prototype** of the full surface inventory above, built in Vue/Nuxt (`ssr: false`); **Storybook** as the prototyping harness with multiple variants per component/screen; the mock payload shapes (the API seam); and a **review/decide-after** gate that selects variants and recommends the post-prototype path.

**Out:** the real daemon / Nitro server / JSON API implementation; `runner` wiring; SSE server + file-watcher; the single-binary embedding (owned by [[M-0008-single-exec-distribution]] / [[T-SPAE-spa-embed-spike]]); persisted history (SQLite); auth / multi-user / remote vaults. The decision on whether to build the daemon-backed UI in this milestone or a new one is itself the output of [[T-UTKU-web-ui-prototype-review]].

## Workstreams

1. **Foundation** — the standalone app + Storybook harness ([[T-ZLND-web-ui-prototype-app]]), the mock payload shapes ([[T-D7X1-web-ui-mock-api-shapes]]), and the status visual language + component kit ([[T-S5K8-web-ui-status-design-system]]).
2. **Surfaces** (parallel, each one UI surface, each shipping multiple Storybook variants) — dashboard ([[T-6RFC-web-ui-vault-dashboard]]), vault detail + findings ([[T-4CUI-web-ui-vault-detail-findings]]), register/manage ([[T-5QJV-web-ui-vault-registry]]), drift ([[T-HHLC-web-ui-drift-view]]), live-status/SSE ([[T-0P0U-web-ui-live-status-sse]]).
3. **Review & decide-after** — pick the winning variants, judge the IA end to end, capture gaps, and recommend extend-vs-new-milestone ([[T-UTKU-web-ui-prototype-review]]).

## Tasks

**Foundation**

- [[T-ZLND-web-ui-prototype-app]] — standalone prototype app + Storybook harness on mock data (decoupled from the binary/daemon).
- [[T-D7X1-web-ui-mock-api-shapes]] — mock vault/findings/drift/SSE payload shapes (the API seam).
- [[T-S5K8-web-ui-status-design-system]] — status visual language + shared component kit.

**Surfaces** (parallel; each one UI surface, each shipping ≥2 Storybook variants)

- [[T-6RFC-web-ui-vault-dashboard]] — all-vaults dashboard (home).
- [[T-4CUI-web-ui-vault-detail-findings]] — vault detail + findings drill-down.
- [[T-5QJV-web-ui-vault-registry]] — register / manage vault flow.
- [[T-HHLC-web-ui-drift-view]] — config drift view (`init --check`).
- [[T-0P0U-web-ui-live-status-sse]] — live-status & SSE UX (watching, loading, errors).

**Review & decide-after**

- [[T-UTKU-web-ui-prototype-review]] — pick winning variants, judge the IA, capture gaps, recommend extend-vs-new-milestone.

## Success criteria

- [ ] A standalone prototype app runs on mock data with **no dependency on the engine (`src/`), the daemon, or the single binary**.
- [ ] **Storybook is the harness**, and every component/screen ships **≥2 named variants** for comparison.
- [ ] Every surface in the inventory above is prototyped (dashboard, vault detail + findings, register/manage, drift, live-status/SSE), across all status states (`green` / `findings` / `drift` / `running` / `error`) and the empty/first-run state.
- [ ] The mock payload shapes match the [[D-0012-distribution-single-exec-and-web-ui]] §D3 route sketch and stand as the proposed stable API seam.
- [x] The review gate records the chosen variant per surface, an IA verdict, a gap list (incl. deferred history/settings surfaces), and a go/no-go recommendation on extending M-0009 — linked back into this milestone. → `apps/daemon-web-prototype/REVIEW.md` ([[T-UTKU-web-ui-prototype-review]]); verdict below.
- [ ] Human review of the prototype direction and the decide-after recommendation.

## Review verdict (decide-after gate)

The decide-after gate ([[T-UTKU-web-ui-prototype-review]]) is complete. The full
review — chosen variant per surface, the end-to-end IA verdict, the gap list
(including the deferred history/trends and settings surfaces), and the API-seam
requirements for a real daemon — lives at **`apps/daemon-web-prototype/REVIEW.md`**.

**Chosen variants:** routed `pages/index.vue` dashboard (Grid default, Table as
a density toggle; the legacy `VaultDashboard` is rejected); vault-detail
grouped-by-contract (flat-severity as a toggle); `VaultForm` inline panel as the
primary registry surface (modal for dashboard quick-add); unified drift
change-list (split as a secondary); `WatchIndicator` with the row-highlight
update-landing cue (silent-flip fallback, toast reserved for error transitions).
The design kit (T-S5K8), foundation (T-ZLND), and `VaultStatus` API seam (T-D7X1)
are adopted wholesale; the older `VaultSummary` component generation is retired.

**IA verdict:** sound and coherent — the prototype validates the UX. The
dashboard → vault-detail spine is a real routed flow; registry, drift-detail,
and live-status are built but Storybook-only (not route-mounted), which is
expected for a harness-first prototype. Biggest structural item: two coexisting
data-model generations (`VaultStatus` vs `VaultSummary`) to unify before
grafting forward.

**Go/no-go:** **GO on building the real daemon-backed UI, but in a NEW follow-up
milestone — do NOT extend M-0009.** M-0009 is cleanly scoped to
prototype + decide-after; the daemon / Nitro JSON API / `runner` wiring / SSE
server + file-watcher / single-binary embedding are large, distinct workstreams
that depend on the single-exec track ([[M-0008-single-exec-distribution]] /
[[T-SPAE-spa-embed-spike]]). Recommend closing M-0009 at the prototype boundary
(after the human-review success criterion) and opening a
**"daemon-backed vault dashboard (make it real)"** milestone, seeded with this
review's chosen variants and gap list. The API seam must additionally expose
`PUT`/`DELETE /api/vaults/:id` (registry edit/remove) and explicit contract
identity on findings before the registry and detail surfaces are real. See
`apps/daemon-web-prototype/REVIEW.md` §5.

## Risks / open questions

- **Extend or split?** ✓ Answered by [[T-UTKU-web-ui-prototype-review]] (see the review verdict above): build the real daemon-backed UI in a **new follow-up milestone**, not by extending M-0009.
- **Nuxt-Storybook integration depth** — the prototype commits to Vue/Nuxt + Storybook; the exact integration module and whether a thin app shell sits alongside the harness is settled in [[T-ZLND-web-ui-prototype-app]].
- **Component portability** — keeping prototype components close enough to the eventual `apps/web` conventions that they graft forward (per [[D-0012-distribution-single-exec-and-web-ui]]) rather than being pure throwaway.

## References

- [[C-0010-single-binary-and-vault-dashboard]] — the capability (the managed-vault dashboard).
- [[D-0012-distribution-single-exec-and-web-ui]] — the decision fixing the runtime, UI shape (Nuxt SPA `ssr:false` + Nitro JSON API), the §D3 API sketch, and the §D4 three-layer vault-tracking model.
- [[M-0008-single-exec-distribution]] / [[T-SPAE-spa-embed-spike]] — the single binary and the SPA-embed spike the eventual daemon reuses; deliberately separate from this prototype.
