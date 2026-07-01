/// <reference types="vite/client" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { Finding } from "../src/core/types.js";
import { loadContract } from "../src/declarative/index.js";
import type { ConsumptionFixture, ValidationFixture } from "./harness.js";

/**
 * TS ⇄ YAML contract parity. Each fixture's `.contract.yaml` peer (the v1 declarative
 * expression of its contract — see `fixtures/YAML-MAPPING.md`) is loaded and run against the
 * same documents as the TS fixture; the findings / typed reads must match.
 *
 * v1 YAML expresses the frontmatter + structure + content planes only. The deferred features —
 * cross-cutting `rule` / `docRule`s and `.refine()` — emit findings outside those planes (custom
 * rule ids; `frontmatter/refine`), which a YAML contract legitimately does NOT produce. So the
 * TS side is filtered to the v1-expressible planes before comparing: full fixtures match exactly,
 * partial fixtures match once their documented gap finding is excluded. One assertion covers both.
 */
const DECLARATIVE_IMPLEMENTED = true;

// `import.meta.glob` is a Vite/Vitest compile-time macro — it's undefined under other runners
// (e.g. `bun test`), where evaluating it throws at module load. Vitest sets `process.env.VITEST`,
// so the ternary short-circuits the call away under any non-Vitest runner (leaving the fixture
// maps empty → this file registers no tests there, instead of crashing). Vite still statically
// transforms the literal call under Vitest, where `process.env.VITEST` is truthy. Run the real
// suite with `npm test` / `bun run test` (→ vitest run), not `bun test`.
// The globs RECURSE (`**/*.ts`) so a subdirectory can never hide a fixture from the "peers
// exist" check — folder placement is not load-bearing. A fixture opts out of the twin
// expectation explicitly with `peerless: true` (see below), not by where it sits on disk.
const valMods = (process.env.VITEST
  ? import.meta.glob("./fixtures/validation/**/*.ts", { eager: true })
  : {}) as Record<string, { default: ValidationFixture }>;
const conMods = (process.env.VITEST
  ? import.meta.glob("./fixtures/consumption/**/*.ts", { eager: true })
  : {}) as Record<string, { default: ConsumptionFixture }>;

interface Entry<T> {
  key: string;
  stem: string;
  fx: T;
}

function fixtures<T>(mods: Record<string, { default: T }>): Entry<T>[] {
  return Object.entries(mods)
    .map(([key, m]) => ({ key, fx: m.default, stem: key.slice(key.lastIndexOf("/") + 1).replace(/\.ts$/, "") }))
    .filter((e) => e.stem !== "index" && !e.stem.startsWith("_"))
    .sort((a, b) => a.stem.localeCompare(b.stem));
}

const peerText = (key: string): string =>
  readFileSync(fileURLToPath(new URL(key.replace(/\.ts$/, ".contract.yaml"), import.meta.url)), "utf8");

/** Whether a fixture's `.contract.yaml` twin exists on disk. */
const hasPeer = (key: string): boolean => {
  try {
    peerText(key);
    return true;
  } catch {
    return false;
  }
};

/** The planes v1 YAML can express; everything else is a deferred-feature finding (rule / refine). */
const isV1Plane = (f: Finding): boolean =>
  f.id.startsWith("structure/") ||
  f.id.startsWith("content/") ||
  f.id.startsWith("text/") ||
  (f.id.startsWith("frontmatter/") && f.id !== "frontmatter/refine");

/** Compare on the fields a YAML contract must reproduce; order-independent. */
const shape = (findings: Finding[]): string[] =>
  findings.map((f) => `${f.id}@${f.pos?.line ?? "-"}:${f.level}`).sort();

const valEntries = fixtures(valMods);
const conEntries = fixtures(conMods);

/**
 * Housekeeping existence check — intentionally SOFT (this is the only softened check; the two
 * behavioral parity describes below stay hard). A fixture that opts out with `peerless: true` is
 * accepted silently. A non-peerless fixture missing its `.contract.yaml` twin emits a NON-failing
 * CI warning via the vitest Test Annotations API (`annotate(msg, "warning")` → a GitHub Actions
 * warning annotation) — the test still PASSES. Folder placement gates nothing.
 */
async function warnMissingPeers<T extends { peerless?: boolean }>(
  entries: Entry<T>[],
  plane: string,
  annotate: (message: string, type?: string) => Promise<unknown>,
): Promise<void> {
  for (const e of entries) {
    if (e.fx.peerless || hasPeer(e.key)) continue;
    await annotate(
      `${plane} fixture "${e.stem}" has no ${e.stem}.contract.yaml twin and is not marked peerless`,
      "warning",
    );
  }
}

describe("YAML contract peers exist for every fixture", () => {
  it(`validation (${valEntries.length})`, async ({ annotate }) => {
    await warnMissingPeers(valEntries, "validation", annotate);
  });
  it(`consumption (${conEntries.length})`, async ({ annotate }) => {
    await warnMissingPeers(conEntries, "consumption", annotate);
  });
});

// The behavioral parity describes run only fixtures that actually have a twin: `peerText()`
// throws on any fixture with no `.contract.yaml`, so a peerless (intentionally twin-less) OR an
// accidentally twin-less fixture is excluded — the latter is already surfaced as a soft warning
// above, and must not become a hard failure here (that's AC-2). Everything else is unchanged, so a
// real TS⇄YAML mismatch on a fixture that DOES have a twin still fails hard (AC-4).
const hasTwin = <T extends { peerless?: boolean }>(e: Entry<T>): boolean => !e.fx.peerless && hasPeer(e.key);

describe.skipIf(!DECLARATIVE_IMPLEMENTED)("YAML ⇄ TS validation parity", () => {
  for (const e of valEntries.filter(hasTwin)) {
    it(e.stem, () => {
      const yaml = loadContract(peerText(e.key));
      const ts = e.fx.build();
      const ctx = { path: e.fx.path ?? "fixture.md" };
      for (const c of e.fx.cases) {
        const got = shape(yaml.validate(c.source, ctx).findings);
        const want = shape(ts.validate(c.source, ctx).findings.filter(isV1Plane));
        expect(got, `${e.stem} — ${c.label}`).toEqual(want);
      }
    });
  }
});

describe.skipIf(!DECLARATIVE_IMPLEMENTED)("YAML ⇄ TS consumption parity", () => {
  for (const e of conEntries.filter(hasTwin)) {
    it(e.stem, () => {
      const yaml = loadContract(peerText(e.key));
      const ctx = { path: e.fx.path ?? "fixture.md" };
      if (e.fx.throws) {
        expect(() => yaml.read(e.fx.source, ctx), e.stem).toThrow();
      } else {
        const doc = yaml.read(e.fx.source, ctx);
        for (const r of e.fx.reads ?? []) {
          expect(r.get(doc), `${e.stem} — ${r.label}`).toEqual(r.equals);
        }
      }
    });
  }
});
