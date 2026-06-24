import { describe, expect, it } from "vitest";

import { DeclarativeError, loadContract } from "./index.js";

const FM = `mcVersion: 1
kind: contract
frontmatter:
  strict: true
  fields:
    id: { type: string, pattern: '^D-[0-9A-Z]{4}$' }
    status: { enum: [open/proposed, open/accepted] }
    title: { type: string, min: 1 }
`;

const doc = (status: string, extra = ""): string =>
  `---\nid: D-0001\nstatus: ${status}\ntitle: Hi\n${extra}---\n\n## Body\n\nx\n`;

describe("loadContract — frontmatter plane parity with the combinators", () => {
  it("a clean document yields no findings", () => {
    const c = loadContract(FM);
    const r = c.validate(doc("open/proposed"), { path: "x.md" });
    expect(r.findings).toEqual([]);
  });

  it("a bad enum surfaces frontmatter/enum", () => {
    const c = loadContract(FM);
    const r = c.validate(doc("bogus"), { path: "x.md" });
    expect(r.findings.map((f) => f.id)).toContain("frontmatter/enum");
  });

  it("an unknown key surfaces frontmatter/unknown-key under strict", () => {
    const c = loadContract(FM);
    const r = c.validate(doc("open/proposed", "extra: 1\n"), { path: "x.md" });
    expect(r.findings.map((f) => f.id)).toContain("frontmatter/unknown-key");
  });
});

describe("loadContract — envelope + current-build limits", () => {
  it("rejects an unsupported mcVersion", () => {
    expect(() => loadContract("mcVersion: 2\nkind: contract\n")).toThrow(DeclarativeError);
  });

  it("rejects a missing / wrong kind", () => {
    expect(() => loadContract("mcVersion: 1\n")).toThrow(DeclarativeError);
    expect(() => loadContract("mcVersion: 1\nkind: config\n")).toThrow(DeclarativeError);
  });

  it("compiles a body grammar (a required section that is absent → structure/section-missing)", () => {
    const c = loadContract("mcVersion: 1\nkind: contract\nbody:\n  order: none\n  sections:\n    - section: Summary\n");
    const r = c.validate("## Other\n\nx\n", { path: "x.md" });
    expect(r.findings.map((f) => f.id)).toContain("structure/section-missing");
  });
});
