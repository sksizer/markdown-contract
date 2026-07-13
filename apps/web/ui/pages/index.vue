<script setup lang="ts">
/**
 * Dashboard — the all-vaults "are they all green?" home view (T-6RFC).
 *
 * Every registered vault as a dense table row (default) or status card (grid),
 * with the at-a-glance tally, a clickable status filter, refresh, and a
 * first-run empty state. Rows link through to the per-vault detail screen.
 *
 * Data comes from the SHARED useVaults store — one fetch, one app-wide SSE
 * stream (the sidebar consumes the same rows); this page opens nothing itself.
 */

import {
  countByLevel,
  EmptyState,
  ErrorState,
  LoadingState,
  SEVERITY_ORDER,
  SeverityBadge,
  STATUS_ORDER,
  StatusBadge,
  statusTokens,
  Toolbar,
} from "@markdown-contract/ui";
import { computed, ref } from "vue";
import { useVaults } from "~/composables/useVaults";
import type { FindingLevel, VaultStatus, VaultStatusState } from "~/types";

const props = defineProps<{
  layout?: "grid" | "table";
}>();

// ── the shared store (one fetch, one stream, app-wide) ──────────────────────────
const { vaults, loading, loadError, refresh } = useVaults();

/** The refresh-all affordance — re-pull the registry snapshot from the daemon. */
function refreshAll(): void {
  void refresh();
}

// ── layout: table reads like an app, so it is the default ───────────────────────
// (named layoutMode so the local binding never shadows the `layout` prop)
const layoutMode = ref<"grid" | "table">(props.layout ?? "table");

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

/** The status summary shown beside the title — the at-a-glance tally. */
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
  <div class="db">
    <Toolbar title="Vaults">
      <template #meta>
        <span class="db__summary" :class="{ 'db__summary--green': allGreen }">
          {{ summaryLine }}
        </span>
      </template>

      <div class="segmented" role="group" aria-label="Layout">
        <button
          type="button"
          class="segmented__btn"
          :aria-pressed="layoutMode === 'table'"
          @click="layoutMode = 'table'"
        >
          Table
        </button>
        <button
          type="button"
          class="segmented__btn"
          :aria-pressed="layoutMode === 'grid'"
          @click="layoutMode = 'grid'"
        >
          Grid
        </button>
      </div>
      <button class="btn" type="button" @click="refreshAll">
        <span aria-hidden="true">↻</span> Refresh
      </button>
      <NuxtLink class="btn btn--primary" to="/register">+ Add vault</NuxtLink>
    </Toolbar>

    <div class="page-body">
      <!-- daemon unreachable / first load -->
      <ErrorState v-if="loadError" title="Daemon unreachable" :message="loadError" />
      <LoadingState v-else-if="loading" label="Loading vaults…" />

      <template v-else>
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
            {{ statusTokens[state].label }}
            <span class="db__chip-count">{{ stateCounts[state] }}</span>
          </button>
        </nav>

        <!-- first-run empty state -->
        <EmptyState
          v-if="total === 0"
          icon="∅"
          title="No vaults registered"
          message="Register a markdown tree and its contract to start tracking its status here."
        >
          <NuxtLink class="btn btn--primary" to="/register">+ Add a vault</NuxtLink>
        </EmptyState>

        <!-- table layout (default): a dense row per vault -->
        <div v-else-if="layoutMode === 'table'" class="db__tablewrap">
          <table class="db__table">
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
                <td class="db__cell-name">
                  <NuxtLink class="db__row-link" :to="`/vault/${view.vault.id}`">
                    {{ view.vault.name }}
                  </NuxtLink>
                  <code class="db__row-path">{{ view.vault.path }}</code>
                </td>
                <td><StatusBadge :status="view.vault.state" size="sm" /></td>
                <td class="db__cell-detail">
                  <span v-if="view.vault.state === 'error'" class="db__error">
                    {{ view.errorMessage }}
                  </span>
                  <LoadingState
                    v-else-if="view.vault.state === 'running'"
                    variant="inline"
                    label="Validating…"
                  />
                  <span v-else-if="view.vault.state === 'drift'" class="db__drift">
                    <span class="db__drift-count">{{ view.driftCount }}</span>
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
                  <span v-else class="db__clean">No findings</span>
                </td>
                <td class="db__cell-updated">{{ view.updated }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- grid layout: a status card per vault -->
        <div v-else class="db__grid">
          <NuxtLink
            v-for="view in visibleViews"
            :key="view.vault.id"
            class="dcard"
            :to="`/vault/${view.vault.id}`"
          >
            <header class="dcard__head">
              <div class="dcard__id">
                <h3 class="dcard__name">{{ view.vault.name }}</h3>
                <code class="dcard__path">{{ view.vault.path }}</code>
              </div>
              <StatusBadge :status="view.vault.state" size="sm" />
            </header>

            <div class="dcard__body">
              <p v-if="view.vault.state === 'error'" class="db__error">{{ view.errorMessage }}</p>
              <LoadingState
                v-else-if="view.vault.state === 'running'"
                variant="inline"
                label="Validating…"
              />
              <p v-else-if="view.vault.state === 'drift'" class="db__drift">
                <span class="db__drift-count">{{ view.driftCount }}</span>
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
                <span v-else class="db__clean">No findings</span>
              </div>
            </div>

            <footer class="dcard__foot">
              <span class="dcard__updated">{{ view.updated }}</span>
              <span class="dcard__view">View →</span>
            </footer>
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.db {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.db__summary {
  font-size: 12px;
  color: var(--mc-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.db__summary--green {
  color: var(--mc-status-green);
  font-weight: 600;
}

/* status legend / filter chips — Finder-style filter capsules */
.db__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.db__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 10px;
  font-family: var(--mc-font);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--mc-text-muted);
  background: var(--mc-control-bg);
  border: 1px solid var(--mc-border);
  border-radius: 999px;
  cursor: pointer;
}
.db__chip:hover {
  background: var(--mc-control-hover);
}
.db__chip--active {
  border-color: currentColor;
  color: var(--mc-text);
}
.db__chip-count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

/* shared row detail bits */
.db__error {
  margin: 0;
  font-size: 12px;
  color: var(--mc-status-error);
}
.db__drift {
  margin: 0;
  font-size: 12px;
  color: var(--mc-text-muted);
}
.db__drift-count {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--mc-text);
}
.db__clean {
  font-size: 12px;
  color: var(--mc-text-muted);
}

/* table — macOS list: no striping, hairline separators, full-row hover tint */
.db__tablewrap {
  overflow-x: auto;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.db__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.db__table th {
  text-align: left;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--mc-text-muted);
  border-bottom: 1px solid var(--mc-border);
  white-space: nowrap;
}
.db__table td {
  height: 30px;
  padding: 5px 12px;
  border-bottom: 1px solid var(--mc-separator);
  vertical-align: middle;
}
.db__row:hover td {
  background: var(--mc-hover);
}
.db__row:last-child td {
  border-bottom: none;
}
.db__row-link {
  font-weight: 600;
  color: var(--mc-text);
  text-decoration: none;
}
.db__row-link:hover {
  color: var(--mc-accent);
  text-decoration: underline;
}
.db__row-path {
  display: block;
  margin-top: 1px;
  color: var(--mc-text-faint);
  font-size: 11px;
}
.db__levels-inline {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 5px;
}
.db__cell-updated {
  color: var(--mc-text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-size: 11.5px;
}

/* grid */
.db__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--mc-gap);
}
.dcard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 13px;
  color: var(--mc-text);
  text-decoration: none;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.dcard:hover {
  border-color: var(--mc-border-strong);
}
.dcard__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.dcard__name {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}
.dcard__path {
  color: var(--mc-text-faint);
  font-size: 11px;
  word-break: break-all;
}
.dcard__body {
  min-height: 22px;
}
.dcard__levels {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}
.dcard__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--mc-text-muted);
}
.dcard__view {
  font-weight: 600;
  color: var(--mc-accent);
}
</style>
