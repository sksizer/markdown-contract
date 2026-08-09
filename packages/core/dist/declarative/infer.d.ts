/** Options for `inferConfig` — mirrors the `init` CLI flags (D-0009 § The CLI surface). */
export interface InferOptions {
    meta?: boolean;
    depth?: number;
    relax?: boolean;
    inline?: boolean;
    inferBounds?: boolean;
    maxConstStringLength?: number;
    minConstExamples?: number;
    include?: string[];
    exclude?: string[];
}
/**
 * One inferred contract for a directory group, in declarative-YAML OBJECT form.
 * `def` is exactly a `compileContractObject` input:
 *   { frontmatter?: { strict?: boolean; fields?: Record<string, unknown> },
 *     body?: { order?: "none"|"recognized-relative"|"strict"; allowUnknown?: boolean;
 *              sections?: Array<{ section: string; optional?: boolean }> } }
 */
export interface InferredContract {
    name: string;
    include: string[];
    def: Record<string, unknown>;
}
export interface InferredFile {
    path: string;
    content: string;
}
export interface InferResult {
    mode: "single" | "meta";
    contracts: InferredContract[];
    files: InferredFile[];
    warnings: string[];
}
/**
 * Infer a config from the corpus under `root`. Pure: reads files, returns model + serialized
 * YAML; writes nothing. Two modes (D-0009 § Two modes):
 *  - **single-contract** (`opts.meta` falsy, the default) — one contract over the whole subtree,
 *    the tightest shape that accepts every `*.md` under it;
 *  - **meta-config** (`opts.meta` truthy) — a uniform-depth cut at `opts.depth ?? 1`: one
 *    contract per directory at exactly that depth (recursive over its subtree) plus a root
 *    contract for files directly in the run root, files stranded above a depth ≥ 2 cut warned.
 *
 * Both modes share the same generalization (`generalize`); meta is single-contract with the cut
 * moved off the root. `opts.depth` 0 (or single mode) collapses to one contract over `**\/*.md`.
 */
export declare function inferConfig(root: string, opts?: InferOptions): InferResult;
//# sourceMappingURL=infer.d.ts.map