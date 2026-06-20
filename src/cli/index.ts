#!/usr/bin/env node
/**
 * markdown-contract CLI — the thin shell, and the ONLY owner of `process.exit` in
 * the codebase. Parses argv → calls the runner (`../runner`) → formats findings
 * (human | json | sarif) → exits. No business logic lives here.
 *
 * Node-standard only (no Bun APIs), so the published bin runs anywhere Node does.
 * Imports flow one way: cli → runner → core. This file is never re-exported by the
 * library (`../index.ts`).
 */
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    format: { type: "string", default: "human" }, // human | json | sarif
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log("usage: markdown-contract validate <path> [--format human|json|sarif]");
  process.exit(values.help ? 0 : 2);
}

// TODO(M·corpus-runner): wire to `../runner/index.js` (runCorpus) and format the findings.
console.error(
  "markdown-contract: not implemented yet (scaffold — see provenance/d0014/review-checklist.md).",
);
process.exit(70); // EX_SOFTWARE placeholder until the runner lands
