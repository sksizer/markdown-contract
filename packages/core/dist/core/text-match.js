// ── The pure matcher ─────────────────────────────────────────────────────────────────
/** Escape every regex metacharacter in a literal so it matches itself. */
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Turn a literal pattern into a regex source whose internal whitespace runs match any run of
 * whitespace — so a phrase wrapped across a line (a newline + indentation between words) still
 * matches. Leading / trailing whitespace is dropped; each word is escaped literally.
 */
function normalizedPatternSource(pattern) {
    const trimmed = pattern.trim();
    if (trimmed === "")
        return "";
    return trimmed.split(/\s+/).map(escapeRegex).join("\\s+");
}
/** Map a 0-based character offset in `text` to a 1-based { line, col } source position. */
function offsetToPos(text, offset) {
    let line = 1;
    let lastNewline = -1;
    for (let i = 0; i < offset; i++) {
        if (text[i] === "\n") {
            line++;
            lastNewline = i;
        }
    }
    return { line, col: offset - lastNewline };
}
/**
 * Match a spec against `text`, returning the occurrence count and each hit's source position.
 * A literal `pattern` is matched with `normalize` (default true → whitespace-run flexible) or
 * exactly (`normalize: false`); a `regex` is matched as given. `ignoreCase` folds case in both.
 * Matching is over the raw text including code spans and fenced blocks (D-0011). Throws when
 * the spec supplies neither `pattern` nor `regex`.
 */
export function matchText(text, spec) {
    let source;
    if (spec.regex !== undefined) {
        source = spec.regex;
    }
    else if (spec.pattern !== undefined) {
        const normalize = spec.normalize ?? true;
        source = normalize ? normalizedPatternSource(spec.pattern) : escapeRegex(spec.pattern);
    }
    else {
        throw new Error("matchText: a spec must supply one of `pattern` or `regex`");
    }
    // An empty needle never matches (avoids a zero-width regex looping over every position).
    if (source === "")
        return { count: 0, positions: [] };
    const flags = spec.ignoreCase ? "gi" : "g";
    const re = new RegExp(source, flags);
    const positions = [];
    let m;
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex.exec iteration
    while ((m = re.exec(text)) !== null) {
        positions.push(offsetToPos(text, m.index));
        // Guard against a zero-width match (e.g. a `regex` that can match empty) looping forever.
        if (m.index === re.lastIndex)
            re.lastIndex++;
    }
    return { count: positions.length, positions };
}
// ── Stable finding-id synthesis ──────────────────────────────────────────────────────
/** A short, stable, deterministic hash (FNV-1a → base36). No crypto dep; pure. */
function shortHash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
}
/**
 * The canonical identity of a spec's *matcher* — what the synthesized id hashes over. It folds in
 * the needle (the normalized literal, or the regex source) and the flags that change what matches
 * (`normalize`, `ignoreCase`), so two genuinely different checks get different ids while the same
 * check is stable across reordering. The count bound (`min` / `max`) is deliberately NOT part of
 * the key — it changes the finding *message*, not which text the entry is about.
 */
function patternKey(spec) {
    const fold = spec.ignoreCase ? "i" : "";
    if (spec.regex !== undefined)
        return `regex|${spec.regex}|${fold}`;
    const normalize = spec.normalize ?? true;
    const needle = normalize
        ? (spec.pattern ?? "").trim().replace(/\s+/g, " ")
        : (spec.pattern ?? "");
    return `pattern|${normalize ? "n" : "x"}|${needle}|${fold}`;
}
/**
 * The stable finding id for one text-constraint entry: `text/<kind>/<scopeKey>/<patternHash>`,
 * where `patternHash` is a short hash of the spec's normalized pattern. It is stable across entry
 * REORDERING (not index-based) and unique across scopes; it changes only when the section is
 * renamed (`scopeKey`) or the pattern is edited. An entry that sets an explicit `id` gets exactly
 * that id back (pinning identity across pattern edits).
 */
export function synthesizeTextId(kind, scopeKey, spec) {
    if (spec.id !== undefined)
        return spec.id;
    return `text/${kind}/${scopeKey}/${shortHash(patternKey(spec))}`;
}
// ── The finding-builder ──────────────────────────────────────────────────────────────
/** The needle as it reads in a finding message — `"literal"` for a pattern, `/source/` for a regex. */
function specRepr(spec) {
    if (spec.regex !== undefined)
        return `/${spec.regex}/`;
    return `"${spec.pattern ?? ""}"`;
}
/** A human label for the scope a finding fires in — `doc` renders as `document`. */
function scopeLabel(scopeKey, scope) {
    if (scope !== undefined)
        return scope;
    return scopeKey === "doc" ? "document" : scopeKey;
}
/** The count bound the builder evaluates against, with the kind's defaults applied. */
function boundsFor(kind, spec) {
    if (kind === "requires")
        return { min: spec.min ?? 1, max: spec.max };
    return { min: spec.min ?? 0, max: spec.max ?? 0 };
}
/**
 * Turn one entry's match result into its findings (D-0011 § Findings and positions):
 *
 *   - `requires` with no hit (`min: 1`) → one `text/requires` "required phrase … not found in …",
 *     positioned at `scopePos` (the section heading) or document-level when `scopePos` is omitted.
 *   - `forbids` with hits (`max: 0`) → one `text/forbids` "forbidden phrase … present" PER hit,
 *     each positioned at the offending match's line.
 *   - a `min` / `max` bound violation (a `requires` shortfall, or any `max` overflow) → one
 *     `text/count` "… found N times, expected …", positioned at `scopePos`.
 *
 * Each message gets the spec's `note` appended. `level` rides from the spec when set, else the
 * registry default (`error`) via `ctx.finding`. A satisfied entry yields no findings.
 */
export function buildTextFindings(input) {
    const { kind, spec } = input;
    const { min, max } = boundsFor(kind, spec);
    const derived = {
        ...input,
        min,
        max,
        repr: specRepr(spec),
        note: spec.note ? ` — ${spec.note}` : "",
    };
    return kind === "requires" ? requiresFindings(derived) : forbidsFindings(derived);
}
/** A `text/count` finding (`… found N times, expected …`), pinned at the scope heading. */
function countFinding(d, expected) {
    return d.ctx.finding({
        id: synthesizeTextId("count", d.scopeKey, d.spec),
        level: d.spec.level,
        message: `${d.repr} found ${d.match.count} times, expected ${expected}${d.note}`,
        pos: d.scopePos,
    });
}
/** The `requires` findings: a `text/requires` miss (`min: 1`), else a `text/count` bound violation. */
function requiresFindings(d) {
    const count = d.match.count;
    if (count < d.min) {
        if (d.min === 1) {
            return [
                d.ctx.finding({
                    id: synthesizeTextId("requires", d.scopeKey, d.spec),
                    level: d.spec.level,
                    message: `required phrase ${d.repr} not found in ${scopeLabel(d.scopeKey, d.scope)}${d.note}`,
                    pos: d.scopePos,
                }),
            ];
        }
        return [countFinding(d, `at least ${d.min}`)];
    }
    if (d.max !== undefined && count > d.max) {
        return [countFinding(d, `at most ${d.max}`)];
    }
    return [];
}
/** The `forbids` findings: a `text/forbids` per hit (`max: 0`), else a `text/count` overflow. */
function forbidsFindings(d) {
    const max = d.max ?? 0;
    if (d.match.count <= max)
        return [];
    if (max === 0) {
        return d.match.positions.map((pos) => d.ctx.finding({
            id: synthesizeTextId("forbids", d.scopeKey, d.spec),
            level: d.spec.level,
            message: `forbidden phrase ${d.repr} present${d.note}`,
            pos,
        }));
    }
    return [countFinding(d, `at most ${max}`)];
}
//# sourceMappingURL=text-match.js.map