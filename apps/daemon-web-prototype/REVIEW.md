# Web-UI prototype review & decide-after gate

_The M-0009 capstone. Reviews the assembled mock-data prototype under
`apps/daemon-web-prototype/`, picks the winning variant per surface, judges the
information architecture end to end, captures the gap list (including the
deferred history/trends and settings surfaces), and records a go/no-go
recommendation on whether to extend M-0009 to wire the real daemon-backed UI or
open a follow-up milestone._

- **Task:** [[T-UTKU-web-ui-prototype-review]]
- **Milestone:** [[M-0009-local-web-ui-vault-dashboard]]
- **Reviewed:** 2026-07-01
- **What was reviewed:** the merged prototype at `apps/daemon-web-prototype/` — the
  foundation ([[T-ZLND-web-ui-prototype-app]] app + Storybook harness,
  [[T-D7X1-web-ui-mock-api-shapes]] mock API seam,
  [[T-S5K8-web-ui-status-design-system]] design kit) and all five surfaces
  ([[T-6RFC-web-ui-vault-dashboard]], [[T-4CUI-web-ui-vault-detail-findings]],
  [[T-5QJV-web-ui-vault-registry]], [[T-HHLC-web-ui-drift-view]],
  [[T-0P0U-web-ui-live-status-sse]]).

## How to read the prototype

Two things are assembled here, deliberately:

1. **The Storybook harness (`npm run storybook`, port 6006)** is the primary
   review surface. 18 story files ship **78 named variants** — every component
   and screen with ≥2 states, per the milestone's "compare variants at a glance"
   contract. This is where the variant selection below happens.
2. **The routed Nuxt SPA** wires **only two of the five surfaces** — the
   dashboard (`/`, `pages/index.vue`) and the vault-detail screen
   (`/vault/:id`, `pages/vault/[id].vue`). Registry, drift-detail, and
   live-status exist as fully-built components + fixtures + stories but are
   **not mounted in any route** (Storybook-only). This is expected for a
   harness-first prototype, but it shapes the IA verdict and the gap list below.

Everything is mock-data only: no network, no SSE, no daemon, and **no import
edge to the engine (`src/`)** — the engine output shapes are hand-mirrored in
`types/api.ts`. That decoupling is a deliberate, correct constraint and the
prototype holds it cleanly.

## 1. Chosen variant per surface

| Surface | Winner | Story ref | Runner-up / rejected |
|---|---|---|---|
| **Dashboard-home** (T-6RFC) | Routed `pages/index.vue`, **Grid** layout | `Screens/Dashboard › Grid` | `Table` kept as a density toggle; **reject** `Screens/VaultDashboard` (legacy) |
| **Vault-detail** (T-4CUI) | **Grouped-by-contract** | `Screens/VaultDetail › GroupedByContract` | `FlatSeveritySorted` kept as a triage toggle |
| **Vault-registry** (T-5QJV) | `VaultForm` **Inline panel** (primary surface) | `Vaults/VaultForm › InlinePanel` | `Modal` kept for the dashboard quick-add entry point |
| **Drift-view** (T-HHLC) | **Unified** change-list | `Drift/DriftView › Drifted` | `SideBySide` (split) kept as a secondary "scan by category" view |
| **Live-status / SSE** (T-0P0U) | `WatchIndicator` control + **row-highlight** landing cue | `Live/WatchIndicator › LandingRowHighlight` | `LandingSilentFlip` as a low-distraction fallback; `LandingToast` reserved for error-transition escalation only |
| **Design kit** (T-S5K8) | Adopt wholesale | `Kit/*` (StatusBadge, SeverityBadge, ContractGroup, FindingRow, EmptyState, ErrorState, LoadingState) | — |
| **Foundation** (T-ZLND) | Adopt wholesale | Nuxt SPA (`ssr:false`) + `@storybook/vue3-vite` harness | — |
| **Data seam** (T-D7X1) | Adopt `types/api.ts`; standardize on `VaultStatus` | — | **Retire** the `VaultSummary` model |

### Dashboard-home (T-6RFC) → routed `pages/index.vue`, Grid layout

Two competing full-screen dashboards exist. **`pages/index.vue`
(`Screens/Dashboard`) wins decisively** over the legacy
`components/VaultDashboard.vue` (`Screens/VaultDashboard`):

- It models **all five `VaultStatus` states** (green / findings / drift /
  running / error). `VaultDashboard` is built on the older `VaultSummary` model
  and can only derive pass/fail from `exitCode` — it cannot render running,
  error, or drift at all.
- It **links out to `/vault/:id`** (a real IA hop) instead of the legacy
  screen's inline master/detail panel, which is a dead-end pattern that does not
  scale past a handful of vaults.
- It adds the pieces the milestone's "are they all green?" framing needs: the
  status-summary tally line, a **clickable status-filter legend**, and a
  **Refresh-all** affordance.

Within the winner, **Grid is the default**: the color-topped status cards give
the strongest at-a-glance "all green?" read. **Table** is retained as an opt-in
dense view for hosts managing many vaults (`layout: "table"`). Ship Grid;
expose Table as a toggle.

### Vault-detail / findings (T-4CUI) → grouped-by-contract

`GroupedByContract` is the default and the winner: it matches the milestone
spec ("findings grouped by contract, each finding down to
file·line·severity·rule·message") and reads as a pass/fail checklist per
contract. `FlatSeveritySorted` is a genuinely useful second mode for
triage-by-severity, so keep it as a toggle rather than dropping it. The
`Green` (no-findings), `Error` (run-could-not-complete), and unknown-id
not-found states are all handled first-class.

**Caveat (feeds the API-seam gap):** the screen derives "contract" from the
first path-segment of a finding's namespaced rule id (`contractOf()` in
`pages/vault/[id].vue`) because the mock `Finding` shape carries no explicit
contract field. That proxy is fine for the prototype but the real API should
carry a first-class contract/rule-group identity on findings.

### Vault-registry (T-5QJV) → `VaultForm` inline panel (primary), modal for quick-add

`InlinePanel` wins as the **primary registry surface**: an always-open managed
list with the add/edit form below reads best on a dedicated registry route and
keeps add/edit/remove in one place. `Modal` is not rejected — it is the right
affordance for a **contextual quick-add from the dashboard's first-run empty
state** (the "+ Add a vault" button, currently inert). Both have a role.

Two competing list-item card renderers exist (`VaultStatusCard` on
`VaultSummary`, `kit/VaultCard` on `VaultStatus`); neither is used by the
winning dashboard (which uses its own inline `dcard` markup). Consolidate onto a
single `VaultStatus`-based card when grafting forward (see tech debt).

### Drift-view (T-HHLC) → unified change-list

`Drifted` (the `variant: "unified"` ordered list of added/removed/changed
entries with colored group tags) wins over `SideBySide`. Drift here is a set of
discrete `DriftEntry` deltas to reconcile — a checklist of "what `init --check`
would change" — not a two-sided document diff, so the unified list matches the
mental model better. `SideBySide` (three Added/Removed/Changed columns) is a
reasonable secondary for scanning by category and worth keeping. The
"Advisory diagnostics" (`warnings`) block that renders separately from real
drift is a nice touch — keep it. Note both in-sync stories render identically
(the in-sync `EmptyState` panel takes over regardless of `variant`), so there is
only one real presentation choice: unified vs split **when drifted**.

### Live-status / SSE (T-0P0U) → WatchIndicator + row-highlight

Two decisions here:

1. **The control:** adopt `WatchIndicator` as the persistent watching toggle +
   connection dot. Its connection→visual mapping is well-judged: connecting =
   pulsing running-color, open = green "Live" pulse, error = red
   "Disconnected", closed = muted "Stopped", idle = muted "Idle".
2. **How an update lands** (the real variant choice, Group B):
   **`LandingRowHighlight` wins.** It draws the eye to *which* vault changed,
   anchored in place, without stealing focus — the right register for an
   always-on ambient dashboard. `LandingSilentFlip` is too easy to miss on a
   board you are not staring at (keep it as a low-distraction fallback);
   `LandingToast` stacks up and interrupts on frequent background events, so
   reserve toasts for **high-salience transitions (e.g. a vault going to
   error)** rather than every update.

The SSE mock (`mocks/event-stream.ts`) is a clean, swappable seam: a
timer-driven replayer exposing exactly the reactive surface (`watching`,
`connection`, `lastEvent`, `log`, `vaultStates`) a real `EventSource` client
would, so "the one thing swapped" claim holds.

### Design kit (T-S5K8) & foundation (T-ZLND) — adopt wholesale

The status/severity visual language (`design/tokens.ts` as the single source of
truth: green `✓`, findings `!`, drift `≠`, running `◌`, error `✕`; severity
error/warn/report) is coherent and is the spine everything else binds to. Adopt
the kit as-is: `StatusBadge`, `SeverityBadge`, `ContractGroup`, `FindingRow`,
`EmptyState`, `ErrorState` (use `WithDetail` for run failures), `LoadingState`
(role-split: `Inline` in card cells, `Skeleton` on first screen load, `Spinner`
on actions). The dual-surface component pattern (every SFC renders in both Nuxt
and Nuxt-free Storybook via explicit imports + a prop-or-load seam) is what
keeps these components graftable into a real `apps/web`; keep it.

## 2. Information-architecture verdict

**Verdict: the IA is sound and the visual language is coherent — the prototype
achieves its purpose (validate the UX and de-risk the UI). The assembled-app
wiring is intentionally partial, and the path to a fully-wired app is clear.**

Walking the flow the milestone names — _dashboard → vault → contract → finding;
drift; registry; live updates_:

- **dashboard → vault:** wired route hop. Solid.
- **vault → contract → finding:** present as sub-views (grouped-by-contract →
  finding rows with file·line·severity·rule·message). "Contract" is a derived
  proxy, not a first-class entity, and there is no per-contract or per-finding
  deep-link/detail screen. Acceptable now; flagged.
- **drift:** the *state* shows on the dashboard cell and the vault-detail
  header; the *detail* (`DriftView`) is built but not mounted. For the real
  build, render drift detail inline on the vault-detail screen when
  `state === "drift"` (drift is per-vault and belongs on the vault screen),
  reached via a "View drift" action.
- **registry:** `VaultForm` is built but not mounted; the dashboard's
  "+ Add a vault" button is inert. The real build needs a registry route
  (e.g. `/vaults` / `/vaults/new`) plus the modal quick-add wired to that empty
  state.
- **live updates:** `WatchIndicator` + the SSE stream are built but not
  mounted; there is no global watching control and the dashboard's only refresh
  is the manual, synchronous "Refresh all". The real build should put the
  watching control in the layout header and drive per-card updates off the
  stream with the row-highlight cue.

**Navigation shell:** `layouts/default.vue` is a brand band + "mock data" tag
only — no nav menu, no breadcrumbs, no global controls. Fine for a two-screen
prototype; the real app needs a persistent header carrying navigation, a
registry entry point, and the watching indicator. (`kit/AppHeader` — with its
`WithStatusSummary` variant — is the natural basis, but it is currently
story-only and not the layout's header.)

**The single biggest structural issue is two coexisting data-model
generations.** The winning surfaces bind the newer five-state `VaultStatus`
(`types/api.ts`); a parallel older generation binds `VaultSummary`
(`VaultDashboard`, `VaultStatusCard`, `RunSummary`, `FindingsList`,
`kit/VaultCard`). Unify on `VaultStatus` and retire the `VaultSummary`
generation before grafting forward — otherwise the real app inherits two ways
to render the same thing.

## 3. Gap list

### Deferred surfaces (captured, out of the prototype by design)

- **History / trends** — the optional SQLite layer ([[D-0012-distribution-single-exec-and-web-ui]] §D4).
  Entirely absent: no component, page, story, or API shape. Deferred.
- **Settings** — port, open-on-start, watching preferences. Entirely absent: no
  component, page, story, or API shape. Deferred.

### Surfaces built but not wired into the app IA

- Registry (`VaultForm`) not route-mounted; dashboard "+ Add a vault" is inert.
- Drift detail (`DriftView`) not route-mounted; vault-detail shows drift header only.
- Live-status (`WatchIndicator` + SSE stream) not route-mounted; no global
  watching control; refresh is manual/synchronous only.

### API-seam gaps for the real daemon (see §4)

- **No edit route** (`PUT`/`PATCH /api/vaults/:id`). `VaultForm` emits `update`
  but the seam cannot persist it.
- **No delete route** (`DELETE /api/vaults/:id`). `VaultForm` emits `remove` but
  the seam cannot persist it.
- **`Finding` has no explicit contract identity** — vault-detail derives it from
  the rule-id prefix. Real API should carry contract/rule-group identity (or
  group server-side).
- **SSE `error` connection state** is only prop-injectable in stories; the mock
  replayer's `stop()` only sets `closed`. The real `EventSource` client owns the
  `onerror → "error"` mapping. (Contract is fine; noted so it isn't lost.)
- No history/trends or settings shapes in the seam (tracks the deferred surfaces).

### Tech debt / consolidation before grafting forward

- **Unify the two data models** — standardize on `VaultStatus`; retire
  `VaultSummary` and its components (`VaultDashboard`, `VaultStatusCard`,
  `RunSummary`, `FindingsList`).
- **Consolidate the two card renderers** (inline `dcard` in `pages/index.vue`
  vs `kit/VaultCard`) onto one `VaultStatus`-based kit card.
- **Adopt `kit/AppHeader` as the real layout header** (nav + status summary +
  watching indicator) rather than the layout's bespoke brand band.
- **Doc drift:** `README.md`'s "Layout" section is stale (omits `kit/`,
  `DriftView`, `WatchIndicator`, `VaultForm`, `types/`, `design/`, and both
  pages); `CONVENTIONS.md`'s stated story glob omits the `pages/**` glob that
  `.storybook/main.ts` actually adds. Fix on graft.

### Minor UX gaps

- No loading state for vault-detail or registry (only the dashboard running-cell
  uses `LoadingState`); real fetches need a skeleton/spinner on initial load.
- No large-registry consideration (pagination/virtualization); the Table layout
  helps but the case is unaddressed.
- Accessibility is off to a good start (status carries icon glyph + text label,
  not color alone; the toast is `aria-live="polite"`); a broader a11y pass is
  deferred.

## 4. What the stable JSON API must expose (the seam for a real daemon)

`types/api.ts` is the proposed stable API seam and mirrors the
[[D-0012-distribution-single-exec-and-web-ui]] §D3 route sketch. It is
well-shaped and should be adopted as-is for the routes it covers. To back the
**full** reviewed UI (chosen variants + wired surfaces), the real daemon must
expose:

**Already specified (adopt unchanged):**

- `GET  /api/vaults` → `VaultListResponse` (registry + each vault's last status)
- `GET  /api/vaults/:id` → `VaultDetailResponse`
- `POST /api/vaults` → `RegisterVaultResponse` (register a path + config)
- `POST /api/vaults/:id/validate` → `ValidateResponse` (run → findings)
- `GET  /api/vaults/:id/check` → `CheckResponse` (drift, via `init --check`)
- `GET  /api/events` → `SseEvent` stream (SSE; monotonic `id` for
  `Last-Event-ID` resumption; discriminated on `type`:
  status / validated / drift / error)

built on the engine-mirrored `Finding` / `RunResult` / `RunStats` /
`DriftResult` / `VaultStatus` shapes.

**Must be added before the registry surface is real:**

- `PUT`/`PATCH /api/vaults/:id` — edit a registered vault (name / path / config).
- `DELETE /api/vaults/:id` — remove a registered vault.

**Should be tightened:**

- Give `Finding` an explicit contract/rule-group association (or have the API
  group findings by contract) so the vault-detail grouping stops relying on the
  rule-id-prefix proxy.

**Deferred (only when the deferred surfaces are picked up):** history/trends
query shapes (the §D4 SQLite layer) and a settings read/write shape.

## 5. Go / no-go recommendation

**GO on building the real daemon-backed UI — but in a NEW follow-up milestone,
NOT by extending M-0009.**

The prototype did its job: it de-risked the hard, undecided part of
[[C-0010-single-binary-and-vault-dashboard]], produced a coherent visual
language and a validated surface set, and pinned a concrete, well-shaped API
seam. The UX is worth building for real — that is the "go."

But it should **not** extend M-0009:

- **Scope integrity.** M-0009 is explicitly and cleanly scoped to
  "prototype + decide-after," with the daemon / Nitro server / real JSON API /
  `runner` wiring / SSE server + file-watcher / single-binary embedding all
  listed *out of scope*. Those are large, distinct workstreams; folding them in
  would balloon a milestone that has otherwise met its goal.
- **Hard dependency on the single-exec track.** The real UI is an `apps/web`
  hosted by the daemon inside the single binary — it depends on
  [[M-0008-single-exec-distribution]] / [[T-SPAE-spa-embed-spike]] (the
  SPA-embed approach) landing or at least being settled first. That track is
  deliberately separate from this prototype.
- **A follow-up milestone can sequence the work properly**, seeded directly by
  this review:
  1. Consolidate onto the `VaultStatus` model; retire the `VaultSummary`
     generation.
  2. Wire the three stubbed surfaces into routes + a global watching control
     (registry route, inline drift detail, header watch indicator).
  3. Extend the API seam: `PUT`/`DELETE /api/vaults/:id`, explicit contract
     identity on findings.
  4. Implement the real Nitro JSON API over `runCorpus` / `inferConfig`.
  5. Implement the SSE server + file-watcher.
  6. Graft into `apps/web` and embed per M-0008.

Keeping the two milestones separate preserves the mock-only / no-engine-import
decoupling the prototype established, and lets this review's chosen variants and
gap list become the opening scope of the follow-up.

**Milestone verdict:** M-0009's prototype phase is complete and successful.
Recommend closing M-0009 at the prototype boundary (after the human review the
milestone's success criteria call for) and opening a new
**"daemon-backed vault dashboard (make it real)"** milestone, seeded with the
selections and gaps above and sequenced after / alongside M-0008's single-exec
embed.

## Appendix — variant inventory reviewed

18 story files, 78 named variants. Winners in **bold**.

- `Screens/Dashboard` (`pages/index.vue`): **Grid**, Table, AllGreen, Empty, Running, WithError
- `Screens/VaultDashboard` (legacy — reject): AllPassing, Mixed, Failing, Empty
- `Screens/VaultDetail` (`pages/vault/[id].vue`): **GroupedByContract**, FlatSeveritySorted, Green, Error, Drift
- `Drift/DriftView`: **Drifted (unified)**, SideBySide, InSync, SideBySideInSync
- `Vaults/VaultForm`: **InlinePanel**, Modal, EmptyRegistry, MissingPathError, InvalidConfigError
- `Live/WatchIndicator`: Idle, Connecting, Watching, Disconnected, Paused, Gallery, LandingSilentFlip, LandingToast, **LandingRowHighlight**
- `Vaults/VaultStatusCard` (legacy): Passing, Warnings, Failing
- `Runs/RunSummary` (legacy): Clean, Failing
- `Findings/FindingsList` (legacy): Empty, Populated, ErrorsOnly
- `Kit/StatusBadge`: Green, Findings, Drift, Running, Error, Gallery
- `Kit/SeverityBadge`: Error, Warn, Report, Scale
- `Kit/ContractGroup`: Passing, Warnings, Failing, Mixed
- `Kit/FindingRow`: Error, Warn, Report, WithFix, WholeDocument
- `Kit/EmptyState`: NoVaults, NoFindings, NoResults
- `Kit/ErrorState`: Generic, WithDetail, Compact
- `Kit/LoadingState`: Spinner, Skeleton, Inline
- `Kit/VaultCard`: Green, Findings, Drift, Running, Error, Selected
- `Kit/AppHeader`: Default, WithStatusSummary, Plain
