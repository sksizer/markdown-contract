/**
 * THE MOCK SSE DRIVER — a timer-driven replayer for the canned event sequence
 * (`mockSseEvents`) layered on top of the existing mock data (`./api-fixtures`).
 *
 * This is the live-status seam. The dashboard's "watching" UX needs a stream of
 * `SseEvent`s landing over time; a real `GET /api/events` `EventSource` client
 * will later produce exactly that. Until the daemon exists, this module fakes the
 * wire: it walks `mockSseEvents` on a `setInterval`, folds each event down to a
 * coarse `VaultStatusState`, and exposes the same reactive surface a real client
 * would (a `watching` flag, a `connection` state mirroring `EventSource.readyState`
 * semantics, the last event, the running log, and the per-vault state map). When
 * the real client lands, `createMockEventStream` is the one thing swapped — the
 * components and stories bind to its `Ref`s and never learn whether the events are
 * replayed or live.
 *
 * Design notes:
 *  - Pure TS + `vue` reactivity. Imports NOTHING from Nuxt and NOTHING from the
 *    engine `src/` — like every other module in this prototype.
 *  - SSR-safe + deterministic: NO timers start at setup time unless `autoStart` is
 *    explicitly requested (and even then only in a browser). Switching Storybook
 *    stories disposes the active scope, which clears the timers via
 *    `onScopeDispose` (registered only when a scope is actually present, so the
 *    factory is equally safe to call outside a component).
 *  - State seeds from `mockVaultStatuses` so a board shows a real baseline BEFORE
 *    any event lands, then mutates as events arrive.
 */
import { getCurrentScope, onScopeDispose, ref, type Ref } from "vue";

import { mockSseEvents, mockVaultStatuses } from "./api-fixtures";
import type { SseEvent, VaultStatusState } from "./types";

/**
 * The connection lifecycle, mirroring `EventSource.readyState` semantics plus the
 * idle (never-connected) and explicit-stop states the UI distinguishes:
 *   idle → connecting → open → (closed | error)
 */
export type ConnectionState = "idle" | "connecting" | "open" | "error" | "closed";

/**
 * Fold one SSE event down to the coarse vault state a board cell renders.
 * Exhaustive over the `SseEvent` discriminated union (`type`):
 *  - `status`    → the state the event already carries
 *  - `validated` → `green` when the run is clean (exit 0, no findings), else `findings`
 *  - `drift`     → `drift` when the check is drifted, else `green`
 *  - `error`     → `error`
 */
export function stateFromEvent(event: SseEvent): VaultStatusState {
  switch (event.type) {
    case "status":
      return event.state;
    case "validated":
      return event.result.exitCode === 0 && event.result.findings.length === 0
        ? "green"
        : "findings";
    case "drift":
      return event.drift.drifted ? "drift" : "green";
    case "error":
      return "error";
  }
}

/** Tuning knobs for the replayer; every field has a sensible default. */
export interface MockEventStreamOptions {
  /** the sequence to replay (defaults to the canned `mockSseEvents`) */
  events?: SseEvent[];
  /** ms between delivered events once the connection is open */
  intervalMs?: number;
  /** ms the connection spends "connecting" before it flips to "open" */
  connectMs?: number;
  /** when the sequence ends, wrap to the start instead of closing */
  loop?: boolean;
  /** begin watching immediately on creation (browser only); off by default */
  autoStart?: boolean;
}

/**
 * The reactive surface a consumer binds to. All `Ref`s are driven by the stream
 * and meant to be READ by components — the stream is their sole writer; mutate it
 * through the `start` / `stop` / `toggle` / `reset` controls.
 */
export interface MockEventStream {
  /** whether the stream is actively watching (delivering events) */
  watching: Ref<boolean>;
  /** the connection lifecycle state (drives the indicator dot + label) */
  connection: Ref<ConnectionState>;
  /** the most recently delivered event, or null before any have landed */
  lastEvent: Ref<SseEvent | null>;
  /** every event delivered so far, in arrival order */
  log: Ref<SseEvent[]>;
  /** per-vault coarse state, seeded from `mockVaultStatuses`, updated by events */
  vaultStates: Ref<Record<string, VaultStatusState>>;
  /** begin watching: connect, then deliver an event every `intervalMs` */
  start(): void;
  /** stop watching: clear timers, connection → "closed" */
  stop(): void;
  /** toggle watching on/off */
  toggle(): void;
  /** rewind to the seeded baseline (cursor, log, lastEvent, vaultStates) */
  reset(): void;
}

const DEFAULT_INTERVAL_MS = 1500;
const DEFAULT_CONNECT_MS = 600;

/** The seeded baseline: each known vault's current state from the fixtures. */
function initialVaultStates(): Record<string, VaultStatusState> {
  return Object.fromEntries(
    mockVaultStatuses.map((v) => [v.id, v.state] as const),
  );
}

/**
 * Create a mock SSE event stream. Plain factory (no component required); the
 * `useMockEventStream` alias below is the Vue-composable-named entry point.
 */
export function createMockEventStream(options: MockEventStreamOptions = {}): MockEventStream {
  const events = options.events ?? mockSseEvents;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const connectMs = options.connectMs ?? DEFAULT_CONNECT_MS;
  const loop = options.loop ?? true;
  const autoStart = options.autoStart ?? false;

  const watching = ref(false);
  const connection = ref<ConnectionState>("idle");
  const lastEvent = ref<SseEvent | null>(null);
  const log = ref<SseEvent[]>([]);
  const vaultStates = ref<Record<string, VaultStatusState>>(initialVaultStates());

  // Timer handles are numbers (browser `setTimeout`/`setInterval`); null when idle.
  let connectTimer: number | null = null;
  let tickTimer: number | null = null;
  let cursor = 0;

  function clearTimers(): void {
    if (connectTimer !== null) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
    if (tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  /** Deliver the event under the cursor, advance, and loop-or-stop at the end. */
  function deliver(): void {
    const event = events[cursor];
    if (!event) {
      stop();
      return;
    }
    log.value = [...log.value, event];
    lastEvent.value = event;
    vaultStates.value = { ...vaultStates.value, [event.vaultId]: stateFromEvent(event) };

    cursor += 1;
    if (cursor >= events.length) {
      if (loop) {
        cursor = 0;
      } else {
        stop();
      }
    }
  }

  function start(): void {
    if (watching.value) return;
    watching.value = true;
    connection.value = "connecting";
    connectTimer = setTimeout(() => {
      connectTimer = null;
      connection.value = "open";
      tickTimer = setInterval(deliver, intervalMs) as unknown as number;
    }, connectMs) as unknown as number;
  }

  function stop(): void {
    clearTimers();
    watching.value = false;
    connection.value = "closed";
  }

  function toggle(): void {
    if (watching.value) stop();
    else start();
  }

  function reset(): void {
    cursor = 0;
    log.value = [];
    lastEvent.value = null;
    vaultStates.value = initialVaultStates();
  }

  // Clear timers when the owning reactive scope is torn down (e.g. switching
  // Storybook stories or unmounting a page). Guarded so the factory is also safe
  // to call outside any component scope.
  if (getCurrentScope()) {
    onScopeDispose(() => stop());
  }

  if (autoStart && typeof window !== "undefined") {
    start();
  }

  return { watching, connection, lastEvent, log, vaultStates, start, stop, toggle, reset };
}

/**
 * Vue-composable-named alias for `createMockEventStream`. Use this from a
 * component/story setup so the live-status driver reads as a composable at the
 * call site (and its timers are cleaned up with the surrounding scope).
 */
export function useMockEventStream(options?: MockEventStreamOptions): MockEventStream {
  return createMockEventStream(options);
}
