import { contract, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadExpected, loadSource } from "../../harness.js";

// Provenance: D-0020 — the v2 `description:` becomes the `hint` findings carry.
// The nearest enclosing description wins: the Summary slot's own description hints its
// section-missing finding; the description-free Context slot falls back to the contract
// root's. The YAML twin authors the same contract in the mcVersion 2 vocabulary.
const v27: ValidationFixture = {
  id: "v27",
  title: "v2 description → finding hint (nearest-enclosing, root fallback)",
  component: "structure",
  path: "decisions/rollout.md",
  build: () =>
    contract({
      description: "A decision record needs its core sections.",
      body: sections({ order: "none", allowUnknown: true }, [
        section("Summary", { description: "One paragraph naming the outcome." }),
        section("Context"),
      ]),
    }),
  cases: [
    {
      label: "pass — both described sections present",
      source: loadSource(import.meta.url, "./27-v2-description-hint.pass.md"),
      findings: loadExpected(import.meta.url, "./27-v2-description-hint.pass.expected.json"),
    },
    {
      label: "fail — both sections missing; each finding carries its nearest description as hint",
      source: loadSource(import.meta.url, "./27-v2-description-hint.fail.md"),
      findings: loadExpected(import.meta.url, "./27-v2-description-hint.fail.expected.json"),
    },
  ],
};

export default v27;
