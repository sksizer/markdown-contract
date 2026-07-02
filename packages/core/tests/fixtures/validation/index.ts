// Barrel of validation fixtures, in provenance numeric order.
// v01 is the worked sample; the rest are ported in two parts (01a–11, 12–21b). The
// declarative text-constraint fixtures (D-0011, v22–v25) sit beside their peers here, each
// marked `peerless` until T-TXYL lands their `.contract.yaml` twins — no longer hidden in a
// `./text/` subdirectory to dodge the yaml-parity "peers exist" check.
import type { ValidationFixture } from "../../harness.js";
import { partA } from "./_part-a.js";
import { partB } from "./_part-b.js";
import v01 from "./01-single-required-section.js";
import v22 from "./22-text-requires-section.js";
import v23 from "./23-text-forbids-body-root.js";
import v24 from "./24-text-requires-count.js";
import v25 from "./25-text-regex.js";
import v26 from "./26-in-doc-dead-anchor.js";

export const validationFixtures: ValidationFixture[] = [
  v01,
  ...partA,
  ...partB,
  v22,
  v23,
  v24,
  v25,
  v26,
];
