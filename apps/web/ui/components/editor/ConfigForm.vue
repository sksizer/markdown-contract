<script setup lang="ts">
/**
 * ConfigForm — the form face of the router file (kind: config): the contracts
 * registry (name → path rows) and the ordered rules list (include/exclude
 * globs, contract ref, reorder). Every mutation goes through the Document API
 * via the page's `apply` — this component never rebuilds the file. Inline
 * contract mappings render as a locked chip that links to YAML mode.
 */
import { computed, reactive, ref } from "vue";

import TagInput from "~/components/editor/TagInput.vue";
import {
  type ApplyFn,
  addContractsEntry,
  addRule,
  moveSeqItem,
  RULES_PATH,
  readContractsEntries,
  readRules,
  removeContractsEntry,
  removeRule,
  renameMapKey,
  setContractsEntryPath,
  setRuleContract,
  setRuleGlobs,
} from "~/lib/contract-doc";
import { isYamlContractRef } from "~/lib/contract-schema";
import { debounce } from "~/lib/debounce";

const props = defineProps<{
  root: Record<string, unknown>;
  apply: ApplyFn;
}>();

const emit = defineEmits<(e: "edit-yaml") => void>();

const entries = computed(() => readContractsEntries(props.root));
const rules = computed(() => readRules(props.root));
const registryNames = computed(() => entries.value.map((e) => e.name));

// ── contracts registry ───────────────────────────────────────────────────────────

function renameEntry(oldName: string, event: Event): void {
  const newName = (event.target as HTMLInputElement).value.trim();
  if (newName !== "" && newName !== oldName) {
    props.apply((doc) => renameMapKey(doc, ["contracts"], oldName, newName));
  }
}

const commitEntryPath = debounce((name: string, path: string) => {
  props.apply((doc) => setContractsEntryPath(doc, name, path));
}, 400);

function onEntryPathInput(name: string, event: Event): void {
  commitEntryPath(name, (event.target as HTMLInputElement).value);
}

const draft = reactive({ name: "", path: "" });
const draftValid = computed(
  () =>
    draft.name.trim() !== "" &&
    draft.path.trim() !== "" &&
    !registryNames.value.includes(draft.name.trim()),
);

function addEntry(): void {
  if (!draftValid.value) return;
  const name = draft.name.trim();
  const path = draft.path.trim();
  props.apply((doc) => addContractsEntry(doc, name, path));
  draft.name = "";
  draft.path = "";
}

// ── rules ────────────────────────────────────────────────────────────────────────

/**
 * "path…" free-text mode per rule index: derived from the ref not being a
 * registry name, overridable when the user explicitly picks "path…" in the
 * select before typing one.
 */
const pathMode = reactive<Record<number, boolean>>({});

function isPathMode(index: number): boolean {
  const override = pathMode[index];
  if (override !== undefined) return override;
  const ref = rules.value[index]?.contractRef;
  return typeof ref === "string" && !registryNames.value.includes(ref);
}

function onContractSelect(index: number, event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "__path__") {
    pathMode[index] = true;
    return;
  }
  pathMode[index] = false;
  props.apply((doc) => setRuleContract(doc, index, value));
}

const commitContractPath = debounce((index: number, ref: string) => {
  props.apply((doc) => setRuleContract(doc, index, ref));
}, 400);

function onContractPathInput(index: number, event: Event): void {
  commitContractPath(index, (event.target as HTMLInputElement).value.trim());
}

function refWarning(ref: string | null): string {
  if (ref === null || ref === "") return "";
  if (registryNames.value.includes(ref) || isYamlContractRef(ref)) return "";
  return "a contract ref must be a registry name or end in .yaml/.yml";
}

function onGlobs(index: number, which: "include" | "exclude", globs: string[]): void {
  props.apply((doc) => setRuleGlobs(doc, index, which, globs));
}

function onAddRule(): void {
  const ref = registryNames.value[0] ?? "contracts/doc.contract.yaml";
  props.apply((doc) => addRule(doc, ["**/*.md"], ref));
}

function onMoveRule(index: number, delta: number): void {
  props.apply((doc) => moveSeqItem(doc, RULES_PATH, index, index + delta));
}

function onRemoveRule(index: number): void {
  props.apply((doc) => removeRule(doc, index));
}
</script>

<template>
  <div class="cf">
    <!-- contracts registry -->
    <section class="cf__card">
      <header class="cf__head">
        <h2 class="cf__title">Contracts registry</h2>
        <p class="cf__hint">named contracts rules can reference (name → path)</p>
      </header>

      <div v-if="entries.length > 0" class="cf__entries">
        <div v-for="entry in entries" :key="entry.name" class="cf__entry">
          <input
            class="input cf__entry-name"
            type="text"
            :value="entry.name"
            aria-label="Contract name"
            @change="renameEntry(entry.name, $event)"
          />
          <template v-if="entry.isString">
            <input
              class="input cf__entry-path"
              type="text"
              :value="entry.path"
              aria-label="Contract path"
              placeholder="contracts/doc.contract.yaml"
              @input="onEntryPathInput(entry.name, $event)"
              @change="commitEntryPath.flush()"
            />
          </template>
          <button
            v-else
            class="cf__chip"
            type="button"
            title="this entry's value is not a plain path"
            @click="emit('edit-yaml')"
          >
            complex — edit in YAML
          </button>
          <button
            class="btn btn--ghost cf__remove"
            type="button"
            :aria-label="`Remove ${entry.name}`"
            @click="props.apply((doc) => removeContractsEntry(doc, entry.name))"
          >
            ✕
          </button>
        </div>
      </div>
      <p v-else class="cf__none">No named contracts yet — rules can still reference paths directly.</p>

      <div class="cf__add">
        <input v-model="draft.name" class="input cf__entry-name" type="text" placeholder="name" />
        <input
          v-model="draft.path"
          class="input cf__entry-path"
          type="text"
          placeholder="contracts/name.contract.yaml"
          @keydown.enter.prevent="addEntry"
        />
        <button class="btn" type="button" :disabled="!draftValid" @click="addEntry">Add</button>
      </div>
    </section>

    <!-- rules -->
    <section class="cf__card">
      <header class="cf__head">
        <h2 class="cf__title">Rules</h2>
        <p class="cf__hint">globs route files to a contract; first match wins, order matters</p>
      </header>

      <div v-for="(rule, i) in rules" :key="i" class="cf__rule">
        <header class="cf__rule-head">
          <span class="cf__rule-name">Rule {{ i + 1 }}</span>
          <span class="cf__rule-actions">
            <button
              class="btn btn--ghost"
              type="button"
              :disabled="i === 0"
              aria-label="Move rule up"
              @click="onMoveRule(i, -1)"
            >↑</button>
            <button
              class="btn btn--ghost"
              type="button"
              :disabled="i === rules.length - 1"
              aria-label="Move rule down"
              @click="onMoveRule(i, 1)"
            >↓</button>
            <button
              class="btn btn--ghost btn--danger"
              type="button"
              aria-label="Remove rule"
              @click="onRemoveRule(i)"
            >✕</button>
          </span>
        </header>

        <div class="field">
          <span class="field__label">Include globs</span>
          <TagInput
            :model-value="rule.include"
            mono
            placeholder="**/*.md"
            @update:model-value="onGlobs(i, 'include', $event)"
          />
          <p v-if="rule.include.length === 0" class="cf__warn">include needs at least one glob</p>
        </div>

        <div class="field">
          <span class="field__label">Exclude globs (optional)</span>
          <TagInput
            :model-value="rule.exclude"
            mono
            placeholder="drafts/**"
            @update:model-value="onGlobs(i, 'exclude', $event)"
          />
        </div>

        <div class="field">
          <span class="field__label">Contract</span>
          <button
            v-if="rule.inline"
            class="cf__chip"
            type="button"
            title="this rule carries an inline contract mapping — the form leaves it untouched"
            @click="emit('edit-yaml')"
          >
            inline contract — edit in YAML
          </button>
          <div v-else class="cf__contract">
            <select
              class="select"
              :value="isPathMode(i) ? '__path__' : (rule.contractRef ?? '__path__')"
              aria-label="Contract reference"
              @change="onContractSelect(i, $event)"
            >
              <option v-for="name in registryNames" :key="name" :value="name">{{ name }}</option>
              <option value="__path__">path…</option>
            </select>
            <input
              v-if="isPathMode(i)"
              class="input cf__contract-path"
              type="text"
              :value="rule.contractRef ?? ''"
              placeholder="contracts/doc.contract.yaml"
              @input="onContractPathInput(i, $event)"
              @change="commitContractPath.flush()"
            />
          </div>
          <p v-if="refWarning(rule.contractRef)" class="cf__warn">{{ refWarning(rule.contractRef) }}</p>
        </div>
      </div>

      <p v-if="rules.length === 0" class="cf__none">No rules yet — nothing gets validated.</p>

      <div class="cf__card-foot">
        <button class="btn" type="button" @click="onAddRule">+ Add rule</button>
      </div>
    </section>

    <p class="cf__envelope">mcVersion 1 · kind config — the envelope is managed automatically.</p>
  </div>
</template>

<style scoped>
.cf {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
}
.cf__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.cf__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.cf__title {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}
.cf__hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-text-faint);
}
.cf__entries {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cf__entry,
.cf__add {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cf__entry-name {
  flex: 0 0 160px;
}
.cf__entry-path {
  flex: 1;
  font-family: var(--mc-mono);
  font-size: 11.5px;
}
.cf__remove {
  flex: 0 0 auto;
}
.cf__none {
  margin: 0;
  font-size: 12px;
  color: var(--mc-text-faint);
}
.cf__rule {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--mc-bg);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.cf__rule-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cf__rule-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-muted);
}
.cf__rule-actions {
  display: flex;
  gap: 2px;
}
.cf__contract {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cf__contract-path {
  flex: 1;
  font-family: var(--mc-mono);
  font-size: 11.5px;
}
.cf__chip {
  appearance: none;
  align-self: flex-start;
  padding: 3px 9px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--mc-status-drift);
  background: var(--mc-status-drift-bg);
  border: 1px solid var(--mc-status-drift);
  border-radius: 999px;
  cursor: pointer;
}
.cf__warn {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-status-findings);
}
.cf__card-foot {
  display: flex;
}
.cf__envelope {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-text-faint);
}
</style>
