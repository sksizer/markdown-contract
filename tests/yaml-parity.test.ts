import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Pending parity between the TypeScript fixture corpus and its declarative YAML peers.
 *
 * Each fixture (`tests/fixtures/{validation,consumption}/<stem>.ts`) now has a
 * `<stem>.contract.yaml` peer — the v1 YAML expression of the same contract (see
 * `tests/fixtures/YAML-MAPPING.md`). When the declarative loader lands
 * (`markdown-contract/declarative`, milestone M-0002 / decision D-0008), the parity
 * suite below activates: load each peer, run the fixture's own cases/reads against the
 * YAML-built contract, and assert identical findings — proving YAML authorship is
 * indistinguishable from the TS combinators.
 *
 * Flip `DECLARATIVE_IMPLEMENTED` to true once `markdown-contract/declarative` exports
 * `loadContract`. Until then the parity block is reported as skipped, keeping the
 * pending surface visible in the test census.
 */
const DECLARATIVE_IMPLEMENTED = false;

const KINDS = ["validation", "consumption"] as const;

const isFixture = (f: string): boolean =>
  f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "index.ts" && !f.startsWith("_");

function fixtureDir(kind: string): string {
  return fileURLToPath(new URL(`./fixtures/${kind}`, import.meta.url));
}

function fixtureStems(kind: string): string[] {
  return readdirSync(fixtureDir(kind))
    .filter(isFixture)
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
}

// Active now: the mapping must stay complete — every TS fixture has a YAML peer.
describe("YAML contract peers", () => {
  for (const kind of KINDS) {
    const dir = fixtureDir(kind);
    const stems = fixtureStems(kind);

    it(`every ${kind} fixture has a .contract.yaml peer (${stems.length} fixtures)`, () => {
      const missing = stems.filter((s) => !existsSync(`${dir}/${s}.contract.yaml`));
      expect(missing, `missing YAML peers in ${kind}: ${missing.join(", ")}`).toEqual([]);
    });
  }
});

// Activates when the loader exists (M-0002). Reported as skipped until then.
describe.skipIf(!DECLARATIVE_IMPLEMENTED)(
  "YAML ⇄ TS contract parity (pending loader — M-0002)",
  () => {
    it("each YAML peer yields the same findings as its TS fixture", async () => {
      // When the loader lands, wire it here:
      //   const { loadContract } = await import("../src/declarative/index.js");
      //   for each validation fixture: for every case, assert
      //     loadContract(peer).validate(case.source, ctx).findings  ==  the TS fixture's expected findings;
      //   for each consumption fixture: assert the same reads / ContractError door.
      // Partial peers (see YAML-MAPPING.md) assert parity only up to their documented gap —
      // the dropped rule/docRule/refine finding is expected to be absent under the YAML contract.
      expect(DECLARATIVE_IMPLEMENTED).toBe(true);
    });
  },
);
