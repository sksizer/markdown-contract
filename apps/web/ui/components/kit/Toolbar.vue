<script setup lang="ts">
/**
 * Toolbar — the slim sticky header every page renders at the top of the main
 * pane: page title on the left (plus an optional `meta` slot beside it),
 * actions on the right (default slot). Pages own their actions and render
 * their content below in a `.page-body` (see assets/css/main.css).
 */
defineProps<{ title: string }>();
</script>

<template>
  <header class="tb">
    <div class="tb__left">
      <h1 class="tb__title">{{ title }}</h1>
      <slot name="meta" />
    </div>
    <div v-if="$slots.default" class="tb__actions">
      <slot />
    </div>
  </header>
</template>

<style scoped>
.tb {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 45px;
  padding: 6px 18px;
  background: var(--mc-bg);
  border-bottom: 1px solid var(--mc-border);
}
.tb__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.tb__title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tb__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
