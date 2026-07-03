import { describe, expect, it } from "vitest";

import { DeclarativeError } from "./errors.js";
import { compileObjectSchema, compileSchema } from "./schema.js";

describe("compileSchema — the closed vocabulary → Zod", () => {
  it("enum", () => {
    const s = compileSchema({ enum: ["a", "b"] });
    expect(s.safeParse("a").success).toBe(true);
    expect(s.safeParse("c").success).toBe(false);
  });

  it("const", () => {
    const s = compileSchema({ const: "task" });
    expect(s.safeParse("task").success).toBe(true);
    expect(s.safeParse("decision").success).toBe(false);
  });

  it("string + pattern + min", () => {
    const s = compileSchema({ type: "string", pattern: "^T-[0-9A-Z]{4}$", min: 1 });
    expect(s.safeParse("T-4QM9").success).toBe(true);
    expect(s.safeParse("nope").success).toBe(false);
    expect(s.safeParse("").success).toBe(false);
  });

  it("number + int + min/max", () => {
    const s = compileSchema({ type: "number", int: true, min: 0, max: 10 });
    expect(s.safeParse(5).success).toBe(true);
    expect(s.safeParse(5.5).success).toBe(false);
    expect(s.safeParse(11).success).toBe(false);
  });

  it("boolean", () => {
    expect(compileSchema({ type: "boolean" }).safeParse(true).success).toBe(true);
    expect(compileSchema({ type: "boolean" }).safeParse("x").success).toBe(false);
  });

  it("array of string + min", () => {
    const s = compileSchema({ type: "array", of: { type: "string" }, min: 1 });
    expect(s.safeParse(["x"]).success).toBe(true);
    expect(s.safeParse([]).success).toBe(false);
    expect(s.safeParse([1]).success).toBe(false);
  });

  it("object + strict rejects unknown keys", () => {
    const s = compileObjectSchema({ a: { type: "string" } }, true, "o");
    expect(s.safeParse({ a: "x" }).success).toBe(true);
    expect(s.safeParse({ a: "x", b: 1 }).success).toBe(false);
  });

  it("optional / default / nullable wrappers", () => {
    expect(compileSchema({ type: "string", optional: true }).safeParse(undefined).success).toBe(
      true,
    );
    expect(
      compileSchema({ type: "array", of: { type: "string" }, default: [] }).safeParse(undefined),
    ).toMatchObject({ success: true, data: [] });
    expect(compileSchema({ type: "string", nullable: true }).safeParse(null).success).toBe(true);
  });

  it("format: email", () => {
    const s = compileSchema({ type: "string", format: "email" });
    expect(s.safeParse("a@b.com").success).toBe(true);
    expect(s.safeParse("nope").success).toBe(false);
  });

  it("format: the broad closed set (Zod ∩ JSON Schema), each accepting/rejecting", () => {
    const cases: Array<[string, string, string]> = [
      // format, a valid value, an invalid value
      ["url", "https://example.com", "not a url"],
      ["uuid", "f47ac10b-58cc-4372-a567-0e02b2c3d479", "nope"],
      ["hostname", "example.com", "not a host!"],
      ["datetime", "2026-06-23T10:00:00Z", "2026-06-23"],
      ["date", "2026-06-23", "23/06/2026"],
      ["time", "10:00:00", "10am"],
      ["duration", "P3Y6M4D", "3 years"],
      ["ipv4", "192.168.0.1", "999.1.1.1"],
      ["ipv6", "2001:db8::1", "192.168.0.1"],
      ["cidrv4", "192.168.0.0/24", "192.168.0.0"],
      ["nanoid", "V1StGXR8_Z5jdHi6B-myT", "short id!"],
      ["cuid", "cjld2cjxh0000qzrmn831i7rn", "NOPE"],
      ["ulid", "01ARZ3NDEKTSV4RRFFQ69G5FAV", "lowercase-ulid"],
      ["base64", "aGVsbG8=", "not base64!!"],
      ["e164", "+14155552671", "5552671"],
    ];
    for (const [format, ok, bad] of cases) {
      const s = compileSchema({ type: "string", format });
      expect(s.safeParse(ok).success, `${format} should accept ${ok}`).toBe(true);
      expect(s.safeParse(bad).success, `${format} should reject ${bad}`).toBe(false);
    }
  });

  it("rejects an unknown format with a helpful message", () => {
    expect(() => compileSchema({ type: "string", format: "iban" })).toThrow(DeclarativeError);
    expect(() => compileSchema({ type: "string", format: "iban" })).toThrow(
      /unsupported string format/,
    );
  });

  it("rejects the deferred $ref code escape hatch", () => {
    expect(() => compileSchema({ $ref: "./x.js#Y" })).toThrow(DeclarativeError);
  });

  it("rejects an unknown / malformed schema", () => {
    expect(() => compileSchema({ wat: 1 })).toThrow(DeclarativeError);
    expect(() => compileSchema("nope")).toThrow(DeclarativeError);
    expect(() => compileSchema({ enum: [] })).toThrow(DeclarativeError);
  });
});
