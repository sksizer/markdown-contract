/**
 * Every source line occupied by a fenced code block — opening fence through closing fence,
 * inclusive — sourced from `tree.mdast` so code nested in lists / blockquotes is included
 * (heading-direct `SectionNode.blocks` misses those). A `##` / `|` / placeholder line inside a
 * fence is thereby opaque to a raw-line scan.
 */
export function codeBlockLines(tree) {
    const lines = new Set();
    const walk = (node) => {
        if (node.type === "code") {
            const pos = node.position;
            if (pos)
                for (let l = pos.start.line; l <= pos.end.line; l++)
                    lines.add(l);
            return;
        }
        if (node.children)
            for (const child of node.children)
                walk(child);
    };
    walk(tree.mdast);
    return lines;
}
/**
 * Every table row line — each table's header line (`table.pos.line`) plus every data-row line
 * (`table.rowPos(i).line`) — recursive over the section tree. The separator row is absent (the
 * projection forms no data row for it). These are the lines a table-cell scanner inspects.
 */
export function tableRowLines(root) {
    const lines = new Set();
    const walk = (nodes) => {
        for (const s of nodes) {
            for (const b of s.blocks) {
                if (b.kind === "table") {
                    lines.add(b.pos.line);
                    for (let i = 0; i < b.rows.length; i++)
                        lines.add(b.rowPos(i).line);
                }
            }
            walk(s.sections);
        }
    };
    walk(root.sections);
    return lines;
}
//# sourceMappingURL=block-lines.js.map