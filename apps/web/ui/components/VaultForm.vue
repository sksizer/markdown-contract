<script setup lang="ts">
/**
 * VaultForm — a self-contained "register / manage vaults" panel.
 *
 * It holds a reactive working copy of the vault registry (seeded from the
 * `vaults` prop), renders the managed-vault list (this list IS the surface that
 * "reflects on the dashboard" — every add/edit/remove mutates it), and provides
 * an add-vault form with client-side validation plus per-row Edit + Remove
 * affordances. Two presentation variants: an always-open inline panel and a
 * modal dialog.
 *
 * Pure presentational: data in via props, registry mutations emitted out
 * (`register` / `update` / `remove` / `update:vaults`). Controls use the global
 * `.btn` / `.input` / `.field` classes from assets/css/main.css; status accents
 * come from `statusTokens` via StatusBadge.
 */
import { computed, reactive, ref, watch } from "vue";

import type { RegisterVaultRequest, VaultStatus } from "../types";
import StatusBadge from "./kit/StatusBadge.vue";

const props = withDefaults(
  defineProps<{
    /** Initial registry seed (shallow-copied so fixtures are never mutated). */
    vaults?: VaultStatus[];
    /** Inline panel (always-open form) vs modal dialog. */
    variant?: "inline" | "modal";
    /** Seed values for the add form. */
    initialDraft?: Partial<{ name: string; path: string; configPath: string }>;
    /** Render validation messages immediately (used by the error-state stories). */
    eagerValidation?: boolean;
  }>(),
  {
    vaults: () => [],
    variant: "inline",
    initialDraft: undefined,
    eagerValidation: false,
  },
);

const emit = defineEmits<{
  register: [req: RegisterVaultRequest];
  update: [vault: VaultStatus];
  remove: [id: string];
  "update:vaults": [vaults: VaultStatus[]];
}>();

// ── State ────────────────────────────────────────────────────────────────────
// Shallow-copy each entry so we NEVER mutate the imported fixtures; re-seed when
// the prop changes so Storybook arg edits flow through.
const registry = ref<VaultStatus[]>(props.vaults.map((v) => ({ ...v })));
watch(
  () => props.vaults,
  (v) => {
    registry.value = v.map((x) => ({ ...x }));
  },
);

const draft = reactive({
  name: props.initialDraft?.name ?? "",
  path: props.initialDraft?.path ?? "",
  configPath: props.initialDraft?.configPath ?? "",
});

const editingId = ref<string | null>(null);
const attempted = ref(false);
// Modal variant starts open so the story shows the dialog at a glance.
const modalOpen = ref(props.variant === "modal");

// ── Validation ───────────────────────────────────────────────────────────────
const errors = computed(() => {
  const e: { name?: string; path?: string; configPath?: string } = {};
  const name = draft.name.trim();
  const path = draft.path.trim();
  const cfg = draft.configPath.trim();

  if (name === "") {
    e.name = "Name is required.";
  } else {
    const dup = registry.value.some(
      (v) => v.id !== editingId.value && v.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (dup) e.name = `A vault named "${name}" already exists.`;
  }

  if (path === "") {
    e.path = "Path is required.";
  }

  const cfgLower = cfg.toLowerCase();
  if (cfg !== "" && !cfgLower.endsWith(".yaml") && !cfgLower.endsWith(".yml")) {
    e.configPath = "Config must be a .yaml or .yml file.";
  }

  return e;
});

const showErrors = computed(() => props.eagerValidation || attempted.value);
const isValid = computed(() => Object.keys(errors.value).length === 0);

// ── Derived view state ───────────────────────────────────────────────────────
const editingVault = computed(() => registry.value.find((v) => v.id === editingId.value) ?? null);
const formTitle = computed(() =>
  editingId.value ? `Edit ${editingVault.value?.name ?? "vault"}` : "Add vault",
);
const submitLabel = computed(() => (editingId.value ? "Save changes" : "Add vault"));
/** Show the form: inline is always-open; modal only while open. */
const showForm = computed(() => props.variant === "inline" || modalOpen.value);

// ── Actions ──────────────────────────────────────────────────────────────────
function effectiveConfig(path: string, cfg: string): string {
  return cfg.trim() || `${path}/markdown-contract.yaml`;
}

function submit(): void {
  attempted.value = true;
  if (!isValid.value) return;

  const name = draft.name.trim();
  const path = draft.path.trim();

  if (editingId.value) {
    const id = editingId.value;
    registry.value = registry.value.map((v) =>
      v.id === id ? { ...v, name, path, configPath: effectiveConfig(path, draft.configPath) } : v,
    );
    const updated = registry.value.find((v) => v.id === id);
    if (updated) emit("update", updated);
    emit("update:vaults", registry.value);
  } else {
    const req: RegisterVaultRequest = {
      name,
      path,
      ...(draft.configPath.trim() !== "" ? { configPath: draft.configPath.trim() } : {}),
    };
    // The PARENT owns the registration now: it POSTs to the daemon and re-seeds
    // the `vaults` prop from the live registry, which re-seeds `registry` here.
    emit("register", req);
  }

  resetForm();
}

function startEdit(v: VaultStatus): void {
  draft.name = v.name;
  draft.path = v.path;
  draft.configPath = v.configPath;
  editingId.value = v.id;
  attempted.value = false;
  modalOpen.value = true;
}

function resetForm(): void {
  draft.name = "";
  draft.path = "";
  draft.configPath = "";
  editingId.value = null;
  attempted.value = false;
  // Inline keeps the form visible; modal closes the dialog.
  modalOpen.value = props.variant === "modal" ? false : modalOpen.value;
}

function cancel(): void {
  resetForm();
}

function openAdd(): void {
  resetForm();
  modalOpen.value = true;
}

function removeVault(id: string): void {
  registry.value = registry.value.filter((v) => v.id !== id);
  emit("remove", id);
  emit("update:vaults", registry.value);
  if (editingId.value === id) resetForm();
}
</script>

<template>
  <section class="vf">
    <header class="vf__header">
      <div>
        <h2 class="vf__title">Managed vaults</h2>
        <p class="vf__count">{{ registry.length }} tracked</p>
      </div>
      <button
        v-if="variant === 'modal'"
        type="button"
        class="btn btn--primary"
        @click="openAdd"
      >
        Add vault
      </button>
    </header>

    <!-- Registry list — the surface that reflects every add/edit/remove. -->
    <p v-if="registry.length === 0" class="vf__empty" data-test="vf-empty">
      No vaults registered yet — add one below.
    </p>
    <ul v-else class="vf__list">
      <li v-for="v in registry" :key="v.id" class="vf__row" data-test="vf-row">
        <StatusBadge :status="v.state" size="sm" />
        <div class="vf__rowmain">
          <strong class="vf__name">{{ v.name }}</strong>
          <span class="vf__path">{{ v.path }}</span>
          <span class="vf__config">{{ v.configPath }}</span>
        </div>
        <div class="vf__rowactions">
          <button type="button" class="btn" @click="startEdit(v)">Edit</button>
          <button type="button" class="btn btn--danger" @click="removeVault(v.id)">
            Remove
          </button>
        </div>
      </li>
    </ul>

    <!-- Modal backdrop (modal variant only); clicking it cancels. -->
    <div
      v-if="variant === 'modal' && modalOpen"
      class="vf__overlay"
      @click="cancel"
    />

    <!-- The single, DRY form block, placed in the right container by variant. -->
    <div
      v-if="showForm"
      class="vf__formwrap"
      :class="variant === 'modal' ? 'vf__formwrap--modal' : 'vf__formwrap--inline'"
      :role="variant === 'modal' ? 'dialog' : undefined"
      :aria-modal="variant === 'modal' ? 'true' : undefined"
      aria-label="Register or edit a vault"
    >
      <form class="vf__form" @submit.prevent="submit">
        <h3 class="vf__form-title">{{ formTitle }}</h3>

        <label class="field">
          <span class="field__label">Name</span>
          <input
            v-model="draft.name"
            class="input"
            type="text"
            placeholder="Team Handbook"
            :aria-invalid="showErrors && !!errors.name"
          />
          <p
            v-if="showErrors && errors.name"
            class="vf__error"
            role="alert"
            data-test="vf-error-name"
          >
            {{ errors.name }}
          </p>
        </label>

        <label class="field">
          <span class="field__label">Path</span>
          <input
            v-model="draft.path"
            class="input"
            type="text"
            placeholder="~/vaults/my-vault"
            :aria-invalid="showErrors && !!errors.path"
          />
          <p
            v-if="showErrors && errors.path"
            class="vf__error"
            role="alert"
            data-test="vf-error-path"
          >
            {{ errors.path }}
          </p>
        </label>

        <label class="field">
          <span class="field__label">
            Config path <span class="vf__optional">(optional)</span>
          </span>
          <input
            v-model="draft.configPath"
            class="input"
            type="text"
            placeholder="markdown-contract.yaml"
            :aria-invalid="showErrors && !!errors.configPath"
          />
          <p
            v-if="showErrors && errors.configPath"
            class="vf__error"
            role="alert"
            data-test="vf-error-config"
          >
            {{ errors.configPath }}
          </p>
        </label>

        <p class="vf__note">
          The daemon only reads vaults; this manages which markdown trees are tracked.
        </p>

        <div class="vf__actions">
          <button type="submit" class="btn btn--primary">
            {{ submitLabel }}
          </button>
          <button
            v-if="variant === 'modal' || editingId"
            type="button"
            class="btn"
            @click="cancel"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.vf {
  display: flex;
  flex-direction: column;
  gap: var(--mc-gap);
  position: relative;
}
.vf__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.vf__title {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}
.vf__count {
  margin: 1px 0 0;
  font-size: 11.5px;
  color: var(--mc-text-muted);
}

/* Registry list */
.vf__empty {
  margin: 0;
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--mc-text-muted);
  background: var(--mc-surface);
  border: 1px dashed var(--mc-border);
  border-radius: var(--mc-radius);
}
.vf__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vf__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.vf__rowmain {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1 1 auto;
}
.vf__name {
  font-size: 12.5px;
}
.vf__path {
  font-family: var(--mc-mono);
  font-size: 11px;
  color: var(--mc-text-muted);
  word-break: break-all;
}
.vf__config {
  font-family: var(--mc-mono);
  font-size: 10.5px;
  color: var(--mc-text-faint);
  word-break: break-all;
}
.vf__rowactions {
  display: flex;
  gap: 5px;
  flex: 0 0 auto;
}

/* Form */
.vf__formwrap--inline {
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  padding: 12px 14px;
}
.vf__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.vf__form-title {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}
.vf__optional {
  font-weight: 400;
  color: var(--mc-text-faint);
}
.vf__error {
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--mc-sev-error);
}
.vf__note {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-text-faint);
}
.vf__actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* Modal */
.vf__overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 16, 20, 0.45);
  z-index: 10;
}
.vf__formwrap--modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
  padding: 16px;
  z-index: 11;
  box-shadow: var(--mc-shadow-overlay);
}
</style>
