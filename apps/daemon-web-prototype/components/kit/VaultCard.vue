<script setup lang="ts">
/**
 * VaultCard — a richer, status-token-driven card for one managed vault.
 *
 * Header: name + path + a StatusBadge. Body: per-level finding counts as
 * SeverityBadges. Footer: files-validated + exit code. The status is derived from
 * the vault's RunResult via `statusForVault`, but a `status` prop can override it
 * for externally-driven live states (drift / running / error).
 *
 * Pure presentational: data in via props, accents from design/tokens.ts (via the
 * badge children), structural styling from `--mc-*`. No Nuxt imports.
 */
import { computed } from "vue";
import { countByLevel } from "../../mocks/builders";
import type { VaultSummary } from "../../mocks/types";
import { SEVERITY_ORDER, type StatusKey, statusForVault, statusTokens } from "../../design/tokens";
import SeverityBadge from "./SeverityBadge.vue";
import StatusBadge from "./StatusBadge.vue";

const props = withDefaults(
  defineProps<{
    vault: VaultSummary;
    /** override the derived status (for live drift / running / error states) */
    status?: StatusKey;
    selected?: boolean;
  }>(),
  { selected: false },
);

const resolvedStatus = computed<StatusKey>(() => props.status ?? statusForVault(props.vault));
const token = computed(() => statusTokens[resolvedStatus.value]);
const counts = computed(() => countByLevel(props.vault.result.findings));
const stats = computed(() => props.vault.result.stats);
const hasFindings = computed(() => props.vault.result.findings.length > 0);
</script>

<template>
  <article
    class="vc"
    :class="{ 'vc--selected': selected }"
    :style="{ borderTopColor: token.color, ...(selected ? { outlineColor: token.color } : {}) }"
  >
    <header class="vc__head">
      <div class="vc__id">
        <h3 class="vc__name">{{ vault.name }}</h3>
        <code class="vc__path">{{ vault.path }}</code>
      </div>
      <StatusBadge :status="resolvedStatus" />
    </header>

    <div class="vc__levels">
      <template v-if="hasFindings">
        <SeverityBadge
          v-for="level in SEVERITY_ORDER"
          :key="level"
          :level="level"
          :count="counts[level]"
        />
      </template>
      <span v-else class="vc__clean">No findings</span>
    </div>

    <footer class="vc__foot">
      <span>{{ stats.filesMatched }} / {{ stats.filesScanned }} files validated</span>
      <span class="vc__exit">exit {{ vault.result.exitCode }}</span>
    </footer>
  </article>
</template>

<style scoped>
.vc {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-top-width: 4px;
  border-radius: var(--mc-radius);
}
.vc--selected {
  outline: 2px solid;
  outline-offset: 2px;
}
.vc__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.vc__name {
  margin: 0;
  font-size: 1.05rem;
}
.vc__path {
  color: var(--mc-text-muted);
  font-size: 0.82rem;
}
.vc__levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.vc__clean {
  font-size: 0.82rem;
  color: var(--mc-text-muted);
}
.vc__foot {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--mc-text-muted);
}
.vc__exit {
  font-family: var(--mc-mono);
}
</style>
