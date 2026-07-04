#!/usr/bin/env bun
/**
 * The combined binary entry — "one binary, two faces" (D-0012 §D3). This file
 * is the `bun build --compile` target:
 *
 *   markdown-contract daemon [--port N] [--open]
 *     → boot the built Nitro server (SPA + JSON API in one bundle),
 *       foreground, Ctrl-C to stop
 *
 *   markdown-contract <anything else>
 *     → hand argv verbatim to `packages/core`'s exported `runCli` — the CLI
 *       face is byte-identical to the npm bin (same commands, formats, exits)
 *
 * The daemon face differs from the peer example (`examples/single-binary`) in
 * ONE way: instead of a hand-rolled `Bun.serve`, it dynamically imports the
 * `nuxt build` output (`ui/.output/server/index.mjs`). Nitro's `bun` preset
 * boots `Bun.serve` as an import side effect, taking its port and host from
 * `NITRO_PORT` / `NITRO_HOST` — so this wrapper's whole job is to set those
 * env vars (host hard-coded to loopback, D-0012 §D1) and then import. The
 * import specifier is a literal so `bun build --compile` embeds the entire
 * server bundle, and it sits strictly behind the `daemon` argv check so the
 * CLI face never boots a server.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

// `/cli/run` (the pure module), NOT `/cli` (the self-executing bin wrapper):
// under `bun build --compile` every bundled module sees import.meta.url equal
// to the executable path, so the bin wrapper's "am I the entry?" guard
// false-positives, runs core's main() with our argv, and process.exit()s the
// daemon out from under us. See the peer example README's entry-guard section.
import { runCli } from "markdown-contract/cli/run";

/** Default port. 4321 — distinct from apps/web's 4319 and the peer example's 4320. */
const DEFAULT_PORT = 4321;

const DAEMON_USAGE = [
  "usage: markdown-contract daemon [--port <n>] [--open]",
  "",
  `  --port <n>  listen port (default ${DEFAULT_PORT}; always binds 127.0.0.1)`,
  "  --open      open the UI in the default browser",
].join("\n");

async function runDaemon(argv: string[]): Promise<void> {
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

  // The Nitro bun preset reads these on import. The host is hard-coded to
  // loopback and deliberately NOT overridable — the 127.0.0.1 bind is the
  // entire security boundary of the no-auth API (D-0012 §D1).
  process.env.NITRO_PORT = String(port);
  process.env.NITRO_HOST = "127.0.0.1";

  try {
    // Literal specifier: `bun build --compile` resolves it at build time and
    // embeds the whole self-contained server bundle (SPA assets inlined via
    // nitro's `serveStatic: "inline"`). Evaluating it boots the server.
    // @ts-expect-error -- the built bundle ships no type declarations (and does
    // not exist until `bun run build:ui`); there is nothing for tsc to see.
    await import("../ui/.output/server/index.mjs");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/cannot (?:find|resolve) module/i.test(message)) {
      process.stderr.write(
        "markdown-contract: the daemon's server bundle is missing (ui/.output/server) — run `bun run build:ui` first\n",
      );
      process.exit(1);
    }
    throw err;
  }

  const url = `http://127.0.0.1:${port}`;
  console.log(`markdown-contract daemon listening on ${url}`);
  if (values.open === true) openBrowser(`${url}/`);
}

function parseDaemonFlags(argv: string[]) {
  return parseArgs({
    args: argv,
    options: {
      port: { type: "string" },
      open: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });
}

/** Best-effort "open this URL in the browser" for `--open`; failures are swallowed. */
function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [url], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    }).unref();
  } catch {
    // Opening a browser is a convenience, never a failure the daemon should surface.
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "daemon") {
    await runDaemon(argv.slice(1));
    return; // foreground: the imported server keeps the process alive
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
