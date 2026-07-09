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
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
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
