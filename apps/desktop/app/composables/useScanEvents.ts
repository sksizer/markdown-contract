// The liveness seam (D-0018 §D5): src-tauri's notifications module emits a
// "scan:completed" Tauri event for EVERY finished run (watch, schedule,
// startup, tray, manual); screens subscribe to refresh — the desktop
// analogue of the daemon's SSE push.
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/** Payload of "scan:completed" (src-tauri/src/notifications.rs). */
export interface ScanCompletedPayload {
  vault_id: string;
  run_id: string;
  status: string;
  error_count: number;
  warn_count: number;
}

/** Scan-completion subscription over the Tauri event bus. */
export function useScanEvents() {
  return {
    /**
     * Call `handler` after every finished run; resolves to the unlisten fn
     * (call it in onUnmounted).
     */
    onScanCompleted: (handler: (payload: ScanCompletedPayload) => void): Promise<UnlistenFn> =>
      listen<ScanCompletedPayload>("scan:completed", (event) => handler(event.payload)),
  };
}
