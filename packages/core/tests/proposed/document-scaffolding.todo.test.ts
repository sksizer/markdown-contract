/**
 * PROPOSED — document scaffolding (capability C-0011, decision D-0017).
 *
 * These cases exercise the *shape* of a not-yet-built API. The runtime suite is
 * `describe.skip` (flip `IMPLEMENTED` when `scaffold` / `template.create` land), so
 * nothing calls the throwing stubs. What DOES run today is the type layer: the
 * example contract, the derived-input assertions, and the `@ts-expect-error` lines
 * all go through `tsc`, so this file fails to type-check the moment the proposed
 * surface stops lining up with a real contract's types. That is the point — it
 * pins the write-side contract now and greens automatically once the code exists.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { contract, section, sections, table } from "../../src/index.js";
import {
  scaffold,
  type ScaffoldInput,
  template,
} from "./document-scaffolding.proposed.js";

// A small, real contract — the same combinators the engine ships. `decision.validate`
// is genuine; only `scaffold` / `template.create` are stubbed.
const decision = contract({
  frontmatter: z.object({
    id: z.string().regex(/^D-\d{4}$/),
    status: z.enum(["active", "closed", "pending"]),
    created: z.string(),
  }),
  body: sections({ order: "strict" }, [
    section("Summary"),
    section("Decision"),
    section("Files", { content: table({ columns: ["path", "reason"] }) }),
  ]),
});

// ── Type layer (checked by `tsc`, runs at import; no stubs called) ────────────

// The derived input narrows `frontmatter.status` to the contract's own enum union.
type DecisionInput = ScaffoldInput<typeof decision>;
type StatusInput = NonNullable<DecisionInput["frontmatter"]>["status"];

const _statusOk: StatusInput = "closed"; // a real enum member — fine
// @ts-expect-error — "archived" is not a member of the status enum; the contract types the input.
const _statusBad: StatusInput = "archived";

// Every field is optional (anything omitted falls back to the fill policy).
const _partialOk: DecisionInput = { frontmatter: { status: "active" } };

// ── Behavioural layer (skipped until the feature lands) ───────────────────────

const IMPLEMENTED = false; // ← flip when scaffold / template.create ship (C-0011 / D-0017)
const suite = IMPLEMENTED ? describe : describe.skip;

suite("document scaffolding (proposed — C-0011 / D-0017)", () => {
  it("scaffold() emits a structurally-valid skeleton", () => {
    const md = scaffold(decision, { fill: "todo" });
    const { findings } = decision.validate(md, { path: "D-0000.md" });
    // Round-trip guarantee: zero structural findings (D-0017 § 4).
    expect(findings.filter((f) => f.id.startsWith("structure/"))).toHaveLength(0);
  });

  it("template.create() places typed frontmatter values", () => {
    const make = template.create(decision);
    const md = make({ frontmatter: { status: "closed" } });
    expect(md).toContain("status: closed");
  });

  it("round-trips to a fully clean validate when all values are supplied", () => {
    const make = template.create(decision);
    const md = make({
      frontmatter: { id: "D-0042", status: "active", created: "2026-07-04" },
      body: { Files: { rows: [{ path: "src/x.ts", reason: "touched" }] } },
    });
    expect(decision.validate(md, { path: "D-0042.md" }).findings).toHaveLength(0);
  });

  it("create({}) with no values equals the blank scaffold", () => {
    const make = template.create(decision);
    expect(make({})).toBe(scaffold(decision));
  });
});
