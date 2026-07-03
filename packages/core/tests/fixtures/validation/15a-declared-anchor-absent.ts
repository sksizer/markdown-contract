import { contract, section, sections, table } from "../../../src/index.js";
import type { ValidationFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: validation/15a-declared-anchor-absent.md
// Edge on 15: a declared content-record anchor that no block carries.
// Note (T-5LW7): the provenance guessed `structure/anchor-missing`, but the shipped
// structure plane (T-8RJ5) classifies an anchored content slot whose `^anchor` binds
// no block as `structure/block-missing` (a declared content slot has no block of the
// expected kind at the anchor) — `anchor-missing` is reserved for a `section({anchor})`
// requirement that resolves to nothing. This is a structure-plane classification (out of
// the content plane's scope); the fixture is aligned to the shipped behavior. Line
// unchanged (the block-missing finding localizes to the ## Decision heading, line 1).
const v15a: ValidationFixture = {
  id: "v15a",
  title: "Declared anchor absent in document",
  component: "content",
  path: "docs/.../README.md",
  build: () =>
    contract({
      body: sections({}, [
        section("Decision", {
          content: {
            components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
            risks: table({ anchor: "risks", columns: ["Risk", "Mitigation"] }),
          },
        }),
      ]),
    }),
  cases: [
    {
      label: "pass — both tables carry their ^anchor",
      source: loadSource(import.meta.url, "./15a-declared-anchor-absent.pass.md"),
      findings: [],
    },
    {
      label: "fail — second table has no ^risks marker; binding unresolved",
      source: loadSource(import.meta.url, "./15a-declared-anchor-absent.fail.md"),
      findings: [{ id: "structure/block-missing", level: "error", line: 1 }],
    },
  ],
};

export default v15a;
