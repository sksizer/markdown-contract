<script setup lang="ts">
/**
 * SectionRow — one node of a contract's body grammar: a `section` (name +
 * aliases), a `oneOf` chip-list, or a `gap` min/max row, each with the
 * optional toggle and reorder/remove controls. Keys the form can't represent
 * (`anchor`, `content`, `children`, `requires`/`forbids`) surface as small
 * "+key" chips linking to YAML mode — their data is never modified.
 */

import TagInput from "~/components/editor/TagInput.vue";
import type { ApplyFn, BodyNodeView } from "~/lib/contract-doc";
import {
  BODY_SECTIONS_PATH,
  moveSeqItem,
  removeBodyNode,
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
  apply: ApplyFn;
}>();

const emit = defineEmits<(e: "edit-yaml") => void>();

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

const commitName = debounce((index: number, name: string) => {
  if (name !== "") props.apply((doc) => setSectionName(doc, index, name));
}, 400);

function onNameInput(event: Event): void {
  commitName(props.index, (event.target as HTMLInputElement).value.trim());
}

function onOptional(event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  const index = props.index;
  props.apply((doc) => setNodeOptional(doc, index, on));
}

function onAliases(aliases: string[]): void {
  const index = props.index;
  props.apply((doc) => setSectionAliases(doc, index, aliases));
}

function onOneOf(names: string[]): void {
  const index = props.index;
  props.apply((doc) => setOneOfNames(doc, index, names));
}

function onGapBound(bound: "min" | "max", event: Event): void {
  const text = (event.target as HTMLInputElement).value.trim();
  const value = text === "" ? undefined : Number(text);
  if (value !== undefined && Number.isNaN(value)) return;
  const index = props.index;
  props.apply((doc) => setGapBound(doc, index, bound, value));
}

function onMove(delta: number): void {
  const index = props.index;
  props.apply((doc) => moveSeqItem(doc, BODY_SECTIONS_PATH, index, index + delta));
}

function onRemove(): void {
  const index = props.index;
  props.apply((doc) => removeBodyNode(doc, index));
}
</script>

<template>
  <div class="sr">
    <header class="sr__head">
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
        class="btn btn--ghost"
        type="button"
        :disabled="index === 0"
        aria-label="Move node up"
        @click="onMove(-1)"
      >↑</button>
      <button
        class="btn btn--ghost"
        type="button"
        :disabled="index === count - 1"
        aria-label="Move node down"
        @click="onMove(1)"
      >↓</button>
      <button
        class="btn btn--ghost btn--danger"
        type="button"
        aria-label="Remove node"
        @click="onRemove"
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
