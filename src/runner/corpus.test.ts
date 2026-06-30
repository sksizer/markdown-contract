/**
 * Peer test for the corpus runner's glob matching (`compileMatcher`).
 *
 * The contract this pins, as input → exact output: a single `**\/`-prefixed include glob matches
 * a file at ANY depth — the run root AND nested directories alike — so a config needs only one
 * entry per rule (no separate bare `X-*.md` for root-level files). It drives the runner's own
 * matcher, so it fails loudly if `**\/` ever stops spanning the root (an opts change or a
 * picomatch upgrade), rather than silently un-routing root-level files.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { Contract, DocTree, Finding } from "../core/index.js";
import { compileMatcher, runCorpus, type CorpusConfig } from "./corpus.js";

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

/**
 * `runCorpus`'s run stats — the per-run counts the CLI renders as a summary. The contract,
 * as input → exact counts: every walked file is `filesScanned`; a file routed to a rule is
 * `filesMatched` (and increments that rule's `matchedByRule[i]`, parallel to `config.rules`);
 * everything else (matching no rule, or removed by the global pre-filter) is `filesUnmatched`.
 */
describe("runCorpus — run stats", () => {
  /** A contract that accepts everything (no findings) — stats counting is independent of finding content. */
  const acceptAll: Contract = {
    validate: () => ({ findings: [] as Finding[], tree: {} as DocTree }),
    read: () => {
      throw new Error("read is not exercised by the runner");
    },
  } as Contract;

  /** Lay down a tiny corpus in a fresh temp dir and return its absolute root. */
  function vault(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "mc-runstats-"));
    for (const [rel, content] of Object.entries(files)) {
      const abs = join(root, rel);
      mkdirSync(join(abs, ".."), { recursive: true });
      writeFileSync(abs, content, "utf8");
    }
    return root;
  }

  it("counts scanned / matched / unmatched and per-rule matches, parallel to config.rules", () => {
    // 5 files: 2 tasks, 1 capability, and 2 that no rule routes (a README and a note).
    const root = vault({
      "T-0001.md": "# task one",
      "T-0002.md": "# task two",
      "C-0001.md": "# capability",
      "README.md": "# readme",
      "notes.txt": "loose",
    });
    const config: CorpusConfig = {
      rules: [
        { include: ["**/T-*.md"], contract: acceptAll, name: "task" },
        { include: ["**/C-*.md"], contract: acceptAll, name: "capability" },
      ],
    };

    const { stats } = runCorpus(config, { cwd: root });

    expect(stats.filesScanned).toBe(5);
    expect(stats.filesMatched).toBe(3);
    expect(stats.filesUnmatched).toBe(2); // README.md + notes.txt match no rule
    expect(stats.matchedByRule).toEqual([2, 1]); // [task, capability], parallel to config.rules

    // The invariants the summary leans on.
    expect(stats.matchedByRule.length).toBe(config.rules.length);
    expect(stats.matchedByRule.reduce((a, b) => a + b, 0)).toBe(stats.filesMatched);
    expect(stats.filesScanned - stats.filesMatched).toBe(stats.filesUnmatched);
  });

  it("a file matching no rule is counted as unmatched", () => {
    const root = vault({ "stray.md": "# stray" });
    const config: CorpusConfig = {
      rules: [{ include: ["**/T-*.md"], contract: acceptAll, name: "task" }],
    };

    const { stats } = runCorpus(config, { cwd: root });

    expect(stats.filesScanned).toBe(1);
    expect(stats.filesMatched).toBe(0);
    expect(stats.filesUnmatched).toBe(1);
    expect(stats.matchedByRule).toEqual([0]); // the named rule routed nothing
  });

  it("a file removed by the global --exclude pre-filter counts as unmatched, not scanned-away", () => {
    const root = vault({
      "T-0001.md": "# kept",
      "T-0002.md": "# excluded",
    });
    const config: CorpusConfig = {
      rules: [{ include: ["**/T-*.md"], contract: acceptAll, name: "task" }],
    };

    const { stats } = runCorpus(config, { cwd: root, exclude: ["**/T-0002.md"] });

    expect(stats.filesScanned).toBe(2); // both files were walked
    expect(stats.filesMatched).toBe(1); // only the non-excluded one routed
    expect(stats.filesUnmatched).toBe(1); // the pre-filtered file is unmatched
    expect(stats.matchedByRule).toEqual([1]);
  });
});
