<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    type?: "submit" | "button";
  }>(),
  {
    type: "button",
  },
);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button :type="type" class="gradient-button" @click="$emit('click', $event)">
    {{ label }}
  </button>
</template>

<style scoped>
.gradient-button {
  padding: 0.5rem 1.25rem;
  /* the kit theme's accent, with the template's faint top-to-bottom gradient */
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--mc-accent) 87%, #fff),
    var(--mc-accent)
  );
  color: var(--mc-on-accent);
  border: none;
  border-radius: var(--mc-radius);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.gradient-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.gradient-button:active {
  transform: translateY(0);
}
</style>
