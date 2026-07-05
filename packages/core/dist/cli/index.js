#!/usr/bin/env node
/**
 * markdown-contract CLI — the thin bin entry, and the ONLY owner of `process.exit` in
 * the codebase (AC-4). The pure, testable core lives in `./run.ts` (`runCli`, which
 * parses argv → loads config → runs the corpus → formats → returns `{ code, stdout,
 * stderr }`). This file wraps it: write the captured streams and exit with the code —
 * the single exit site — and runs only when this module is the program entry (the bin),
 * never on import.
 *
 * Node-standard only (no Bun APIs), so the published bin runs anywhere Node does.
 * Imports flow one way: cli → runner → core. This file is never re-exported by the
 * library (`../index.ts`).
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runCli } from "./run.js";
// Surface the testable core as the cli module's public API (consumed by ./index.test.ts).
export { runCli } from "./run.js";
/**
 * The thin exit wrapper — the SINGLE `process.exit` site. Runs the pure core, writes
 * its captured stdout/stderr to the real streams, and exits with its code. Invoked
 * only when this module is the program entry (the bin), never on import.
 */
async function main() {
    const { code, stdout, stderr } = await runCli(process.argv.slice(2));
    if (stdout)
        process.stdout.write(`${stdout}\n`);
    if (stderr)
        process.stderr.write(`${stderr}\n`);
    process.exit(code);
}
// Run `main` only when executed as the bin (not when imported by a test). Comparing
// the resolved module URL to argv[1] is the Node-standard ESM entry check.
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) {
    void main();
}
//# sourceMappingURL=index.js.map