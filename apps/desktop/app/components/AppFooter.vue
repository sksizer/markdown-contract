<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <footer class="footer">
    <p>{{ text }}</p>
  </footer>
</template>

<style scoped>
.footer {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.footer p {
  margin: 0;
}
</style>
