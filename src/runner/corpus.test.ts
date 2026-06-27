/**
 * Peer test for the corpus runner's glob matching (`compileMatcher`).
 *
 * The contract this pins, as input → exact output: a single `**\/`-prefixed include glob matches
 * a file at ANY depth — the run root AND nested directories alike — so a config needs only one
 * entry per rule (no separate bare `X-*.md` for root-level files). It drives the runner's own
 * matcher, so it fails loudly if `**\/` ever stops spanning the root (an opts change or a
 * picomatch upgrade), rather than silently un-routing root-level files.
 */
import { describe, expect, it } from "vitest";

import { compileMatcher } from "./corpus.js";

describe("compileMatcher — a single `**/`-glob spans root and nested", () => {
  it("matches a prefixed file at the run root AND nested under it", () => {
    const match = compileMatcher(["**/T-*.md"]);
    expect(match("T-0001.md")).toBe(true); // root-level — the case the bare `T-*.md` used to cover
    expect(match("tasks/T-0001.md")).toBe(true); // one level down
    expect(match("a/b/T-0001.md")).toBe(true); // arbitrarily deep
  });

  it("does not match a path without the prefix", () => {
    const match = compileMatcher(["**/T-*.md"]);
    expect(match("notes.md")).toBe(false);
    expect(match("C-0001.md")).toBe(false); // a different doc kind's prefix
    expect(match("tasks/C-0001.md")).toBe(false);
  });

  it("matches inside a dotfile directory (PICOMATCH_OPTS has `dot: true`)", () => {
    const match = compileMatcher(["**/T-*.md"]);
    expect(match(".obsidian/T-0001.md")).toBe(true);
  });
});
