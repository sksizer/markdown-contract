<script setup lang="ts">
/**
 * VaultStatusCard — at-a-glance pass/fail status for a single managed vault,
 * plus per-level finding counts and scan/match stats.
 *
 * Pure presentational component (data in via props; no engine import).
 */
import { computed } from "vue";
import { countByLevel } from "../mocks/builders";
import type { VaultSummary } from "../mocks/types";

const props = defineProps<{ vault: VaultSummary }>();

const passed = computed(() => props.vault.result.exitCode === 0);
const counts = computed(() => countByLevel(props.vault.result.findings));
const stats = computed(() => props.vault.result.stats);
</script>

<template>
  <article class="vsc" :class="passed ? 'vsc--pass' : 'vsc--fail'">
    <header class="vsc__head">
      <div class="vsc__id">
        <h3 class="vsc__name">{{ vault.name }}</h3>
        <code class="vsc__path">{{ vault.path }}</code>
      </div>
      <span class="vsc__status" :class="passed ? 'vsc__status--pass' : 'vsc__status--fail'">
        {{ passed ? "PASS" : "FAIL" }}
      </span>
    </header>

    <dl class="vsc__levels">
      <div class="vsc__level vsc__level--error">
        <dt>errors</dt>
        <dd>{{ counts.error }}</dd>
      </div>
      <div class="vsc__level vsc__level--warn">
        <dt>warnings</dt>
        <dd>{{ counts.warn }}</dd>
      </div>
      <div class="vsc__level vsc__level--report">
        <dt>reports</dt>
        <dd>{{ counts.report }}</dd>
      </div>
    </dl>

    <footer class="vsc__foot">
      <span>{{ stats.filesMatched }} / {{ stats.filesScanned }} files validated</span>
      <span class="vsc__exit">exit {{ vault.result.exitCode }}</span>
    </footer>
  </article>
</template>

<style scoped>
.vsc {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-top-width: 4px;
  border-radius: var(--mc-radius);
}
.vsc--pass {
  border-top-color: var(--mc-pass);
}
.vsc--fail {
  border-top-color: var(--mc-fail);
}
.vsc__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.vsc__name {
  margin: 0;
  font-size: 1.05rem;
}
.vsc__path {
  color: var(--mc-text-muted);
  font-size: 0.82rem;
}
.vsc__status {
  flex: 0 0 auto;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 999px;
}
.vsc__status--pass {
  color: var(--mc-pass);
  background: var(--mc-pass-bg);
}
.vsc__status--fail {
  color: var(--mc-fail);
  background: var(--mc-fail-bg);
}
.vsc__levels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
}
.vsc__level {
  text-align: center;
  padding: 8px 4px;
  border-radius: 6px;
  background: var(--mc-bg);
}
.vsc__level dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mc-text-muted);
}
.vsc__level dd {
  margin: 2px 0 0;
  font-size: 1.3rem;
  font-weight: 700;
}
.vsc__level--error dd {
  color: var(--mc-error);
}
.vsc__level--warn dd {
  color: var(--mc-warn);
}
.vsc__level--report dd {
  color: var(--mc-report);
}
.vsc__foot {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--mc-text-muted);
}
.vsc__exit {
  font-family: var(--mc-mono);
}
</style>
