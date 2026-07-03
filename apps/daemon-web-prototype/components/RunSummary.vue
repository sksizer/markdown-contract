<script setup lang="ts">
/**
 * RunSummary — a compact panel over the engine's `RunStats` (files scanned /
 * matched / unmatched) plus the per-rule matched breakdown and the run exit code.
 *
 * Pure presentational component (data in via props; no engine import).
 */
import { computed } from "vue";
import type { RunStats } from "../mocks/types";

const props = withDefaults(
  defineProps<{
    stats: RunStats;
    /** the run's CI exit code, shown as a status pill when provided */
    exitCode?: number;
  }>(),
  { exitCode: undefined },
);

const passed = computed(() => props.exitCode === 0);
</script>

<template>
  <section class="rs">
    <header class="rs__head">
      <h3 class="rs__title">Run summary</h3>
      <span
        v-if="exitCode !== undefined"
        class="rs__exit"
        :class="passed ? 'rs__exit--pass' : 'rs__exit--fail'"
      >
        exit {{ exitCode }}
      </span>
    </header>

    <dl class="rs__grid">
      <div class="rs__stat">
        <dt>scanned</dt>
        <dd>{{ stats.filesScanned }}</dd>
      </div>
      <div class="rs__stat">
        <dt>matched</dt>
        <dd>{{ stats.filesMatched }}</dd>
      </div>
      <div class="rs__stat">
        <dt>unmatched</dt>
        <dd>{{ stats.filesUnmatched }}</dd>
      </div>
    </dl>

    <div class="rs__rules">
      <span class="rs__rules-label">matched by rule</span>
      <ol class="rs__rule-list">
        <li v-for="(n, i) in stats.matchedByRule" :key="i" class="rs__rule">
          <span class="rs__rule-idx">#{{ i }}</span>
          <span class="rs__rule-n">{{ n }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.rs {
  padding: 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.rs__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rs__title {
  margin: 0;
  font-size: 0.95rem;
}
.rs__exit {
  font-family: var(--mc-mono);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
}
.rs__exit--pass {
  color: var(--mc-pass);
  background: var(--mc-pass-bg);
}
.rs__exit--fail {
  color: var(--mc-fail);
  background: var(--mc-fail-bg);
}
.rs__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 14px 0 0;
}
.rs__stat {
  text-align: center;
  padding: 10px 4px;
  background: var(--mc-bg);
  border-radius: 6px;
}
.rs__stat dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mc-text-muted);
}
.rs__stat dd {
  margin: 2px 0 0;
  font-size: 1.4rem;
  font-weight: 700;
}
.rs__rules {
  margin-top: 14px;
}
.rs__rules-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mc-text-muted);
}
.rs__rule-list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 0;
  padding: 0;
}
.rs__rule {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 8px;
  background: var(--mc-report-bg);
  border-radius: 6px;
  font-size: 0.82rem;
}
.rs__rule-idx {
  font-family: var(--mc-mono);
  color: var(--mc-report);
}
.rs__rule-n {
  font-weight: 700;
}
</style>
