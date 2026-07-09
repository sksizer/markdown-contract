<script setup lang="ts">
/**
 * Dashboard — the vault registry, status-first (D-0018 §D5/§D6): one card per
 * vault (status from its latest run, counts, recency, watch/schedule), the
 * add-vault form, and scan-now/remove per vault. Refreshes on every
 * "scan:completed" Tauri event, so watch/schedule/tray-triggered runs land
 * here live.
 */
import { EmptyState, Toolbar } from "@markdown-contract/ui";
import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { ScanRun, Vault } from "../bindings/types";
import AddVaultForm from "../components/AddVaultForm.vue";
import EchoCard from "../components/EchoCard.vue";
import VaultCard from "../components/VaultCard.vue";
import { useScanEvents } from "../composables/useScanEvents";
import { useVaults } from "../composables/useVaults";
import { latestRunFor } from "../utils/vaultView";

const vaultsSvc = useVaults();

const vaults = ref<Vault[]>([]);
const runs = ref<ScanRun[]>([]);
const scanning = ref(new Set<string>());
const showAdd = ref(false);
const error = ref<string | null>(null);

const rows = computed(() =>
  vaults.value.map((vault) => ({
    vault,
    run: latestRunFor(runs.value, vault.id),
  })),
);

async function load() {
  try {
    [vaults.value, runs.value] = await Promise.all([vaultsSvc.list(), vaultsSvc.runs()]);
    error.value = null;
  } catch (e) {
    error.value = String(e);
  }
}

async function scanNow(id: string) {
  scanning.value = new Set(scanning.value).add(id);
  try {
    await vaultsSvc.scanNow(id);
    error.value = null;
  } catch (e) {
    error.value = String(e);
  } finally {
    const next = new Set(scanning.value);
    next.delete(id);
    scanning.value = next;
    await load();
  }
}

async function scanAll() {
  for (const vault of vaults.value) {
    await scanNow(vault.id);
  }
}

async function remove(id: string) {
  try {
    await vaultsSvc.remove(id);
    error.value = null;
  } catch (e) {
    error.value = String(e);
  }
  await load();
}

let unlisten: UnlistenFn | undefined;
onMounted(async () => {
  await load();
  // Live refresh: watch/schedule/startup/tray scans all emit this event.
  unlisten = await useScanEvents().onScanCompleted(() => {
    void load();
  });
});
onUnmounted(() => unlisten?.());

// Dev: keeps the template's echo IPC round-trip reachable and tested.
async function tauriEcho(message: string): Promise<string> {
  return await invoke("echo", { message });
}
</script>

<template>
  <div>
    <Toolbar title="Vaults">
      <button
        v-if="vaults.length > 0"
        type="button"
        class="mc-btn"
        :disabled="scanning.size > 0"
        @click="scanAll"
      >
        Scan all
      </button>
      <button type="button" class="mc-btn mc-btn--primary" @click="showAdd = !showAdd">
        {{ showAdd ? "Close" : "Add vault" }}
      </button>
    </Toolbar>

    <main class="page">
      <p v-if="error" class="mc-error">{{ error }}</p>

      <AddVaultForm
        v-if="showAdd"
        @added="
          showAdd = false;
          load();
        "
      />

      <EmptyState
        v-if="vaults.length === 0 && !showAdd"
        icon="▦"
        title="No vaults tracked yet"
        message="Register a markdown vault to see its contract health — findings, drift, and live status — right here."
      >
        <button type="button" class="mc-btn mc-btn--primary" @click="showAdd = true">
          Add vault
        </button>
      </EmptyState>

      <VaultCard
        v-for="row in rows"
        :key="row.vault.id"
        :vault="row.vault"
        :run="row.run"
        :scanning="scanning.has(row.vault.id)"
        @scan="scanNow(row.vault.id)"
        @remove="remove(row.vault.id)"
      />

      <!-- Dev: the template's echo IPC round-trip stays reachable. -->
      <details class="dev">
        <summary class="dev__summary">Dev — IPC smoke test</summary>
        <EchoCard :invoker="tauriEcho" />
      </details>
    </main>
  </div>
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
