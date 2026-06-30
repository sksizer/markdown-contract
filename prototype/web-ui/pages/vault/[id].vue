<script setup lang="ts">
/**
 * VaultDetail — the per-vault detail & findings drill-down screen (T-4CUI).
 *
 * A header (name, path, status, last-run, finding counts, per-contract pass/fail)
 * over the findings of one vault, in one of two presentations:
 *   - "grouped" (default): one ContractGroup per contract, with pass/fail.
 *   - "flat": a single severity-sorted list of FindingRow.
 *
 * Dual-surface: this SFC renders BOTH in the Nuxt app AND in `@storybook/vue3-vite`
 * (which is Nuxt-free — no auto-imports, no `<NuxtLink>`). So every Vue API and
 * every kit component is imported EXPLICITLY, and `useRoute()` (a Nuxt auto-import)
 * is reached only on the runtime path that Storybook never executes (stories always
 * pass the `vault` prop). Back-navigation is a plain anchor, not `<NuxtLink>`.
 */
import { computed } from "vue";
import { countByLevel, mockApi } from "~/mocks";
import { SEVERITY_ORDER, severityRank } from "~/design/tokens";
import type { Finding, VaultStatus } from "~/types";
import ContractGroup from "~/components/kit/ContractGroup.vue";
import EmptyState from "~/components/kit/EmptyState.vue";
import ErrorState from "~/components/kit/ErrorState.vue";
import FindingRow from "~/components/kit/FindingRow.vue";
import SeverityBadge from "~/components/kit/SeverityBadge.vue";
import StatusBadge from "~/components/kit/StatusBadge.vue";

const props = defineProps<{
  vault?: VaultStatus;
  presentation?: "grouped" | "flat";
}>();

/**
 * Resolve the vault: prefer the `vault` prop (Storybook), else load it by the
 * route `:id` (Nuxt runtime). The `props.vault` short-circuit guarantees
 * `useRoute()` — undefined under Storybook's vue3-vite — is only ever evaluated on
 * the runtime path, which Storybook never reaches.
 */
const vault = computed<VaultStatus | undefined>(() => {
  if (props.vault) return props.vault;
  const id = useRoute().params.id;
  return mockApi.getVault(String(id))?.vault;
});

const presentation = computed(() => props.presentation ?? "grouped");

/** The vault's findings — empty for green / running / error / drift-clean states. */
const findings = computed<Finding[]>(() => vault.value?.result?.findings ?? []);

const counts = computed(() => countByLevel(findings.value));
/** Only the severity levels actually present, so the header tally stays tight. */
const presentLevels = computed(() => SEVERITY_ORDER.filter((level) => counts.value[level] > 0));

/**
 * Group findings by CONTRACT. The mock `Finding` shape carries no explicit
 * contract field, so we use the first path segment of its namespaced rule id
 * (`area/.../name`) as the available proxy for "contract" — e.g.
 * "structure/section-missing" → "structure", "links/wikilink-unresolved" → "links".
 */
function contractOf(finding: Finding): string {
  const slash = finding.id.indexOf("/");
  return slash === -1 ? finding.id : finding.id.slice(0, slash);
}

interface ContractGrouping {
  title: string;
  findings: Finding[];
  /** pass/fail per contract: any error-level finding ⇒ fail, otherwise pass. */
  hasError: boolean;
}

const groups = computed<ContractGrouping[]>(() => {
  const byContract = new Map<string, Finding[]>();
  for (const finding of findings.value) {
    const key = contractOf(finding);
    const bucket = byContract.get(key);
    if (bucket) bucket.push(finding);
    else byContract.set(key, [finding]);
  }
  return [...byContract.entries()].map(([title, fs]) => ({
    title,
    findings: fs,
    hasError: fs.some((f) => f.level === "error"),
  }));
});

const passCount = computed(() => groups.value.filter((g) => !g.hasError).length);
const failCount = computed(() => groups.value.length - passCount.value);

/** The flat presentation: every finding, sorted most-severe first (error > warn > report). */
const flatFindings = computed<Finding[]>(() =>
  [...findings.value].sort((a, b) => severityRank(b.level) - severityRank(a.level)),
);

/**
 * Last-run timestamp, formatted DETERMINISTICALLY from the ISO string (never
 * locale-dependent `toLocaleString()`): "2026-06-30T12:00:00.000Z" → "2026-06-30 12:00 UTC".
 */
const lastRun = computed(() => {
  const iso = vault.value?.updatedAt ?? "";
  return iso.length >= 16 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : iso;
});

/** The pass/fail subtitle shown on each contract group's header. */
function passFailLabel(group: ContractGrouping): string {
  return group.hasError ? "Fail — contains error findings" : "Pass — no error findings";
}
</script>

<template>
  <!-- unknown id → first-class not-found state (never crash) -->
  <div v-if="!vault" class="vd vd--missing">
    <a class="vd__back" href="/">← All vaults</a>
    <ErrorState
      title="Vault not found"
      message="No vault is registered with that id. It may have been removed, or the link is stale."
    />
  </div>

  <div v-else class="vd">
    <a class="vd__back" href="/">← All vaults</a>

    <header class="vd__header">
      <div class="vd__id">
        <div class="vd__title-row">
          <h1 class="vd__name">{{ vault.name }}</h1>
          <StatusBadge :status="vault.state" />
        </div>
        <p class="vd__path"><code>{{ vault.path }}</code></p>
      </div>

      <dl class="vd__meta">
        <div class="vd__meta-item">
          <dt class="vd__meta-label">Last run</dt>
          <dd class="vd__meta-value">{{ lastRun }}</dd>
        </div>
        <div class="vd__meta-item">
          <dt class="vd__meta-label">Findings</dt>
          <dd class="vd__meta-value vd__counts">
            <span class="vd__total">{{ findings.length }} total</span>
            <SeverityBadge
              v-for="level in presentLevels"
              :key="level"
              :level="level"
              :count="counts[level]"
            />
          </dd>
        </div>
        <div v-if="groups.length > 0" class="vd__meta-item">
          <dt class="vd__meta-label">Contracts</dt>
          <dd class="vd__meta-value vd__contracts">
            <span class="vd__pass">{{ passCount }} pass</span>
            <span class="vd__fail">{{ failCount }} fail</span>
          </dd>
        </div>
      </dl>
    </header>

    <!-- the run itself failed: surface the message, then a clean findings area -->
    <ErrorState
      v-if="vault.error"
      class="vd__error"
      title="Run could not complete"
      :message="vault.error.message"
    />

    <section class="vd__body">
      <!-- green / zero-findings state -->
      <EmptyState
        v-if="findings.length === 0"
        icon="✓"
        title="No findings"
        message="This vault validates clean — every document satisfies its contract."
      />

      <!-- grouped: one ContractGroup per contract, each with pass/fail -->
      <template v-else-if="presentation === 'grouped'">
        <ContractGroup
          v-for="group in groups"
          :key="group.title"
          :title="group.title"
          :subtitle="passFailLabel(group)"
          :findings="group.findings"
        />
      </template>

      <!-- flat: a single severity-sorted list of FindingRow -->
      <div v-else class="vd__flat">
        <FindingRow v-for="(f, i) in flatFindings" :key="`${f.id}-${i}`" :finding="f" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.vd {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.vd__back {
  align-self: flex-start;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}
.vd__back:hover {
  text-decoration: underline;
}
.vd__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  padding: 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.vd__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.vd__name {
  margin: 0;
  font-size: 1.3rem;
}
.vd__path {
  margin: 6px 0 0;
  color: var(--mc-text-muted);
  font-size: 0.85rem;
}
.vd__meta {
  display: flex;
  gap: 24px;
  margin: 0;
  flex-wrap: wrap;
}
.vd__meta-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vd__meta-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-muted);
}
.vd__meta-value {
  margin: 0;
  font-size: 0.95rem;
}
.vd__counts {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.vd__total {
  font-variant-numeric: tabular-nums;
  color: var(--mc-text-muted);
}
.vd__contracts {
  display: flex;
  gap: 12px;
  font-variant-numeric: tabular-nums;
}
.vd__pass {
  color: var(--mc-pass);
  font-weight: 600;
}
.vd__fail {
  color: var(--mc-fail);
  font-weight: 600;
}
.vd__body {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
}
.vd__flat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
@media (max-width: 640px) {
  .vd__header {
    flex-direction: column;
  }
}
</style>
