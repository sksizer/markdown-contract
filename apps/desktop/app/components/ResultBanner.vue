<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <div class="result">
    {{ message }}
  </div>
</template>

<style scoped>
.result {
  padding: 1rem;
  background: var(--mc-surface-2);
  color: var(--mc-text);
  border-radius: var(--mc-radius);
  margin-top: 1rem;
  font-weight: 500;
  border-left: 4px solid var(--mc-accent);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
