// Barrel of the declarative text-constraint fixtures (D-0011 / C-0009), all gated on `text-api`.
// They live in this subdirectory — out of the top-level `*.ts` glob the yaml-parity harness
// enumerates — so no `.contract.yaml` parity peer is demanded yet; T-TXYL adds those when it
// flips `text-yaml`. The top-level validation barrel spreads `textFixtures` into the suite so
// the census counts them (skipped while `text-api` is `false`).
import type { ValidationFixture } from "../../../harness.js";

import v22 from "./22-text-requires-section.js";
import v23 from "./23-text-forbids-body-root.js";
import v24 from "./24-text-requires-count.js";
import v25 from "./25-text-regex.js";

export const textFixtures: ValidationFixture[] = [v22, v23, v24, v25];
