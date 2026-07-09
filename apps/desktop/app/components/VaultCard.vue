<script setup lang="ts">
/**
 * VaultCard — one tracked vault on the dashboard: name (links to the detail
 * screen), path, status from its latest run, error/warn tallies, last-scan
 * recency, the watch indicator, the schedule chip, and the per-vault actions
 * (scan now, open in …, remove). Presentation-only: the page owns loading
 * and actions.
 */
import { SeverityBadge, StatusBadge } from "@markdown-contract/ui";
import { computed } from "vue";
import type { ScanRun, Vault } from "../bindings/types";
import { formatRelativeTime, scheduleLabel } from "../utils/format";
import { statusKeyFor } from "../utils/vaultView";
import OpenInMenu from "./OpenInMenu.vue";

const props = defineProps<{
  vault: Vault;
  /** The vault's latest run (null = never scanned). */
  run: ScanRun | null;
  /** True while a scan kicked off from the UI is in flight. */
  scanning?: boolean;
}>();

defineEmits<{
  scan: [];
  remove: [];
}>();

const status = computed(() => (props.scanning ? "running" : statusKeyFor(props.run)));
const lastScan = computed(() => {
  const at = props.run?.finished_at ?? props.run?.started_at;
  return at ? formatRelativeTime(at) : null;
});
</script>

<template>
  <article class="vc">
    <header class="vc__head">
      <div class="vc__id">
        <NuxtLink :to="`/vaults/${vault.id}`" class="vc__name">{{ vault.name }}</NuxtLink>
        <code class="vc__path">{{ vault.path }}</code>
      </div>
      <StatusBadge v-if="status" :status="status" />
      <span v-else class="vc__unscanned">not scanned yet</span>
    </header>

    <div class="vc__meta">
      <template v-if="run && (run.error_count > 0 || run.warn_count > 0)">
        <SeverityBadge v-if="run.error_count > 0" level="error" :count="run.error_count" />
        <SeverityBadge v-if="run.warn_count > 0" level="warn" :count="run.warn_count" />
      </template>
      <span v-if="lastScan" class="vc__chip">scanned {{ lastScan }}</span>
      <span class="vc__chip" :class="{ 'vc__chip--on': vault.watch_enabled }">
        {{ vault.watch_enabled ? "● watching" : "○ not watching" }}
      </span>
      <span class="vc__chip"><code>{{ scheduleLabel(vault.schedule) }}</code></span>
    </div>

    <footer class="vc__actions">
      <button type="button" class="mc-btn" :disabled="scanning" @click="$emit('scan')">
        {{ scanning ? "Scanning…" : "Scan now" }}
      </button>
      <OpenInMenu :path="vault.path" kind="dir" />
      <span class="vc__spacer" />
      <button type="button" class="mc-btn mc-btn--danger" @click="$emit('remove')">Remove</button>
    </footer>
  </article>
</template>

<style scoped>
.vc {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.vc__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.vc__id {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.vc__name {
  font-size: 13.5px;
  font-weight: 650;
  color: var(--mc-text);
  text-decoration: none;
}
.vc__name:hover {
  text-decoration: underline;
}
.vc__path {
  font-size: 11px;
  color: var(--mc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vc__unscanned {
  font-size: 11px;
  color: var(--mc-text-faint);
  white-space: nowrap;
}
.vc__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.vc__chip {
  font-size: 11px;
  color: var(--mc-text-muted);
}
.vc__chip--on {
  color: var(--mc-status-green);
}
.vc__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.vc__spacer {
  flex: 1;
}
</style>
