# d0020 — mcVersion 2 vocabulary respell (JSON Schema idiom)

Provenance for **[[D-0020-mcversion-2-json-schema-vocabulary]]**
(`docs/planning/decisions/D-0020-mcversion-2-json-schema-vocabulary.md`): the
research that motivated respelling the declarative vocabulary to the JSON Schema
2020-12 idiom.

- `research/document-schema-alignment.md` — the full comparison of
  markdown-contract against **document-schema.org** (draft 2026-06 / the
  `schematter` validator): feature-by-feature tables, gap inventories, semantic
  conflicts, and the four alignment options. Its recommendation sequence
  (vocabulary first, conformance fixtures next, engine capabilities on their own
  merits, full compatibility last) is what D-0020 executes the first step of.
- The Zod 4 composability spike referenced by D-0020 (formats chaining with
  `min` / `max` / `regex`, `[T, "null"]` unions, wrapper stacking) ran against
  the in-repo `zod@4.4.3`; results are recorded in the decision's Context.
