<script setup lang="ts">
/**
 * Manage vaults — hosts the prototype's VaultForm (T-5QJV) wired to the live
 * registry routes: register → POST /api/vaults, remove → DELETE /api/vaults/:id,
 * edit → remove + re-register (the prototype daemon has no PATCH). After every
 * mutation the list re-seeds from the daemon, so what the form shows is always
 * the durable registry, not an optimistic copy.
 */
import { onMounted, ref } from "vue";
import type { RegisterVaultRequest, VaultStatus } from "~/types";
import { apiErrorMessage, useApi } from "~/composables/useApi";
import VaultForm from "~/components/VaultForm.vue";

const api = useApi();
const vaults = ref<VaultStatus[]>([]);
const error = ref("");

async function reload(): Promise<void> {
  try {
    vaults.value = (await api.listVaults()).vaults;
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
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
  <section class="reg">
    <a class="reg__back" href="/">← All vaults</a>
    <p v-if="error" class="reg__error">{{ error }}</p>
    <VaultForm :vaults="vaults" @register="onRegister" @update="onUpdate" @remove="onRemove" />
  </section>
</template>

<style scoped>
.reg {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.reg__back {
  align-self: flex-start;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}
.reg__back:hover {
  text-decoration: underline;
}
.reg__error {
  margin: 0;
  padding: 10px 14px;
  font-size: 0.85rem;
  color: var(--mc-fail);
  background: var(--mc-error-bg, #ffeef0);
  border: 1px solid var(--mc-fail);
  border-radius: var(--mc-radius);
}
</style>
