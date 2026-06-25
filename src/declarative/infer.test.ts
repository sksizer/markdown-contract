/**
 * Peer unit tests for `inferConfig` single-contract core (D-0009 Phase 2). The gating truth is
 * `tests/fixtures/infer` (accept-by-construction + deterministic over real vaults); these add
 * direct, fast assertions over the model an in-memory vault produces — base-type frontmatter,
 * required/optional split, order detection, the strict flag, naming, and the emitted YAML.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parse } from "yaml";

import { compileContractObject } from "./load.js";
import { inferConfig } from "./infer.js";
import type { InferredContract } from "./infer.js";

let root: string;

/** Write one `*.md` into the temp vault, creating intermediate dirs. */
function file(rel: string, body: string): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, body, "utf8");
}

/** The single contract's `def`, typed loosely for direct property reads. */
function def(c: InferredContract): {
  frontmatter?: { strict?: boolean; fields?: Record<string, Record<string, unknown>> };
  body?: { order?: string; allowUnknown?: boolean; sections?: Array<{ section: string; optional?: boolean }> };
} {
  return c.def as never;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mc-infer-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("inferConfig — single-contract mode shape", () => {
  it("emits one contract in single mode named after the root basename slug", () => {
    file("a.md", "---\ntitle: A\n---\n\n## Summary\n\nx\n");
    const r = inferConfig(root);
    expect(r.mode).toBe("single");
    expect(r.contracts).toHaveLength(1);
    expect(r.contracts[0]!.include).toEqual(["**/*.md"]);
    // The temp dir basename slugs to lowercase-with-dashes.
    expect(r.contracts[0]!.name).toMatch(/^[a-z0-9-]+$/);
    expect(r.warnings).toEqual([]);
  });

  it("recurses into subdirectories (single mode is the whole subtree)", () => {
    file("top.md", "## Summary\n\nx\n");
    file("nested/deep.md", "## Summary\n\ny\n");
    const r = inferConfig(root);
    // Summary appears in every (both) files → required, present.
    expect(def(r.contracts[0]!).body?.sections).toEqual([{ section: "Summary" }]);
  });
});

describe("inferConfig — sections: universal required, the rest optional", () => {
  it("splits universal vs partial sections and closes the unknown door", () => {
    file("one.md", "## Summary\n\nx\n\n## Context\n\nx\n");
    file("two.md", "## Summary\n\nx\n");
    const body = def(inferConfig(root).contracts[0]!).body!;
    expect(body.allowUnknown).toBe(false);
    expect(body.sections).toContainEqual({ section: "Summary" });
    expect(body.sections).toContainEqual({ section: "Context", optional: true });
  });
});

describe("inferConfig — order detection (D-0009 § Step 3 — order)", () => {
  it("strict when every file has the identical gap-free sequence", () => {
    file("one.md", "## A\n\nx\n\n## B\n\nx\n");
    file("two.md", "## A\n\nx\n\n## B\n\nx\n");
    const body = def(inferConfig(root).contracts[0]!).body!;
    expect(body.order).toBe("strict");
    expect(body.sections!.map((s) => s.section)).toEqual(["A", "B"]);
  });

  it("recognized-relative when files agree on relative order of differing subsets", () => {
    file("one.md", "## A\n\nx\n\n## B\n\nx\n");
    file("two.md", "## A\n\nx\n\n## C\n\nx\n");
    file("three.md", "## B\n\nx\n\n## C\n\nx\n");
    const body = def(inferConfig(root).contracts[0]!).body!;
    expect(body.order).toBe("recognized-relative");
    // A topological order: A before B before C (a linear extension of every file).
    expect(body.sections!.map((s) => s.section)).toEqual(["A", "B", "C"]);
  });

  it("none when two files disagree on order", () => {
    file("one.md", "## A\n\nx\n\n## B\n\nx\n");
    file("two.md", "## B\n\nx\n\n## A\n\nx\n");
    expect(def(inferConfig(root).contracts[0]!).body!.order).toBe("none");
  });
});

describe("inferConfig — frontmatter required/optional + strict", () => {
  it("required = present in every file; partial keys → optional", () => {
    file("one.md", "---\ntitle: A\nstatus: open\n---\n\n## S\n\nx\n");
    file("two.md", "---\ntitle: B\n---\n\n## S\n\nx\n");
    const fm = def(inferConfig(root).contracts[0]!).frontmatter!;
    expect(fm.strict).toBe(true);
    expect(fm.fields!.title).toEqual({ type: "string" });
    // `status` is present in only one file → optional; its one observed value → const (rung 1).
    expect(fm.fields!.status).toEqual({ const: "open", optional: true });
  });

  it("picks the tightest type that admits every observed value (the value ladder)", () => {
    file("one.md", "---\nn: 1\nb: true\narr: [x, y]\ns: hello\n---\n\n## S\n\nx\n");
    file("two.md", "---\nn: 2\nb: false\narr: [z]\ns: 2026-01-01\n---\n\n## S\n\nx\n");
    const fields = def(inferConfig(root).contracts[0]!).frontmatter!.fields!;
    // All-integer numbers → number(int); booleans → boolean; arrays → array of loose element.
    expect(fields.n).toEqual({ type: "number", int: true });
    expect(fields.b).toEqual({ type: "boolean" });
    expect(fields.arr).toEqual({ type: "array", of: { type: "string" } });
    // `hello` matches no format and the set is too small to enum (2 distinct ≥ half of 2) → string.
    expect(fields.s).toEqual({ type: "string" });
  });

  it("--relax drops strict and opens the body floor", () => {
    file("one.md", "---\ntitle: A\n---\n\n## A\n\nx\n\n## B\n\nx\n");
    file("two.md", "---\ntitle: B\n---\n\n## A\n\nx\n\n## B\n\nx\n");
    const c = inferConfig(root, { relax: true }).contracts[0]!;
    expect(def(c).frontmatter!.strict).toBeUndefined();
    expect(def(c).body!.order).toBe("none");
    expect(def(c).body!.allowUnknown).toBe(true);
  });
});

describe("inferConfig — value-type ladder (D-0009 § Step 4)", () => {
  /** Six files exercising the ladder, so the rung-6 enum ratio (< half of 6) is satisfiable. */
  function ladderVault(): void {
    for (let i = 1; i <= 6; i++) {
      const severity = i % 2 === 0 ? "high" : "low";
      file(
        `f${i}.md`,
        `---\nkind: policy\nversion: ${i}\nactive: ${i % 2 === 0}\n` +
          `created: 2024-0${i}-0${i}\nseverity: ${severity}\ntitle: Doc ${i}\n---\n\n## Body\n\nx\n`,
      );
    }
  }

  it("walks const → number(int) → boolean → format → enum → string", () => {
    ladderVault();
    const fields = def(inferConfig(root).contracts[0]!).frontmatter!.fields!;
    expect(fields.kind).toEqual({ const: "policy" }); // rung 1 — uniform
    expect(fields.version).toEqual({ type: "number", int: true }); // rung 2 — all integers
    expect(fields.active).toEqual({ type: "boolean" }); // rung 3
    expect(fields.created).toEqual({ type: "string", format: "date" }); // rung 5 — ISO dates
    expect(fields.severity).toEqual({ enum: ["low", "high"] }); // rung 6 — small closed set
    expect(fields.title).toEqual({ type: "string" }); // rung 7 — all-distinct free-form
  });

  it("--relax drops rung 6: a categorical field stays a plain string", () => {
    ladderVault();
    const fields = def(inferConfig(root, { relax: true }).contracts[0]!).frontmatter!.fields!;
    expect(fields.severity).toEqual({ type: "string" });
    // The tighter, non-categorical rungs still fire under --relax.
    expect(fields.kind).toEqual({ const: "policy" });
    expect(fields.created).toEqual({ type: "string", format: "date" });
  });

  it("non-integer numbers → number (no int)", () => {
    file("a.md", "---\nratio: 1.5\n---\n\n## S\n\nx\n");
    file("b.md", "---\nratio: 2\n---\n\n## S\n\nx\n");
    const fields = def(inferConfig(root).contracts[0]!).frontmatter!.fields!;
    expect(fields.ratio).toEqual({ type: "number" });
  });
});

describe("inferConfig — emission + determinism", () => {
  it("serializes a loadable contract document and is deterministic", () => {
    file("one.md", "---\ntitle: A\n---\n\n## Summary\n\nx\n");
    file("two.md", "---\ntitle: B\n---\n\n## Summary\n\nx\n");
    const a = inferConfig(root);
    const b = inferConfig(root);
    expect(b.contracts).toEqual(a.contracts);
    expect(b.files).toEqual(a.files);

    const yaml = parse(a.files[0]!.content) as Record<string, unknown>;
    expect(yaml.mcVersion).toBe(1);
    expect(yaml.kind).toBe("contract");
    // The emitted def round-trips through the loader the self-check uses.
    expect(() => compileContractObject(a.contracts[0]!.def)).not.toThrow();
  });
});
