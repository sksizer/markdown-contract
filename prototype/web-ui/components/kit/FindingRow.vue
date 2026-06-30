<script setup lang="ts">
/**
 * FindingRow — one engine `Finding` rendered as a single row: a SeverityBadge,
 * the finding id, its `path:line:col` location, the message, and an optional fix
 * description.
 *
 * Pure presentational: finding in via props, severity styling delegated to
 * SeverityBadge (which binds its colors from design/tokens.ts). No Nuxt imports.
 */
import { computed } from "vue";
import type { Finding } from "../../mocks/types";
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
  gap: 10px;
  padding: 10px 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-left-width: 4px;
  border-radius: var(--mc-radius);
}
.fr--error {
  border-left-color: #d1242f;
}
.fr--warn {
  border-left-color: #9a6700;
}
.fr--report {
  border-left-color: #0a66c2;
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
  font-weight: 600;
}
.fr__loc {
  color: var(--mc-text-muted);
}
.fr__msg {
  margin: 4px 0 0;
}
.fr__fix {
  margin: 6px 0 0;
  color: var(--mc-text-muted);
  font-size: 0.9rem;
}
.fr__fix-label {
  text-transform: uppercase;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--mc-pass);
  margin-right: 4px;
}
</style>
