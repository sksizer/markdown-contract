// Peer test (CONVENTIONS.md): the composable's contract — it exposes the vault
// operations backed by the generated IPC transport. The transport itself is
// generated (and its creation is lazy, touching no IPC), so outside the Tauri
// webview we assert the surface, not a round-trip.
import { describe, expect, it } from "bun:test";
import { useVaults } from "./useVaults";

describe("useVaults", () => {
  it("exposes list, register, and scanNow over the generated transport", () => {
    const vaults = useVaults();
    expect(typeof vaults.list).toBe("function");
    expect(typeof vaults.register).toBe("function");
    expect(typeof vaults.scanNow).toBe("function");
  });
});
