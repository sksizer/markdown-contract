<script setup lang="ts">
/**
 * DriftView — the config-drift surface (`init --check`): how the live corpus has
 * diverged from the committed contract. It renders a `DriftResult` as either a
 * single unified change-list or a side-by-side Added / Removed / Changed split,
 * with an in-sync panel when nothing has drifted.
 *
 * Each `DriftEntry` is classified into one of three change groups:
 *   ADDED   = section-added · field-added
 *   REMOVED = section-removed · field-removed
 *   CHANGED = field-changed · order-changed · unknown-admission-changed
 *
 * Pure presentational component: data in via props, no engine import, no Nuxt
 * auto-imports — so it renders identically in the app shell and in Storybook,
 * and can graft into a future apps/web unchanged. The added/removed/changed
 * accent colors are bound INLINE from a small local map (the design/tokens.ts
 * pattern); structural styling uses the shared `--mc-*` vars.
 */
import { computed } from "vue";
import type { DriftEntry, DriftKind, DriftResult } from "../mocks/types";
import StatusBadge from "./kit/StatusBadge.vue";
import EmptyState from "./kit/EmptyState.vue";

const props = withDefaults(
  defineProps<{
    /** the drift check to render */
    drift: DriftResult;
    /** presentation: a single unified list, or a side-by-side split */
    variant?: "unified" | "split";
    /** optional vault name for header context */
    vaultName?: string;
    /** optional heading above the view */
    title?: string;
  }>(),
  { variant: "unified", vaultName: "", title: "" },
);

/** The three change groups every drift entry collapses into. */
type GroupKey = "added" | "removed" | "changed";

/** Display order for the split columns and the summary line. */
const GROUP_ORDER: readonly GroupKey[] = ["added", "removed", "changed"];

/** Which group each `DriftKind` belongs to. */
const KIND_GROUP: Record<DriftKind, GroupKey> = {
  "section-added": "added",
  "field-added": "added",
  "section-removed": "removed",
  "field-removed": "removed",
  "field-changed": "changed",
  "order-changed": "changed",
  "unknown-admission-changed": "changed",
};

/**
 * The local visual language for the three groups (analogous to FindingsList's
 * LEVEL_LABEL). Accent hexes are harmonized with the `--mc-*` palette but stated
 * concretely and bound INLINE, so this component stays self-contained.
 */
const GROUP: Record<GroupKey, { label: string; glyph: string; color: string; bg: string }> = {
  added: { label: "Added", glyph: "+", color: "#1a7f37", bg: "#e8f5ec" },
  removed: { label: "Removed", glyph: "−", color: "#d1242f", bg: "#ffeef0" },
  changed: { label: "Changed", glyph: "~", color: "#8250df", bg: "#f5f0ff" },
};

interface Classified {
  entry: DriftEntry;
  group: GroupKey;
}

/** True when the contract still matches the corpus (no drift to reconcile). */
const inSync = computed(() => !props.drift.drifted || props.drift.entries.length === 0);

/** Entries in document order, each tagged with its change group. */
const classified = computed<Classified[]>(() =>
  props.drift.entries.map((entry) => ({ entry, group: KIND_GROUP[entry.kind] })),
);

/** Entries bucketed by group, for the split presentation. */
const byGroup = computed<Record<GroupKey, DriftEntry[]>>(() => {
  const out: Record<GroupKey, DriftEntry[]> = { added: [], removed: [], changed: [] };
  for (const entry of props.drift.entries) out[KIND_GROUP[entry.kind]].push(entry);
  return out;
});

/** Per-group tallies. */
const counts = computed<Record<GroupKey, number>>(() => ({
  added: byGroup.value.added.length,
  removed: byGroup.value.removed.length,
  changed: byGroup.value.changed.length,
}));

/** A one-line headline: a per-group breakdown when drifted, else the in-sync note. */
const summary = computed(() => {
  if (inSync.value) return "No drift — the committed contract matches the corpus.";
  const total = props.drift.entries.length;
  const parts = GROUP_ORDER.filter((g) => counts.value[g] > 0).map((g) => `${counts.value[g]} ${g}`);
  return `${total} change${total === 1 ? "" : "s"} — ${parts.join(" · ")}`;
});
</script>

<template>
  <section class="dv">
    <header class="dv__head">
      <div class="dv__heading">
        <h3 v-if="title" class="dv__title">{{ title }}</h3>
        <p v-if="vaultName" class="dv__vault">{{ vaultName }}</p>
      </div>
      <StatusBadge
        :status="drift.drifted ? 'drift' : 'green'"
        :label="drift.drifted ? 'In drift' : 'In sync'"
      />
    </header>

    <p class="dv__summary" data-test="drift-summary">{{ summary }}</p>

    <!-- in-sync: a first-class panel, not an empty list -->
    <EmptyState
      v-if="inSync"
      data-test="drift-in-sync"
      icon="✓"
      title="In sync"
      message="The committed contract matches the corpus — no config drift to reconcile."
    />

    <!-- unified: one ordered list of every change -->
    <ul v-else-if="variant === 'unified'" class="dv__list" data-test="drift-unified">
      <li
        v-for="(c, i) in classified"
        :key="`${c.entry.kind}-${i}`"
        class="dv__row"
        :style="{ borderLeftColor: GROUP[c.group].color }"
      >
        <span
          class="dv__tag"
          :style="{ color: GROUP[c.group].color, background: GROUP[c.group].bg }"
          :title="GROUP[c.group].label"
        >
          <span class="dv__glyph" aria-hidden="true">{{ GROUP[c.group].glyph }}</span>
          <span class="dv__group-label">{{ GROUP[c.group].label }}</span>
        </span>
        <div class="dv__body">
          <div class="dv__row-head">
            <span class="dv__kind">{{ c.entry.kind }}</span>
            <code class="dv__target">{{ c.entry.target }}</code>
          </div>
          <p class="dv__detail">{{ c.entry.detail }}</p>
        </div>
      </li>
    </ul>

    <!-- split: side-by-side Added / Removed / Changed columns -->
    <div v-else class="dv__split" data-test="drift-split">
      <section
        v-for="g in GROUP_ORDER"
        :key="g"
        class="dv__col"
        :data-test="`drift-col-${g}`"
      >
        <header class="dv__col-head">
          <span
            class="dv__tag"
            :style="{ color: GROUP[g].color, background: GROUP[g].bg }"
          >
            <span class="dv__glyph" aria-hidden="true">{{ GROUP[g].glyph }}</span>
            <span class="dv__group-label">{{ GROUP[g].label }}</span>
          </span>
          <span class="dv__col-count">{{ counts[g] }}</span>
        </header>
        <ul v-if="byGroup[g].length > 0" class="dv__col-list">
          <li
            v-for="(e, i) in byGroup[g]"
            :key="`${e.kind}-${i}`"
            class="dv__col-item"
            :style="{ borderLeftColor: GROUP[g].color }"
          >
            <div class="dv__row-head">
              <span class="dv__kind">{{ e.kind }}</span>
              <code class="dv__target">{{ e.target }}</code>
            </div>
            <p class="dv__detail">{{ e.detail }}</p>
          </li>
        </ul>
        <p v-else class="dv__col-empty">No {{ GROUP[g].label.toLowerCase() }} entries.</p>
      </section>
    </div>

    <!-- advisory diagnostics: NOT themselves drift (per DriftResult doc comment) -->
    <aside v-if="drift.warnings.length > 0" class="dv__warnings" data-test="drift-warnings">
      <h4 class="dv__warnings-title">Advisory diagnostics</h4>
      <p class="dv__warnings-note">
        Inference notes only — these do not themselves constitute drift.
      </p>
      <ul class="dv__warnings-list">
        <li v-for="(w, i) in drift.warnings" :key="i" class="dv__warning">{{ w }}</li>
      </ul>
    </aside>
  </section>
</template>

<style scoped>
.dv {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dv__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.dv__title {
  margin: 0;
  font-size: 1rem;
}
.dv__vault {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: var(--mc-text-muted);
}
.dv__summary {
  margin: 0;
  color: var(--mc-text-muted);
  font-size: 0.9rem;
}

/* unified list */
.dv__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dv__row {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-left-width: 4px;
  border-radius: var(--mc-radius);
}

/* shared tag pill (unified rows + split headers) */
.dv__tag {
  flex: 0 0 auto;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
.dv__glyph {
  font-weight: 700;
  line-height: 1;
}

.dv__body {
  min-width: 0;
}
.dv__row-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
}
.dv__kind {
  font-weight: 600;
  font-size: 0.82rem;
}
.dv__target {
  color: var(--mc-text-muted);
  font-family: var(--mc-mono);
}
.dv__detail {
  margin: 4px 0 0;
}

/* split columns */
.dv__split {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.dv__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.dv__col-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.dv__col-count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--mc-text-muted);
}
.dv__col-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dv__col-item {
  padding: 8px 10px;
  background: var(--mc-bg);
  border: 1px solid var(--mc-border);
  border-left-width: 4px;
  border-radius: var(--mc-radius);
}
.dv__col-empty {
  margin: 0;
  color: var(--mc-text-muted);
  font-size: 0.85rem;
}

/* advisory diagnostics */
.dv__warnings {
  padding: 12px 14px;
  background: var(--mc-warn-bg);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.dv__warnings-title {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mc-warn);
}
.dv__warnings-note {
  margin: 4px 0 8px;
  font-size: 0.82rem;
  color: var(--mc-text-muted);
}
.dv__warnings-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dv__warning {
  font-size: 0.88rem;
}
</style>
