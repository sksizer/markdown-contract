<script setup lang="ts">
/**
 * VaultDashboard — the assembled screen: a status bar over all managed vaults,
 * a grid of VaultStatusCard, and a per-vault detail panel (RunSummary +
 * FindingsList) for the currently selected vault.
 *
 * Composes the leaf components and is itself rendered by the app shell
 * (pages/index.vue) and by Storybook. Pure presentational: `vaults` in via props.
 */
import { computed, ref } from "vue";
import FindingsList from "./FindingsList.vue";
import RunSummary from "./RunSummary.vue";
import VaultStatusCard from "./VaultStatusCard.vue";
import type { VaultSummary } from "../mocks/types";

const props = defineProps<{ vaults: VaultSummary[] }>();

const selectedId = ref<string | null>(props.vaults[0]?.id ?? null);

const selected = computed<VaultSummary | undefined>(
  () => props.vaults.find((v) => v.id === selectedId.value) ?? props.vaults[0],
);

const passingCount = computed(() => props.vaults.filter((v) => v.result.exitCode === 0).length);
const failingCount = computed(() => props.vaults.length - passingCount.value);

function select(id: string): void {
  selectedId.value = id;
}
</script>

<template>
  <div class="dash">
    <header class="dash__bar">
      <div class="dash__totals">
        <span class="dash__total">
          <strong>{{ vaults.length }}</strong> vaults
        </span>
        <span class="dash__total dash__total--pass">
          <strong>{{ passingCount }}</strong> passing
        </span>
        <span class="dash__total dash__total--fail">
          <strong>{{ failingCount }}</strong> failing
        </span>
      </div>
    </header>

    <p v-if="vaults.length === 0" class="dash__empty" data-test="dash-empty">
      No vaults are being managed yet. Add a markdown tree to get started.
    </p>

    <template v-else>
      <div class="dash__grid">
        <button
          v-for="v in vaults"
          :key="v.id"
          type="button"
          class="dash__card"
          :class="{ 'dash__card--active': v.id === selected?.id }"
          @click="select(v.id)"
        >
          <VaultStatusCard :vault="v" />
        </button>
      </div>

      <section v-if="selected" class="dash__detail">
        <h2 class="dash__detail-title">{{ selected.name }}</h2>
        <div class="dash__detail-grid">
          <RunSummary :stats="selected.result.stats" :exit-code="selected.result.exitCode" />
          <FindingsList :findings="selected.result.findings" title="Findings" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.dash__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dash__totals {
  display: flex;
  gap: 18px;
  font-size: 0.95rem;
  color: var(--mc-text-muted);
}
.dash__total strong {
  color: var(--mc-text);
  font-size: 1.2rem;
}
.dash__total--pass strong {
  color: var(--mc-pass);
}
.dash__total--fail strong {
  color: var(--mc-fail);
}
.dash__empty {
  padding: 24px;
  text-align: center;
  color: var(--mc-text-muted);
  background: var(--mc-surface);
  border: 1px dashed var(--mc-border);
  border-radius: var(--mc-radius);
}
.dash__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--mc-gap);
}
.dash__card {
  display: block;
  text-align: left;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--mc-radius);
  transition: transform 0.08s ease;
}
.dash__card:hover {
  transform: translateY(-2px);
}
.dash__card--active {
  outline: 2px solid var(--mc-report);
  outline-offset: 2px;
}
.dash__detail-title {
  margin: 0 0 12px;
  font-size: 1.1rem;
}
.dash__detail-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 2fr;
  gap: var(--mc-gap);
  align-items: start;
}
@media (max-width: 720px) {
  .dash__detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
