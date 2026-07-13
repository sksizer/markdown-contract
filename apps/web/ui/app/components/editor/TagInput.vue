<script setup lang="ts">
/**
 * TagInput — a chip-style editor for a list of strings (globs, aliases, enum
 * values, oneOf names). Enter / comma / blur commits the draft; Backspace on an
 * empty draft removes the last chip. Emits the full replacement list; the
 * parent owns where it lands in the YAML document.
 */
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    placeholder?: string;
    /** render chips + input in the mono face (globs, enum values) */
    mono?: boolean;
  }>(),
  { placeholder: "add…", mono: false },
);

const emit = defineEmits<(e: "update:modelValue", value: string[]) => void>();

const draft = ref("");

function commitDraft(): void {
  const value = draft.value.trim();
  draft.value = "";
  if (value === "" || props.modelValue.includes(value)) return;
  emit("update:modelValue", [...props.modelValue, value]);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    commitDraft();
  } else if (event.key === "Backspace" && draft.value === "" && props.modelValue.length > 0) {
    emit("update:modelValue", props.modelValue.slice(0, -1));
  }
}

function removeAt(index: number): void {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, i) => i !== index),
  );
}
</script>

<template>
  <div class="ti" :class="{ 'ti--mono': mono }">
    <span v-for="(item, i) in modelValue" :key="`${item}-${i}`" class="ti__chip">
      <span class="ti__text">{{ item }}</span>
      <button
        class="ti__x"
        type="button"
        :aria-label="`Remove ${item}`"
        @click="removeAt(i)"
      >×</button>
    </span>
    <input
      v-model="draft"
      class="ti__input"
      type="text"
      :placeholder="placeholder"
      @keydown="onKeydown"
      @blur="commitDraft"
    />
  </div>
</template>

<style scoped>
.ti {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 3px 6px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.ti:focus-within {
  outline: 2px solid var(--mc-focus);
  outline-offset: 1px;
}
.ti__chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 4px 1px 7px;
  font-size: 11.5px;
  background: var(--mc-surface-2);
  border: 1px solid var(--mc-border);
  border-radius: 4px;
  white-space: nowrap;
}
.ti--mono .ti__chip,
.ti--mono .ti__input {
  font-family: var(--mc-mono);
  font-size: 11px;
}
.ti__x {
  appearance: none;
  border: none;
  padding: 0 2px;
  font-size: 12px;
  line-height: 1;
  color: var(--mc-text-faint);
  background: transparent;
  cursor: pointer;
}
.ti__x:hover {
  color: var(--mc-status-error);
}
.ti__input {
  flex: 1;
  min-width: 90px;
  border: none;
  outline: none;
  padding: 2px;
  font-family: var(--mc-font);
  font-size: 12px;
  color: var(--mc-text);
  background: transparent;
}
.ti__input::placeholder {
  color: var(--mc-text-faint);
}
</style>
