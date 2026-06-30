<script setup lang="ts">
/**
 * FindingsList — renders an engine `Finding[]` as a scannable list with
 * per-level styling (error / warn / report), the `<path>:<line>` location, the
 * message, and the optional fix description.
 *
 * Pure presentational component: data in via props, no engine import, no Nuxt
 * auto-imports — so it renders identically in the app shell and in Storybook,
 * and can graft into a future apps/web unchanged.
 */
import type { Finding } from "../mocks/types";

const props = withDefaults(
  defineProps<{
    findings: Finding[];
    /** optional heading above the list */
    title?: string;
  }>(),
  { title: "" },
);

const LEVEL_LABEL: Record<Finding["level"], string> = {
  error: "ERROR",
  warn: "WARN",
  report: "REPORT",
};

function location(f: Finding): string {
  if (!f.pos) return f.path;
  const col = f.pos.col != null ? `:${f.pos.col}` : "";
  return `${f.path}:${f.pos.line}${col}`;
}
</script>

<template>
  <section class="fl">
    <h3 v-if="title" class="fl__title">{{ title }}</h3>

    <p v-if="findings.length === 0" class="fl__empty" data-test="findings-empty">
      No findings — this document validates cleanly.
    </p>

    <ul v-else class="fl__list">
      <li
        v-for="(f, i) in findings"
        :key="`${f.id}-${i}`"
        class="fl__item"
        :class="`fl__item--${f.level}`"
      >
        <span class="fl__badge" :class="`fl__badge--${f.level}`">{{ LEVEL_LABEL[f.level] }}</span>
        <div class="fl__body">
          <div class="fl__head">
            <code class="fl__id">{{ f.id }}</code>
            <code class="fl__loc">{{ location(f) }}</code>
          </div>
          <p class="fl__msg">{{ f.message }}</p>
          <p v-if="f.fix" class="fl__fix">
            <span class="fl__fix-label">fix</span> {{ f.fix.description }}
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.fl__title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 600;
}
.fl__empty {
  margin: 0;
  padding: 12px 14px;
  color: var(--mc-text-muted);
  background: var(--mc-pass-bg);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.fl__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fl__item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-left-width: 4px;
  border-radius: var(--mc-radius);
}
.fl__item--error {
  border-left-color: var(--mc-error);
}
.fl__item--warn {
  border-left-color: var(--mc-warn);
}
.fl__item--report {
  border-left-color: var(--mc-report);
}
.fl__badge {
  flex: 0 0 auto;
  align-self: flex-start;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
}
.fl__badge--error {
  color: var(--mc-error);
  background: var(--mc-error-bg);
}
.fl__badge--warn {
  color: var(--mc-warn);
  background: var(--mc-warn-bg);
}
.fl__badge--report {
  color: var(--mc-report);
  background: var(--mc-report-bg);
}
.fl__body {
  min-width: 0;
}
.fl__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
}
.fl__id {
  font-weight: 600;
}
.fl__loc {
  color: var(--mc-text-muted);
}
.fl__msg {
  margin: 4px 0 0;
}
.fl__fix {
  margin: 6px 0 0;
  color: var(--mc-text-muted);
  font-size: 0.9rem;
}
.fl__fix-label {
  text-transform: uppercase;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--mc-pass);
  margin-right: 4px;
}
</style>
