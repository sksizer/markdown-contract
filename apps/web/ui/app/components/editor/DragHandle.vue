<script setup lang="ts">
/**
 * DragHandle — the grip (⠿) a reorderable row exposes at its left edge.
 * Only the handle is draggable, so text selection and inputs inside the row
 * stay unaffected; the parent wires dragstart/dragend into its
 * useDragReorder instance. Pointer-only by design — every list that renders
 * a handle keeps ↑/↓ buttons as the keyboard-accessible path.
 */
defineProps<{ label: string }>();

const emit = defineEmits<{
  (e: "dragstart", event: DragEvent): void;
  (e: "dragend", event: DragEvent): void;
}>();
</script>

<template>
  <button
    class="dh"
    type="button"
    draggable="true"
    :aria-label="label"
    :title="label"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend', $event)"
  >⠿</button>
</template>

<style scoped>
.dh {
  appearance: none;
  flex: 0 0 auto;
  padding: 1px 2px;
  border: none;
  background: transparent;
  font-size: 13px;
  line-height: 1;
  color: var(--mc-text-faint);
  cursor: grab;
  touch-action: none;
}
.dh:hover {
  color: var(--mc-text-muted);
}
.dh:active {
  cursor: grabbing;
}
</style>

<style>
/*
 * Shared drag-reorder row states (unscoped on purpose — applied by
 * useDragReorder's rowClass on rows across several editor components).
 * dnd-row--before/--after draw the insertion indicator line in the gap
 * beside the hovered row; --lift fades the row being dragged.
 */
.dnd-row {
  position: relative;
}
.dnd-row--lift {
  opacity: 0.55;
}
.dnd-row--before::before,
.dnd-row--after::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--mc-accent);
  pointer-events: none;
  z-index: 2;
}
.dnd-row--before::before {
  top: -4px;
}
.dnd-row--after::after {
  bottom: -4px;
}
</style>
