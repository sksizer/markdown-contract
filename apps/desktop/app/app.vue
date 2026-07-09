<script setup lang="ts">
/**
 * The app shell (D-0018 §D6): layout + router outlet. The screens live under
 * app/pages/ — the dashboard (index.vue) and the vault detail
 * (vaults/[id].vue) — all speaking the shared kit's desktop metaphor.
 */
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
