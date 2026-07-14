/**
 * The public type surface — every interface the engine, runner, and CLI share.
 *
 * This module is **logic-free**: interfaces and type aliases only. The functions
 * (`parse`, `contract`, `validate`, `read`, `runCorpus`, the combinators) and the
 * `ContractError` class are stubbed later in `T-4QM9-framework-skeleton`.
 *
 * Transcribed field-for-field from the capability API sections (`C-0001`..`C-0005`)
 * and the ADRs (`D-0001` finding model, `D-0002` projection, `D-0005` OOM), which in
 * turn derive from `provenance/d0014/proposed-shape.md` §2 (projection), §3 (contract),
 * §4 (findings), §6 (typed model).
 *
 * External types we do not yet depend on are stubbed with TODO-marked placeholders so
 * this surface type-checks before the runtime deps land:
 *   - `ZodType`            → `import type { ZodType } from "zod"`   (T-4QM9 / T-5LW7)
 *   - `Mdast`              → `import type { Root } from "mdast"`    (T-2HF6)
 *   - `MicromarkExtension` → the real micromark extension type      (T-2HF6)
 */
export {};
//# sourceMappingURL=types.js.map