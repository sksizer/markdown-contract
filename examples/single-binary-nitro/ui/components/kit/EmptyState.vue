<script setup lang="ts">
/**
 * EmptyState — a first-class "nothing here yet" surface, centered in whatever
 * pane hosts it. Adopted from apps/web's kit (itself adopted from the design
 * prototype).
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
  justify-content: center;
  text-align: center;
  gap: 4px;
  margin: auto 0;
  padding: 48px 24px;
  color: var(--mc-text-muted);
}
.es__icon {
  font-size: 22px;
  line-height: 1;
  color: var(--mc-text-faint);
}
.es__title {
  margin: 6px 0 0;
  font-size: 13.5px;
  font-weight: 650;
  color: var(--mc-text);
}
.es__message {
  margin: 0;
  font-size: 12.5px;
  max-width: 46ch;
}
.es__action {
  margin-top: 10px;
}
</style>
