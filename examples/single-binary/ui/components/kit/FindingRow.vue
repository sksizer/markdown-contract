<script setup lang="ts">
/**
 * FindingRow — one engine `Finding` rendered as a single dense row: a
 * SeverityBadge, the finding id, its mono `path:line:col` location, the
 * message, and an optional fix description.
 *
 * Pure presentational: finding in via props; the severity accent comes from
 * the `--mc-sev-*` custom properties (the same vars design/tokens.ts binds).
 * No Nuxt imports.
 */
import { computed } from "vue";
import type { Finding } from "../../types";
import SeverityBadge from "./SeverityBadge.vue";

const props = defineProps<{ finding: Finding }>();

/** `path:line:col`, dropping line/col when the finding has no source position. */
const location = computed(() => {
  const f = props.finding;
  if (!f.pos) return f.path;
  const col = f.pos.col != null ? `:${f.pos.col}` : "";
  return `${f.path}:${f.pos.line}${col}`;
});
</script>

<template>
  <div class="fr" :class="`fr--${finding.level}`">
    <SeverityBadge :level="finding.level" />
    <div class="fr__body">
      <div class="fr__head">
        <code class="fr__id">{{ finding.id }}</code>
        <code class="fr__loc">{{ location }}</code>
      </div>
      <p class="fr__msg">{{ finding.message }}</p>
      <p v-if="finding.fix" class="fr__fix">
        <span class="fr__fix-label">fix</span> {{ finding.fix.description }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.fr {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-left-width: 3px;
  border-radius: var(--mc-radius);
}
.fr--error {
  border-left-color: var(--mc-sev-error);
}
.fr--warn {
  border-left-color: var(--mc-sev-warn);
}
.fr--report {
  border-left-color: var(--mc-sev-report);
}
.fr__body {
  min-width: 0;
}
.fr__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
}
.fr__id {
  font-size: 11.5px;
  font-weight: 600;
}
.fr__loc {
  font-size: 11px;
  color: var(--mc-text-muted);
  font-variant-numeric: tabular-nums;
}
.fr__msg {
  margin: 2px 0 0;
  font-size: 12.5px;
}
.fr__fix {
  margin: 3px 0 0;
  color: var(--mc-text-muted);
  font-size: 11.5px;
}
.fr__fix-label {
  text-transform: uppercase;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--mc-status-green);
  margin-right: 4px;
}
</style>
