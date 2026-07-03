#!/usr/bin/env bun
/**
 * The combined single-binary entry — the two-faced `markdown-contract` (D-0012 §D3).
 *
 * `argv[0]` selects the face:
 *  - `daemon` → boot the loopback HTTP server (`./daemon/server.ts`) and keep serving.
 *    `Bun.serve` holds the event loop open, so there is no exit here.
 *  - anything else → delegate to `packages/core`'s exported `runCli`, wrapped with the
 *    SAME write-streams-and-exit shim as `packages/core/src/cli/index.ts` (the npm bin),
 *    so `validate <path>` / `init <dir>` behave identically to the published binary (AC-3).
 *
 * This file is the `bun build --compile` target ([[T-BMTX-bun-compile-matrix]]). One-way
 * layering: `apps/web → packages/core`; core imports nothing here (AC-5).
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runCli } from "markdown-contract/cli";

import { runDaemon } from "./daemon/server.js";

/**
 * Dispatch on `argv[0]`. The delegate branch mirrors the core bin's single exit site:
 * run the pure core, write its captured streams, exit with its code.
 */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv[0] === "daemon") {
    // The server keeps the process alive; deliberately no `process.exit` on this face.
    runDaemon(argv.slice(1));
    return;
  }

  const { code, stdout, stderr } = await runCli(argv);
  if (stdout) process.stdout.write(`${stdout}\n`);
  if (stderr) process.stderr.write(`${stderr}\n`);
  process.exit(code);
}

// Run only when executed as the bin (not on import) — the Node-standard ESM entry check,
// matching `packages/core/src/cli/index.ts` so importing this module never boots a server.
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) {
  void main();
}
