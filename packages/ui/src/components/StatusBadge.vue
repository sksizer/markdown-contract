<script setup lang="ts">
/**
 * StatusBadge — a compact, flat pill that names one of the five vault states
 * (green / findings / drift / running / error) with its icon + label.
 *
 * Pure presentational: status in via props, accent colors bound INLINE from
 * `statusTokens` (design/tokens.ts — `var(--mc-status-…)` references, so the
 * badge follows light/dark automatically). No Nuxt imports.
 */
import { computed } from "vue";
import { type StatusKey, statusTokens } from "../tokens";

const props = withDefaults(
  defineProps<{
    status: StatusKey;
    /** override the token's default label */
    label?: string;
    size?: "sm" | "md";
  }>(),
  { size: "md" },
);

const token = computed(() => statusTokens[props.status]);
const text = computed(() => props.label ?? token.value.label);
</script>

<template>
  <span
    class="sb"
    :class="`sb--${size}`"
    :style="{ color: token.color, background: token.bg }"
    :title="token.description"
  >
    <span class="sb__icon" aria-hidden="true">{{ token.icon }}</span>
    <span class="sb__label">{{ text }}</span>
  </span>
</template>

<style scoped>
.sb {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border-radius: 999px;
  white-space: nowrap;
}
.sb--md {
  font-size: 11px;
  padding: 2px 8px;
}
.sb--sm {
  font-size: 10px;
  padding: 1px 6px;
  gap: 3px;
}
.sb__icon {
  font-weight: 700;
  line-height: 1;
}
</style>
