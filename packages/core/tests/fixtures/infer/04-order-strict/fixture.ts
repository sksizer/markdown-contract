import { fileURLToPath } from "node:url";

import { expect } from "vitest";

import { first } from "../../../expect.js";
import type { InferenceFixture } from "../../../harness.js";
import { asDef, sectionNames } from "../_assert.js";

const dir = fileURLToPath(new URL("./vault", import.meta.url));

/**
 * 04 · order-strict (infer-core). Every file has the identical, gap-free section
 * sequence (Summary, Context, Decision), so the strongest order consistent with every
 * file is `strict` (D-0009 § Step 3 — order).
 */
const fixture: InferenceFixture = {
  id: "infer04",
  title: "Identical gap-free sequence across files → strict",
  component: "infer-core",
  dir,
  assert: (result) => {
    const def = first(result.contracts).def;
    expect(asDef(def).body?.order).toBe("strict");
    expect(sectionNames(def)).toEqual(["Context", "Decision", "Summary"]);
  },
};

export default fixture;
