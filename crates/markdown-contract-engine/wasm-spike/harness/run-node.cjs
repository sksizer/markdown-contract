// SPIKE Node harness — proves the wasm round-trip works end to end.
//
//   require() the nodejs-target pkg (synchronous instantiate at module load),
//   compile a declarative YAML contract + validate two markdown docs, print the
//   findings JSON, and assert the engine reports what we expect.
//
// Run:  node harness/run-node.cjs   (from the wasm-spike crate dir, after
//       `wasm-pack build . --target nodejs --out-dir pkg-node`)

const assert = require("node:assert");
const {
  validate_document,
  engine_info,
} = require("../pkg-node/markdown_contract_engine_wasm_spike.js");

// A small declarative contract: a strict-ish frontmatter enum + two required sections.
const contract = `mcVersion: 1
kind: contract
frontmatter:
  fields:
    status:
      enum: [open/proposed, open/accepted]
body:
  order: none
  allowUnknown: true
  sections:
    - section: Summary
    - section: Context
`;

const passDoc = `---
status: open/proposed
---

## Summary

A summary.

## Context

Why it matters.
`;

const failDoc = `---
status: open/draft
---

## Summary

A summary.
`;

console.log("loaded:", engine_info());

// PASS: a conforming doc yields zero findings.
const passOut = JSON.parse(validate_document(passDoc, contract, "doc.md"));
console.log("\nPASS doc findings:", JSON.stringify(passOut));
assert.deepStrictEqual(passOut, [], "conforming doc should produce no findings");

// FAIL: bad enum value + a missing required section.
const failOut = JSON.parse(validate_document(failDoc, contract, "doc.md"));
console.log("\nFAIL doc findings:");
console.log(JSON.stringify(failOut, null, 2));
const ids = failOut.map((f) => f.id);
assert.deepStrictEqual(
  ids,
  ["frontmatter/enum", "structure/section-missing"],
  "expected the enum + missing-section findings, in interchange order",
);

// A malformed contract surfaces as a thrown JS Error, not a finding.
let threw = null;
try {
  validate_document("x", "mcVersion: 9\nkind: contract\n", "doc.md");
} catch (e) {
  threw = e;
}
assert.ok(threw instanceof Error, "unsupported mcVersion should throw a JS Error");
console.log("\nmalformed contract threw:", threw.message);

console.log("\nOK — wasm round-trip verified in Node.");
