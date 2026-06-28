// Barrel of validation fixtures, in provenance numeric order.
// v01 is the worked sample; the rest are ported in two parts (01a–11, 12–21b). The
// declarative text-constraint fixtures (D-0011) live under `./text/` and arrive as `textFixtures`.
import type { ValidationFixture } from "../../harness.js";

import v01 from "./01-single-required-section.js";
import { partA } from "./_part-a.js";
import { partB } from "./_part-b.js";
import { textFixtures } from "./text/index.js";

export const validationFixtures: ValidationFixture[] = [v01, ...partA, ...partB, ...textFixtures];
