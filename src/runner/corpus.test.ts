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

import {
  contract,
  docRule,
  optional,
  section,
  sections,
  type Contract,
  type DocTree,
  type Finding,
} from "../core/index.js";
import { compileMatcher, runCorpus, type CorpusConfig } from "./corpus.js";

/** Lay down a tiny corpus in a fresh temp dir and return its absolute root. */
function vault(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mc-corpus-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  return root;
}

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

/**
 * `runCorpus` collects the findings each document's contract emits into ONE flat run-level
 * `findings` array, then derives the run `exitCode` from those findings' levels. The contract,
 * as input → exact output: route a `docRule`-bearing contract — a rule that sees the whole typed
 * doc — across a multi-document corpus, and every doc's docRule findings land in the same run
 * `findings`, each stamped with the document it came from (`ctx.path`, the POSIX-relative file
 * path). That cross-document stamping is how aggregation is observable. The exit code follows
 * finding level: any `error` ⇒ `1`; a `warn`-only run stays `0` (a warn never bumps the code).
 */
describe("runCorpus — docRule findings aggregate across documents into findings / exitCode", () => {
  /**
   * A tiny "doc" contract with TWO whole-document docRules over a body of two optional sections.
   * `doc/needs-summary` (error — the default level) fires when there is no `## Summary`;
   * `doc/has-owner` (warn — explicit level) fires when there is no `## Owner`. No `frontmatter`
   * key, so the ONLY findings a document can produce are these two docRules — which keeps the
   * aggregation assertions exact (every finding below is one of these two, from one of the docs).
   */
  function docContract() {
    return contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        optional(section("Summary")),
        optional(section("Owner")),
      ]),
      rules: [
        docRule("doc/needs-summary", (doc, ctx) => {
          // Mirror fixture 16's cast: the typed body exposes `section(name)` (truthy when the
          // section is present, `undefined` when absent). No `pos` ⇒ a whole-document finding,
          // which the engine stamps with `ctx.path`.
          const body = doc.body as { section(name: string): unknown };
          return body.section("Summary")
            ? []
            : [ctx.finding({ id: "doc/needs-summary", message: "a doc needs a ## Summary section" })];
        }),
        docRule("doc/has-owner", (doc, ctx) => {
          const body = doc.body as { section(name: string): unknown };
          return body.section("Owner")
            ? []
            : [
                ctx.finding({
                  id: "doc/has-owner",
                  message: "a doc should name an ## Owner",
                  level: "warn", // explicit warn — the only thing keeping the exit code off 1 in case 2
                }),
              ];
        }),
      ],
    });
  }

  /** One rule routing every `.md` in the tree through the doc contract. */
  const config: CorpusConfig = {
    rules: [{ include: ["**/*.md"], contract: docContract(), name: "doc" }],
  };

  it("aggregates BOTH docRules across BOTH documents; the error-level rule sets exitCode 1", () => {
    // Two docs, each with only a `## Notes` body (all-H2, so the heading-depth scan stays quiet) —
    // neither has a Summary or an Owner, so on each doc BOTH rules fire. The walk is deterministic
    // (entries sorted ascending), so doc-a is validated before doc-b; within a doc the two findings
    // are whole-document (line 0) and break the tie by emission order, i.e. rule-array order.
    const root = vault({
      "doc-a.md": "## Notes\n\nnotes for a\n",
      "doc-b.md": "## Notes\n\nnotes for b\n",
    });

    const { findings, exitCode } = runCorpus(config, { cwd: root });

    // Exact, ordered shape: 4 findings = 2 rules × 2 docs, each stamped with its source path.
    // needs-summary precedes has-owner within a doc; doc-a precedes doc-b across docs.
    expect(findings.map((f) => ({ id: f.id, level: f.level, path: f.path }))).toEqual([
      { id: "doc/needs-summary", level: "error", path: "doc-a.md" },
      { id: "doc/has-owner", level: "warn", path: "doc-a.md" },
      { id: "doc/needs-summary", level: "error", path: "doc-b.md" },
      { id: "doc/has-owner", level: "warn", path: "doc-b.md" },
    ]);

    // Cross-document: the run's findings carry BOTH documents' paths (aggregation across files).
    expect(new Set(findings.map((f) => f.path))).toEqual(new Set(["doc-a.md", "doc-b.md"]));
    // Multiple docRules: BOTH rule ids contributed findings to the run.
    expect(new Set(findings.map((f) => f.id))).toEqual(
      new Set(["doc/needs-summary", "doc/has-owner"]),
    );
    // An error-level finding exists somewhere in the corpus ⇒ the run exits 1.
    expect(exitCode).toBe(1);
  });

  it("a warn-only run leaves exitCode 0 — a warn-level docRule does NOT bump the exit code", () => {
    // Each doc now HAS a `## Summary` (the error rule is satisfied) but still lacks `## Owner`
    // (the warn rule fires). So the run's only findings are warn-level — and yet aggregation
    // still spans both documents.
    const root = vault({
      "doc-a.md": "## Summary\n\nsummary for a\n",
      "doc-b.md": "## Summary\n\nsummary for b\n",
    });

    const { findings, exitCode } = runCorpus(config, { cwd: root });

    expect(findings.map((f) => ({ id: f.id, level: f.level, path: f.path }))).toEqual([
      { id: "doc/has-owner", level: "warn", path: "doc-a.md" },
      { id: "doc/has-owner", level: "warn", path: "doc-b.md" },
    ]);
    // No error-level finding anywhere ⇒ the exit code stays 0 despite the warns.
    expect(findings.every((f) => f.level === "warn")).toBe(true);
    expect(exitCode).toBe(0);
  });
});
