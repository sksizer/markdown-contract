<script setup lang="ts">
// A dashboard page defined ONCE in the shared layer. Any app that `extends` the
// layer gets `/spike-vaults` as a route automatically — this is the "share
// pages" proof. `useVaults` is auto-imported from the layer's composables.

import type { Vault } from "@markdown-contract/dashboard/transport";
import { onMounted, ref } from "vue";

const vaults = ref<Vault[]>([]);
const error = ref<string | null>(null);
const api = useVaults();

// Client-only (the transport plugin is `.client`); keeps static prerender inert.
onMounted(async () => {
  try {
    vaults.value = await api.list();
  } catch (e) {
    error.value = (e as Error).message;
  }
});
</script>

<template>
  <section style="font-family: system-ui; padding: 2rem">
    <h1>Vaults — shared dashboard layer</h1>
    <p style="color: #888">
      This page + its <code>useVaults()</code> composable live in
      <code>@markdown-contract/dashboard</code>; the data comes from the
      host-provided transport.
    </p>
    <p v-if="error" style="color: #c00">transport error: {{ error }}</p>
    <ul>
      <li v-for="v in vaults" :key="v.id"><strong>{{ v.name }}</strong> — {{ v.path }}</li>
    </ul>
    <p v-if="!error && vaults.length === 0">no vaults</p>
  </section>
</template>
