<script setup lang="ts">
/**
 * The example's ONE page — the whole M-0008 UI surface: enter a markdown-tree
 * path, `POST /api/validate` on the daemon serving this page, render the
 * returned findings with the kit subset adopted from apps/web.
 *
 * Deliberately no registry, no SSE, no watching, no editor, no other routes —
 * that is apps/web (M-0009). See the package README's Boundary section.
 */
import { computed, onMounted, ref } from "vue";

import EmptyState from "~/components/kit/EmptyState.vue";
import ErrorState from "~/components/kit/ErrorState.vue";
import FindingRow from "~/components/kit/FindingRow.vue";
import LoadingState from "~/components/kit/LoadingState.vue";
import SeverityBadge from "~/components/kit/SeverityBadge.vue";
import StatusBadge from "~/components/kit/StatusBadge.vue";
import { SEVERITY_ORDER, severityRank } from "~/design/tokens";
import { countByLevel } from "~/lib/findings";
import type { ApiError, HealthResponse, ValidateResponse } from "~/types";

/** "" (same origin) everywhere here — in this variant even `nuxt dev` serves the API itself. */
const apiBase = (useRuntimeConfig().public.apiBase as string) ?? "";

// ── daemon identity (GET /api/health, once on load) ─────────────────────────────
const health = ref<HealthResponse | null>(null);
onMounted(async () => {
  try {
    health.value = await $fetch<HealthResponse>(`${apiBase}/api/health`);
  } catch {
    health.value = null; // unreachable — the form still renders; validate will surface it
  }
});

// ── the validate flow (POST /api/validate) ──────────────────────────────────────
const path = ref("");
type Phase = "idle" | "running" | "done" | "failed";
const phase = ref<Phase>("idle");
const result = ref<ValidateResponse | null>(null);
const errorMessage = ref("");

async function validate(): Promise<void> {
  const vault = path.value.trim();
  if (!vault || phase.value === "running") return;
  phase.value = "running";
  result.value = null;
  errorMessage.value = "";
  try {
    result.value = await $fetch<ValidateResponse>(`${apiBase}/api/validate`, {
      method: "POST",
      body: { path: vault },
    });
    phase.value = "done";
  } catch (err) {
    const e = err as { data?: ApiError; message?: string };
    errorMessage.value = e.data?.error ?? e.message ?? "request failed";
    phase.value = "failed";
  }
}

const findings = computed(() => result.value?.findings ?? []);
/** Most-severe first, stable within a level (the CLI's reading order). */
const sortedFindings = computed(() =>
  [...findings.value].sort((a, b) => severityRank(b.level) - severityRank(a.level)),
);
const counts = computed(() => countByLevel(findings.value));
/** Only the severity levels actually present, so the tally stays tight. */
const presentLevels = computed(() => SEVERITY_ORDER.filter((level) => counts.value[level] > 0));
const runState = computed(() => (findings.value.length > 0 ? "findings" : "green"));
</script>

<template>
  <div class="app">
    <header class="hd">
      <span class="hd__logo" aria-hidden="true">md</span>
      <div class="hd__names">
        <h1 class="hd__title">markdown-contract</h1>
        <p class="hd__sub">single-binary-nitro example — validate a markdown tree</p>
      </div>
      <span class="hd__health">
        {{ health ? `daemon v${health.version}` : "daemon unreachable" }}
      </span>
    </header>

    <main class="pane">
      <div class="page-body">
        <form class="bar" @submit.prevent="validate">
          <label class="field bar__path">
            <span class="field__label">Vault path</span>
            <input
              v-model="path"
              class="input"
              placeholder="/path/to/markdown-tree (absolute, or relative to the daemon's directory)"
              spellcheck="false"
            />
          </label>
          <button
            class="btn btn--primary"
            type="submit"
            :disabled="phase === 'running' || !path.trim()"
          >
            Validate
          </button>
        </form>

        <LoadingState v-if="phase === 'running'" label="Validating…" />

        <ErrorState
          v-else-if="phase === 'failed'"
          title="Validation failed"
          :message="errorMessage"
        >
          <button class="btn" type="button" @click="validate">Retry</button>
        </ErrorState>

        <template v-else-if="phase === 'done' && result">
          <div class="sum">
            <StatusBadge :status="runState" :label="runState === 'green' ? 'Clean' : undefined" />
            <SeverityBadge
              v-for="level in presentLevels"
              :key="level"
              :level="level"
              :count="counts[level]"
            />
            <span class="sum__stats">
              {{ result.stats.filesMatched }}/{{ result.stats.filesScanned }} files matched ·
              exit {{ result.exitCode }}
            </span>
          </div>

          <EmptyState
            v-if="findings.length === 0"
            icon="✓"
            title="No findings"
            message="Every matched file satisfies its contract."
          />
          <div v-else class="list">
            <FindingRow v-for="(f, i) in sortedFindings" :key="i" :finding="f" />
          </div>
        </template>

        <EmptyState
          v-else
          icon="▸"
          title="Point at a markdown tree"
          message="Enter the path of a tree governed by a markdown-contract config; the daemon runs the corpus in-process and returns its findings."
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* header — a slim unified toolbar */
.hd {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--mc-border);
  background: var(--mc-surface);
}
.hd__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--mc-accent) 80%, #fff),
    var(--mc-accent)
  );
  color: var(--mc-on-accent);
  font-family: var(--mc-mono);
  font-size: 11px;
  font-weight: 700;
}
.hd__names {
  min-width: 0;
}
.hd__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.hd__sub {
  margin: 0;
  font-size: 11.5px;
  color: var(--mc-text-muted);
}
.hd__health {
  margin-left: auto;
  font-family: var(--mc-mono);
  font-size: 11px;
  color: var(--mc-text-faint);
  white-space: nowrap;
}

/* the scrolling content pane */
.pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* the validate bar: path field + button on one line */
.bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 720px;
}
.bar__path {
  flex: 1;
  min-width: 0;
}

/* run summary strip */
.sum {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 720px;
}
.sum__stats {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--mc-text-muted);
  font-variant-numeric: tabular-nums;
}

/* findings list */
.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 720px;
}
</style>
