<script setup lang="ts">
/**
 * WatchIndicator — the live-status control row: a watching on/off toggle plus a
 * connection-state indicator (a colored, optionally pulsing dot + label).
 *
 * PURE PRESENTATIONAL. It owns no stream: `watching` / `connection` / `eventCount`
 * come in via props and the toggle button emits a bare `toggle` for the parent to
 * act on. The stream itself lives in the page/story (see `../mocks/event-stream`)
 * and is wired to this component. Accent colors are bound INLINE from
 * `statusTokens`; structural styling uses the shared `--mc-*` vars. No Nuxt imports.
 */
import { computed } from "vue";

import { statusTokens } from "../design/tokens";
import type { ConnectionState } from "../composables/useEventStream";

const props = withDefaults(
  defineProps<{
    /** whether the stream is actively watching */
    watching: boolean;
    /** the connection lifecycle state */
    connection: ConnectionState;
    /** how many events have landed so far (shown while watching) */
    eventCount?: number;
    size?: "sm" | "md";
  }>(),
  { eventCount: 0, size: "md" },
);

const emit = defineEmits<{ (e: "toggle"): void }>();

/** Connection → its label, accent color, and whether the dot should pulse. */
const conn = computed<{ label: string; color: string; pulse: boolean }>(() => {
  switch (props.connection) {
    case "connecting":
      return { label: "Connecting…", color: statusTokens.running.color, pulse: true };
    case "open":
      return { label: "Live", color: statusTokens.green.color, pulse: true };
    case "error":
      return { label: "Disconnected", color: statusTokens.error.color, pulse: false };
    case "closed":
      return { label: "Stopped", color: "var(--mc-text-muted)", pulse: false };
    case "idle":
      return { label: "Idle", color: "var(--mc-text-muted)", pulse: false };
  }
});

/** Accent the toggle (green) only while watching; muted otherwise. */
const toggleAccent = computed(() =>
  props.watching ? { color: statusTokens.green.color, borderColor: statusTokens.green.color } : {},
);

const countLabel = computed(() => `${props.eventCount} ${props.eventCount === 1 ? "event" : "events"}`);
</script>

<template>
  <div class="wi" :class="`wi--${size}`">
    <button
      type="button"
      class="wi__toggle"
      :class="{ 'wi__toggle--on': watching }"
      :style="toggleAccent"
      :aria-pressed="watching"
      @click="emit('toggle')"
    >
      <span class="wi__toggle-glyph" aria-hidden="true">{{ watching ? "❙❙" : "▶" }}</span>
      <span class="wi__toggle-label">{{ watching ? "Watching" : "Paused" }}</span>
    </button>

    <span
      class="wi__conn"
      role="status"
      aria-live="polite"
      :aria-label="`Connection: ${conn.label}`"
    >
      <span
        class="wi__dot"
        :class="{ 'wi__dot--pulse': conn.pulse }"
        :style="{ color: conn.color }"
        aria-hidden="true"
      />
      <span class="wi__conn-label" :style="{ color: conn.color }">{{ conn.label }}</span>
    </span>

    <span v-if="watching" class="wi__count">{{ countLabel }}</span>
  </div>
</template>

<style scoped>
.wi {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 6px 12px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 999px;
}
.wi--sm {
  gap: 10px;
  padding: 4px 10px;
  font-size: 0.78rem;
}

/* Toggle button */
.wi__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font: inherit;
  font-weight: 700;
  color: var(--mc-text-muted);
  background: var(--mc-bg);
  border: 1px solid var(--mc-border);
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}
.wi__toggle:hover {
  background: var(--mc-surface);
}
.wi__toggle--on {
  background: var(--mc-surface);
}
.wi__toggle-glyph {
  font-size: 0.72em;
  line-height: 1;
}
.wi--sm .wi__toggle {
  padding: 3px 10px;
}

/* Connection indicator */
.wi__conn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
}
.wi__dot {
  position: relative;
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}
.wi--sm .wi__dot {
  width: 8px;
  height: 8px;
}
.wi__dot::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
}
.wi__dot--pulse::after {
  animation: wi-pulse 1.4s ease-out infinite;
}
.wi__conn-label {
  letter-spacing: 0.01em;
}

/* Event count */
.wi__count {
  color: var(--mc-text-muted);
  font-size: 0.82em;
  font-variant-numeric: tabular-nums;
}

@keyframes wi-pulse {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
}
</style>
