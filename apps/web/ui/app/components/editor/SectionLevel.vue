<script setup lang="ts">
/**
 * SectionLevel — ONE nesting level of the body grammar, rendered recursively
 * (the body root at depth 0, a node's `children` below): the level's
 * order/allowUnknown knobs, its ordered node rows with drag-handle + ↑/↓
 * reordering constrained to this level, each row's nested children level
 * (collapsible), and the add-section / add-one-of controls.
 *
 * `levelPath` is the document path of the level MAPPING (BODY_PATH at the
 * root, [...node, "children"] below); all mutations flow through the
 * Document API via `apply`.
 */
import { computed, reactive, ref } from "vue";

import SectionRow from "~/components/editor/SectionRow.vue";
import { useDragReorder } from "~/components/editor/useDragReorder";
import {
  type ApplyFn,
  addBodyOneOf,
  addBodySection,
  type DocPath,
  type LevelView,
  moveSeqItem,
  removeBodyNode,
  setLevelAllowUnknown,
  setLevelOrder,
} from "~/lib/contract-doc";
import { ORDER_MODES, type OrderMode } from "~/lib/contract-schema";

const props = defineProps<{
  levelPath: DocPath;
  level: LevelView;
  depth: number;
  apply: ApplyFn;
}>();

const emit = defineEmits<(e: "edit-yaml") => void>();

const sectionsPath = computed<DocPath>(() => [...props.levelPath, "sections"]);
const count = computed(() => props.level.sections.length);

// ── level knobs ──────────────────────────────────────────────────────────────────

function onOrder(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  const order = value === "" ? null : (value as OrderMode);
  const path = props.levelPath;
  props.apply((doc) => setLevelOrder(doc, path, order));
}

function onAllowUnknown(event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  const path = props.levelPath;
  props.apply((doc) => setLevelAllowUnknown(doc, path, on));
}

// ── rows: reorder / remove (index bookkeeping lives here, next to collapse) ─────

/** collapsed rows by index — default expanded; remapped when indices shift */
const collapsed = reactive(new Set<number>());

function toggle(index: number): void {
  if (collapsed.has(index)) collapsed.delete(index);
  else collapsed.add(index);
}

function remap(shift: (i: number) => number | null): void {
  const next = [...collapsed].map(shift).filter((i): i is number => i !== null);
  collapsed.clear();
  for (const i of next) collapsed.add(i);
}

function performMove(from: number, to: number): void {
  if (from === to || to < 0 || to >= count.value) return;
  const path = sectionsPath.value;
  props.apply((doc) => moveSeqItem(doc, path, from, to));
  remap((i) => {
    if (i === from) return to;
    if (from < i && i <= to) return i - 1;
    if (to <= i && i < from) return i + 1;
    return i;
  });
}

function performRemove(index: number): void {
  const path = sectionsPath.value;
  props.apply((doc) => removeBodyNode(doc, path, index));
  remap((i) => (i === index ? null : i > index ? i - 1 : i));
}

const drag = useDragReorder(() => count.value, performMove);

// ── add controls ─────────────────────────────────────────────────────────────────

const newSectionName = ref("");

function onAddSection(): void {
  const name = newSectionName.value.trim();
  if (name === "") return;
  const path = sectionsPath.value;
  props.apply((doc) => addBodySection(doc, path, name));
  newSectionName.value = "";
}

function onAddOneOf(): void {
  const path = sectionsPath.value;
  props.apply((doc) => addBodyOneOf(doc, path));
}
</script>

<template>
  <div class="sl" :class="{ 'sl--nested': depth > 0 }">
    <div class="sl__knobs">
      <label class="field sl__order">
        <span class="field__label">order</span>
        <select class="select" :value="level.order ?? ''" @change="onOrder">
          <option value="">(engine default)</option>
          <option v-for="m in ORDER_MODES" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
      <label class="sl__flag">
        <input type="checkbox" :checked="level.allowUnknown" @change="onAllowUnknown" />
        allow unknown sections
      </label>
    </div>

    <div
      v-for="(node, i) in level.sections"
      :key="i"
      class="sl__row"
      :class="drag.rowClass(i)"
      @dragover="drag.over(i, $event)"
      @drop="drag.dropOn($event)"
    >
      <SectionRow
        :node="node"
        :index="i"
        :count="count"
        :sections-path="sectionsPath"
        :apply="props.apply"
        :drag="drag"
        :children-expanded="!collapsed.has(i)"
        @toggle-children="toggle(i)"
        @move="(delta) => performMove(i, i + delta)"
        @remove="performRemove(i)"
        @edit-yaml="emit('edit-yaml')"
      />
      <SectionLevel
        v-if="node.children !== null && !collapsed.has(i)"
        class="sl__child"
        :level-path="[...sectionsPath, i, 'children']"
        :level="node.children"
        :depth="depth + 1"
        :apply="props.apply"
        @edit-yaml="emit('edit-yaml')"
      />
    </div>
    <p v-if="count === 0" class="sl__none">No sections at this level yet.</p>

    <div class="sl__add">
      <input
        v-model="newSectionName"
        class="input sl__add-name"
        type="text"
        placeholder="section heading…"
        @keydown.enter.prevent="onAddSection"
      />
      <button class="btn" type="button" :disabled="newSectionName.trim() === ''" @click="onAddSection">
        + Add section
      </button>
      <button class="btn" type="button" @click="onAddOneOf">+ Add one-of</button>
    </div>
  </div>
</template>

<style scoped>
.sl {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
/* one guide line + indent per depth (levels nest structurally) */
.sl--nested {
  margin: 2px 0 2px 10px;
  padding-left: 12px;
  border-left: 2px solid var(--mc-border-strong);
}
.sl__knobs {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.sl__order {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.sl__flag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--mc-text-muted);
  cursor: pointer;
}
.sl__row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sl__none {
  margin: 0;
  font-size: 12px;
  color: var(--mc-text-faint);
}
.sl__add {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sl__add-name {
  flex: 0 1 240px;
  font-family: var(--mc-mono);
  font-size: 11.5px;
}
</style>
