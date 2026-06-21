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

const [command] = positionals;

switch (command) {
  case "validate": {
    // The validate subcommand wires to the runner once it lands (T-J9TZ): build a
    // CorpusConfig, call runCorpus, format the findings, and exit on its exit code.
    // For now it is a stub that throws `not implemented`.
    try {
      runValidate();
    } catch (err) {
      console.error(`markdown-contract: ${(err as Error).message}`);
      process.exit(70); // EX_SOFTWARE until the runner lands
    }
    break;
  }
  default:
    console.error(`markdown-contract: unknown command "${command}"`);
    process.exit(2); // usage error
}

/** Stub `validate` dispatch — wired to `../runner` (runCorpus) in T-J9TZ. */
function runValidate(): void {
  throw new Error("validate: not implemented");
}
