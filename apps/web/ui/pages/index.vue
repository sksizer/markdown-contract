<script setup lang="ts">
/**
 * Dashboard — the all-vaults "are they all green?" home view (T-6RFC).
 *
 * Every registered vault as a status card (grid) or row (table) with its
 * at-a-glance state, a status-summary tally, a clickable status filter, a
 * refresh-all affordance, and a first-run empty state. Each card/row links
 * through to the per-vault detail screen.
 *
 * LIVE-WIRED (was: the mockApi seam): the list loads from the daemon's
 * `GET /api/vaults`, and `GET /api/events` (SSE) folds status changes into the
 * rows as they happen — a run finishing, a watch-triggered re-validation, a
 * vault erroring — without a refresh.
 */
import { computed, onMounted, ref, watch } from "vue";
import { countByLevel } from "~/lib/findings";
import { SEVERITY_ORDER, STATUS_ORDER, statusTokens, type StatusToken } from "~/design/tokens";
import type { FindingLevel, SseEvent, VaultStatus, VaultStatusState } from "~/types";
import { apiErrorMessage, useApi, useApiBase } from "~/composables/useApi";
import { createEventStream, stateFromEvent } from "~/composables/useEventStream";
import WatchIndicator from "~/components/WatchIndicator.vue";
import EmptyState from "~/components/kit/EmptyState.vue";
import ErrorState from "~/components/kit/ErrorState.vue";
import LoadingState from "~/components/kit/LoadingState.vue";
import SeverityBadge from "~/components/kit/SeverityBadge.vue";
import StatusBadge from "~/components/kit/StatusBadge.vue";

const props = defineProps<{
  layout?: "grid" | "table";
}>();

// ── the live data seam ───────────────────────────────────────────────────────────
const api = useApi();
const vaults = ref<VaultStatus[]>([]);
const loading = ref(true);
const loadError = ref("");

async function loadVaults(): Promise<void> {
  try {
    vaults.value = (await api.listVaults()).vaults;
    loadError.value = "";
  } catch (err) {
    loadError.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

/** The refresh-all affordance — re-pull the registry snapshot from the daemon. */
function refreshAll(): void {
  void loadVaults();
}

// ── live updates over SSE ────────────────────────────────────────────────────────
const stream = createEventStream(useApiBase());
const { watching, connection, eventCount } = stream;

function toggleStream(): void {
  if (watching.value) stream.stop();
  else stream.start();
}

/** Fold one SSE event into the row it concerns (fresh object, per-state optionals resolved). */
function applyEvent(row: VaultStatus, event: SseEvent): VaultStatus {
  switch (event.type) {
    case "status":
      return { ...row, state: event.state, updatedAt: event.at };
    case "validated": {
      const { error: _err, ...rest } = row;
      return { ...rest, state: stateFromEvent(event), result: event.result, updatedAt: event.at };
    }
    case "drift":
      return { ...row, state: stateFromEvent(event), drift: event.drift, updatedAt: event.at };
    case "error": {
      const { result: _res, ...rest } = row;
      return { ...rest, state: "error", error: { message: event.message }, updatedAt: event.at };
    }
  }
}

watch(
  () => stream.lastEvent.value,
  (event) => {
    if (!event) return;
    // An event about a vault we don't know = the registry changed elsewhere — re-pull.
    if (!vaults.value.some((v) => v.id === event.vaultId)) {
      void loadVaults();
      return;
    }
    vaults.value = vaults.value.map((v) => (v.id === event.vaultId ? applyEvent(v, event) : v));
  },
);

onMounted(() => {
  void loadVaults();
  stream.start();
});

const layout = computed<"grid" | "table">(() => props.layout ?? "grid");

// ── status filter (clickable legend chips) ───────────────────────────────────────
type Filter = VaultStatusState | "all";
const filter = ref<Filter>("all");

/** Toggle a status chip: click an active chip again to clear back to "all". */
function toggleFilter(state: VaultStatusState): void {
  filter.value = filter.value === state ? "all" : state;
}

// ── view-model: resolve every per-state optional in TS-land (no optional access in the template) ──
interface VaultView {
  vault: VaultStatus;
  token: StatusToken;
  /** only the severity levels actually present, with their counts */
  levels: Array<{ level: FindingLevel; count: number }>;
  hasFindings: boolean;
  driftCount: number;
  errorMessage: string;
  updated: string;
}

/**
 * Deterministic timestamp render (never locale-dependent): an ISO string
 * "2026-06-30T12:00:00.000Z" → "2026-06-30 12:00 UTC".
 */
function formatUpdated(iso: string): string {
  return iso.length >= 16 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : iso;
}

function toView(vault: VaultStatus): VaultView {
  const counts = vault.result
    ? countByLevel(vault.result.findings)
    : { error: 0, warn: 0, report: 0 };
  const levels = SEVERITY_ORDER.filter((level) => counts[level] > 0).map((level) => ({
    level,
    count: counts[level],
  }));
  return {
    vault,
    token: statusTokens[vault.state],
    levels,
    hasFindings: (vault.result?.findings.length ?? 0) > 0,
    driftCount: vault.drift?.entries.length ?? 0,
    errorMessage: vault.error?.message ?? "",
    updated: formatUpdated(vault.updatedAt),
  };
}

const views = computed<VaultView[]>(() => vaults.value.map(toView));
const visibleViews = computed<VaultView[]>(() =>
  filter.value === "all" ? views.value : views.value.filter((v) => v.vault.state === filter.value),
);

// ── the "are they all green?" tally ───────────────────────────────────────────────
const total = computed(() => vaults.value.length);

const stateCounts = computed<Record<VaultStatusState, number>>(() => {
  const acc: Record<VaultStatusState, number> = {
    green: 0,
    findings: 0,
    drift: 0,
    running: 0,
    error: 0,
  };
  for (const v of vaults.value) acc[v.state] += 1;
  return acc;
});

const allGreen = computed(() => total.value > 0 && stateCounts.value.green === total.value);

/** The status summary line shown under the title — the at-a-glance tally. */
const summaryLine = computed(() => {
  if (total.value === 0) return "No vaults registered yet.";
  const noun = total.value === 1 ? "vault" : "vaults";
  if (allGreen.value) return `${total.value} ${noun} — all green ✓`;
  const parts = STATUS_ORDER.filter((s) => stateCounts.value[s] > 0).map(
    (s) => `${stateCounts.value[s]} ${statusTokens[s].label.toLowerCase()}`,
  );
  return `${total.value} ${noun} — ${parts.join(", ")}`;
});
</script>

<template>
  <section class="db">
    <header class="db__bar">
      <div class="db__heading">
        <h1 class="db__title">Vaults</h1>
        <p class="db__summary" :class="{ 'db__summary--green': allGreen }">{{ summaryLine }}</p>
      </div>
      <div class="db__actions">
        <WatchIndicator
          :watching="watching"
          :connection="connection"
          :event-count="eventCount"
          size="sm"
          @toggle="toggleStream"
        />
        <a class="db__add" href="/register">+ Add vault</a>
        <button class="db__refresh" type="button" @click="refreshAll">
          <span aria-hidden="true">↻</span> Refresh all
        </button>
      </div>
    </header>

    <!-- daemon unreachable / first load -->
    <ErrorState
      v-if="loadError"
      title="Daemon unreachable"
      :message="loadError"
    />
    <LoadingState v-else-if="loading" label="Loading vaults…" />

    <!-- status legend / filter — also the per-state tally -->
    <nav v-if="total > 0" class="db__legend" aria-label="Filter by status">
      <button
        type="button"
        class="db__chip"
        :class="{ 'db__chip--active': filter === 'all' }"
        @click="filter = 'all'"
      >
        All <span class="db__chip-count">{{ total }}</span>
      </button>
      <button
        v-for="state in STATUS_ORDER"
        :key="state"
        type="button"
        class="db__chip"
        :class="{ 'db__chip--active': filter === state }"
        :style="filter === state ? { color: statusTokens[state].color, background: statusTokens[state].bg } : {}"
        @click="toggleFilter(state)"
      >
        {{ statusTokens[state].label }} <span class="db__chip-count">{{ stateCounts[state] }}</span>
      </button>
    </nav>

    <!-- first-run empty state -->
    <EmptyState
      v-if="!loading && !loadError && total === 0"
      icon="∅"
      title="No vaults registered"
      message="Register a markdown tree and its contract to start tracking its status here."
    >
      <a class="db__add" href="/register">+ Add a vault</a>
    </EmptyState>

    <!-- grid layout: a status card per vault -->
    <div v-else-if="layout === 'grid'" class="db__grid">
      <a
        v-for="view in visibleViews"
        :key="view.vault.id"
        class="dcard"
        :href="`/vault/${view.vault.id}`"
        :style="{ borderTopColor: view.token.color }"
      >
        <header class="dcard__head">
          <div class="dcard__id">
            <h3 class="dcard__name">{{ view.vault.name }}</h3>
            <code class="dcard__path">{{ view.vault.path }}</code>
          </div>
          <StatusBadge :status="view.vault.state" />
        </header>

        <div class="dcard__body">
          <p v-if="view.vault.state === 'error'" class="dcard__error">{{ view.errorMessage }}</p>
          <LoadingState
            v-else-if="view.vault.state === 'running'"
            variant="inline"
            label="Validating…"
          />
          <p v-else-if="view.vault.state === 'drift'" class="dcard__drift">
            <span class="dcard__drift-count">{{ view.driftCount }}</span>
            drift{{ view.driftCount === 1 ? "" : "s" }} from contract
          </p>
          <div v-else class="dcard__levels">
            <template v-if="view.hasFindings">
              <SeverityBadge
                v-for="lc in view.levels"
                :key="lc.level"
                :level="lc.level"
                :count="lc.count"
              />
            </template>
            <span v-else class="dcard__clean">No findings</span>
          </div>
        </div>

        <footer class="dcard__foot">
          <span class="dcard__updated">{{ view.updated }}</span>
          <span class="dcard__view">View →</span>
        </footer>
      </a>
    </div>

    <!-- table layout: a dense row per vault -->
    <table v-else class="db__table">
      <thead>
        <tr>
          <th scope="col">Vault</th>
          <th scope="col">Status</th>
          <th scope="col">Detail</th>
          <th scope="col">Updated</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="view in visibleViews" :key="view.vault.id" class="db__row">
          <td class="db__cell-name" :style="{ borderLeftColor: view.token.color }">
            <a class="db__row-link" :href="`/vault/${view.vault.id}`">{{ view.vault.name }}</a>
            <code class="db__row-path">{{ view.vault.path }}</code>
          </td>
          <td><StatusBadge :status="view.vault.state" size="sm" /></td>
          <td class="db__cell-detail">
            <span v-if="view.vault.state === 'error'" class="dcard__error">{{ view.errorMessage }}</span>
            <LoadingState
              v-else-if="view.vault.state === 'running'"
              variant="inline"
              label="Validating…"
            />
            <span v-else-if="view.vault.state === 'drift'" class="dcard__drift">
              <span class="dcard__drift-count">{{ view.driftCount }}</span>
              drift{{ view.driftCount === 1 ? "" : "s" }}
            </span>
            <span v-else-if="view.hasFindings" class="db__levels-inline">
              <SeverityBadge
                v-for="lc in view.levels"
                :key="lc.level"
                :level="lc.level"
                :count="lc.count"
              />
            </span>
            <span v-else class="dcard__clean">No findings</span>
          </td>
          <td class="db__cell-updated">{{ view.updated }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.db {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
}
.db__bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.db__title {
  margin: 0;
  font-size: 1.4rem;
}
.db__summary {
  margin: 4px 0 0;
  color: var(--mc-text-muted);
  font-size: 0.9rem;
}
.db__summary--green {
  color: var(--mc-pass);
  font-weight: 600;
}
.db__refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--mc-text);
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  cursor: pointer;
}
.db__refresh:hover {
  border-color: var(--mc-report);
  color: var(--mc-report);
}

/* status legend / filter chips */
.db__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.db__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--mc-text-muted);
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 999px;
  cursor: pointer;
}
.db__chip--active {
  border-color: currentColor;
}
.db__chip-count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.db__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.db__add {
  display: inline-block;
  text-decoration: none;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--mc-report);
  background: var(--mc-report-bg);
  border: 1px solid var(--mc-report);
  border-radius: var(--mc-radius);
  cursor: pointer;
}

/* grid */
.db__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--mc-gap);
}
.dcard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  color: var(--mc-text);
  text-decoration: none;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-top-width: 4px;
  border-radius: var(--mc-radius);
}
.dcard:hover {
  border-color: var(--mc-text-muted);
}
.dcard__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.dcard__name {
  margin: 0;
  font-size: 1.05rem;
}
.dcard__path {
  color: var(--mc-text-muted);
  font-size: 0.82rem;
}
.dcard__body {
  min-height: 28px;
}
.dcard__levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.dcard__clean {
  font-size: 0.82rem;
  color: var(--mc-text-muted);
}
.dcard__error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--mc-error);
}
.dcard__drift {
  margin: 0;
  font-size: 0.85rem;
  color: var(--mc-text-muted);
}
.dcard__drift-count {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--mc-text);
}
.dcard__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  color: var(--mc-text-muted);
}
.dcard__view {
  font-weight: 600;
  color: var(--mc-report);
}

/* table */
.db__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  overflow: hidden;
  font-size: 0.88rem;
}
.db__table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-muted);
  border-bottom: 1px solid var(--mc-border);
}
.db__table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--mc-border);
  vertical-align: middle;
}
.db__row:last-child td {
  border-bottom: none;
}
.db__cell-name {
  border-left: 3px solid transparent;
}
.db__row-link {
  font-weight: 600;
  text-decoration: none;
}
.db__row-link:hover {
  text-decoration: underline;
}
.db__row-path {
  display: block;
  margin-top: 2px;
  color: var(--mc-text-muted);
  font-size: 0.78rem;
}
.db__levels-inline {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}
.db__cell-updated {
  color: var(--mc-text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .db__bar {
    align-items: flex-start;
  }
}
</style>
