import { describe, expect, test } from "vitest";

import { defaultRegistry, makeCtx, STRUCTURE_LEVELS } from "./registry.js";

// registry.ts holds the finding-id → default-level table and the Ctx factory whose
// finding() stamps the document path and fills the default level. Each case is the contract.

describe("default finding levels", () => {
  test("structure ids default to error; heading-depth-jump is a warn", () => {
    expect(STRUCTURE_LEVELS["structure/section-missing"]).toBe("error");
    expect(STRUCTURE_LEVELS["structure/heading-depth-jump"]).toBe("warn");
  });

  test("defaultRegistry() hands back a fresh copy — mutating it doesn't leak", () => {
    const copy = defaultRegistry();
    copy["structure/section-missing"] = "warn";
    expect(defaultRegistry()["structure/section-missing"]).toBe("error");
  });
});

describe("makeCtx — the rule-author finding factory", () => {
  const ctx = makeCtx("docs/x.md", defaultRegistry());

  test("finding() stamps the document path and fills the registry default level", () => {
    expect(ctx.finding({ id: "structure/section-missing", message: "Summary is missing" })).toEqual({
      id: "structure/section-missing",
      level: "error",
      path: "docs/x.md",
      message: "Summary is missing",
    });
  });

  test("an explicit level overrides the registry default", () => {
    const f = ctx.finding({ id: "structure/section-missing", message: "m", level: "warn" });
    expect(f.level).toBe("warn");
  });

  test("an unregistered id falls back to error", () => {
    expect(ctx.finding({ id: "custom/anything", message: "m" }).level).toBe("error");
  });

  test("pos is carried only when supplied (absence findings omit it)", () => {
    expect(ctx.finding({ id: "structure/section-missing", message: "m" }).pos).toBeUndefined();
    expect(
      ctx.finding({ id: "structure/anchor-missing", message: "m", pos: { line: 3, col: 1 } }).pos,
    ).toEqual({ line: 3, col: 1 });
  });
});
