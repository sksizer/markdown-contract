import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, defineComponent, type PropType, ref, watch } from "vue";

import { mockVaultStatuses } from "../mocks/api-fixtures";
import { type ConnectionState, useMockEventStream } from "../mocks/event-stream";
import StatusBadge from "./kit/StatusBadge.vue";
import WatchIndicator from "./WatchIndicator.vue";

/**
 * WatchIndicator is the live-status control row. Group A below shows every
 * connection state on its own so the review gate can compare the indicator's
 * visual language side by side; Group B ("Landing*") drives a real mock event
 * stream into a dashboard-like board to compare how a status change SURFACES
 * (silent badge flip vs toast vs row highlight).
 */
const meta: Meta<typeof WatchIndicator> = {
  title: "Live/WatchIndicator",
  component: WatchIndicator,
};
export default meta;

type Story = StoryObj<typeof WatchIndicator>;

// ── Group A — connection states ──────────────────────────────────────────────────

/** Never connected — the resting state before watching is turned on. */
export const Idle: Story = {
  args: { watching: false, connection: "idle" },
};

/** Watching just turned on; the connection is opening (dot pulses). */
export const Connecting: Story = {
  args: { watching: true, connection: "connecting", eventCount: 0 },
};

/** Live and watching — interactive: click the toggle to pause/resume. */
export const Watching: Story = {
  render: () => ({
    components: { WatchIndicator },
    setup() {
      const watching = ref(true);
      const eventCount = ref(4);
      const connection = computed<ConnectionState>(() => (watching.value ? "open" : "closed"));
      return { watching, eventCount, connection };
    },
    template: `
      <WatchIndicator
        :watching="watching"
        :connection="connection"
        :event-count="eventCount"
        @toggle="watching = !watching"
      />
    `,
  }),
};

/** The connection dropped — error state, watching is off. */
export const Disconnected: Story = {
  args: { watching: false, connection: "error" },
};

/** Watching was explicitly paused — the stream is stopped. */
export const Paused: Story = {
  args: { watching: false, connection: "closed" },
};

/** Every connection state lined up — the full indicator legend. */
export const Gallery: Story = {
  render: () => ({
    components: { WatchIndicator },
    setup() {
      const states: { connection: ConnectionState; watching: boolean; eventCount: number }[] = [
        { connection: "idle", watching: false, eventCount: 0 },
        { connection: "connecting", watching: true, eventCount: 0 },
        { connection: "open", watching: true, eventCount: 4 },
        { connection: "error", watching: false, eventCount: 0 },
        { connection: "closed", watching: false, eventCount: 0 },
      ];
      return { states };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
        <WatchIndicator
          v-for="s in states"
          :key="s.connection"
          :watching="s.watching"
          :connection="s.connection"
          :event-count="s.eventCount"
        />
      </div>
    `,
  }),
};

// ── Group B — update-landing board ───────────────────────────────────────────────

/**
 * Styling for the LiveBoard demo. Injected once at module load (global, but every
 * class is `lb__`-prefixed) so the stories file stays a plain `.ts` module — no
 * SFC `<style>` block to compile.
 */
const LIVE_BOARD_CSS = `
.lb {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius);
}
.lb__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.lb__treatment {
  font-family: var(--mc-mono);
  font-size: 0.78rem;
  color: var(--mc-text-muted);
}
.lb__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lb__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--mc-border);
  border-radius: 8px;
  background: transparent;
  transition: background 0.6s ease;
}
.lb__row--hot {
  background: #fff8e6;
  transition: background 0.1s ease;
}
.lb__name {
  font-weight: 600;
}
.lb__toasts {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  pointer-events: none;
}
.lb__toast {
  padding: 8px 12px;
  background: var(--mc-text);
  color: var(--mc-surface);
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  animation: lb-toast-in 0.22s ease;
}
.lb-fade-enter-active,
.lb-fade-leave-active {
  transition: opacity 0.4s ease;
}
.lb-fade-enter-from,
.lb-fade-leave-to {
  opacity: 0;
}
@keyframes lb-toast-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

if (typeof document !== "undefined" && !document.getElementById("lb-styles")) {
  const el = document.createElement("style");
  el.id = "lb-styles";
  el.textContent = LIVE_BOARD_CSS;
  document.head.appendChild(el);
}

/**
 * LiveBoard — a dashboard-like board driven by a REAL mock event stream
 * (`useMockEventStream`, replaying `mockSseEvents`). It renders the WatchIndicator
 * wired to the live stream over a row per seeded vault, and applies one of three
 * "how an update lands" treatments as each event mutates a vault's state:
 *   - "silent"        → the badge cross-fades in place (a quiet opacity transition)
 *   - "toast"         → a transient "<vault> → <state>" toast pops and auto-dismisses
 *   - "row-highlight" → the changed vault's row briefly flashes
 */
const LiveBoard = defineComponent({
  name: "LiveBoard",
  components: { WatchIndicator, StatusBadge },
  props: {
    treatment: {
      type: String as PropType<"silent" | "toast" | "row-highlight">,
      default: "silent",
    },
  },
  setup(props) {
    const { watching, connection, log, lastEvent, vaultStates, toggle } = useMockEventStream({
      autoStart: true,
      intervalMs: 1400,
    });

    const vaults = mockVaultStatuses.map((v) => ({ id: v.id, name: v.name }));
    const nameById = new Map(vaults.map((v) => [v.id, v.name]));

    // toast treatment state
    const toasts = ref<{ key: number; text: string }[]>([]);
    let toastSeq = 0;

    // row-highlight treatment state
    const highlightedId = ref<string | null>(null);
    let highlightTimer: number | null = null;

    watch(lastEvent, (event) => {
      if (!event) return;
      if (props.treatment === "toast") {
        const state = vaultStates.value[event.vaultId];
        const key = ++toastSeq;
        toasts.value = [
          ...toasts.value,
          { key, text: `${nameById.get(event.vaultId) ?? event.vaultId} → ${state}` },
        ];
        setTimeout(() => {
          toasts.value = toasts.value.filter((t) => t.key !== key);
        }, 2200);
      } else if (props.treatment === "row-highlight") {
        highlightedId.value = event.vaultId;
        if (highlightTimer !== null) clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => {
          highlightedId.value = null;
        }, 900) as unknown as number;
      }
    });

    return { watching, connection, log, vaultStates, toggle, vaults, toasts, highlightedId };
  },
  template: `
    <div class="lb">
      <div class="lb__bar">
        <WatchIndicator
          :watching="watching"
          :connection="connection"
          :event-count="log.length"
          @toggle="toggle"
        />
        <span class="lb__treatment">treatment: {{ treatment }}</span>
      </div>

      <ul class="lb__rows">
        <li
          v-for="v in vaults"
          :key="v.id"
          class="lb__row"
          :class="{ 'lb__row--hot': treatment === 'row-highlight' && highlightedId === v.id }"
        >
          <span class="lb__name">{{ v.name }}</span>
          <Transition name="lb-fade" mode="out-in">
            <StatusBadge :key="vaultStates[v.id]" :status="vaultStates[v.id]" />
          </Transition>
        </li>
      </ul>

      <div v-if="treatment === 'toast'" class="lb__toasts" aria-live="polite">
        <div v-for="t in toasts" :key="t.key" class="lb__toast">{{ t.text }}</div>
      </div>
    </div>
  `,
});

/** Update lands as a SILENT badge flip — the badge cross-fades, nothing else moves. */
export const LandingSilentFlip: Story = {
  render: () => ({
    components: { LiveBoard },
    template: `<LiveBoard treatment="silent" />`,
  }),
};

/** Update lands as a TOAST — a transient "<vault> → <state>" pops in the corner. */
export const LandingToast: Story = {
  render: () => ({
    components: { LiveBoard },
    template: `<LiveBoard treatment="toast" />`,
  }),
};

/** Update lands as a ROW HIGHLIGHT — the changed vault's row briefly flashes. */
export const LandingRowHighlight: Story = {
  render: () => ({
    components: { LiveBoard },
    template: `<LiveBoard treatment="row-highlight" />`,
  }),
};
