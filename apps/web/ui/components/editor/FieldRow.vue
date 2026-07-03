<script setup lang="ts">
/**
 * FieldRow — one schema node of a contract's frontmatter, rendered
 * RECURSIVELY to any depth: a keyed row when the node sits in a fields
 * mapping (the frontmatter root or an object's `fields`), a keyless row for
 * an array's `of` schema. Object fields nest object/array sub-schemas with
 * the same row UI; keyed rows in a mapping reorder by drag grip or ↑/↓
 * (the keyboard path), constrained to their own mapping.
 *
 * Only genuinely unrepresentable schemas lock — `$ref`, a `default` wrapper,
 * malformed nodes, anywhere in the subtree — rendering as a "complex — edit
 * in YAML" chip whose data is never modified. All mutations go through the
 * Document API via `apply`; the row re-derives from the plain-JS schema prop
 * after every change.
 */
import { computed } from "vue";

import DragHandle from "~/components/editor/DragHandle.vue";
import TagInput from "~/components/editor/TagInput.vue";
import { type DragReorder, useDragReorder } from "~/components/editor/useDragReorder";
import {
  type ApplyFn,
  addField,
  type DocPath,
  moveMapItem,
  removeAt,
  renameMapKey,
  setSchemaFlag,
  setSchemaKind,
  setSchemaProp,
} from "~/lib/contract-doc";
import {
  classifySchema,
  coerceScalar,
  FIELD_KINDS,
  type FieldKind,
  isRecord,
  STRING_FORMATS,
} from "~/lib/contract-schema";
import { debounce } from "~/lib/debounce";

const props = defineProps<{
  /** this schema node's path in the document */
  nodePath: DocPath;
  schema: unknown;
  apply: ApplyFn;
  /** the fields mapping this row's key lives in — absent for the keyless array-`of` row */
  mapPath?: DocPath;
  fieldKey?: string;
  /** the owning mapping's drag controller + this row's position (keyed rows only) */
  drag?: DragReorder;
  index?: number;
  count?: number;
}>();

const emit = defineEmits<{
  (e: "edit-yaml"): void;
  (e: "move", delta: number): void;
}>();

const cls = computed(() => classifySchema(props.schema));
const node = computed<Record<string, unknown>>(() => (isRecord(props.schema) ? props.schema : {}));
const kind = computed<FieldKind>(() => cls.value.kind ?? "string");
const keyed = computed(() => props.mapPath !== undefined && props.fieldKey !== undefined);
const listed = computed(() => props.index !== undefined && props.count !== undefined);

// ── derived extras ───────────────────────────────────────────────────────────────

const strFormat = computed(() => (typeof node.value.format === "string" ? node.value.format : ""));
const patternText = computed(() =>
  typeof node.value.pattern === "string" ? node.value.pattern : "",
);
const minText = computed(() => (typeof node.value.min === "number" ? String(node.value.min) : ""));
const maxText = computed(() => (typeof node.value.max === "number" ? String(node.value.max) : ""));
const intOn = computed(() => node.value.int === true);
const enumValues = computed(() =>
  Array.isArray(node.value.enum) ? node.value.enum.map(String) : [],
);
const constText = computed(() => (node.value.const === undefined ? "" : String(node.value.const)));
const optionalOn = computed(() => node.value.optional === true);
const nullableOn = computed(() => node.value.nullable === true);
const strictOn = computed(() => node.value.strict === true);

const ofPath = computed<DocPath>(() => [...props.nodePath, "of"]);
const fieldsPath = computed<DocPath>(() => [...props.nodePath, "fields"]);
const subFields = computed(() => {
  const fields = node.value.fields;
  if (!isRecord(fields)) return [];
  return Object.entries(fields).map(([key, schema]) => ({ key, schema }));
});

// ── this row's drag/reorder participation (keyed rows only) ──────────────────────

const dragClass = computed(() =>
  props.drag !== undefined && props.index !== undefined ? props.drag.rowClass(props.index) : null,
);

function onGripStart(event: DragEvent): void {
  if (props.drag !== undefined && props.index !== undefined) props.drag.start(props.index, event);
}

function onGripEnd(): void {
  props.drag?.end();
}

function onRowDragOver(event: DragEvent): void {
  if (props.drag !== undefined && props.index !== undefined) props.drag.over(props.index, event);
}

function onRowDrop(event: DragEvent): void {
  props.drag?.dropOn(event);
}

// ── handlers ─────────────────────────────────────────────────────────────────────

function onRename(event: Event): void {
  const newKey = (event.target as HTMLInputElement).value.trim();
  const oldKey = props.fieldKey;
  const mapPath = props.mapPath;
  if (oldKey === undefined || mapPath === undefined) return;
  if (newKey !== "" && newKey !== oldKey) {
    props.apply((doc) => renameMapKey(doc, mapPath, oldKey, newKey));
  }
}

function onKind(event: Event): void {
  const next = (event.target as HTMLSelectElement).value as FieldKind;
  const path = props.nodePath;
  props.apply((doc) => setSchemaKind(doc, path, next));
}

function setProp(prop: string, value: string | number | boolean | string[] | undefined): void {
  const path = props.nodePath;
  props.apply((doc) => setSchemaProp(doc, path, prop, value));
}

function onFlag(prop: "optional" | "nullable" | "strict", event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  const path = props.nodePath;
  props.apply((doc) => setSchemaFlag(doc, path, prop, on));
}

function onFormat(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  setProp("format", value === "" ? undefined : value);
}

function onBound(prop: "min" | "max", event: Event): void {
  const text = (event.target as HTMLInputElement).value.trim();
  const value = text === "" ? undefined : Number(text);
  if (value !== undefined && Number.isNaN(value)) return;
  setProp(prop, value);
}

const commitPattern = debounce((value: string) => {
  setProp("pattern", value === "" ? undefined : value);
}, 400);

const commitConst = debounce((value: string) => {
  setProp("const", coerceScalar(value));
}, 400);

function onRemove(): void {
  const path = props.nodePath;
  props.apply((doc) => removeAt(doc, path));
}

// ── object sub-fields (recursive keyed rows over [...nodePath, "fields"]) ────────

const subDrag = useDragReorder(
  () => subFields.value.length,
  (from, to) => {
    const mapPath = fieldsPath.value;
    props.apply((doc) => moveMapItem(doc, mapPath, from, to));
  },
);

function onSubMove(index: number, delta: number): void {
  const to = index + delta;
  if (to < 0 || to >= subFields.value.length) return;
  const mapPath = fieldsPath.value;
  props.apply((doc) => moveMapItem(doc, mapPath, index, to));
}

function onSubAdd(event: Event): void {
  const input = event.target as HTMLInputElement;
  const key = input.value.trim();
  if (key === "" || subFields.value.some((f) => f.key === key)) return;
  const mapPath = fieldsPath.value;
  props.apply((doc) => addField(doc, mapPath, key));
  input.value = "";
}
</script>

<template>
  <!-- locked: the form can't fully represent this schema — never touch it -->
  <div
    v-if="!cls.representable"
    class="fr fr--locked"
    :class="dragClass"
    @dragover="onRowDragOver"
    @drop="onRowDrop"
  >
    <DragHandle
      v-if="drag !== undefined && index !== undefined"
      :label="`Drag to reorder ${fieldKey ?? 'schema'}`"
      @dragstart="onGripStart"
      @dragend="onGripEnd"
    />
    <code class="fr__key-ro">{{ fieldKey ?? "of" }}</code>
    <button class="fr__chip" type="button" :title="cls.reason" @click="emit('edit-yaml')">
      complex — edit in YAML
    </button>
    <span class="fr__summary">{{ cls.summary }}</span>
  </div>

  <div v-else class="fr" :class="dragClass" @dragover="onRowDragOver" @drop="onRowDrop">
    <div class="fr__main">
      <DragHandle
        v-if="drag !== undefined && index !== undefined"
        :label="`Drag to reorder ${fieldKey ?? 'schema'}`"
        @dragstart="onGripStart"
        @dragend="onGripEnd"
      />
      <input
        v-if="keyed"
        class="input fr__key"
        type="text"
        :value="fieldKey"
        aria-label="Field key"
        @change="onRename"
      />
      <span v-else class="fr__of-label">each item</span>
      <select class="select fr__kind" :value="kind" aria-label="Field kind" @change="onKind">
        <option v-for="k in FIELD_KINDS" :key="k" :value="k">{{ k }}</option>
      </select>
      <template v-if="keyed">
        <label class="fr__flag">
          <input type="checkbox" :checked="optionalOn" @change="onFlag('optional', $event)" />
          optional
        </label>
        <label class="fr__flag">
          <input type="checkbox" :checked="nullableOn" @change="onFlag('nullable', $event)" />
          nullable
        </label>
      </template>
      <span class="fr__grow" />
      <template v-if="listed">
        <button
          class="btn btn--ghost"
          type="button"
          :disabled="index === 0"
          :aria-label="`Move field ${fieldKey} up`"
          @click="emit('move', -1)"
        >↑</button>
        <button
          class="btn btn--ghost"
          type="button"
          :disabled="index === (count ?? 0) - 1"
          :aria-label="`Move field ${fieldKey} down`"
          @click="emit('move', 1)"
        >↓</button>
      </template>
      <button
        v-if="keyed"
        class="btn btn--ghost btn--danger"
        type="button"
        :aria-label="`Remove field ${fieldKey}`"
        @click="onRemove"
      >✕</button>
    </div>

    <!-- string extras: a format short-circuits min/max/pattern in the engine -->
    <div v-if="kind === 'string'" class="fr__extras">
      <label class="field fr__extra">
        <span class="field__label">format</span>
        <select class="select" :value="strFormat" @change="onFormat">
          <option value="">(none)</option>
          <option v-for="f in STRING_FORMATS" :key="f" :value="f">{{ f }}</option>
        </select>
      </label>
      <template v-if="strFormat === ''">
        <label class="field fr__extra fr__extra--num">
          <span class="field__label">min length</span>
          <input class="input" type="number" :value="minText" @change="onBound('min', $event)" />
        </label>
        <label class="field fr__extra fr__extra--num">
          <span class="field__label">max length</span>
          <input class="input" type="number" :value="maxText" @change="onBound('max', $event)" />
        </label>
        <label class="field fr__extra fr__extra--wide">
          <span class="field__label">pattern (regex)</span>
          <input
            class="input fr__mono"
            type="text"
            :value="patternText"
            @input="commitPattern(($event.target as HTMLInputElement).value)"
            @change="commitPattern.flush()"
          />
        </label>
      </template>
    </div>

    <div v-else-if="kind === 'number'" class="fr__extras">
      <label class="fr__flag">
        <input
          type="checkbox"
          :checked="intOn"
          @change="setProp('int', ($event.target as HTMLInputElement).checked ? true : undefined)"
        />
        integer
      </label>
      <label class="field fr__extra fr__extra--num">
        <span class="field__label">min</span>
        <input class="input" type="number" :value="minText" @change="onBound('min', $event)" />
      </label>
      <label class="field fr__extra fr__extra--num">
        <span class="field__label">max</span>
        <input class="input" type="number" :value="maxText" @change="onBound('max', $event)" />
      </label>
    </div>

    <div v-else-if="kind === 'enum'" class="fr__extras">
      <label class="field fr__extra fr__extra--wide">
        <span class="field__label">values</span>
        <TagInput :model-value="enumValues" mono placeholder="add value…" @update:model-value="setProp('enum', $event)" />
      </label>
    </div>

    <div v-else-if="kind === 'const'" class="fr__extras">
      <label class="field fr__extra fr__extra--wide">
        <span class="field__label">value (true/false and numbers are typed automatically)</span>
        <input
          class="input fr__mono"
          type="text"
          :value="constText"
          @input="commitConst(($event.target as HTMLInputElement).value)"
          @change="commitConst.flush()"
        />
      </label>
    </div>

    <template v-else-if="kind === 'array'">
      <div class="fr__extras">
        <label class="field fr__extra fr__extra--num">
          <span class="field__label">min items</span>
          <input class="input" type="number" :value="minText" @change="onBound('min', $event)" />
        </label>
        <label class="field fr__extra fr__extra--num">
          <span class="field__label">max items</span>
          <input class="input" type="number" :value="maxText" @change="onBound('max', $event)" />
        </label>
      </div>
      <!-- the element schema, recursive: array-of-anything-representable -->
      <div class="fr__nest">
        <span class="fr__nest-label">of</span>
        <FieldRow
          :node-path="ofPath"
          :schema="node.of"
          :apply="props.apply"
          @edit-yaml="emit('edit-yaml')"
        />
      </div>
    </template>

    <div v-else-if="kind === 'object'" class="fr__nest fr__object">
      <label class="fr__flag">
        <input type="checkbox" :checked="strictOn" @change="onFlag('strict', $event)" />
        strict (unknown keys are findings)
      </label>
      <FieldRow
        v-for="(sf, i) in subFields"
        :key="sf.key"
        :node-path="[...fieldsPath, sf.key]"
        :schema="sf.schema"
        :apply="props.apply"
        :map-path="fieldsPath"
        :field-key="sf.key"
        :drag="subDrag"
        :index="i"
        :count="subFields.length"
        @edit-yaml="emit('edit-yaml')"
        @move="(delta) => onSubMove(i, delta)"
      />
      <div class="fr__sub-add">
        <input
          class="input fr__key"
          type="text"
          placeholder="new sub-field key…"
          @keydown.enter.prevent="onSubAdd($event)"
          @change="onSubAdd($event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fr {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--mc-bg);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.fr--locked {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.fr__main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.fr__key {
  flex: 0 1 180px;
  font-family: var(--mc-mono);
  font-size: 11.5px;
}
.fr__key-ro {
  font-size: 11.5px;
}
.fr__of-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
  white-space: nowrap;
}
.fr__kind {
  flex: 0 0 auto;
}
.fr__flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--mc-text-muted);
  white-space: nowrap;
  cursor: pointer;
}
.fr__grow {
  flex: 1;
}
.fr__extras {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.fr__extra {
  min-width: 130px;
}
.fr__extra--num {
  min-width: 0;
  width: 90px;
}
.fr__extra--wide {
  flex: 1;
  min-width: 220px;
}
.fr__mono {
  font-family: var(--mc-mono);
  font-size: 11.5px;
}
.fr__chip {
  appearance: none;
  padding: 3px 9px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--mc-status-drift);
  background: var(--mc-status-drift-bg);
  border: 1px solid var(--mc-status-drift);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}
.fr__summary {
  font-size: 11.5px;
  color: var(--mc-text-faint);
  font-family: var(--mc-mono);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* one guide line + indent per nesting level (levels nest structurally) */
.fr__nest {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 4px;
  padding-left: 12px;
  border-left: 2px solid var(--mc-border-strong);
}
.fr__nest-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.fr__sub-add {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
