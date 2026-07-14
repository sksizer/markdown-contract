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
    checkTableColumns(node, cfg, ctx, out);
    checkTableMinRows(node, cfg, ctx, out);
    checkTableCells(node, cfg, ctx, out);
}
/** Missing declared columns and (when `extraColumns: "error"`) undeclared columns. */
function checkTableColumns(node, cfg, ctx, out) {
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
}
/** Row-count floor → `content/table/min-rows`. */
function checkTableMinRows(node, cfg, ctx, out) {
    if (cfg.minRows !== undefined && node.rows.length < cfg.minRows) {
        out.push(ctx.finding({
            id: "content/table/min-rows",
            message: `table has ${node.rows.length} rows; expected at least ${cfg.minRows}`,
            pos: node.pos,
        }));
    }
}
/** Typed cells — run each declared cell schema over every row's value in that column. */
function checkTableCells(node, cfg, ctx, out) {
    if (!cfg.cells)
        return;
    for (const [col, schema] of Object.entries(cfg.cells)) {
        const colIdx = node.columns.indexOf(col);
        if (colIdx === -1)
            continue; // a declared cell on a missing column → column-missing covers it
        const zod = asZod(schema);
        node.rows.forEach((row, i) => {
            const value = row[colIdx] ?? "";
            const res = zod.safeParse(value);
            if (res.success) {
                // A1 — keep the parsed output (previously discarded) and cache it on the table node's
                // sparse typed overlay, from this SAME `safeParse` (no second Zod pass / traversal).
                node.setTyped(i, col, res.data);
            }
            else {
                out.push(ctx.finding({
                    id: "content/table/cell",
                    message: `cell ‘${value}’ in column ‘${col}’ is invalid`,
                    pos: node.rowPos(i), // AC-5 — localize to the offending row
                }));
            }
        });
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
        node.items.forEach((item, i) => {
            const res = zod.safeParse(item.text);
            if (res.success) {
                // A1 — keep the parsed output (previously discarded) and cache it on the list node's sparse
                // typed overlay, from this SAME `safeParse` (no second Zod pass), mirroring the table cell.
                node.setTypedItem(i, res.data);
            }
            else {
                out.push(ctx.finding({
                    id: "content/list/item-kind",
                    message: `list item ‘${item.text}’ is invalid`,
                    pos: item.pos,
                }));
            }
        });
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
/** Render a Zod issue path as a readable key reference: `[]` → "", `["a","b"]` → "a.b", `["related",0]` → "related[0]". */
function formatKeyPath(path) {
    let s = "";
    for (const seg of path) {
        if (typeof seg === "number")
            s += `[${seg}]`;
        else
            s += s === "" ? seg : `.${seg}`;
    }
    return s;
}
/** The JS type name of a value, for "(got number)" hints — distinguishing null and array from object. */
function typeName(v) {
    if (v === null)
        return "null";
    if (Array.isArray(v))
        return "array";
    return typeof v;
}
/** The value addressed by `path` within `data` (undefined when any segment is absent). */
function valueAt(data, path) {
    let node = data;
    for (const seg of path) {
        if (node === null || node === undefined || typeof node !== "object")
            return undefined;
        node = node[seg];
    }
    return node;
}
/**
 * Build a field-qualified message for a frontmatter Zod issue. Zod's own message names a
 * type or a literal but never the offending key, so a report reads "expected string, received
 * undefined" with no clue which field is wrong. Every message here instead leads with the
 * field — `frontmatter field ‘<key>’ …` — so the report names exactly what to fix.
 *
 * `id` is the already-resolved finding id, so a missing-required key (an `invalid_type` whose
 * value is undefined) reads "is required" rather than "must be a string". `data` is the parsed
 * frontmatter, used to report the actual type on a wrong-type mismatch (zod v4 drops `received`).
 */
function frontmatterMessage(issue, id, data) {
    const field = formatKeyPath(issue.path);
    const at = field ? `frontmatter field ‘${field}’` : "frontmatter";
    if (id === "frontmatter/required")
        return `${at} is required`;
    switch (issue.code) {
        case "invalid_enum_value": // zod v3 enum mismatch
        case "invalid_value":
            return invalidValueMessage(at, issue);
        case "invalid_type":
            return invalidTypeMessage(at, issue, data);
        case "invalid_format":
            return invalidFormatMessage(at, issue);
        case "too_small":
            return `${at} is too small`;
        case "too_big":
            return `${at} is too large`;
        case "custom":
            return customMessage(at, field, issue);
        default:
            return unhandledMessage(at, field, issue);
    }
}
/** zod v4 literal/enum mismatch — `values` is the allowed set (one entry for a literal). */
function invalidValueMessage(at, issue) {
    const values = Array.isArray(issue.values) ? issue.values : [];
    if (values.length === 1)
        return `${at} must be ‘${String(values[0])}’`;
    if (values.length > 1)
        return `${at} must be one of ${values.map((v) => `‘${String(v)}’`).join(", ")}`;
    return `${at} has an invalid value`;
}
/** A wrong-type mismatch — name the expected type and the actual type (zod v4 drops `received`). */
function invalidTypeMessage(at, issue, data) {
    const got = typeName(valueAt(data, issue.path));
    return issue.expected
        ? `${at} must be a ${issue.expected} (got ${got})`
        : `${at} has the wrong type (got ${got})`;
}
/** A `pattern` / `format` constraint (D-0008 schema vocabulary) — name the format, else "pattern". */
function invalidFormatMessage(at, issue) {
    return issue.format && issue.format !== "regex"
        ? `${at} is not a valid ${issue.format}`
        : `${at} does not match the required pattern`;
}
/**
 * A `.refine()` / `.superRefine()` predicate speaks its own rule — keep its message,
 * field-qualified when it addresses a key, verbatim when it is document-level.
 */
function customMessage(at, field, issue) {
    return field && issue.message ? `${at}: ${issue.message}` : (issue.message ?? `${at} is invalid`);
}
/** An unhandled Zod code: lead with the field but keep Zod's detail rather than discard it. */
function unhandledMessage(at, field, issue) {
    return field
        ? `${at}: ${issue.message ?? "is invalid"}`
        : (issue.message ?? "frontmatter is invalid");
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
        // A strict-object rejection lists every offending key under `issue.keys`; each becomes its
        // own unknown-key finding. Anything else is a generic field issue.
        if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
            emitUnknownKeys(issue, lineFor, ctx, out);
        }
        else {
            emitFrontmatterIssue(issue, data, lineFor, ctx, out);
        }
    }
}
/** Emit one `frontmatter/unknown-key` per offending key, each at that key's source line. */
function emitUnknownKeys(issue, lineFor, ctx, out) {
    for (const key of issue.keys ?? []) {
        const pos = lineFor([...issue.path, key]);
        out.push(ctx.finding({
            id: "frontmatter/unknown-key",
            message: `unknown frontmatter key ‘${key}’`,
            ...(pos ? { pos } : {}),
        }));
    }
}
/** Emit one finding for a generic frontmatter issue (required / type / enum / …), at its key's line. */
function emitFrontmatterIssue(issue, data, lineFor, ctx, out) {
    // A missing required key reads as an invalid_type whose input is undefined.
    const id = issue.code === "invalid_type" && isMissingRequired(data, issue.path)
        ? "frontmatter/required"
        : frontmatterIdFor(issue);
    const pos = lineFor(issue.path);
    out.push(ctx.finding({
        id,
        message: frontmatterMessage(issue, id, data),
        ...(pos ? { pos } : {}),
    }));
}
/** Whether the value addressed by `path` is absent from `data` (a missing required key). */
function isMissingRequired(data, path) {
    return valueAt(data, path) === undefined;
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