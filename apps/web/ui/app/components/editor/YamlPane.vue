<script setup lang="ts">
/**
 * YamlPane — the raw-text side of the editor: a monospace textarea bound to
 * the file's buffer, with debounced (~300ms) client-side parse feedback shown
 * inline under the pane. The daemon (engine parser) stays the real validator
 * on save; this is just fast feedback while typing.
 */
import { onBeforeUnmount, ref, watch } from "vue";
import { parse } from "yaml";

import { debounce } from "~/lib/debounce";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<(e: "update:modelValue", value: string) => void>();

const parseError = ref<string | null>(null);

function check(text: string): void {
  try {
    parse(text);
    parseError.value = null;
  } catch (err) {
    parseError.value = (err as Error).message;
  }
}

const scheduleCheck = debounce(check, 300);

watch(
  () => props.modelValue,
  (text) => scheduleCheck(text),
  { immediate: true },
);

onBeforeUnmount(() => scheduleCheck.cancel());

function onInput(event: Event): void {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <div class="yp">
    <textarea
      class="input yp__ta"
      :value="modelValue"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      aria-label="YAML source"
      :aria-invalid="parseError !== null"
      @input="onInput"
    />
    <p v-if="parseError" class="yp__error" role="alert">{{ parseError }}</p>
    <p v-else class="yp__ok">YAML parses — the daemon validates the full contract on save.</p>
  </div>
</template>

<style scoped>
.yp {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 0;
}
.yp__ta {
  flex: 1;
  width: 100%;
  min-height: 380px;
  font-family: var(--mc-mono);
  font-size: 12px;
  line-height: 1.55;
  tab-size: 2;
  white-space: pre;
  overflow-x: auto;
}
.yp__error {
  margin: 0;
  padding: 6px 10px;
  font-family: var(--mc-mono);
  font-size: 11.5px;
  white-space: pre-wrap;
  color: var(--mc-status-error);
  background: var(--mc-status-error-bg);
  border: 1px solid var(--mc-status-error);
  border-radius: var(--mc-radius);
}
.yp__ok {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-text-faint);
}
</style>
