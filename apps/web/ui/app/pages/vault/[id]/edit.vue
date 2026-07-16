<script setup lang="ts">
/**
 * Contract editor — /vault/:id/edit: one vault's contract setup as a set of
 * YAML files (the router `markdown-contract.yaml`, kind: config, plus every
 * referenced `*.contract.yaml`), each editable as a FORM or as raw YAML.
 *
 * Single source of truth: the per-file text BUFFER. Form views derive from a
 * fresh `parseDocument(buffer)` on every change, and every form mutation is
 * reparse → Document-API surgery → `doc.toString()` back into the buffer —
 * never a plain-object rebuild — so comments and constructs the form can't
 * represent survive round-trips untouched.
 *
 * The daemon (engine parser) is the real validator on save; a failed save
 * surfaces inline via `apiErrorMessage`. Save triggers a background
 * revalidation whose live status lands through the SHARED SSE store
 * (useVaults) — the toolbar badge follows it with no extra wiring.
 */

import { EmptyState, ErrorState, LoadingState, StatusBadge, Toolbar } from "@markdown-contract/ui";
import { computed, onMounted, ref, watch } from "vue";
import type { Document } from "yaml";
import ConfigForm from "~/components/editor/ConfigForm.vue";
import ConfirmBar from "~/components/editor/ConfirmBar.vue";
import ContractForm from "~/components/editor/ContractForm.vue";
import FileList, { type FileListRow } from "~/components/editor/FileList.vue";
import YamlPane from "~/components/editor/YamlPane.vue";
import { apiErrorMessage, useApi } from "~/composables/useApi";
import { useVaults } from "~/composables/useVaults";
import {
  docErrorMessage,
  ensureEnvelope,
  openDoc,
  rootOf,
  STARTER_CONFIG_YAML,
  serializeDoc,
} from "~/lib/contract-doc";

const api = useApi();
const routeId = String(useRoute().params.id);

// The shared store names the vault and carries its live (SSE-fed) status.
const { vaults } = useVaults();
const vaultRow = computed(() => vaults.value.find((v) => v.id === routeId));
const vaultName = computed(() => vaultRow.value?.name ?? "Vault");

// ── file buffers (the single source of truth per file) ──────────────────────────

interface FileState {
  relPath: string;
  kind: "config" | "contract";
  exists: boolean;
  /** the daemon's parse verdict for the SAVED bytes (null = valid) */
  serverParseError: string | null;
  savedRaw: string;
  buffer: string;
}

const files = ref<FileState[]>([]);
const loading = ref(true);
const loadError = ref("");
const selectedPath = ref("");

const isDirty = (f: FileState): boolean => f.buffer !== f.savedRaw;
const selected = computed(() => files.value.find((f) => f.relPath === selectedPath.value));
const selectedDirty = computed(() => (selected.value ? isDirty(selected.value) : false));
const anyDirty = computed(() => files.value.some(isDirty));

/** (Re)pull the file set; `preserveDirty` keeps in-memory edits across the reload. */
async function reloadFiles(preserveDirty: boolean): Promise<void> {
  try {
    const res = await api.getConfigFiles(routeId);
    const previous = new Map(files.value.map((f) => [f.relPath, f]));
    files.value = res.files.map((f) => {
      const prev = previous.get(f.relPath);
      const keepBuffer = preserveDirty && prev !== undefined && isDirty(prev);
      return {
        relPath: f.relPath,
        kind: f.kind,
        exists: f.exists,
        serverParseError: f.parseError,
        savedRaw: f.raw,
        buffer: keepBuffer ? prev.buffer : f.raw,
      };
    });
    if (!files.value.some((f) => f.relPath === selectedPath.value)) {
      selectedPath.value = files.value[0]?.relPath ?? "";
    }
    loadError.value = "";
  } catch (err) {
    loadError.value = apiErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void reloadFiles(false));

// ── parse state + form availability for the selected buffer ─────────────────────

const selectedDoc = computed<Document | null>(() =>
  selected.value ? openDoc(selected.value.buffer) : null,
);
const selectedParseError = computed(() =>
  selectedDoc.value ? docErrorMessage(selectedDoc.value) : null,
);
const formAvailable = computed(
  () => selectedDoc.value !== null && selectedParseError.value === null,
);
const formRoot = computed<Record<string, unknown> | null>(() =>
  formAvailable.value && selectedDoc.value ? rootOf(selectedDoc.value) : null,
);

// ── mode (Form / YAML segmented toggle) ──────────────────────────────────────────

const mode = ref<"form" | "yaml">("form");

watch(selectedPath, () => {
  mode.value = formAvailable.value ? "form" : "yaml";
});
watch(formAvailable, (ok) => {
  if (!ok && mode.value === "form") mode.value = "yaml";
});

function toYamlMode(): void {
  mode.value = "yaml";
}

// ── the ONE mutation pipeline for form edits ─────────────────────────────────────

/**
 * Reparse the buffer, ensure the envelope (new files get `mcVersion: 2` +
 * the right `kind` — never edited afterwards), run the Document-API mutation,
 * serialize back. The buffer text is the truth; the form re-derives from it.
 */
function applyEdit(mutate: (doc: Document) => void): void {
  const file = selected.value;
  if (!file) return;
  const doc = openDoc(file.buffer);
  if (docErrorMessage(doc) !== null) return;
  ensureEnvelope(doc, file.kind);
  mutate(doc);
  file.buffer = serializeDoc(doc);
}

function onBufferInput(value: string): void {
  const file = selected.value;
  if (file) file.buffer = value;
}

// ── save / revert ────────────────────────────────────────────────────────────────

const saving = ref(false);
const saveError = ref("");

async function save(): Promise<void> {
  const file = selected.value;
  if (!file || !isDirty(file) || saving.value) return;
  saving.value = true;
  saveError.value = "";
  try {
    await api.saveConfigFile(routeId, { relPath: file.relPath, raw: file.buffer });
    file.savedRaw = file.buffer;
    file.exists = true;
    file.serverParseError = null;
    // The router's contract references may have changed — re-pull the file set
    // (keeping any other file's unsaved edits).
    await reloadFiles(true);
  } catch (err) {
    saveError.value = apiErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

function revert(): void {
  const file = selected.value;
  if (file) file.buffer = file.savedRaw;
  saveError.value = "";
}

// ── unsaved-changes guards (inline ConfirmBar, never window.confirm) ────────────

const pendingSwitch = ref<string | null>(null);
const pendingLeave = ref<string | null>(null);
let leaveApproved = false;

function onSelect(relPath: string): void {
  if (relPath === selectedPath.value) return;
  if (selected.value && isDirty(selected.value)) {
    pendingSwitch.value = relPath;
    return;
  }
  selectedPath.value = relPath;
}

function confirmSwitch(): void {
  if (pendingSwitch.value !== null) selectedPath.value = pendingSwitch.value;
  pendingSwitch.value = null;
}

onBeforeRouteLeave((to) => {
  if (leaveApproved || !anyDirty.value) return true;
  pendingLeave.value = to.fullPath;
  return false;
});

function confirmLeave(): void {
  leaveApproved = true;
  const target = pendingLeave.value;
  pendingLeave.value = null;
  if (target !== null) void navigateTo(target);
}

// ── empty state (no config on disk yet) ──────────────────────────────────────────

const routerFile = computed(() => files.value.find((f) => f.kind === "config"));
const showEmpty = computed(() => {
  const router = routerFile.value;
  return (
    !loading.value &&
    loadError.value === "" &&
    router !== undefined &&
    !router.exists &&
    !isDirty(router)
  );
});

const initBusy = ref(false);
const initError = ref("");

async function inferContracts(): Promise<void> {
  initBusy.value = true;
  initError.value = "";
  try {
    const res = await api.initVault(routeId, {});
    if (res.code !== 0) {
      initError.value = res.stderr || res.stdout || `init exited with code ${res.code}`;
    }
    await reloadFiles(true);
  } catch (err) {
    initError.value = apiErrorMessage(err);
  } finally {
    initBusy.value = false;
  }
}

function startFromTemplate(): void {
  const router = routerFile.value;
  if (!router) return;
  router.buffer = STARTER_CONFIG_YAML;
  selectedPath.value = router.relPath;
  mode.value = "form";
}

// ── file-list rows (dirty + parse-status dots) ───────────────────────────────────

const fileRows = computed<FileListRow[]>(() =>
  files.value.map((f) => {
    const dirty = isDirty(f);
    let status: FileListRow["status"] = "ok";
    let statusMessage = "";
    if (!f.exists && !dirty) {
      status = "missing";
    } else if (dirty) {
      const err = docErrorMessage(openDoc(f.buffer));
      status = err === null ? "ok" : "error";
      statusMessage = err ?? "";
    } else if (f.serverParseError !== null) {
      status = "error";
      statusMessage = f.serverParseError;
    }
    return { relPath: f.relPath, kind: f.kind, exists: f.exists, dirty, status, statusMessage };
  }),
);
</script>

<template>
  <div class="ed">
    <Toolbar :title="`${vaultName} · Contracts`">
      <template #meta>
        <StatusBadge v-if="vaultRow" :status="vaultRow.state" size="sm" />
        <span v-if="selected" class="ed__meta">
          <code>{{ selected.relPath }}</code>
          <span v-if="selectedDirty" class="ed__meta-dirty"> · unsaved</span>
        </span>
      </template>

      <button
        class="btn btn--primary"
        type="button"
        :disabled="!selectedDirty || saving"
        @click="save"
      >
        {{ saving ? "Saving…" : "Save" }}
      </button>
      <button class="btn" type="button" :disabled="!selectedDirty || saving" @click="revert">
        Revert
      </button>
      <NuxtLink class="btn btn--ghost" :to="`/vault/${routeId}`">← Vault</NuxtLink>
    </Toolbar>

    <div class="page-body">
      <!-- unsaved-changes prompts (one at a time; leaving wins) -->
      <ConfirmBar
        v-if="pendingLeave !== null"
        message="You have unsaved contract edits — leaving discards them."
        confirm-label="Discard & leave"
        cancel-label="Stay"
        danger
        @confirm="confirmLeave"
        @cancel="pendingLeave = null"
      />
      <ConfirmBar
        v-else-if="pendingSwitch !== null"
        :message="`${selected?.relPath ?? 'This file'} has unsaved changes — they're kept in memory while you stay on this page.`"
        confirm-label="Switch file"
        @confirm="confirmSwitch"
        @cancel="pendingSwitch = null"
      />

      <p v-if="saveError" class="ed__error" role="alert">{{ saveError }}</p>

      <!-- first load / load failure -->
      <LoadingState v-if="loading" label="Loading contract files…" />
      <ErrorState
        v-else-if="loadError"
        title="Could not load contract files"
        :message="loadError"
      >
        <button class="btn" type="button" @click="reloadFiles(false)">Retry</button>
      </ErrorState>

      <!-- no config on disk yet: infer or start from a template -->
      <template v-else-if="showEmpty">
        <p v-if="initError" class="ed__error" role="alert">{{ initError }}</p>
        <EmptyState
          icon="✎"
          title="No contract config yet"
          :message="`This vault has no ${routerFile?.relPath ?? 'markdown-contract.yaml'} on disk. Infer contracts from the existing documents, or start from a minimal template.`"
        >
          <div class="ed__empty-actions">
            <button class="btn btn--primary" type="button" :disabled="initBusy" @click="inferContracts">
              {{ initBusy ? "Inferring…" : "⚙ Infer contracts" }}
            </button>
            <button class="btn" type="button" :disabled="initBusy" @click="startFromTemplate">
              Start from a template
            </button>
          </div>
        </EmptyState>
      </template>

      <!-- the editor: slim file rail + the selected file's pane -->
      <div v-else class="ed__cols">
        <aside class="ed__files">
          <FileList :rows="fileRows" :selected="selectedPath" @select="onSelect" />
        </aside>

        <section v-if="selected" class="ed__pane">
          <header class="ed__pane-head">
            <div class="ed__pane-title">
              <code>{{ selected.relPath }}</code>
              <span v-if="!selected.exists" class="ed__pane-new">new file — saved on Save</span>
            </div>
            <div class="ed__seg" role="tablist" aria-label="Editor mode">
              <button
                class="ed__seg-btn"
                :class="{ 'ed__seg-btn--active': mode === 'form' }"
                type="button"
                role="tab"
                :aria-selected="mode === 'form'"
                :disabled="!formAvailable"
                :title="formAvailable ? undefined : 'fix syntax in YAML view'"
                @click="mode = 'form'"
              >
                Form
              </button>
              <button
                class="ed__seg-btn"
                :class="{ 'ed__seg-btn--active': mode === 'yaml' }"
                type="button"
                role="tab"
                :aria-selected="mode === 'yaml'"
                @click="mode = 'yaml'"
              >
                YAML
              </button>
            </div>
          </header>

          <p
            v-if="!formAvailable && selectedParseError"
            class="ed__form-blocked"
          >
            Form mode is disabled while the YAML doesn't parse.
          </p>

          <template v-if="mode === 'form' && formRoot !== null">
            <ConfigForm
              v-if="selected.kind === 'config'"
              :root="formRoot"
              :apply="applyEdit"
              @edit-yaml="toYamlMode"
            />
            <ContractForm
              v-else
              :root="formRoot"
              :apply="applyEdit"
              @edit-yaml="toYamlMode"
            />
          </template>
          <YamlPane v-else :model-value="selected.buffer" @update:model-value="onBufferInput" />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ed {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.ed__meta {
  font-size: 11.5px;
  color: var(--mc-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ed__meta code {
  font-size: 11px;
}
.ed__meta-dirty {
  color: var(--mc-accent);
  font-weight: 600;
}
.ed__error {
  margin: 0;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--mc-status-error);
  background: var(--mc-status-error-bg);
  border: 1px solid var(--mc-status-error);
  border-radius: var(--mc-radius);
}
.ed__empty-actions {
  display: flex;
  gap: 8px;
}

/* two-column body: slim file rail + editor pane */
.ed__cols {
  display: flex;
  align-items: flex-start;
  gap: var(--mc-gap);
  flex: 1;
  min-width: 0;
}
.ed__files {
  flex: 0 0 230px;
  min-width: 0;
  position: sticky;
  top: 59px;
}
.ed__pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ed__pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.ed__pane-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.ed__pane-title code {
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ed__pane-new {
  font-size: 11px;
  color: var(--mc-status-findings);
  white-space: nowrap;
}
.ed__form-blocked {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-text-faint);
}

/* Form / YAML segmented toggle */
.ed__seg {
  display: inline-flex;
  padding: 2px;
  background: var(--mc-surface-2);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.ed__seg-btn {
  appearance: none;
  padding: 3px 12px;
  font-family: var(--mc-font);
  font-size: 12px;
  font-weight: 600;
  color: var(--mc-text-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.ed__seg-btn--active {
  color: var(--mc-text);
  background: var(--mc-surface);
  box-shadow: 0 0 0 1px var(--mc-border);
}
.ed__seg-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
