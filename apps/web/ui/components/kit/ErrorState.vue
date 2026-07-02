<script setup lang="ts">
/**
 * ErrorState — a first-class "the run could not complete" panel (AC-3), themed
 * with the `error` status token.
 *
 * Sensible defaults; pass `title` / `message` and an optional `detail` (rendered
 * in a monospace block, e.g. a stack trace or stderr). Use the default slot for a
 * retry action.
 *
 * Pure presentational, accents bound inline from the error token. No Nuxt imports.
 */
import { statusTokens } from "../../design/tokens";

withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    detail?: string;
  }>(),
  {
    title: "Something went wrong",
    message: "The validation run could not complete.",
  },
);

const token = statusTokens.error;
</script>

<template>
  <div class="err" role="alert" :style="{ borderTopColor: token.color }">
    <div class="err__head">
      <span class="err__icon" :style="{ color: token.color, background: token.bg }" aria-hidden="true">
        {{ token.icon }}
      </span>
      <div class="err__copy">
        <h3 class="err__title" :style="{ color: token.color }">{{ title }}</h3>
        <p class="err__message">{{ message }}</p>
      </div>
    </div>
    <pre v-if="detail" class="err__detail"><code>{{ detail }}</code></pre>
    <div v-if="$slots.default" class="err__action"><slot /></div>
  </div>
</template>

<style scoped>
.err {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-top-width: 4px;
  border-radius: var(--mc-radius);
}
.err__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.err__icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-weight: 700;
}
.err__copy {
  min-width: 0;
}
.err__title {
  margin: 0;
  font-size: 1.05rem;
}
.err__message {
  margin: 4px 0 0;
  color: var(--mc-text-muted);
}
.err__detail {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  background: var(--mc-bg);
  border: 1px solid var(--mc-border);
  border-radius: 6px;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.err__action {
  display: flex;
  gap: 8px;
}
</style>
