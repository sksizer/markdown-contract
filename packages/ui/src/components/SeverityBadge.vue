<script setup lang="ts">
/**
 * SeverityBadge — a small flat badge naming one finding severity (error / warn /
 * report) with its icon, label, and an optional count.
 *
 * Pure presentational: level in via props, accent colors bound INLINE from
 * `severityTokens` (design/tokens.ts — `var(--mc-sev-…)` references). No Nuxt
 * imports.
 */
import { computed } from "vue";
import { type SeverityKey, severityTokens } from "../tokens";

const props = defineProps<{
  level: SeverityKey;
  /** when present, render a trailing count (e.g. how many of this level) */
  count?: number;
}>();

const token = computed(() => severityTokens[props.level]);
</script>

<template>
  <span class="seb" :style="{ color: token.color, background: token.bg }">
    <span class="seb__icon" aria-hidden="true">{{ token.icon }}</span>
    <span class="seb__label">{{ token.label }}</span>
    <span v-if="count != null" class="seb__count">{{ count }}</span>
  </span>
</template>

<style scoped>
.seb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.seb__icon {
  line-height: 1;
}
.seb__count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  padding-left: 4px;
  border-left: 1px solid currentColor;
  opacity: 0.85;
}
</style>
