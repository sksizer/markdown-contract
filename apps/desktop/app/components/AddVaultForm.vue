<script setup lang="ts">
/**
 * AddVaultForm — register a vault: absolute path (plain text input — no
 * dialog plugin in this pass), display name (defaults to the path's last
 * segment), the watch toggle, and an optional cron schedule (validated
 * backend-side at the vault-create seam; rejections surface inline).
 */
import { ref } from "vue";
import type { Vault } from "../bindings/types";
import { useVaults } from "../composables/useVaults";

const emit = defineEmits<{
  added: [vault: Vault];
}>();

const vaults = useVaults();

const path = ref("");
const name = ref("");
const watch = ref(true);
const schedule = ref("");
const busy = ref(false);
const error = ref<string | null>(null);

async function submit() {
  const root = path.value.trim().replace(/\/+$/, "");
  if (root === "") {
    error.value = "A vault path is required.";
    return;
  }
  const now = new Date().toISOString();
  busy.value = true;
  error.value = null;
  try {
    const vault = await vaults.register({
      id: "", // backend derives the slug id from the name
      name: name.value.trim() || (root.split("/").pop() ?? root),
      path: root,
      config_path: `${root}/markdown-contract.yaml`,
      watch_enabled: watch.value,
      schedule: schedule.value.trim() === "" ? null : schedule.value.trim(),
      created_at: now,
      updated_at: now,
    });
    path.value = "";
    name.value = "";
    schedule.value = "";
    emit("added", vault);
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="avf" @submit.prevent="submit">
    <div class="avf__grid">
      <label class="avf__label" for="avf-path">Path</label>
      <input
        id="avf-path"
        v-model="path"
        class="mc-field"
        type="text"
        placeholder="/absolute/path/to/vault"
        spellcheck="false"
      />

      <label class="avf__label" for="avf-name">Name</label>
      <input
        id="avf-name"
        v-model="name"
        class="mc-field"
        type="text"
        placeholder="defaults to the folder name"
      />

      <label class="avf__label" for="avf-schedule">Schedule</label>
      <input
        id="avf-schedule"
        v-model="schedule"
        class="mc-field avf__mono"
        type="text"
        placeholder="cron, e.g. 0 9 * * * (optional)"
        spellcheck="false"
      />

      <span class="avf__label">Watch</span>
      <label class="avf__check" for="avf-watch">
        <input id="avf-watch" v-model="watch" type="checkbox" />
        re-scan when files change
      </label>
    </div>

    <p v-if="error" class="mc-error">{{ error }}</p>

    <div class="avf__actions">
      <button type="submit" class="mc-btn mc-btn--primary" :disabled="busy">
        {{ busy ? "Adding…" : "Add vault" }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.avf {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-lg);
}
.avf__grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 10px;
  align-items: center;
}
.avf__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.avf__mono {
  font-family: var(--mc-mono);
}
.avf__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--mc-text);
}
.avf__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
