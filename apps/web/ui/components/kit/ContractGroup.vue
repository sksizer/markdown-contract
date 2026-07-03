<script setup lang="ts">
/**
 * ContractGroup — a titled group of findings for one contract / rule area.
 *
 * Header: title, optional subtitle, and a tally — either per-level SeverityBadge
 * counts when findings exist, or a green "Clean" StatusBadge when empty. Body:
 * a FindingRow per finding, or a first-class inline clean message when empty.
 *
 * Pure presentational: data in via props, accents delegated to the badge/row
 * children (design/tokens.ts). No Nuxt imports.
 */
import { computed } from "vue";
import { SEVERITY_ORDER } from "../../design/tokens";
import { countByLevel } from "../../lib/findings";
import type { Finding } from "../../types";
import FindingRow from "./FindingRow.vue";
import SeverityBadge from "./SeverityBadge.vue";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps<{
  title: string;
  findings: Finding[];
  subtitle?: string;
}>();

const hasFindings = computed(() => props.findings.length > 0);
const counts = computed(() => countByLevel(props.findings));
/** only the levels actually present, so the tally stays tight */
const presentLevels = computed(() => SEVERITY_ORDER.filter((level) => counts.value[level] > 0));
</script>

<template>
  <section class="cg">
    <header class="cg__head">
      <div class="cg__id">
        <h3 class="cg__title">{{ title }}</h3>
        <p v-if="subtitle" class="cg__subtitle">{{ subtitle }}</p>
      </div>
      <div class="cg__tally">
        <template v-if="hasFindings">
          <SeverityBadge
            v-for="level in presentLevels"
            :key="level"
            :level="level"
            :count="counts[level]"
          />
        </template>
        <StatusBadge v-else status="green" label="Clean" size="sm" />
      </div>
    </header>

    <div v-if="hasFindings" class="cg__list">
      <FindingRow v-for="(f, i) in findings" :key="`${f.id}-${i}`" :finding="f" />
    </div>
    <p v-else class="cg__clean">
      No findings — every document in this group validates cleanly.
    </p>
  </section>
</template>

<style scoped>
.cg {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.cg__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
.cg__title {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}
.cg__subtitle {
  margin: 1px 0 0;
  font-size: 11.5px;
  color: var(--mc-text-muted);
}
.cg__tally {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}
.cg__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cg__clean {
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--mc-text-muted);
  background: var(--mc-status-green-bg);
  border-radius: var(--mc-radius);
}
</style>
