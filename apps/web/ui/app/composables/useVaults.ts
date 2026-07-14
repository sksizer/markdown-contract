/**
 * useVaults — the ONE shared vault store for the whole app.
 *
 * `useState`-backed so the sidebar, the dashboard, and any detail page all read
 * the same rows: one `listVaults()` fetch, one app-wide SSE stream
 * (`createEventStream`) whose events fold into the rows as they land. The
 * stream and its fold live in a DETACHED effect scope, so no component unmount
 * can tear them down — components never open their own EventSource.
 *
 * Surface (deliberately small): `{ vaults, loading, loadError, refresh, stream }`.
 */
import { effectScope, type Ref, watch } from "vue";

import { apiErrorMessage, useApi, useApiBase } from "~/composables/useApi";
import { createEventStream, type EventStream, stateFromEvent } from "~/composables/useEventStream";
import type { SseEvent, VaultStatus } from "~/types";

export interface VaultsStore {
  /** every registered vault with its live status */
  vaults: Ref<VaultStatus[]>;
  /** true until the first list load settles */
  loading: Ref<boolean>;
  /** "" when the last load succeeded; else the daemon error */
  loadError: Ref<string>;
  /** re-pull the registry snapshot from the daemon */
  refresh: () => Promise<void>;
  /** the single app-wide SSE stream (WatchIndicator binds its refs) */
  stream: EventStream;
}

/** Fold one SSE event into the row it concerns (fresh object, per-state optionals resolved). */
function applyEvent(row: VaultStatus, event: SseEvent): VaultStatus {
  switch (event.type) {
    case "status":
      return { ...row, state: event.state, updatedAt: event.at };
    case "validated": {
      const { error: _err, ...rest } = row;
      return { ...rest, state: stateFromEvent(event), result: event.result, updatedAt: event.at };
    }
    case "drift":
      return { ...row, state: stateFromEvent(event), drift: event.drift, updatedAt: event.at };
    case "error": {
      const { result: _res, ...rest } = row;
      return { ...rest, state: "error", error: { message: event.message }, updatedAt: event.at };
    }
  }
}

/** The app-wide singleton stream — created once, in a scope nothing disposes. */
let sharedStream: EventStream | null = null;

/** Open the one EventSource inside a detached scope and wire the event fold. */
function openSharedStream(base: string, onEvent: (event: SseEvent) => void): EventStream {
  const scope = effectScope(true); // detached: survives every component unmount
  let stream: EventStream | undefined;
  scope.run(() => {
    stream = createEventStream(base);
    watch(stream.lastEvent, (event) => {
      if (event) onEvent(event);
    });
  });
  if (!stream) throw new Error("event stream failed to initialize");
  return stream;
}

export function useVaults(): VaultsStore {
  const api = useApi();
  const vaults = useState<VaultStatus[]>("mc-vaults", () => []);
  const loading = useState<boolean>("mc-vaults-loading", () => true);
  const loadError = useState<string>("mc-vaults-load-error", () => "");

  async function refresh(): Promise<void> {
    try {
      vaults.value = await api.listVaults();
      loadError.value = "";
    } catch (err) {
      loadError.value = apiErrorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  let stream = sharedStream;
  if (stream === null) {
    stream = openSharedStream(useApiBase(), (event) => {
      // An event about a vault we don't know = the registry changed elsewhere — re-pull.
      if (!vaults.value.some((v) => v.id === event.vaultId)) {
        void refresh();
        return;
      }
      vaults.value = vaults.value.map((v) => (v.id === event.vaultId ? applyEvent(v, event) : v));
    });
    sharedStream = stream;
    stream.start();
    void refresh();
  }

  return { vaults, loading, loadError, refresh, stream };
}
