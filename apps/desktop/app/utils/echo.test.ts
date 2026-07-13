// Peer test (CONVENTIONS.md): the contract of the browser-side echo fallback —
// given a message, you get exactly `Echo: <message>`, with no Rust marker.
import { describe, expect, it } from "bun:test";
import { echoFallback } from "./echo";

describe("echoFallback", () => {
  it("echoes the message back with the Echo: prefix", async () => {
    expect(await echoFallback("Hello World")).toBe("Echo: Hello World");
  });

  it("echoes the empty string", async () => {
    expect(await echoFallback("")).toBe("Echo: ");
  });
});
