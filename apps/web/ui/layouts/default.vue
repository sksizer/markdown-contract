<script setup lang="ts">
/**
 * App frame — a full-viewport application shell (no body scroll): a fixed
 * left sidebar and a main pane that scrolls independently.
 *
 * Sidebar: brand row, vault nav (live status dot + name per vault, fed by the
 * shared useVaults store), an add-vault item, and a pinned footer carrying the
 * SSE live indicator (WatchIndicator over the ONE shared stream) plus daemon
 * liveness polled from GET /api/health.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import WatchIndicator from "~/components/WatchIndicator.vue";
import { useApiBase } from "~/composables/useApi";
import { useVaults } from "~/composables/useVaults";
import { statusTokens } from "~/design/tokens";
import type { HealthResponse } from "~/types";

const { vaults, stream } = useVaults();
const { watching, connection, eventCount } = stream;

function toggleStream(): void {
  if (watching.value) stream.stop();
  else stream.start();
}

// ── daemon liveness (GET /api/health, polled) ───────────────────────────────────
const base = useApiBase();
type Health = "checking" | "ok" | "down";
const health = ref<Health>("checking");
const healthVersion = ref("");

async function pollHealth(): Promise<void> {
  try {
    const res = await $fetch<HealthResponse>(`${base}/api/health`);
    health.value = res.ok ? "ok" : "down";
    healthVersion.value = res.version;
  } catch {
    health.value = "down";
  }
}

let healthTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void pollHealth();
  healthTimer = setInterval(() => void pollHealth(), 15_000);
});
onBeforeUnmount(() => clearInterval(healthTimer));

const healthLabel = computed(() => {
  switch (health.value) {
    case "ok":
      return "daemon up";
    case "down":
      return "daemon unreachable";
    default:
      return "checking daemon…";
  }
});
</script>

<template>
  <div class="app">
    <aside class="side">
      <NuxtLink to="/" class="side__brand">
        <span class="side__logo" aria-hidden="true">md</span>
        <span class="side__brand-name">markdown-contract</span>
      </NuxtLink>

      <nav class="side__nav" aria-label="Main">
        <NuxtLink to="/" class="side__item" exact-active-class="side__item--active">
          <span class="side__glyph" aria-hidden="true">▦</span>
          <span class="side__name">Dashboard</span>
        </NuxtLink>

        <h2 class="side__section">Vaults</h2>
        <NuxtLink
          v-for="v in vaults"
          :key="v.id"
          :to="`/vault/${v.id}`"
          class="side__item"
          active-class="side__item--active"
        >
          <span
            class="side__dot"
            :style="{ background: statusTokens[v.state].color }"
            :title="statusTokens[v.state].label"
            aria-hidden="true"
          />
          <span class="side__name">{{ v.name }}</span>
        </NuxtLink>
        <p v-if="vaults.length === 0" class="side__none">No vaults yet</p>

        <NuxtLink
          to="/register"
          class="side__item side__item--add"
          exact-active-class="side__item--active"
        >
          <span class="side__glyph" aria-hidden="true">+</span>
          <span class="side__name">Add vault</span>
        </NuxtLink>
      </nav>

      <footer class="side__foot">
        <WatchIndicator
          :watching="watching"
          :connection="connection"
          :event-count="eventCount"
          size="sm"
          @toggle="toggleStream"
        />
        <div class="side__health">
          <span class="side__health-dot" :class="`side__health-dot--${health}`" aria-hidden="true" />
          <span>{{ healthLabel }}</span>
          <span v-if="healthVersion" class="side__version">v{{ healthVersion }}</span>
        </div>
      </footer>
    </aside>

    <main class="pane">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* ── sidebar ── */
.side {
  flex: 0 0 230px;
  width: 230px;
  display: flex;
  flex-direction: column;
  background: var(--mc-sidebar);
  border-right: 1px solid var(--mc-border);
}
.side__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  color: var(--mc-text);
  text-decoration: none;
}
.side__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: var(--mc-text);
  color: var(--mc-sidebar);
  font-family: var(--mc-mono);
  font-size: 10.5px;
  font-weight: 700;
}
.side__brand-name {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.side__nav {
  flex: 1;
  overflow-y: auto;
  padding: 2px 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.side__section {
  margin: 12px 6px 3px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--mc-text-faint);
}
.side__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--mc-text);
  text-decoration: none;
}
.side__item:hover {
  background: var(--mc-hover);
}
.side__item--active {
  background: var(--mc-active);
  font-weight: 600;
}
.side__item--add {
  color: var(--mc-text-muted);
}
.side__glyph {
  display: inline-flex;
  justify-content: center;
  width: 10px;
  color: var(--mc-text-muted);
  font-size: 11px;
}
.side__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin: 0 1px;
  border-radius: 50%;
}
.side__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.side__none {
  margin: 2px 8px;
  font-size: 12px;
  color: var(--mc-text-faint);
}
.side__foot {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  border-top: 1px solid var(--mc-border);
}
.side__health {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--mc-text-muted);
}
.side__health-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mc-text-faint);
}
.side__health-dot--ok {
  background: var(--mc-status-green);
}
.side__health-dot--down {
  background: var(--mc-status-error);
}
.side__version {
  margin-left: auto;
  font-family: var(--mc-mono);
  font-size: 10.5px;
  color: var(--mc-text-faint);
}

/* ── main pane ── */
.pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--mc-bg);
}
</style>
