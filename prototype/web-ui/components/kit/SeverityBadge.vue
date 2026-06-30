<script setup lang="ts">
/**
 * SeverityBadge — a small badge naming one finding severity (error / warn /
 * report) with its icon, label, and an optional count.
 *
 * Pure presentational: level in via props, accent colors bound INLINE from
 * `severityTokens` (design/tokens.ts). No Nuxt imports.
 */
import { computed } from "vue";
import { type SeverityKey, severityTokens } from "../../design/tokens";

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
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
.seb__icon {
  line-height: 1;
}
.seb__count {
  font-variant-numeric: tabular-nums;
  padding-left: 4px;
  border-left: 1px solid currentColor;
  opacity: 0.85;
}
</style>
