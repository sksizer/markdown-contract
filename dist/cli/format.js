const SARIF_SCHEMA = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json";
/**
 * The human report: one `"<path>:<line> <level> <id> — <message>"` line per finding,
 * grouped by file (files in first-seen order) with each file's findings in the order
 * the runner already sorted them. A finding with no `pos` prints without a `:line`.
 * A trailing summary line counts findings by level. An empty corpus reports "No findings."
 */
export function formatHuman(findings) {
    if (findings.length === 0)
        return "No findings.";
    // Group by file path, preserving first-seen order of the paths.
    const byPath = new Map();
    for (const f of findings) {
        const list = byPath.get(f.path);
        if (list)
            list.push(f);
        else
            byPath.set(f.path, [f]);
    }
    const lines = [];
    for (const [path, group] of byPath) {
        for (const f of group) {
            const loc = f.pos ? `${path}:${f.pos.line}` : path;
            lines.push(`${loc} ${f.level} ${f.id} — ${f.message}`);
        }
    }
    const counts = countByLevel(findings);
    const summary = `${findings.length} finding(s): ${counts.error} error, ${counts.warn} warn, ${counts.report} report`;
    lines.push("", summary);
    return lines.join("\n");
}
/**
 * The JSON report: the findings array serialized with two-space indent. The shape is
 * exactly the `Finding[]` the runner returns, so it round-trips through `JSON.parse`.
 */
export function formatJson(findings) {
    return JSON.stringify(findings, null, 2);
}
/** SARIF level mapping: error→"error", warn→"warning", report→"note". */
function sarifLevel(level) {
    switch (level) {
        case "error":
            return "error";
        case "warn":
            return "warning";
        case "report":
            return "note";
    }
}
/**
 * The SARIF 2.1.0 report. A single run whose `tool.driver` is `markdown-contract`;
 * `driver.rules` lists every distinct finding id seen (deduped), and each finding
 * becomes one `result` with its `ruleId`, mapped `level`, `message.text`, and a
 * `physicalLocation` pointing at the file (and `region.startLine` when the finding
 * has a `pos`; the region is omitted for whole-document findings). The whole object
 * round-trips through `JSON.parse` / `JSON.stringify`.
 */
export function formatSarif(findings) {
    // Distinct rule ids, in first-seen order, for the driver's rule descriptors.
    const ruleIds = [];
    const seen = new Set();
    for (const f of findings) {
        if (!seen.has(f.id)) {
            seen.add(f.id);
            ruleIds.push(f.id);
        }
    }
    const log = {
        version: "2.1.0",
        $schema: SARIF_SCHEMA,
        runs: [
            {
                tool: {
                    driver: {
                        name: "markdown-contract",
                        rules: ruleIds.map((id) => ({ id })),
                    },
                },
                results: findings.map((f) => {
                    const physicalLocation = {
                        artifactLocation: { uri: f.path },
                    };
                    if (f.pos)
                        physicalLocation.region = { startLine: f.pos.line };
                    return {
                        ruleId: f.id,
                        level: sarifLevel(f.level),
                        message: { text: f.message },
                        locations: [{ physicalLocation }],
                    };
                }),
            },
        ],
    };
    return JSON.stringify(log, null, 2);
}
function countByLevel(findings) {
    const counts = { error: 0, warn: 0, report: 0 };
    for (const f of findings)
        counts[f.level]++;
    return counts;
}
//# sourceMappingURL=format.js.map