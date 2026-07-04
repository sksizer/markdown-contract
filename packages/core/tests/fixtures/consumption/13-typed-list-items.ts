import { z } from "zod";
import { contract, list, section, sections } from "../../../src/index.js";
import { defineConsumptionFixture, loadSource } from "../../harness.js";

// Provenance: consumption/13-typed-list-items.md  (gate: list-typed — D-0015 / M-0011)
// Typed list-item read-back: a `list({ everyItem })` whose items TRANSFORM their source text into a
// typed `{ ref, text }` value, so each item reads back as that structure. Mirrors the typed-cell
// slice on the list plane. Skipped until T-SCLI flips `list-typed`; the read-back accessors here
// (typed `.items`) are not yet on the model surface, so each item is narrowed with the local
// `asCriterion` boundary (the list-item analogue of the dual-key table casts).
//
// `peerless`: v1 YAML has no way to express a Zod `.transform()`, so there is no `.contract.yaml`
// twin for this fixture (see tests/yaml-parity.test.ts).

/** `AC-1: do the thing` → { ref: "AC-1", text: "do the thing" }. */
const criterion = z.string().transform((raw) => {
  const [ref = "", ...rest] = raw.split(":");
  return { ref: ref.trim(), text: rest.join(":").trim() };
});

/** The transformed list item's typed read-back shape (not yet inferred by the model surface). */
type Criterion = { ref: string; text: string };
const asCriterion = (value: unknown): Criterion => value as Criterion;

const c13 = defineConsumptionFixture({
  id: "c13",
  title: "Typed list items via a transforming everyItem",
  component: "list-typed",
  path: "docs/task.md",
  source: loadSource(import.meta.url, "./13-typed-list-items.md"),
  peerless: true,
  build: () =>
    contract({
      body: sections({}, [
        section("Acceptance criteria", {
          content: list({ everyItem: criterion, minItems: 1 }),
        }),
      ]),
    }),
  reads: [
    {
      label: "items[0] === { ref: 'AC-1', text: 'scaffold the gated fixtures' }",
      get: (doc) => asCriterion(doc.body["Acceptance criteria"].lists[0]?.items[0]),
      equals: { ref: "AC-1", text: "scaffold the gated fixtures" },
    },
    {
      label: "items[1].ref === 'AC-2' — the typed item carries the parsed ref",
      get: (doc) => asCriterion(doc.body["Acceptance criteria"].lists[0]?.items[1]).ref,
      equals: "AC-2",
    },
    {
      label: "items[2].text === 'keep the goldens unchanged' — the parsed remainder",
      get: (doc) => asCriterion(doc.body["Acceptance criteria"].lists[0]?.items[2]).text,
      equals: "keep the goldens unchanged",
    },
  ],
});

export default c13;
