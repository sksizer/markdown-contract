<script setup lang="ts">
/**
 * VaultDetail — the per-vault detail & findings drill-down screen (T-4CUI).
 *
 * A sticky toolbar (name, status, actions: validate / drift / watch / edit
 * contracts / remove) over a dense meta strip and the findings of one vault,
 * in one of two presentations:
 *   - "grouped" (default): one ContractGroup per contract, with pass/fail.
 *   - "flat": a single severity-sorted list of FindingRow.
 *
 * LIVE-WIRED: the vault loads from the daemon's `GET /api/vaults/:id`; the
 * actions drive the real routes; and any event on the SHARED app SSE stream
 * (useVaults — this page opens no EventSource of its own) about this vault
 * re-pulls the row so watch-triggered runs land live.
 */

import {
  ContractGroup,
  countByLevel,
  EmptyState,
  ErrorState,
  FindingRow,
  LoadingState,
  SEVERITY_ORDER,
  SeverityBadge,
  StatusBadge,
  severityRank,
  Toolbar,
} from "@markdown-contract/ui";
import { computed, onMounted, ref, watch } from "vue";
import DriftView from "~/components/DriftView.vue";
import { apiErrorMessage, useApi } from "~/composables/useApi";
import { useVaults } from "~/composables/useVaults";
import type { Finding, InitVaultResponse, VaultStatus } from "~/types";

const props = defineProps<{
  presentation?: "grouped" | "flat";
}>();

const api = useApi();
const routeId = String(useRoute().params.id);

// The SHARED store: its stream feeds live re-pulls; its refresh keeps the
// sidebar/dashboard rows honest after mutations made from this page.
const { stream, refresh: refreshVaults } = useVaults();

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
type Action = "" | "validate" | "check" | "init" | "remove";
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

/** Unregister the vault (files on disk untouched) and return to the dashboard. */
async function removeVault(): Promise<void> {
  if (!vault.value) return;
  const ok = window.confirm(
    `Remove "${vault.value.name}" from the daemon? The files on disk are untouched.`,
  );
  if (!ok) return;
  busy.value = "remove";
  actionError.value = "";
  try {
    await api.removeVault(routeId);
    await refreshVaults();
    await navigateTo("/");
  } catch (err) {
    actionError.value = apiErrorMessage(err);
    busy.value = "";
  }
}

// ── live: any event about this vault on the SHARED stream → re-pull the row ────
watch(
  () => stream.lastEvent.value,
  (event) => {
    if (event && event.vaultId === routeId && busy.value === "") void load();
  },
);

onMounted(() => {
  void load();
});

// (named presentationMode so the local binding never shadows the `presentation` prop)
const presentationMode = computed(() => props.presentation ?? "grouped");

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
  <div v-if="!vault && loading" class="vd">
    <Toolbar title="Vault" />
    <div class="page-body">
      <LoadingState label="Loading vault…" />
    </div>
  </div>

  <!-- unknown id → first-class not-found state (never crash) -->
  <div v-else-if="!vault" class="vd">
    <Toolbar title="Vault not found" />
    <div class="page-body">
      <ErrorState
        title="Vault not found"
        message="No vault is registered with that id. It may have been removed, or the link is stale."
      >
        <NuxtLink class="btn" to="/">← All vaults</NuxtLink>
      </ErrorState>
    </div>
  </div>

  <div v-else class="vd">
    <Toolbar :title="vault.name">
      <template #meta>
        <StatusBadge :status="vault.state" size="sm" />
        <span v-if="busy !== ''" class="vd__busy">{{ busy }} running…</span>
      </template>

      <button class="btn" type="button" :disabled="busy !== ''" @click="revalidate">
        <span aria-hidden="true">▶</span> Validate
      </button>
      <button class="btn" type="button" :disabled="busy !== ''" @click="checkDrift">
        <span aria-hidden="true">≠</span> Check drift
      </button>
      <button
        class="btn"
        :class="{ 'vd__watch--on': vault.watch !== false }"
        type="button"
        :aria-pressed="vault.watch !== false"
        @click="toggleVaultWatch"
      >
        {{ vault.watch !== false ? "● Watching" : "○ Watch off" }}
      </button>
      <button class="btn btn--ghost" type="button" :disabled="busy !== ''" @click="scaffold">
        <span aria-hidden="true">⚙</span> Infer contracts
      </button>
      <NuxtLink class="btn" :to="`/vault/${routeId}/edit`">
        <span aria-hidden="true">✎</span> Edit contracts
      </NuxtLink>
      <button class="btn btn--danger" type="button" :disabled="busy !== ''" @click="removeVault">
        Remove
      </button>
    </Toolbar>

    <div class="page-body">
      <!-- dense meta strip: path · last run · findings tally · contracts pass/fail -->
      <section class="vd__meta">
        <div class="vd__meta-item vd__meta-item--wide">
          <span class="vd__meta-label">Path</span>
          <code class="vd__meta-path">{{ vault.path }}</code>
        </div>
        <div class="vd__meta-item">
          <span class="vd__meta-label">Last run</span>
          <span class="vd__meta-value">{{ lastRun }}</span>
        </div>
        <div class="vd__meta-item">
          <span class="vd__meta-label">Findings</span>
          <span class="vd__meta-value vd__counts">
            <span class="vd__total">{{ findings.length }} total</span>
            <SeverityBadge
              v-for="level in presentLevels"
              :key="level"
              :level="level"
              :count="counts[level]"
            />
          </span>
        </div>
        <div v-if="groups.length > 0" class="vd__meta-item">
          <span class="vd__meta-label">Contracts</span>
          <span class="vd__meta-value vd__contracts">
            <span class="vd__pass">{{ passCount }} pass</span>
            <span class="vd__fail">{{ failCount }} fail</span>
          </span>
        </div>
      </section>

      <p v-if="actionError" class="vd__action-error" role="alert">{{ actionError }}</p>

      <div v-if="initOutput" class="vd__init">
        <header class="vd__init-head">
          <strong>init</strong> exited {{ initOutput.code }}
          <button class="btn btn--ghost" type="button" @click="initOutput = null">Dismiss</button>
        </header>
        <pre class="vd__init-out">{{ initOutput.stdout || initOutput.stderr }}</pre>
      </div>

      <!-- the run itself failed: surface the message, then a clean findings area -->
      <ErrorState
        v-if="vault.error"
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
        <template v-else-if="presentationMode === 'grouped'">
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
  </div>
</template>

<style scoped>
.vd {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.vd__busy {
  font-size: 11.5px;
  color: var(--mc-text-muted);
  white-space: nowrap;
}
.vd__watch--on {
  color: var(--mc-status-green);
  border-color: var(--mc-status-green);
}

/* meta strip */
.vd__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  padding: 9px 13px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.vd__meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.vd__meta-item--wide {
  flex: 1 1 100%;
}
.vd__meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.vd__meta-value {
  font-size: 12.5px;
}
.vd__meta-path {
  font-size: 11.5px;
  color: var(--mc-text-muted);
  word-break: break-all;
}
.vd__counts {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.vd__total {
  font-variant-numeric: tabular-nums;
  color: var(--mc-text-muted);
}
.vd__contracts {
  display: flex;
  gap: 10px;
  font-variant-numeric: tabular-nums;
}
.vd__pass {
  color: var(--mc-status-green);
  font-weight: 600;
}
.vd__fail {
  color: var(--mc-status-error);
  font-weight: 600;
}

.vd__action-error {
  margin: 0;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--mc-status-error);
  background: var(--mc-status-error-bg);
  border: 1px solid var(--mc-status-error);
  border-radius: var(--mc-radius);
}

.vd__init {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.vd__init-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.vd__init-out {
  margin: 0;
  padding: 8px 10px;
  font-size: 11.5px;
  background: var(--mc-surface-2);
  border-radius: var(--mc-radius);
  overflow-x: auto;
}

.vd__body {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
  flex: 1;
}
.vd__flat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
