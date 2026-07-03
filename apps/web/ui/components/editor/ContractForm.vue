<script setup lang="ts">
/**
 * ContractForm — the form face of a `*.contract.yaml` (kind: contract):
 * the frontmatter card (strict toggle + the reorderable FieldRow list) and
 * the body card (the recursive SectionLevel tree, root level = `body`).
 * All mutations flow through the Document API via `apply`; body-root
 * `requires`/`forbids` and anything else the form can't represent stay
 * untouched behind chips that link to YAML mode.
 */
import { computed, ref } from "vue";

import FieldRow from "~/components/editor/FieldRow.vue";
import SectionLevel from "~/components/editor/SectionLevel.vue";
import { useDragReorder } from "~/components/editor/useDragReorder";
import {
  type ApplyFn,
  addField,
  BODY_PATH,
  FRONTMATTER_FIELDS_PATH,
  moveMapItem,
  readBodyLevel,
  readBodyRootRules,
  readFields,
  readStrict,
  setFrontmatterStrict,
} from "~/lib/contract-doc";

const props = defineProps<{
  root: Record<string, unknown>;
  apply: ApplyFn;
}>();

const emit = defineEmits<(e: "edit-yaml") => void>();

const strict = computed(() => readStrict(props.root));
const fields = computed(() => readFields(props.root));
const bodyLevel = computed(() => readBodyLevel(props.root));
const bodyRootRules = computed(() => readBodyRootRules(props.root));

// ── frontmatter ──────────────────────────────────────────────────────────────────

function onStrict(event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  props.apply((doc) => setFrontmatterStrict(doc, on));
}

function moveField(from: number, to: number): void {
  if (to < 0 || to >= fields.value.length) return;
  props.apply((doc) => moveMapItem(doc, FRONTMATTER_FIELDS_PATH, from, to));
}

const fieldsDrag = useDragReorder(() => fields.value.length, moveField);

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
        v-for="(field, i) in fields"
        :key="field.key"
        :node-path="[...FRONTMATTER_FIELDS_PATH, field.key]"
        :schema="field.schema"
        :apply="props.apply"
        :map-path="FRONTMATTER_FIELDS_PATH"
        :field-key="field.key"
        :drag="fieldsDrag"
        :index="i"
        :count="fields.length"
        @edit-yaml="emit('edit-yaml')"
        @move="(delta) => moveField(i, i + delta)"
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

    <!-- body: the recursive level tree, root level = `body` -->
    <section class="ctf__card">
      <header class="ctf__head">
        <h2 class="ctf__title">Body</h2>
        <button
          v-if="bodyRootRules"
          class="ctf__chip"
          type="button"
          title="this body carries root-level requires/forbids — the form keeps them untouched"
          @click="emit('edit-yaml')"
        >
          +rules
        </button>
      </header>

      <SectionLevel
        :level-path="BODY_PATH"
        :level="bodyLevel"
        :depth="0"
        :apply="props.apply"
        @edit-yaml="emit('edit-yaml')"
      />
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
