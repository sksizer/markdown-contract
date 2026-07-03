<script setup lang="ts">
/**
 * ContractForm — the form face of a `*.contract.yaml` (kind: contract):
 * the frontmatter card (strict toggle + fields table of FieldRow) and the
 * body card (order / allowUnknown knobs + the ordered SectionRow list).
 * All mutations flow through the Document API via `apply`; body-root
 * `requires`/`forbids` and anything else the form can't represent stay
 * untouched behind chips that link to YAML mode.
 */
import { computed, ref } from "vue";

import FieldRow from "~/components/editor/FieldRow.vue";
import SectionRow from "~/components/editor/SectionRow.vue";
import {
  type ApplyFn,
  addBodyOneOf,
  addBodySection,
  addField,
  FRONTMATTER_FIELDS_PATH,
  readBodyMeta,
  readBodyNodes,
  readFields,
  readStrict,
  setBodyAllowUnknown,
  setBodyOrder,
  setFrontmatterStrict,
} from "~/lib/contract-doc";
import { ORDER_MODES, type OrderMode } from "~/lib/contract-schema";

const props = defineProps<{
  root: Record<string, unknown>;
  apply: ApplyFn;
}>();

const emit = defineEmits<(e: "edit-yaml") => void>();

const strict = computed(() => readStrict(props.root));
const fields = computed(() => readFields(props.root));
const bodyMeta = computed(() => readBodyMeta(props.root));
const nodes = computed(() => readBodyNodes(props.root));

// ── frontmatter ──────────────────────────────────────────────────────────────────

function onStrict(event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  props.apply((doc) => setFrontmatterStrict(doc, on));
}

const newFieldKey = ref("");
const newFieldValid = computed(() => {
  const key = newFieldKey.value.trim();
  return key !== "" && !fields.value.some((f) => f.key === key);
});

function onAddField(): void {
  if (!newFieldValid.value) return;
  const key = newFieldKey.value.trim();
  props.apply((doc) => addField(doc, FRONTMATTER_FIELDS_PATH, key));
  newFieldKey.value = "";
}

// ── body ─────────────────────────────────────────────────────────────────────────

function onOrder(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  const order = value === "" ? null : (value as OrderMode);
  props.apply((doc) => setBodyOrder(doc, order));
}

function onAllowUnknown(event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  props.apply((doc) => setBodyAllowUnknown(doc, on));
}

const newSectionName = ref("");

function onAddSection(): void {
  const name = newSectionName.value.trim();
  if (name === "") return;
  props.apply((doc) => addBodySection(doc, name));
  newSectionName.value = "";
}

function onAddOneOf(): void {
  props.apply((doc) => addBodyOneOf(doc));
}
</script>

<template>
  <div class="ctf">
    <!-- frontmatter -->
    <section class="ctf__card">
      <header class="ctf__head">
        <h2 class="ctf__title">Frontmatter</h2>
        <label class="ctf__flag">
          <input type="checkbox" :checked="strict" @change="onStrict" />
          strict (unknown keys are findings)
        </label>
      </header>

      <FieldRow
        v-for="field in fields"
        :key="field.key"
        :field-key="field.key"
        :schema="field.schema"
        :apply="props.apply"
        @edit-yaml="emit('edit-yaml')"
      />
      <p v-if="fields.length === 0" class="ctf__none">No frontmatter fields yet.</p>

      <div class="ctf__add">
        <input
          v-model="newFieldKey"
          class="input ctf__add-key"
          type="text"
          placeholder="new field key…"
          @keydown.enter.prevent="onAddField"
        />
        <button class="btn" type="button" :disabled="!newFieldValid" @click="onAddField">
          + Add field
        </button>
      </div>
    </section>

    <!-- body -->
    <section class="ctf__card">
      <header class="ctf__head">
        <h2 class="ctf__title">Body</h2>
        <label class="field ctf__order">
          <span class="field__label">order</span>
          <select class="select" :value="bodyMeta.order ?? ''" @change="onOrder">
            <option value="">(engine default)</option>
            <option v-for="mode in ORDER_MODES" :key="mode" :value="mode">{{ mode }}</option>
          </select>
        </label>
        <label class="ctf__flag">
          <input type="checkbox" :checked="bodyMeta.allowUnknown" @change="onAllowUnknown" />
          allow unknown sections
        </label>
        <button
          v-if="bodyMeta.rootRules"
          class="ctf__chip"
          type="button"
          title="this body carries root-level requires/forbids — the form keeps them untouched"
          @click="emit('edit-yaml')"
        >
          +rules
        </button>
      </header>

      <SectionRow
        v-for="(node, i) in nodes"
        :key="i"
        :node="node"
        :index="i"
        :count="nodes.length"
        :apply="props.apply"
        @edit-yaml="emit('edit-yaml')"
      />
      <p v-if="nodes.length === 0" class="ctf__none">No body sections declared yet.</p>

      <div class="ctf__add">
        <input
          v-model="newSectionName"
          class="input ctf__add-key"
          type="text"
          placeholder="section heading…"
          @keydown.enter.prevent="onAddSection"
        />
        <button class="btn" type="button" :disabled="newSectionName.trim() === ''" @click="onAddSection">
          + Add section
        </button>
        <button class="btn" type="button" @click="onAddOneOf">+ Add one-of</button>
      </div>
    </section>

    <p class="ctf__envelope">mcVersion 1 · kind contract — the envelope is managed automatically.</p>
  </div>
</template>

<style scoped>
.ctf {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
}
.ctf__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.ctf__head {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}
.ctf__title {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}
.ctf__flag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--mc-text-muted);
  cursor: pointer;
}
.ctf__order {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.ctf__chip {
  appearance: none;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mc-status-drift);
  background: var(--mc-status-drift-bg);
  border: 1px solid var(--mc-status-drift);
  border-radius: 999px;
  cursor: pointer;
}
.ctf__none {
  margin: 0;
  font-size: 12px;
  color: var(--mc-text-faint);
}
.ctf__add {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ctf__add-key {
  flex: 0 1 240px;
  font-family: var(--mc-mono);
  font-size: 11.5px;
}
.ctf__envelope {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-text-faint);
}
</style>
