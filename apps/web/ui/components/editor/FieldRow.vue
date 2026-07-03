<script setup lang="ts">
/**
 * FieldRow — one frontmatter field of a contract: key, kind select
 * (string/number/boolean/enum/const/array/object), per-kind extras, and the
 * optional/nullable wrappers. A schema the form can't fully represent
 * (nested objects, array-of-object, `default`, `$ref`) renders as a LOCKED
 * row — a "complex — edit in YAML" chip — and its data is never modified.
 *
 * All mutations go through the Document API via `apply`; the row re-derives
 * from the plain-JS schema prop after every change.
 */
import { computed } from "vue";

import TagInput from "~/components/editor/TagInput.vue";
import {
  type ApplyFn,
  addField,
  type DocPath,
  FRONTMATTER_FIELDS_PATH,
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
  SCALAR_FIELD_KINDS,
  STRING_FORMATS,
  schemaKindOf,
} from "~/lib/contract-schema";
import { debounce } from "~/lib/debounce";

const props = defineProps<{
  fieldKey: string;
  schema: unknown;
  apply: ApplyFn;
}>();

const emit = defineEmits<(e: "edit-yaml") => void>();

const nodePath = computed<DocPath>(() => [...FRONTMATTER_FIELDS_PATH, props.fieldKey]);
const cls = computed(() => classifySchema(props.schema));
const node = computed<Record<string, unknown>>(() => (isRecord(props.schema) ? props.schema : {}));
const kind = computed<FieldKind>(() => cls.value.kind ?? "string");

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

const ofNode = computed<Record<string, unknown>>(() =>
  isRecord(node.value.of) ? node.value.of : {},
);
const ofKind = computed<FieldKind>(() => schemaKindOf(ofNode.value) ?? "string");
const ofEnumValues = computed(() =>
  Array.isArray(ofNode.value.enum) ? ofNode.value.enum.map(String) : [],
);

const subFields = computed(() => {
  const fields = node.value.fields;
  if (!isRecord(fields)) return [];
  return Object.entries(fields).map(([key, schema]) => ({
    key,
    kind: schemaKindOf(schema) ?? "string",
    optional: isRecord(schema) && schema.optional === true,
    enumValues: isRecord(schema) && Array.isArray(schema.enum) ? schema.enum.map(String) : [],
  }));
});

// ── handlers ─────────────────────────────────────────────────────────────────────

function onRename(event: Event): void {
  const newKey = (event.target as HTMLInputElement).value.trim();
  const oldKey = props.fieldKey;
  if (newKey !== "" && newKey !== oldKey) {
    props.apply((doc) => renameMapKey(doc, FRONTMATTER_FIELDS_PATH, oldKey, newKey));
  }
}

function onKind(event: Event): void {
  const next = (event.target as HTMLSelectElement).value as FieldKind;
  props.apply((doc) => setSchemaKind(doc, nodePath.value, next));
}

function setProp(prop: string, value: string | number | boolean | string[] | undefined): void {
  props.apply((doc) => setSchemaProp(doc, nodePath.value, prop, value));
}

function onFlag(prop: "optional" | "nullable" | "strict", event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  props.apply((doc) => setSchemaFlag(doc, nodePath.value, prop, on));
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

function onOfKind(event: Event): void {
  const next = (event.target as HTMLSelectElement).value as FieldKind;
  const path: DocPath = [...nodePath.value, "of"];
  props.apply((doc) => setSchemaKind(doc, path, next));
}

function onOfEnum(values: string[]): void {
  const path: DocPath = [...nodePath.value, "of"];
  props.apply((doc) => setSchemaProp(doc, path, "enum", values));
}

// ── object sub-fields (one level deep — deeper nesting locks the row) ────────────

const subFieldsPath = computed<DocPath>(() => [...nodePath.value, "fields"]);

function onSubRename(oldKey: string, event: Event): void {
  const newKey = (event.target as HTMLInputElement).value.trim();
  const mapPath = subFieldsPath.value;
  if (newKey !== "" && newKey !== oldKey) {
    props.apply((doc) => renameMapKey(doc, mapPath, oldKey, newKey));
  }
}

function onSubKind(key: string, event: Event): void {
  const next = (event.target as HTMLSelectElement).value as FieldKind;
  const path: DocPath = [...subFieldsPath.value, key];
  props.apply((doc) => setSchemaKind(doc, path, next));
}

function onSubOptional(key: string, event: Event): void {
  const on = (event.target as HTMLInputElement).checked;
  const path: DocPath = [...subFieldsPath.value, key];
  props.apply((doc) => setSchemaFlag(doc, path, "optional", on));
}

function onSubEnum(key: string, values: string[]): void {
  const path: DocPath = [...subFieldsPath.value, key];
  props.apply((doc) => setSchemaProp(doc, path, "enum", values));
}

function onSubRemove(key: string): void {
  const path: DocPath = [...subFieldsPath.value, key];
  props.apply((doc) => removeAt(doc, path));
}

function onSubAdd(event: Event): void {
  const input = event.target as HTMLInputElement;
  const key = input.value.trim();
  if (key === "" || subFields.value.some((f) => f.key === key)) return;
  const mapPath = subFieldsPath.value;
  props.apply((doc) => addField(doc, mapPath, key));
  input.value = "";
}

function onRemove(): void {
  const path = nodePath.value;
  props.apply((doc) => removeAt(doc, path));
}
</script>

<template>
  <!-- locked: the form can't fully represent this schema — never touch it -->
  <div v-if="!cls.representable" class="fr fr--locked">
    <code class="fr__key-ro">{{ fieldKey }}</code>
    <button class="fr__chip" type="button" :title="cls.reason" @click="emit('edit-yaml')">
      complex — edit in YAML
    </button>
    <span class="fr__summary">{{ cls.summary }}</span>
  </div>

  <div v-else class="fr">
    <div class="fr__main">
      <input
        class="input fr__key"
        type="text"
        :value="fieldKey"
        aria-label="Field key"
        @change="onRename"
      />
      <select class="select fr__kind" :value="kind" aria-label="Field kind" @change="onKind">
        <option v-for="k in FIELD_KINDS" :key="k" :value="k">{{ k }}</option>
      </select>
      <label class="fr__flag">
        <input type="checkbox" :checked="optionalOn" @change="onFlag('optional', $event)" />
        optional
      </label>
      <label class="fr__flag">
        <input type="checkbox" :checked="nullableOn" @change="onFlag('nullable', $event)" />
        nullable
      </label>
      <button
        class="btn btn--ghost btn--danger fr__remove"
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

    <div v-else-if="kind === 'array'" class="fr__extras">
      <label class="field fr__extra">
        <span class="field__label">of</span>
        <select class="select" :value="ofKind" @change="onOfKind">
          <option v-for="k in SCALAR_FIELD_KINDS" :key="k" :value="k">{{ k }}</option>
        </select>
      </label>
      <label v-if="ofKind === 'enum'" class="field fr__extra fr__extra--wide">
        <span class="field__label">enum values</span>
        <TagInput :model-value="ofEnumValues" mono placeholder="add value…" @update:model-value="onOfEnum" />
      </label>
      <label class="field fr__extra fr__extra--num">
        <span class="field__label">min items</span>
        <input class="input" type="number" :value="minText" @change="onBound('min', $event)" />
      </label>
      <label class="field fr__extra fr__extra--num">
        <span class="field__label">max items</span>
        <input class="input" type="number" :value="maxText" @change="onBound('max', $event)" />
      </label>
    </div>

    <div v-else-if="kind === 'object'" class="fr__object">
      <label class="fr__flag">
        <input type="checkbox" :checked="strictOn" @change="onFlag('strict', $event)" />
        strict (unknown keys are findings)
      </label>
      <div v-for="sf in subFields" :key="sf.key" class="fr__sub">
        <input
          class="input fr__sub-key"
          type="text"
          :value="sf.key"
          aria-label="Sub-field key"
          @change="onSubRename(sf.key, $event)"
        />
        <select class="select" :value="sf.kind" aria-label="Sub-field kind" @change="onSubKind(sf.key, $event)">
          <option v-for="k in SCALAR_FIELD_KINDS" :key="k" :value="k">{{ k }}</option>
        </select>
        <TagInput
          v-if="sf.kind === 'enum'"
          class="fr__sub-enum"
          :model-value="sf.enumValues"
          mono
          placeholder="value…"
          @update:model-value="onSubEnum(sf.key, $event)"
        />
        <label class="fr__flag">
          <input type="checkbox" :checked="sf.optional" @change="onSubOptional(sf.key, $event)" />
          optional
        </label>
        <button
          class="btn btn--ghost fr__remove"
          type="button"
          :aria-label="`Remove sub-field ${sf.key}`"
          @click="onSubRemove(sf.key)"
        >✕</button>
      </div>
      <div class="fr__sub-add">
        <input
          class="input fr__sub-key"
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
.fr__remove {
  margin-left: auto;
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
.fr__object {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px dashed var(--mc-border-strong);
  border-radius: var(--mc-radius);
}
.fr__sub,
.fr__sub-add {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.fr__sub-key {
  flex: 0 1 160px;
  font-family: var(--mc-mono);
  font-size: 11.5px;
}
.fr__sub-enum {
  flex: 1;
  min-width: 160px;
}
</style>
