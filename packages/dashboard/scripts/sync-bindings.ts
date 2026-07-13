// Regenerate the shared layer's transport bindings from ontogen's generated
// desktop output — so packages/dashboard/bindings/ is TOOLING-MANAGED, never
// hand-edited. Run after a `cargo build` of src-tauri changes the API surface:
//
//   bun run sync:bindings        (from packages/dashboard)
//
// Source of truth: apps/desktop/app/bindings/{types,transport}.ts (emitted by
// ontogen on every src-tauri build). This script produces the web-safe slice:
//   • types.ts     — verbatim (pure types, transport-agnostic)
//   • transport.ts — HTTP-only: the `import '@tauri-apps/api/core'` line and the
//     entire `createIpcTransport` section are stripped, so the shared/web bundle
//     carries no Tauri SDK. The `Transport` interface + `createHttpTransport`
//     survive verbatim.
//
// End-state: ontogen emits this split directly (an upstream codegen flag), and
// this script goes away. Until then it keeps the vendored copy in lockstep.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "../../../apps/desktop/app/bindings");
const OUT = resolve(here, "../bindings");

const banner = (extra: string) =>
  `// GENERATED — do not edit. Regenerate with \`bun run sync:bindings\` (packages/dashboard).\n${extra}\n`;

/** Drop ontogen's own "Auto-generated … DO NOT EDIT" header lines; we add our own. */
function stripOntogenHeader(src: string): string {
  return src.replace(/^(\/\/[^\n]*\n)+/, "").replace(/^\n+/, "");
}

// ── types.ts — verbatim slice ──
const types = stripOntogenHeader(readFileSync(`${SRC}/types.ts`, "utf8"));
writeFileSync(
  `${OUT}/types.ts`,
  `${banner("// Vendored verbatim from ontogen's apps/desktop/app/bindings/types.ts.")}\n${types}`,
);

// ── transport.ts — HTTP-only slice ──
let t = stripOntogenHeader(readFileSync(`${SRC}/transport.ts`, "utf8"));
// 1. drop the Tauri IPC import (any quote style)
t = t.replace(/^import\s*\{\s*invoke\s*\}\s*from\s*['"]@tauri-apps\/api\/core['"];?\n/m, "");
// 2. drop everything from the IPC-transport section marker onward
const IPC_MARKER = "// ── IPC Transport ──";
const ipcAt = t.indexOf(IPC_MARKER);
if (ipcAt === -1) {
  throw new Error(
    `sync-bindings: expected IPC marker ${JSON.stringify(IPC_MARKER)} in the ontogen transport — ` +
      "ontogen's output shape changed; update this slicer.",
  );
}
t = `${t.slice(0, ipcAt).trimEnd()}\n`;
// 3. drop ontogen's speculative `toQueryString` helper — unused by the HTTP
//    transport (only the stripped IPC/query paths referenced it), so it would be
//    dead code in this slice. Lazy match up to the next section marker.
t = t.replace(/\nfunction toQueryString[\s\S]*?\n(?=\/\/ ── HTTP Transport ──)/, "\n");
writeFileSync(
  `${OUT}/transport.ts`,
  `${banner(
    "// HTTP-only slice of ontogen's apps/desktop/app/bindings/transport.ts:\n" +
      "// the createIpcTransport section + its @tauri-apps import are stripped so this\n" +
      "// module bundles with no Tauri SDK. Transport interface + createHttpTransport verbatim.",
  )}\n${t}`,
);

process.stdout.write(`sync-bindings: wrote ${OUT}/types.ts + ${OUT}/transport.ts from ${SRC}\n`);
