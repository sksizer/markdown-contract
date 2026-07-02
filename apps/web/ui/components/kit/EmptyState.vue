<script setup lang="ts">
/**
 * EmptyState — a first-class "nothing here yet" panel (AC-3).
 *
 * Sensible defaults so it reads as an empty state out of the box; pass `title` /
 * `message` / `icon` to tailor the copy, and use the default slot for an action
 * (e.g. an "Add vault" button).
 *
 * Pure presentational, structural styling from `--mc-*`. No Nuxt imports.
 */
withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    icon?: string;
  }>(),
  {
    title: "Nothing here yet",
    message: "There is nothing to show.",
    icon: "∅",
  },
);
</script>

<template>
  <div class="es" role="status">
    <div class="es__icon" aria-hidden="true">{{ icon }}</div>
    <h3 class="es__title">{{ title }}</h3>
    <p class="es__message">{{ message }}</p>
    <div v-if="$slots.default" class="es__action"><slot /></div>
  </div>
</template>

<style scoped>
.es {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 40px 24px;
  background: var(--mc-surface);
  border: 1px dashed var(--mc-border);
  border-radius: var(--mc-radius);
  color: var(--mc-text-muted);
}
.es__icon {
  font-size: 2rem;
  line-height: 1;
  color: var(--mc-text-muted);
}
.es__title {
  margin: 4px 0 0;
  font-size: 1.05rem;
  color: var(--mc-text);
}
.es__message {
  margin: 0;
  max-width: 42ch;
}
.es__action {
  margin-top: 8px;
}
</style>
