<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import AppFooter from "./components/AppFooter.vue";
import AppHeader from "./components/AppHeader.vue";
import EchoCard from "./components/EchoCard.vue";

// The IPC smoke test: round-trips a string through src-tauri's `echo` command.
async function tauriEcho(message: string): Promise<string> {
  return await invoke("echo", { message });
}
</script>

<template>
  <NuxtLayout>
    <div class="content">
      <AppHeader title="Markdown Contract" subtitle="Vault health, resident on the desktop" />
      <main class="main">
        <EchoCard :invoker="tauriEcho" />
      </main>
      <AppFooter text="Built with Tauri 2, Nuxt 4, and TypeScript" />
    </div>
  </NuxtLayout>
</template>

<style scoped>
.content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.main {
  margin: 2rem 0;
}
</style>

<style>
html,
body {
  overscroll-behavior: none;
}
</style>
