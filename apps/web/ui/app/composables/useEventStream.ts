/**
 * THE REAL SSE CLIENT — the `EventSource` counterpart the mock prototype's
 * `createMockEventStream` faked: same reactive surface (`watching`,
 * `connection`, `lastEvent`, `eventCount`, `vaultStates`, `start`/`stop`), now
 * fed by a live `GET /api/events` stream. Components (WatchIndicator, pages)
 * bind the same refs and never learn the events stopped being replayed.
 */
import { getCurrentScope, onScopeDispose, type Ref, ref } from "vue";

import type { SseEvent, VaultStatusState } from "~/types";

/**
 * The connection lifecycle, mirroring `EventSource.readyState` semantics plus
 * the idle (never-connected) and explicit-stop states the UI distinguishes:
 *   idle → connecting → open → (closed | error)
 */
export type ConnectionState = "idle" | "connecting" | "open" | "error" | "closed";

/** Fold one SSE event down to the coarse vault state a board cell renders. */
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

export interface EventStream {
  watching: Ref<boolean>;
  connection: Ref<ConnectionState>;
  lastEvent: Ref<SseEvent | null>;
  eventCount: Ref<number>;
  vaultStates: Ref<Record<string, VaultStatusState>>;
  start: () => void;
  stop: () => void;
}

/**
 * Create (but don't open) a live event stream against `base` ("" = same
 * origin). `start()` opens the EventSource; `stop()` closes it; a disposing
 * component scope closes it automatically.
 */
export function createEventStream(base: string): EventStream {
  const watching = ref(false);
  const connection = ref<ConnectionState>("idle");
  const lastEvent = ref<SseEvent | null>(null);
  const eventCount = ref(0);
  const vaultStates = ref<Record<string, VaultStatusState>>({});
  let source: EventSource | null = null;

  function start(): void {
    if (source !== null || typeof EventSource === "undefined") return;
    connection.value = "connecting";
    watching.value = true;
    source = new EventSource(`${base}/api/events`);
    source.onopen = () => {
      connection.value = "open";
    };
    source.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as SseEvent;
      lastEvent.value = event;
      eventCount.value += 1;
      vaultStates.value = { ...vaultStates.value, [event.vaultId]: stateFromEvent(event) };
    };
    source.onerror = () => {
      // EventSource auto-reconnects; reflect the gap without tearing down.
      connection.value =
        source && source.readyState === EventSource.CLOSED ? "error" : "connecting";
    };
  }

  function stop(): void {
    source?.close();
    source = null;
    watching.value = false;
    connection.value = "closed";
  }

  if (getCurrentScope()) onScopeDispose(stop);

  return { watching, connection, lastEvent, eventCount, vaultStates, start, stop };
}
