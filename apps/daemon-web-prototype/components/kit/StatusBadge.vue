<script setup lang="ts">
/**
 * StatusBadge — a rounded pill that names one of the five vault states
 * (green / findings / drift / running / error) with its icon + label.
 *
 * Pure presentational: status in via props, accent colors bound INLINE from
 * `statusTokens` (the design/tokens.ts source of truth); structural styling uses
 * the shared `--mc-*` vars. No Nuxt imports.
 */
import { computed } from "vue";
import { type StatusKey, statusTokens } from "../../design/tokens";

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
  gap: 6px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  white-space: nowrap;
}
.sb--md {
  font-size: 0.75rem;
  padding: 4px 10px;
}
.sb--sm {
  font-size: 0.66rem;
  padding: 2px 8px;
  gap: 4px;
}
.sb__icon {
  font-weight: 700;
  line-height: 1;
}
</style>
