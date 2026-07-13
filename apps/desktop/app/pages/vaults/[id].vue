<script setup lang="ts">
/**
 * Vault detail — one vault's health in depth (D-0018 §D5/§D6): watch/schedule
 * editing (cron validated at the backend seam), the latest finished run's
 * findings grouped per file (kit ContractGroup/FindingRow) with per-finding
 * "open file in …", the vault-level open-in menu, and the run history.
 * Refreshes on every "scan:completed" event for this vault.
 */
import { ContractGroup, EmptyState, FindingRow, StatusBadge, Toolbar } from "@markdown-contract/ui";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import type { FindingRecord, ScanRun, Vault } from "../../bindings/types";
import OpenInMenu from "../../components/OpenInMenu.vue";
import RunHistory from "../../components/RunHistory.vue";
import { useScanEvents } from "../../composables/useScanEvents";
import { useVaults } from "../../composables/useVaults";
import { scheduleLabel } from "../../utils/format";
import {
  groupFindingsByFile,
  joinVaultPath,
  runsForVault,
  statusKeyFor,
} from "../../utils/vaultView";

const route = useRoute();
const vaultId = computed(() => String(route.params.id));
const vaultsSvc = useVaults();

const vault = ref<Vault | null>(null);
const runs = ref<ScanRun[]>([]);
const findings = ref<FindingRecord[]>([]);
const loadError = ref<string | null>(null);

// Watch/schedule editing state, seeded from the vault on load.
const watchEnabled = ref(false);
const schedule = ref("");
const saveBusy = ref(false);
const saveError = ref<string | null>(null);
const scanBusy = ref(false);

const vaultRuns = computed(() => runsForVault(runs.value, vaultId.value));
/** The latest run that actually finished — the findings shown below. */
const latestFinished = computed(() => vaultRuns.value.find((r) => r.finished_at !== null) ?? null);
const latestFindings = computed(() =>
  latestFinished.value === null
    ? []
    : findings.value.filter((f) => f.scan_run_id === latestFinished.value?.id),
);
const fileGroups = computed(() => groupFindingsByFile(latestFindings.value));
const status = computed(() => statusKeyFor(vaultRuns.value[0] ?? null));

const dirty = computed(
  () =>
    vault.value !== null &&
    (watchEnabled.value !== vault.value.watch_enabled ||
      schedule.value.trim() !== (vault.value.schedule ?? "")),
);

async function load() {
  try {
    const [v, allRuns, allFindings] = await Promise.all([
      vaultsSvc.get(vaultId.value),
      vaultsSvc.runs(),
      vaultsSvc.findings(),
    ]);
    vault.value = v;
    runs.value = allRuns;
    findings.value = allFindings;
    watchEnabled.value = v.watch_enabled;
    schedule.value = v.schedule ?? "";
    loadError.value = null;
  } catch (e) {
    loadError.value = String(e);
  }
}

async function saveSettings() {
  if (vault.value === null) return;
  saveBusy.value = true;
  try {
    // Backend seam validates the cron and rearms watcher/scheduler.
    vault.value = await vaultsSvc.update(vault.value.id, {
      watch_enabled: watchEnabled.value,
      schedule: schedule.value.trim() === "" ? null : schedule.value.trim(),
      updated_at: new Date().toISOString(),
    });
    saveError.value = null;
  } catch (e) {
    saveError.value = String(e);
  } finally {
    saveBusy.value = false;
  }
}

async function scanNow() {
  scanBusy.value = true;
  try {
    await vaultsSvc.scanNow(vaultId.value);
    loadError.value = null;
  } catch (e) {
    loadError.value = String(e);
  } finally {
    scanBusy.value = false;
    await load();
  }
}

let unlisten: UnlistenFn | undefined;
onMounted(async () => {
  await load();
  unlisten = await useScanEvents().onScanCompleted((payload) => {
    if (payload.vault_id === vaultId.value) void load();
  });
});
onUnmounted(() => unlisten?.());
</script>

<template>
  <div>
    <Toolbar :title="vault?.name ?? 'Vault'">
      <template #meta>
        <StatusBadge v-if="scanBusy" status="running" />
        <StatusBadge v-else-if="status" :status="status" />
      </template>
      <button type="button" class="mc-btn" :disabled="scanBusy" @click="scanNow">
        {{ scanBusy ? "Scanning…" : "Scan now" }}
      </button>
      <OpenInMenu v-if="vault" :path="vault.path" kind="dir" label="Open vault in …" />
      <NuxtLink to="/" class="mc-btn">← All vaults</NuxtLink>
    </Toolbar>

    <main class="page">
      <p v-if="loadError" class="mc-error">{{ loadError }}</p>

      <template v-if="vault">
        <!-- Settings: path facts + watch/schedule editing. -->
        <section class="panel">
          <h2 class="panel__title">Settings</h2>
          <div class="settings">
            <span class="settings__label">Path</span>
            <code class="settings__value">{{ vault.path }}</code>

            <span class="settings__label">Config</span>
            <code class="settings__value">{{ vault.config_path }}</code>

            <span class="settings__label">Watch</span>
            <label class="settings__check" for="vd-watch">
              <input id="vd-watch" v-model="watchEnabled" type="checkbox" />
              re-scan when files change
            </label>

            <label class="settings__label" for="vd-schedule">Schedule</label>
            <input
              id="vd-schedule"
              v-model="schedule"
              class="mc-field settings__schedule"
              type="text"
              placeholder="cron, e.g. 0 9 * * * (empty = unscheduled)"
              spellcheck="false"
            />
          </div>
          <p v-if="saveError" class="mc-error">{{ saveError }}</p>
          <div class="panel__actions">
            <span class="settings__hint">{{ scheduleLabel(vault.schedule) }}</span>
            <button
              type="button"
              class="mc-btn mc-btn--primary"
              :disabled="!dirty || saveBusy"
              @click="saveSettings"
            >
              {{ saveBusy ? "Saving…" : "Save changes" }}
            </button>
          </div>
        </section>

        <!-- Latest findings, grouped per file, each openable in a detected app. -->
        <section class="panel">
          <h2 class="panel__title">
            Latest findings
            <span v-if="latestFinished" class="panel__subtitle">
              from the {{ latestFinished.trigger }} run
            </span>
          </h2>
          <EmptyState
            v-if="!latestFinished"
            icon="◌"
            title="No finished runs yet"
            message="Scan the vault to see its findings here."
          />
          <ContractGroup
            v-else-if="fileGroups.length === 0"
            title="All documents"
            subtitle="latest finished run"
            :findings="[]"
          />
          <div v-else class="groups">
            <section v-for="group in fileGroups" :key="group.file" class="group">
              <header class="group__head">
                <code class="group__file">{{ group.file }}</code>
                <OpenInMenu
                  :path="joinVaultPath(vault.path, group.file)"
                  kind="file"
                  label="Open file in …"
                />
              </header>
              <FindingRow
                v-for="(finding, i) in group.findings"
                :key="`${finding.id}-${i}`"
                :finding="finding"
              />
            </section>
          </div>
        </section>

        <!-- Run history. -->
        <section class="panel">
          <h2 class="panel__title">Run history</h2>
          <EmptyState
            v-if="vaultRuns.length === 0"
            icon="◌"
            title="Never scanned"
            message="Runs land here as they happen — manual, watch, schedule, and startup."
          />
          <RunHistory v-else :runs="vaultRuns" />
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  padding: 14px 18px 32px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.panel__title {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.panel__subtitle {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--mc-text-faint);
}
.panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.settings {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 12px;
  align-items: center;
}
.settings__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.settings__value {
  font-size: 11.5px;
  color: var(--mc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.settings__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
}
.settings__schedule {
  font-family: var(--mc-mono);
  max-width: 320px;
}
.settings__hint {
  font-size: 11px;
  color: var(--mc-text-faint);
  font-family: var(--mc-mono);
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.group__file {
  font-size: 12px;
  font-weight: 600;
}
</style>
