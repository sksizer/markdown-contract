<script setup lang="ts">
/**
 * Manage vaults — hosts the prototype's VaultForm (T-5QJV) wired to the live
 * registry routes: register → POST /api/vaults, remove → DELETE /api/vaults/:id,
 * edit → remove + re-register (the prototype daemon has no PATCH). After every
 * mutation the list re-seeds from the daemon AND the shared useVaults store
 * refreshes, so the sidebar/dashboard reflect the change immediately.
 */
import { onMounted, ref } from "vue";

import VaultForm from "~/components/VaultForm.vue";
import Toolbar from "~/components/kit/Toolbar.vue";
import { apiErrorMessage, useApi } from "~/composables/useApi";
import { useVaults } from "~/composables/useVaults";
import type { RegisterVaultRequest, VaultStatus } from "~/types";

const api = useApi();
const { refresh: refreshShared } = useVaults();
const vaults = ref<VaultStatus[]>([]);
const error = ref("");

async function reload(): Promise<void> {
  try {
    vaults.value = (await api.listVaults()).vaults;
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
  void refreshShared();
}

async function onRegister(req: RegisterVaultRequest): Promise<void> {
  error.value = "";
  try {
    await api.registerVault(req);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
  await reload();
}

async function onRemove(id: string): Promise<void> {
  error.value = "";
  try {
    await api.removeVault(id);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
  await reload();
}

async function onUpdate(vault: VaultStatus): Promise<void> {
  error.value = "";
  try {
    await api.removeVault(vault.id);
    await api.registerVault({ name: vault.name, path: vault.path, configPath: vault.configPath });
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
  await reload();
}

onMounted(() => void reload());
</script>

<template>
  <div class="reg">
    <Toolbar title="Add vault">
      <template #meta>
        <span class="reg__hint">register a markdown tree and its contract</span>
      </template>
    </Toolbar>

    <div class="page-body">
      <p v-if="error" class="reg__error" role="alert">{{ error }}</p>
      <div class="reg__col">
        <VaultForm :vaults="vaults" @register="onRegister" @update="onUpdate" @remove="onRemove" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.reg {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.reg__hint {
  font-size: 12px;
  color: var(--mc-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reg__col {
  max-width: 720px;
}
.reg__error {
  margin: 0;
  max-width: 720px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--mc-status-error);
  background: var(--mc-status-error-bg);
  border: 1px solid var(--mc-status-error);
  border-radius: var(--mc-radius);
}
</style>
