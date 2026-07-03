import { contract, list, section, sections } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/12-list-leaf-checkbox-minitems.md
// The `list()` content leaf: every item a checkbox, minItems floor.
// Note (T-5LW7): the provenance guessed `list/every-item` for a non-checkbox item;
// reconciled to the D-0004 `content/<leaf>/<check>` scheme → content/list/item-kind
// (the `everyItem` kind check). Level + line are unchanged.
const v12: ValidationFixture = {
  id: "v12",
  title: "List leaf: checkbox items + minItems",
  component: "content",
  path: "docs/.../task.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Acceptance criteria", {
          content: list({ everyItem: "checkbox", minItems: 1 }),
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — all three items are checkboxes, count clears minItems",
      source: loadSource(import.meta.url, "./12-list-leaf-checkbox-minitems.pass.md"),
      findings: [],
    },
    {
      label: "fail — third item is a plain bullet, everyItem violated",
      source: loadSource(import.meta.url, "./12-list-leaf-checkbox-minitems.fail.md"),
      findings: [{ id: "content/list/item-kind", level: "error", line: 5 }],
    },
  ],
};

export default v12;
