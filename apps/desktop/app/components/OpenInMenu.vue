<script setup lang="ts">
/**
 * OpenInMenu — the "Open in …" dropdown (D-0018 §D5): detected installed apps
 * (already preference-merged by the backend), filtered to what can open the
 * target (`dir` → vault root, `file` → a finding's markdown file). Each entry
 * shows the effective launch command as its preview (path-opener's
 * preview_command through the `preview_open` IPC).
 */
import { computed, ref } from "vue";
import type { OpenerInfo } from "../bindings/types";
import { useOpeners } from "../composables/useOpeners";

const props = defineProps<{
  /** Absolute path to open. */
  path: string;
  /** What the path is — decides which openers qualify. */
  kind: "dir" | "file";
  /** Button label; defaults to "Open in …". */
  label?: string;
}>();

const svc = useOpeners();
const open = ref(false);
const apps = ref<OpenerInfo[]>([]);
const previews = ref<Record<string, string>>({});
const error = ref<string | null>(null);

const relevant = computed(() =>
  apps.value.filter((o) => (props.kind === "dir" ? o.accepts_directories : o.accepts_markdown)),
);

async function toggle() {
  open.value = !open.value;
  if (!open.value) return;
  try {
    apps.value = await svc.list();
    error.value = null;
  } catch (e) {
    error.value = String(e);
    return;
  }
  // Launch previews, best effort — the menu is useful without them.
  for (const app of relevant.value) {
    svc
      .preview(props.path, app.app_id)
      .then((p) => {
        previews.value[app.app_id] = [p.program, ...p.args].join(" ");
      })
      .catch(() => {});
  }
}

async function launch(appId: string) {
  open.value = false;
  try {
    await svc.open(props.path, appId);
    error.value = null;
  } catch (e) {
    error.value = String(e);
  }
}
</script>

<template>
  <div class="oim">
    <button type="button" class="mc-btn" @click="toggle">
      {{ label ?? "Open in …" }}
      <span class="oim__caret" aria-hidden="true">▾</span>
    </button>
    <!-- click-away backdrop -->
    <div v-if="open" class="oim__backdrop" @click="open = false" />
    <div v-if="open" class="oim__panel" role="menu">
      <p v-if="relevant.length === 0" class="oim__empty">No matching apps detected</p>
      <button
        v-for="app in relevant"
        :key="app.app_id"
        type="button"
        class="oim__item"
        role="menuitem"
        :title="previews[app.app_id] ?? app.command"
        @click="launch(app.app_id)"
      >
        <span class="oim__name">{{ app.name }}</span>
        <code v-if="previews[app.app_id]" class="oim__preview">{{
          previews[app.app_id]
        }}</code>
      </button>
    </div>
    <p v-if="error" class="mc-error oim__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.oim {
  position: relative;
  display: inline-flex;
  flex-direction: column;
}
.oim__caret {
  font-size: 9px;
  color: var(--mc-text-faint);
}
.oim__backdrop {
  position: fixed;
  inset: 0;
  z-index: 19;
}
.oim__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  min-width: 220px;
  max-width: 340px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border-strong);
  border-radius: var(--mc-radius-lg);
  box-shadow: var(--mc-shadow-overlay);
}
.oim__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 5px 8px;
  border: 0;
  background: transparent;
  border-radius: var(--mc-radius);
  color: var(--mc-text);
  font-family: var(--mc-font);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}
.oim__item:hover {
  background: var(--mc-hover);
}
.oim__name {
  font-weight: 550;
}
.oim__preview {
  font-size: 10px;
  color: var(--mc-text-faint);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oim__empty {
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--mc-text-muted);
}
.oim__error {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  white-space: nowrap;
}
</style>
