<script setup lang="ts">
/**
 * LoadingState — a first-class loading / running surface, themed with the
 * `running` status token color. Adopted from apps/web's kit (itself adopted
 * from the design prototype).
 *
 *   - `spinner`  — an animated CSS ring + label, centered in the pane (default).
 *   - `skeleton` — `rows` shimmer placeholder bars.
 *   - `inline`   — a small inline spinner + label, for tight spaces.
 *
 * Pure presentational, accent bound inline from the running token. No Nuxt imports.
 */
import { computed } from "vue";
import { statusTokens } from "../../design/tokens";

const props = withDefaults(
  defineProps<{
    label?: string;
    variant?: "spinner" | "skeleton" | "inline";
    rows?: number;
  }>(),
  { label: "Loading…", variant: "spinner", rows: 3 },
);

const accent = statusTokens.running.color;
const rowList = computed(() => Array.from({ length: Math.max(1, props.rows) }, (_, i) => i));
</script>

<template>
  <!-- Skeleton: shimmer placeholder bars -->
  <div v-if="variant === 'skeleton'" class="ls ls--skeleton" role="status" :aria-label="label">
    <div v-for="i in rowList" :key="i" class="ls__bar" />
  </div>

  <!-- Inline: small spinner + label on one line -->
  <span v-else-if="variant === 'inline'" class="ls ls--inline" role="status">
    <span class="ls__spinner ls__spinner--sm" :style="{ borderTopColor: accent }" aria-hidden="true" />
    <span class="ls__label">{{ label }}</span>
  </span>

  <!-- Spinner: centered ring + label -->
  <div v-else class="ls ls--spinner" role="status">
    <span class="ls__spinner" :style="{ borderTopColor: accent }" aria-hidden="true" />
    <span class="ls__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.ls__spinner {
  display: inline-block;
  width: 22px;
  height: 22px;
  border: 2px solid var(--mc-border);
  border-radius: 50%;
  animation: ls-spin 0.8s linear infinite;
}
.ls__spinner--sm {
  width: 12px;
  height: 12px;
  border-width: 2px;
}
.ls__label {
  color: var(--mc-text-muted);
  font-size: 12.5px;
}

.ls--spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: auto 0;
  padding: 48px 24px;
}

.ls--inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ls--skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.ls__bar {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--mc-surface-2) 25%,
    var(--mc-border) 37%,
    var(--mc-surface-2) 63%
  );
  background-size: 400% 100%;
  animation: ls-shimmer 1.4s ease infinite;
}
.ls__bar:nth-child(2) {
  width: 88%;
}
.ls__bar:nth-child(3) {
  width: 72%;
}
.ls__bar:nth-child(even) {
  width: 80%;
}

@keyframes ls-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes ls-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
</style>
