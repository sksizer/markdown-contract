<script setup lang="ts">
/**
 * RunHistory — a vault's scan runs, newest first: trigger, status, counts,
 * duration, and recency per row. Presentation-only: the page passes the
 * already-ordered runs.
 */
import { SeverityBadge, StatusBadge } from "@markdown-contract/ui";
import type { ScanRun } from "../bindings/types";
import { formatDuration, formatRelativeTime } from "../utils/format";
import { statusKeyFor } from "../utils/vaultView";

defineProps<{ runs: ScanRun[] }>();
</script>

<template>
  <ul class="rh">
    <li v-for="run in runs" :key="run.id" class="rh__row">
      <StatusBadge v-if="statusKeyFor(run)" :status="statusKeyFor(run)!" size="sm" />
      <span class="rh__trigger">{{ run.trigger }}</span>
      <span class="rh__counts">
        <SeverityBadge v-if="run.error_count > 0" level="error" :count="run.error_count" />
        <SeverityBadge v-if="run.warn_count > 0" level="warn" :count="run.warn_count" />
        <span v-if="run.status === 'green'" class="rh__clean">clean</span>
        <span v-if="run.error_message" class="rh__failure" :title="run.error_message">
          {{ run.error_message }}
        </span>
      </span>
      <span class="rh__timing">
        <span v-if="formatDuration(run.started_at, run.finished_at)" class="rh__duration">
          {{ formatDuration(run.started_at, run.finished_at) }}
        </span>
        <span class="rh__when">{{ formatRelativeTime(run.started_at) }}</span>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.rh {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}
.rh__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 2px;
  border-bottom: 1px solid var(--mc-separator);
  font-size: 12px;
}
.rh__row:last-child {
  border-bottom: 0;
}
.rh__trigger {
  min-width: 62px;
  color: var(--mc-text-muted);
  font-family: var(--mc-mono);
  font-size: 11px;
}
.rh__counts {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}
.rh__clean {
  color: var(--mc-text-faint);
  font-size: 11px;
}
.rh__failure {
  color: var(--mc-sev-error);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rh__timing {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--mc-text-muted);
  font-variant-numeric: tabular-nums;
}
.rh__duration {
  font-size: 11px;
}
.rh__when {
  font-size: 11px;
  color: var(--mc-text-faint);
}
</style>
