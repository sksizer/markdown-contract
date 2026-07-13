// Peer test (CONVENTIONS.md): the composable's contract — a scan-completion
// subscription surface over the Tauri event bus. Subscribing needs the
// webview's IPC, so outside Tauri we assert the surface.
import { describe, expect, it } from "bun:test";
import { useScanEvents } from "./useScanEvents";

describe("useScanEvents", () => {
  it("exposes the scan-completed subscription", () => {
    const events = useScanEvents();
    expect(typeof events.onScanCompleted).toBe("function");
  });
});
