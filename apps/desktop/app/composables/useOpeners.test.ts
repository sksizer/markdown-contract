// Peer test (CONVENTIONS.md): the composable's contract — the opener surface
// over the generated IPC transport. Outside the Tauri webview we assert the
// surface, not a round-trip (creation is lazy and touches no IPC).
import { describe, expect, it } from "bun:test";
import { useOpeners } from "./useOpeners";

describe("useOpeners", () => {
  it("exposes list, open, and preview over the generated transport", () => {
    const openers = useOpeners();
    expect(typeof openers.list).toBe("function");
    expect(typeof openers.open).toBe("function");
    expect(typeof openers.preview).toBe("function");
  });
});
