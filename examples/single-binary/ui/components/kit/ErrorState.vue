<script setup lang="ts">
/**
 * ErrorState — a first-class "the run could not complete" surface, themed with
 * the `error` status token and centered in whatever pane hosts it. Adopted
 * from apps/web's kit (itself adopted from the design prototype).
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
  <div class="err" role="alert">
    <span class="err__icon" :style="{ color: token.color, background: token.bg }" aria-hidden="true">
      {{ token.icon }}
    </span>
    <h3 class="err__title" :style="{ color: token.color }">{{ title }}</h3>
    <p class="err__message">{{ message }}</p>
    <pre v-if="detail" class="err__detail"><code>{{ detail }}</code></pre>
    <div v-if="$slots.default" class="err__action"><slot /></div>
  </div>
</template>

<style scoped>
.err {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  margin: auto 0;
  padding: 40px 24px;
}
.err__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
}
.err__title {
  margin: 8px 0 0;
  font-size: 13.5px;
  font-weight: 650;
}
.err__message {
  margin: 0;
  font-size: 12.5px;
  color: var(--mc-text-muted);
  max-width: 56ch;
}
.err__detail {
  margin: 10px 0 0;
  padding: 8px 10px;
  max-width: 100%;
  overflow-x: auto;
  text-align: left;
  background: var(--mc-surface-2);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  font-size: 11.5px;
  white-space: pre-wrap;
  word-break: break-word;
}
.err__action {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
</style>
