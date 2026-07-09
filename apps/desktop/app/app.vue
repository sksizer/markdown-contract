<script setup lang="ts">
/**
 * The vault-dashboard shell (D-0018 §D6) — the first real screen, rendered from
 * the shared kit (@markdown-contract/ui): the Toolbar header, the "no vaults
 * tracked yet" empty state, and the five-state status language the dashboard
 * will speak. Vault features are a later phase; this screen is the proof the
 * kit renders inside the Tauri webview. The template's echo IPC smoke test
 * stays reachable in the dev section at the bottom, so the Rust↔webview path
 * keeps getting exercised.
 */
import {
  EmptyState,
  STATUS_ORDER,
  StatusBadge,
  statusTokens,
  Toolbar,
} from "@markdown-contract/ui";
import { invoke } from "@tauri-apps/api/core";
import EchoCard from "./components/EchoCard.vue";

// The IPC smoke test: round-trips a string through src-tauri's `echo` command.
async function tauriEcho(message: string): Promise<string> {
  return await invoke("echo", { message });
}
</script>

<template>
  <NuxtLayout>
    <Toolbar title="Vaults" />
    <main class="page">
      <EmptyState
        icon="▦"
        title="No vaults tracked yet"
        message="Register a markdown vault to see its contract health — findings, drift, and live status — right here."
      />

      <!-- The status language, straight from the kit's tokens. -->
      <section class="legend" aria-label="Vault status legend">
        <h2 class="legend__title">Vault states</h2>
        <div v-for="key in STATUS_ORDER" :key="key" class="legend__row">
          <StatusBadge :status="key" />
          <span class="legend__desc">{{ statusTokens[key].description }}</span>
        </div>
      </section>

      <!-- Dev: keeps the template's echo IPC round-trip reachable and tested. -->
      <details class="dev">
        <summary class="dev__summary">Dev — IPC smoke test</summary>
        <EchoCard :invoker="tauriEcho" />
      </details>
    </main>
  </NuxtLayout>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 14px 18px 32px;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.legend__title {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.legend__row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.legend__desc {
  font-size: 12.5px;
  color: var(--mc-text-muted);
}

.dev__summary {
  font-size: 11.5px;
  color: var(--mc-text-faint);
  cursor: pointer;
  user-select: none;
}
.dev[open] .dev__summary {
  margin-bottom: 8px;
}
</style>
