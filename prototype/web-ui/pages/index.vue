<script setup lang="ts">
// The dashboard screen, assembled off the mock-data layer.
// `useMockVaults()` is the seam the real app will later swap for a
// `runCorpus`-backed client — the page never knows the data is mock.
import { useMockVaults } from "~/mocks";

const vaults = useMockVaults();
</script>

<template>
  <VaultDashboard :vaults="vaults" />
</template>
