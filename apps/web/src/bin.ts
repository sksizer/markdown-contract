#!/usr/bin/env bun
/**
 * The combined binary entry — "one binary, two faces" (D-0012 §D3). This file,
 * not `packages/core`'s bin, is the `bun build --compile` target:
 *
 *   markdown-contract daemon [--port N] [--open] [--registry F] [--no-watch]
 *     → boot the localhost server (SPA + JSON API), foreground, Ctrl-C to stop
 *
 *   markdown-contract <anything else>
 *     → hand argv verbatim to `packages/core`'s exported `runCli` — the CLI
 *       face is byte-identical to the npm bin (same commands, formats, exits)
 *
 * Like core's bin, this wrapper is the only `process.exit` owner on the CLI
 * path; the daemon path never exits on its own (foreground until signaled).
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { runCli } from "markdown-contract/cli";

import { DEFAULT_PORT, startDaemon } from "./daemon";

const DAEMON_USAGE = [
  "usage: markdown-contract daemon [--port <n>] [--open] [--registry <file>] [--no-watch]",
  "",
  `  --port <n>        listen port (default ${DEFAULT_PORT}; always binds 127.0.0.1)`,
  "  --open            open the dashboard in the default browser",
  "  --registry <file> use this vaults.json instead of the OS config dir",
  "  --no-watch        disable file-watching (validate on demand only)",
].join("\n");

function parseDaemonFlags(argv: string[]) {
  return parseArgs({
    args: argv,
    options: {
      port: { type: "string" },
      open: { type: "boolean" },
      registry: { type: "string" },
      "no-watch": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
}

function runDaemon(argv: string[]): void {
  let parsed: ReturnType<typeof parseDaemonFlags>;
  try {
    parsed = parseDaemonFlags(argv);
  } catch (err) {
    process.stderr.write(`markdown-contract: ${(err as Error).message}\n${DAEMON_USAGE}\n`);
    process.exit(2);
  }
  const { values } = parsed;
  if (values.help) {
    process.stdout.write(`${DAEMON_USAGE}\n`);
    process.exit(0);
  }
  let port = DEFAULT_PORT;
  if (values.port !== undefined) {
    port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      process.stderr.write(`markdown-contract: --port must be 1..65535 (got '${values.port}')\n`);
      process.exit(2);
    }
  }
  const daemon = startDaemon({
    port,
    open: values.open === true,
    ...(values.registry !== undefined ? { registryPath: values.registry } : {}),
    watch: values["no-watch"] !== true,
  });
  const shutdown = (): void => {
    daemon.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "daemon") {
    runDaemon(argv.slice(1));
    return; // foreground: the server keeps the process alive
  }
  const { code, stdout, stderr } = await runCli(argv);
  if (stdout) process.stdout.write(`${stdout}\n`);
  if (stderr) process.stderr.write(`${stderr}\n`);
  process.exit(code);
}

// Run only when executed as the bin (not on import) — the Node-standard ESM entry
// check, matching `packages/core/src/cli/index.ts`, so importing this module never
// boots a server or exits the process.
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) {
  void main();
}
