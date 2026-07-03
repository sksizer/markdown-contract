<script lang="ts">
/** One row of the contract editor's file list, as the page derives it. */
export interface FileListRow {
  relPath: string;
  kind: "config" | "contract";
  exists: boolean;
  /** buffer differs from what's saved on disk */
  dirty: boolean;
  /** parse verdict: client-side for dirty buffers, the daemon's for saved ones */
  status: "ok" | "error" | "missing";
  statusMessage: string;
}
</script>

<script setup lang="ts">
/**
 * FileList — the slim left rail of the contract editor: the router config
 * first, then every referenced *.contract.yaml. Each row carries a kind tag,
 * a dirty dot, and a parse-status dot. Selection only — all state lives in
 * the page.
 */
defineProps<{ rows: FileListRow[]; selected: string }>();

const emit = defineEmits<{ (e: "select", relPath: string): void }>();

const KIND_LABEL: Record<FileListRow["kind"], string> = {
  config: "router",
  contract: "contract",
};

function statusTitle(row: FileListRow): string {
  if (row.status === "missing") return "not created yet";
  if (row.status === "error") return row.statusMessage || "does not parse";
  return "parses";
}
</script>

<template>
  <nav class="fl" aria-label="Contract files">
    <button
      v-for="row in rows"
      :key="row.relPath"
      class="fl__item"
      :class="{ 'fl__item--active': row.relPath === selected }"
      type="button"
      @click="emit('select', row.relPath)"
    >
      <span
        class="fl__status"
        :class="`fl__status--${row.status}`"
        :title="statusTitle(row)"
        aria-hidden="true"
      />
      <span class="fl__text">
        <span class="fl__name">{{ row.relPath }}</span>
        <span class="fl__kind">{{ KIND_LABEL[row.kind] }}<template v-if="!row.exists"> · new</template></span>
      </span>
      <span v-if="row.dirty" class="fl__dirty" title="unsaved changes" aria-hidden="true" />
    </button>
    <p v-if="rows.length === 0" class="fl__none">No contract files</p>
  </nav>
</template>

<style scoped>
.fl {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fl__item {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  font-family: var(--mc-font);
  color: var(--mc-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--mc-radius);
  cursor: pointer;
}
.fl__item:hover {
  background: var(--mc-hover);
}
.fl__item--active {
  background: var(--mc-surface);
  border-color: var(--mc-border);
}
.fl__status {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.fl__status--ok {
  background: var(--mc-status-green);
}
.fl__status--error {
  background: var(--mc-status-error);
}
.fl__status--missing {
  background: transparent;
  border: 1.5px dashed var(--mc-text-faint);
}
.fl__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.fl__name {
  font-family: var(--mc-mono);
  font-size: 11.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fl__kind {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.fl__dirty {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mc-accent);
}
.fl__none {
  margin: 2px 4px;
  font-size: 12px;
  color: var(--mc-text-faint);
}
</style>
