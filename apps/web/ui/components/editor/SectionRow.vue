<script setup lang="ts">
/**
 * SectionRow — one node of a body-grammar LEVEL (any depth): a `section`
 * (name + aliases), a `oneOf` chip-list, or a `gap` min/max row, each with the
 * optional toggle, a drag grip, and reorder/remove controls (reorder/remove
 * are emitted — the owning SectionLevel does the splice bookkeeping).
 *
 * Nested structure: a section/oneOf node can grow a `children` level — this
 * row shows the expand/collapse disclosure and the add/remove-nested-level
 * affordances; the level itself renders below the row in SectionLevel.
 * Keys the form can't represent (`anchor`, `content`, `requires`/`forbids`,
 * malformed `children`) surface as "+key" chips linking to YAML mode — their
 * data is never modified.
 */
import { computed, ref } from "vue";

import ConfirmBar from "~/components/editor/ConfirmBar.vue";
import DragHandle from "~/components/editor/DragHandle.vue";
import TagInput from "~/components/editor/TagInput.vue";
import type { DragReorder } from "~/components/editor/useDragReorder";
import type { ApplyFn, BodyNodeView, DocPath } from "~/lib/contract-doc";
import {
  ensureChildren,
  removeAt,
  setGapBound,
  setNodeOptional,
  setOneOfNames,
  setSectionAliases,
  setSectionName,
} from "~/lib/contract-doc";
import { debounce } from "~/lib/debounce";

const props = defineProps<{
  node: BodyNodeView;
  index: number;
  count: number;
  /** the owning level's sections sequence in the document */
  sectionsPath: DocPath;
  apply: ApplyFn;
  /** the owning level's drag controller (this row's grip wires into it) */
  drag: DragReorder;
  childrenExpanded: boolean;
}>();

const emit = defineEmits<{
  (e: "edit-yaml"): void;
  (e: "toggle-children"): void;
  (e: "move", delta: number): void;
  (e: "remove"): void;
}>();

const TYPE_LABEL: Record<BodyNodeView["type"], string> = {
  section: "§ section",
  oneOf: "one of",
  gap: "gap",
  unknown: "node",
};

const EXTRA_LABEL: Record<string, string> = {
  anchor: "+anchor",
  content: "+content",
  children: "+children",
  rules: "+rules",
};

const nodePath = computed<DocPath>(() => [...props.sectionsPath, props.index]);
const rowLabel = computed(() =>
  props.node.type === "section" && props.node.name !== "" ? props.node.name : props.node.type,
);

// ── content edits (all through the Document API on this level's path) ───────────

const commitName = debounce((index: number, name: string) => {
  if (name !== "") {
    const path = props.sectionsPath;
    props.apply((doc) => setSectionName(doc, path, index, name));
  }
}, 400);

function onNameInput(event: Event): void {
  commitName(props.index, (event.target as HTMLInputElement).value.trim());
}

function onOptional(event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  const { index } = props;
  const path = props.sectionsPath;
  props.apply((doc) => setNodeOptional(doc, path, index, on));
}

function onAliases(aliases: string[]): void {
  const { index } = props;
  const path = props.sectionsPath;
  props.apply((doc) => setSectionAliases(doc, path, index, aliases));
}

function onOneOf(names: string[]): void {
  const { index } = props;
  const path = props.sectionsPath;
  props.apply((doc) => setOneOfNames(doc, path, index, names));
}

function onGapBound(bound: "min" | "max", event: Event): void {
  const text = (event.target as HTMLInputElement).value.trim();
  const value = text === "" ? undefined : Number(text);
  if (value !== undefined && Number.isNaN(value)) return;
  const { index } = props;
  const path = props.sectionsPath;
  props.apply((doc) => setGapBound(doc, path, index, bound, value));
}

// ── nested children level ────────────────────────────────────────────────────────

const canNest = computed(() => props.node.type === "section" || props.node.type === "oneOf");
const childCount = computed(() => props.node.children?.sections.length ?? 0);
const pendingRemoveChildren = ref(false);

function onAddChildren(): void {
  const path = nodePath.value;
  props.apply((doc) => ensureChildren(doc, path));
}

function onRemoveChildren(): void {
  if (childCount.value > 0) {
    pendingRemoveChildren.value = true;
    return;
  }
  doRemoveChildren();
}

function doRemoveChildren(): void {
  pendingRemoveChildren.value = false;
  const path: DocPath = [...nodePath.value, "children"];
  props.apply((doc) => removeAt(doc, path));
}
</script>

<template>
  <div class="sr">
    <header class="sr__head">
      <DragHandle
        :label="`Drag to reorder ${rowLabel}`"
        @dragstart="drag.start(index, $event)"
        @dragend="drag.end()"
      />
      <button
        v-if="node.children !== null"
        class="sr__disclose"
        type="button"
        :aria-expanded="childrenExpanded"
        :aria-label="childrenExpanded ? 'Collapse nested sections' : 'Expand nested sections'"
        @click="emit('toggle-children')"
      >{{ childrenExpanded ? "▾" : "▸" }}</button>
      <span class="sr__type">{{ TYPE_LABEL[node.type] }}</span>
      <label class="sr__flag">
        <input type="checkbox" :checked="node.optional" @change="onOptional" />
        optional
      </label>
      <span class="sr__spacer" />
      <button
        v-for="extra in node.extras"
        :key="extra"
        class="sr__chip"
        type="button"
        :title="`this node carries '${extra}' — the form keeps it untouched`"
        @click="emit('edit-yaml')"
      >
        {{ EXTRA_LABEL[extra] ?? `+${extra}` }}
      </button>
      <button
        v-if="canNest && node.children === null"
        class="btn btn--ghost sr__nest"
        type="button"
        title="Add nested sections (a children level under this node)"
        aria-label="Add nested sections"
        @click="onAddChildren"
      >+ nested</button>
      <button
        v-if="node.children !== null"
        class="btn btn--ghost sr__nest"
        type="button"
        title="Remove the nested level under this node"
        aria-label="Remove nested level"
        @click="onRemoveChildren"
      >− nested</button>
      <button
        class="btn btn--ghost"
        type="button"
        :disabled="index === 0"
        aria-label="Move node up"
        @click="emit('move', -1)"
      >↑</button>
      <button
        class="btn btn--ghost"
        type="button"
        :disabled="index === count - 1"
        aria-label="Move node down"
        @click="emit('move', 1)"
      >↓</button>
      <button
        class="btn btn--ghost btn--danger"
        type="button"
        aria-label="Remove node"
        @click="emit('remove')"
      >✕</button>
    </header>

    <div v-if="node.type === 'section'" class="sr__body">
      <input
        class="input sr__name"
        type="text"
        :value="node.name"
        aria-label="Section heading"
        placeholder="Section heading"
        @input="onNameInput"
        @change="commitName.flush()"
      />
      <div class="field sr__aliases">
        <span class="field__label">aliases</span>
        <TagInput :model-value="node.aliases" placeholder="alias spelling…" @update:model-value="onAliases" />
      </div>
    </div>

    <div v-else-if="node.type === 'oneOf'" class="sr__body">
      <div class="field sr__aliases">
        <span class="field__label">exactly one of these headings</span>
        <TagInput :model-value="node.names" placeholder="section name…" @update:model-value="onOneOf" />
      </div>
    </div>

    <div v-else-if="node.type === 'gap'" class="sr__body sr__body--gap">
      <label class="field sr__bound">
        <span class="field__label">min sections</span>
        <input
          class="input"
          type="number"
          min="0"
          :value="node.min ?? ''"
          @change="onGapBound('min', $event)"
        />
      </label>
      <label class="field sr__bound">
        <span class="field__label">max sections</span>
        <input
          class="input"
          type="number"
          min="0"
          :value="node.max ?? ''"
          @change="onGapBound('max', $event)"
        />
      </label>
      <p class="sr__hint">admits unrecognized sections between the neighbors</p>
    </div>

    <div v-else class="sr__body">
      <button
        class="sr__chip"
        type="button"
        title="this node isn't a recognizable section / oneOf / gap"
        @click="emit('edit-yaml')"
      >
        unrecognized node — edit in YAML
      </button>
    </div>

    <ConfirmBar
      v-if="pendingRemoveChildren"
      :message="`This removes the nested level and its ${childCount} section${childCount === 1 ? '' : 's'}.`"
      confirm-label="Remove nested level"
      danger
      @confirm="doRemoveChildren"
      @cancel="pendingRemoveChildren = false"
    />
  </div>
</template>

<style scoped>
.sr {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--mc-bg);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.sr__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sr__disclose {
  appearance: none;
  flex: 0 0 auto;
  padding: 0 2px;
  border: none;
  background: transparent;
  font-size: 12px;
  line-height: 1;
  color: var(--mc-text-muted);
  cursor: pointer;
}
.sr__type {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-muted);
  white-space: nowrap;
}
.sr__flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--mc-text-muted);
  cursor: pointer;
}
.sr__spacer {
  flex: 1;
}
.sr__nest {
  white-space: nowrap;
}
.sr__chip {
  appearance: none;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mc-status-drift);
  background: var(--mc-status-drift-bg);
  border: 1px solid var(--mc-status-drift);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}
.sr__body {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.sr__body--gap {
  align-items: flex-end;
}
.sr__name {
  flex: 0 1 260px;
}
.sr__aliases {
  flex: 1;
  min-width: 220px;
}
.sr__bound {
  width: 110px;
}
.sr__hint {
  margin: 0 0 5px;
  font-size: 11.5px;
  color: var(--mc-text-faint);
}
</style>
