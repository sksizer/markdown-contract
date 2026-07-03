<script setup lang="ts">
/**
 * AppHeader — the app layout/header as a reusable component, mirroring the band in
 * `layouts/default.vue` (brand logo, title, subtitle, a "mock data" tag pill).
 *
 * When `vaults` is provided, the right side shows an aggregated status summary —
 * counts of green vs findings vaults via `statusForVault` — as StatusBadges. The
 * default slot adds extra right-side content (e.g. a refresh button).
 *
 * Pure presentational: data in via props, accents via StatusBadge (design/tokens.ts),
 * structural styling from `--mc-*`. No Nuxt imports.
 */
import { computed } from "vue";
import type { VaultSummary } from "../../mocks/types";
import { statusForVault } from "../../design/tokens";
import StatusBadge from "./StatusBadge.vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    tag?: string;
    vaults?: VaultSummary[];
  }>(),
  {
    title: "markdown-contract",
    subtitle: "local vault dashboard — prototype",
    tag: "mock data",
  },
);

/** Per-status vault tally; only green/findings are derivable from a RunResult. */
const summary = computed(() => {
  let green = 0;
  let findings = 0;
  for (const v of props.vaults ?? []) {
    if (statusForVault(v) === "green") green += 1;
    else findings += 1;
  }
  return { green, findings };
});
const hasSummary = computed(() => (props.vaults?.length ?? 0) > 0);
</script>

<template>
  <header class="ah">
    <div class="ah__bar">
      <div class="ah__brand">
        <span class="ah__logo">md</span>
        <div>
          <h1 class="ah__title">{{ title }}</h1>
          <p v-if="subtitle" class="ah__subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <div class="ah__right">
        <div v-if="hasSummary" class="ah__summary">
          <StatusBadge status="green" :label="`${summary.green} green`" size="sm" />
          <StatusBadge status="findings" :label="`${summary.findings} findings`" size="sm" />
        </div>
        <slot />
        <span v-if="tag" class="ah__tag">{{ tag }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.ah {
  background: var(--mc-surface);
  border-bottom: 1px solid var(--mc-border);
}
.ah__bar {
  max-width: 1040px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.ah__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ah__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--mc-text);
  color: #fff;
  font-family: var(--mc-mono);
  font-weight: 700;
}
.ah__title {
  margin: 0;
  font-size: 1.1rem;
}
.ah__subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--mc-text-muted);
}
.ah__right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ah__summary {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ah__tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-warn);
  background: var(--mc-warn-bg);
  padding: 4px 10px;
  border-radius: 999px;
}
</style>
