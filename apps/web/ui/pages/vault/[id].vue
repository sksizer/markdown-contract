<script setup lang="ts">
/**
 * VaultDetail — the per-vault detail & findings drill-down screen (T-4CUI).
 *
 * A header (name, path, status, last-run, finding counts, per-contract pass/fail)
 * over the findings of one vault, in one of two presentations:
 *   - "grouped" (default): one ContractGroup per contract, with pass/fail.
 *   - "flat": a single severity-sorted list of FindingRow.
 *
 * LIVE-WIRED (was: the mockApi seam): the vault loads from the daemon's
 * `GET /api/vaults/:id`; the action row drives the real routes (re-run, drift
 * check, contract scaffolding via `init`, per-vault watch toggle); and any SSE
 * event about this vault re-pulls the row so watch-triggered runs land live.
 */
import { computed, onMounted, ref, watch } from "vue";
import { countByLevel } from "~/lib/findings";
import { SEVERITY_ORDER, severityRank } from "~/design/tokens";
import type { Finding, InitVaultResponse, VaultStatus } from "~/types";
import { apiErrorMessage, useApi, useApiBase } from "~/composables/useApi";
import { createEventStream } from "~/composables/useEventStream";
import DriftView from "~/components/DriftView.vue";
import ContractGroup from "~/components/kit/ContractGroup.vue";
import EmptyState from "~/components/kit/EmptyState.vue";
import ErrorState from "~/components/kit/ErrorState.vue";
import FindingRow from "~/components/kit/FindingRow.vue";
import LoadingState from "~/components/kit/LoadingState.vue";
import SeverityBadge from "~/components/kit/SeverityBadge.vue";
import StatusBadge from "~/components/kit/StatusBadge.vue";

const props = defineProps<{
  presentation?: "grouped" | "flat";
}>();

const api = useApi();
const routeId = String(useRoute().params.id);

const loaded = ref<VaultStatus | undefined>(undefined);
const loading = ref(true);
const vault = computed<VaultStatus | undefined>(() => loaded.value);

async function load(): Promise<void> {
  try {
    loaded.value = (await api.getVault(routeId)).vault;
  } catch {
    loaded.value = undefined;
  } finally {
    loading.value = false;
  }
}

// ── actions against the live daemon ─────────────────────────────────────────────
type Action = "" | "validate" | "check" | "init";
const busy = ref<Action>("");
const actionError = ref("");
const initOutput = ref<InitVaultResponse | null>(null);

async function runAction(kind: Action, fn: () => Promise<unknown>): Promise<void> {
  busy.value = kind;
  actionError.value = "";
  try {
    await fn();
  } catch (err) {
    actionError.value = apiErrorMessage(err);
  } finally {
    await load();
    busy.value = "";
  }
}

const revalidate = () => runAction("validate", () => api.validateVault(routeId));
const checkDrift = () => runAction("check", () => api.checkVault(routeId));
const scaffold = () =>
  runAction("init", async () => {
    initOutput.value = await api.initVault(routeId, {});
  });

async function toggleVaultWatch(): Promise<void> {
  if (!vault.value) return;
  await api.setWatch(routeId, vault.value.watch === false);
  await load();
}

// ── live: any event about this vault → re-pull the row ─────────────────────────
const stream = createEventStream(useApiBase());
watch(
  () => stream.lastEvent.value,
  (event) => {
    if (event && event.vaultId === routeId && busy.value === "") void load();
  },
);

onMounted(() => {
  void load();
  stream.start();
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
  <!-- first load -->
  <div v-if="!vault && loading" class="vd vd--missing">
    <a class="vd__back" href="/">← All vaults</a>
    <LoadingState label="Loading vault…" />
  </div>

  <!-- unknown id → first-class not-found state (never crash) -->
  <div v-else-if="!vault" class="vd vd--missing">
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

    <!-- actions against the live daemon -->
    <div class="vd__toolbar">
      <button class="vd__action" type="button" :disabled="busy !== ''" @click="revalidate">
        ▶ Re-run validation
      </button>
      <button class="vd__action" type="button" :disabled="busy !== ''" @click="checkDrift">
        ≠ Check drift
      </button>
      <button class="vd__action" type="button" :disabled="busy !== ''" @click="scaffold">
        ⚙ Infer contracts (init)
      </button>
      <button
        class="vd__action"
        :class="{ 'vd__action--on': vault.watch !== false }"
        type="button"
        @click="toggleVaultWatch"
      >
        {{ vault.watch !== false ? "● Watching files" : "○ Watch off" }}
      </button>
      <span v-if="busy !== ''" class="vd__busy">{{ busy }} running…</span>
    </div>
    <p v-if="actionError" class="vd__action-error">{{ actionError }}</p>
    <div v-if="initOutput" class="vd__init">
      <header class="vd__init-head">
        <strong>init</strong> exited {{ initOutput.code }}
        <button class="vd__action" type="button" @click="initOutput = null">dismiss</button>
      </header>
      <pre class="vd__init-out">{{ initOutput.stdout || initOutput.stderr }}</pre>
    </div>

    <!-- the run itself failed: surface the message, then a clean findings area -->
    <ErrorState
      v-if="vault.error"
      class="vd__error"
      title="Run could not complete"
      :message="vault.error.message"
    />

    <!-- the latest drift check, when one has run -->
    <DriftView
      v-if="vault.drift"
      :drift="vault.drift"
      :vault-name="vault.name"
      title="Contract drift"
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
.vd__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.vd__action {
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--mc-text);
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  cursor: pointer;
}
.vd__action:hover:not(:disabled) {
  border-color: var(--mc-report);
  color: var(--mc-report);
}
.vd__action:disabled {
  opacity: 0.5;
  cursor: default;
}
.vd__action--on {
  color: var(--mc-pass);
  border-color: var(--mc-pass);
}
.vd__busy {
  font-size: 0.82rem;
  color: var(--mc-text-muted);
}
.vd__action-error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--mc-fail);
}
.vd__init {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.vd__init-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}
.vd__init-out {
  margin: 0;
  font-size: 0.8rem;
  overflow-x: auto;
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
