/** Cast a placeholder `ZodType` to its real runtime face (the `ZodType` swap is T-6PV4's). */
function asZod(schema) {
    return schema;
}
/** Unwrap `optional(spec)` to its inner spec. */
function innerOf(spec) {
    if (spec.kind === "optional")
        return innerOf(spec.spec);
    return spec;
}
/** The section/oneOf slots at one level that carry a `SectionOpts` (content / children). */
function contentSlots(specs) {
    const slots = [];
    for (const spec of specs) {
        const inner = innerOf(spec);
        if (inner.kind === "section") {
            const s = inner;
            if (s.opts)
                slots.push({ names: s.names, opts: s.opts });
        }
        else if (inner.kind === "oneOf") {
            const o = inner;
            if (o.opts)
                slots.push({ names: o.names, opts: o.opts });
        }
    }
    return slots;
}
/** The first doc section at this level whose name is in `names` (first-occurrence binds). */
function findSection(nodes, names) {
    return nodes.find((n) => names.includes(n.name));
}
/**
 * Walk one level: pair each content slot with the doc section filling it, validate that
 * section's content leaf(s), then recurse into declared children.
 */
function matchLevel(nodes, seq, ctx, out) {
    for (const slot of contentSlots(seq.specs)) {
        const node = findSection(nodes, slot.names);
        if (!node)
            continue; // absence is structure's concern (structure/section-missing)
        validateSectionContent(node, slot.opts, ctx, out);
        if (slot.opts.children)
            matchLevel(node.sections, slot.opts.children, ctx, out);
    }
}
/** Validate a section's content leaf(s): a single leaf, or named leaves bound by `^anchor`. */
function validateSectionContent(node, opts, ctx, out) {
    if (opts.content === undefined)
        return;
    if (isLeafSpec(opts.content)) {
        validateLeaf(node, opts.content, undefined, ctx, out);
    }
    else {
        for (const [anchor, leaf] of Object.entries(opts.content)) {
            validateLeaf(node, leaf, anchor, ctx, out);
        }
    }
}
/** Structural guard: a single `LeafSpec` vs a `Record<string, LeafSpec>`. */
function isLeafSpec(c) {
    return typeof c.kind === "string";
}
/**
 * The block a content slot addresses: when `anchor` is set, the block carrying that anchor;
 * otherwise the section's first block (a single-leaf slot owns the section's sole block).
 */
function pickBlock(node, anchor) {
    if (anchor !== undefined)
        return node.blocks.find((b) => b.anchor === anchor) ?? null;
    return node.blocks[0] ?? null;
}
/**
 * Validate one leaf against the block that fills it. The leaf runs ONLY when a block of the
 * expected kind is present (AC-4): an absent block (→ `structure/block-missing`) or a
 * wrong-kind block (→ `structure/block-kind`) is the structure plane's to report, so the
 * content plane stays silent and never double-reports.
 */
function validateLeaf(node, leaf, anchor, ctx, out) {
    const block = pickBlock(node, anchor);
    if (!block)
        return; // structure/block-missing
    if (block.kind !== leaf.kind)
        return; // structure/block-kind (AC-4)
    switch (leaf.kind) {
        case "table":
            validateTable(block, leaf.config, ctx, out);
            break;
        case "list":
            validateList(block, leaf.config, ctx, out);
            break;
        case "code":
            validateCode(block, leaf.config, ctx, out);
            break;
        case "paragraph":
            validateParagraph(block, leaf.config, ctx, out);
            break;
    }
}
// ── Table ─────────────────────────────────────────────────────────────────────────
/**
 * Validate a `table` block's data:
 *   - every declared column present in `node.columns`     → `content/table/column-missing`
 *   - `extraColumns: "error"` for each undeclared column  → `content/table/column-extra`
 *   - `minRows`                                            → `content/table/min-rows`
 *   - typed `cells` over each row's value, localized to    → `content/table/cell`
 *     the offending row via `node.rowPos(i)` (AC-5)
 * Each is independent; a table can fire several. Column / row-count findings pin the table's
 * header position; cell findings pin the offending row.
 */
function validateTable(node, cfg, ctx, out) {
    // Declared columns must all be present (one finding per missing column).
    for (const col of cfg.columns) {
        if (!node.columns.includes(col)) {
            out.push(ctx.finding({
                id: "content/table/column-missing",
                message: `table is missing declared column ‘${col}’`,
                pos: node.pos,
            }));
        }
    }
    // Extra (undeclared) columns, when locked with extraColumns: "error".
    if (cfg.extraColumns === "error") {
        for (const col of node.columns) {
            if (!cfg.columns.includes(col)) {
                out.push(ctx.finding({
                    id: "content/table/column-extra",
                    message: `table carries undeclared column ‘${col}’`,
                    pos: node.pos,
                }));
            }
        }
    }
    // Row-count floor.
    if (cfg.minRows !== undefined && node.rows.length < cfg.minRows) {
        out.push(ctx.finding({
            id: "content/table/min-rows",
            message: `table has ${node.rows.length} rows; expected at least ${cfg.minRows}`,
            pos: node.pos,
        }));
    }
    // Typed cells — run each declared cell schema over every row's value in that column.
    if (cfg.cells) {
        for (const [col, schema] of Object.entries(cfg.cells)) {
            const colIdx = node.columns.indexOf(col);
            if (colIdx === -1)
                continue; // a declared cell on a missing column → column-missing covers it
            const zod = asZod(schema);
            node.rows.forEach((row, i) => {
                const value = row[colIdx] ?? "";
                const res = zod.safeParse(value);
                if (!res.success) {
                    out.push(ctx.finding({
                        id: "content/table/cell",
                        message: `cell ‘${value}’ in column ‘${col}’ is invalid`,
                        pos: node.rowPos(i), // AC-5 — localize to the offending row
                    }));
                }
            });
        }
    }
}
// ── List ────────────────────────────────────────────────────────────────────────
/**
 * Validate a `list` block's data:
 *   - `everyItem: "checkbox"`  → every item carries `checked`, else `content/list/item-kind`
 *                                 per offending item (pinned to the item's source line)
 *   - `everyItem: ZodType`     → run the schema over each item's `text` → `content/list/item-kind`
 *   - `minItems`               → item-count floor → `content/list/min-items`
 */
function validateList(node, cfg, ctx, out) {
    if (cfg.everyItem === "checkbox") {
        for (const item of node.items) {
            if (item.checked === undefined) {
                out.push(ctx.finding({
                    id: "content/list/item-kind",
                    message: "list item is not a checkbox (‘- [ ]’ / ‘- [x]’)",
                    pos: item.pos,
                }));
            }
        }
    }
    else if (cfg.everyItem !== undefined) {
        const zod = asZod(cfg.everyItem);
        for (const item of node.items) {
            const res = zod.safeParse(item.text);
            if (!res.success) {
                out.push(ctx.finding({
                    id: "content/list/item-kind",
                    message: `list item ‘${item.text}’ is invalid`,
                    pos: item.pos,
                }));
            }
        }
    }
    if (cfg.minItems !== undefined && node.items.length < cfg.minItems) {
        out.push(ctx.finding({
            id: "content/list/min-items",
            message: `list has ${node.items.length} items; expected at least ${cfg.minItems}`,
            pos: node.pos,
        }));
    }
}
// ── Code ───────────────────────────────────────────────────────────────────────
/** Validate a `code` block's language matches the declared `lang` → `content/code/lang`. */
function validateCode(node, cfg, ctx, out) {
    if (cfg.lang === undefined)
        return;
    if (node.lang !== cfg.lang) {
        out.push(ctx.finding({
            id: "content/code/lang",
            message: `code block language ‘${node.lang ?? "(none)"}’ does not match required ‘${cfg.lang}’`,
            pos: node.pos,
        }));
    }
}
// ── Paragraph (maxWords) ──────────────────────────────────────────────────────────
/** Validate a `paragraph` block's word count ≤ `maxWords` → `content/max-words`. */
function validateParagraph(node, cfg, ctx, out) {
    const words = node.text.split(/\s+/).filter((w) => w.length > 0).length;
    if (words > cfg.maxWords) {
        out.push(ctx.finding({
            id: "content/max-words",
            message: `paragraph runs to ${words} words; expected at most ${cfg.maxWords}`,
            pos: node.pos,
        }));
    }
}
// ── Frontmatter ────────────────────────────────────────────────────────────────
/**
 * Map a Zod issue code to its frontmatter-plane finding id. The corpus's frontmatter ids
 * (E1 / 07a) are `frontmatter/enum`, `frontmatter/unknown-key`, `frontmatter/type`,
 * `frontmatter/required`; any other code falls back to `frontmatter/type`.
 */
function frontmatterIdFor(issue) {
    switch (issue.code) {
        case "invalid_enum_value":
        case "invalid_value": // zod v4 enum mismatch
            return "frontmatter/enum";
        case "unrecognized_keys":
            return "frontmatter/unknown-key";
        case "custom":
            // a `.refine()` / `.superRefine()` cross-field predicate (D-0001 E1, fixture 20a).
            return "frontmatter/refine";
        case "invalid_type":
            // zod v4 reports a missing required key as invalid_type (received undefined).
            return "frontmatter/type";
        default:
            return "frontmatter/type";
    }
}
/**
 * Validate the document frontmatter against a declared Zod schema, remapping each Zod issue
 * to its key's source line via `tree.frontmatter.lineForPath(issue.path)` (AC-5). When the
 * schema rejects an unrecognized key (a strict object), Zod reports one issue whose `keys`
 * list the offending keys; each is emitted as a `frontmatter/unknown-key` localized to that
 * key's line. A missing-required key surfaces as `frontmatter/required` (an `invalid_type`
 * whose received value is undefined). When no frontmatter block is present, the schema runs
 * over `{}` so required-key findings still fire.
 */
function matchFrontmatter(tree, schema, ctx, out) {
    const data = tree.frontmatter ? tree.frontmatter.data : {};
    const res = asZod(schema).safeParse(data);
    if (res.success || !res.error)
        return;
    const lineFor = (path) => {
        const line = tree.frontmatter?.lineForPath(path);
        return line !== undefined ? { line } : undefined;
    };
    for (const issue of res.error.issues) {
        // A strict-object rejection lists every offending key under `issue.keys`; emit one
        // unknown-key finding per key, each at that key's source line.
        if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
            for (const key of issue.keys) {
                const pos = lineFor([...issue.path, key]);
                out.push(ctx.finding({
                    id: "frontmatter/unknown-key",
                    message: `unknown frontmatter key ‘${key}’`,
                    ...(pos ? { pos } : {}),
                }));
            }
            continue;
        }
        // A missing required key reads as an invalid_type whose input is undefined.
        const id = issue.code === "invalid_type" && isMissingRequired(data, issue.path)
            ? "frontmatter/required"
            : frontmatterIdFor(issue);
        const pos = lineFor(issue.path);
        out.push(ctx.finding({
            id,
            message: issue.message ?? `frontmatter key ‘${issue.path.join(".")}’ is invalid`,
            ...(pos ? { pos } : {}),
        }));
    }
}
/** Whether the value addressed by `path` is absent from `data` (a missing required key). */
function isMissingRequired(data, path) {
    let node = data;
    for (const seg of path) {
        if (node === null || node === undefined || typeof node !== "object")
            return true;
        node = node[seg];
    }
    return node === undefined;
}
// ── Public entry ─────────────────────────────────────────────────────────────────
/**
 * Run the content plane: frontmatter Zod (if declared) plus every section's content leaf.
 * Returns findings in emission order; `validate()` applies the deterministic cross-plane sort.
 */
export function matchContent(tree, def, ctx) {
    const out = [];
    if (def.frontmatter !== undefined) {
        matchFrontmatter(tree, def.frontmatter, ctx, out);
    }
    if (def.body !== undefined) {
        matchLevel(tree.root.sections, def.body, ctx, out);
    }
    return out;
}
//# sourceMappingURL=content.js.map