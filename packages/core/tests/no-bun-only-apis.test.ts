import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

// Guard (T-WKSP AC-3): packages/core is the runtime-neutral, npm-published
// library, and its `test` task is pinned to the Node toolchain precisely so this
// suite is the Node-compatibility gate. This guard walks every shipped source
// file under src/ and fails if any imports a Bun-only API — a `Bun.*` global or
// a `bun:` builtin module (bun:sqlite, bun:test, bun:ffi, …). A dev-time Bun
// dependency must never leak into the published artifact.
//
// Only non-test .ts files are scanned: tsconfig.build.json excludes *.test.ts, so
// test files never ship in dist/ and are out of scope for the artifact guard.
const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function shippedSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...shippedSourceFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

// `Bun.` global usage, and any `bun:` module specifier (the leading quote pins it
// to a real import/require specifier rather than the word "bun" in prose).
const BUN_GLOBAL = /\bBun\./;
const BUN_MODULE = /["']bun:/;

describe("no Bun-only APIs in packages/core/src", () => {
  const files = shippedSourceFiles(SRC_DIR);

  test("source tree is non-empty (guard is actually scanning something)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = file.slice(SRC_DIR.length + 1);
    test(`${rel} imports no Bun-only API`, () => {
      const text = readFileSync(file, "utf8");
      expect(BUN_GLOBAL.test(text), `${rel} uses a Bun.* global`).toBe(false);
      expect(BUN_MODULE.test(text), `${rel} imports a bun: module`).toBe(false);
    });
  }
});
