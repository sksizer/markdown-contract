/**
 * Corpus runner — config (globs → contracts) → aggregated findings across a tree
 * of documents, plus a CI-meaningful exit code (C-0003). Library API, not CLI-only:
 * other consumers reuse it in-process rather than shelling out. Reads files and
 * returns data; never owns argv or `process.exit`.
 *
 * Depends on `../core`; never imports from `../cli`. The traversal walks the tree
 * from `cwd`, matches each file against the config's `include`/`exclude` globs
 * (via `picomatch`), and runs the FIRST matching rule's contract over it
 * (first-match for determinism — see `runCorpus`).
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import picomatch from "picomatch";
/**
 * Identity helper that types a config for `markdown-contract.config.{js,mjs}`.
 * Passthrough is correct here — its only job is to attach the `CorpusConfig` type
 * at the call site so authors get completion and checking on their config literal.
 */
export function defineConfig(config) {
    return config;
}
/** picomatch options — `dot` so dotfiles match like any other file. */
const PICOMATCH_OPTS = { dot: true };
function compile(config) {
    return config.rules.map((r) => ({
        include: picomatch(r.include, PICOMATCH_OPTS),
        exclude: r.exclude && r.exclude.length > 0 ? picomatch(r.exclude, PICOMATCH_OPTS) : null,
        contract: r.contract,
    }));
}
/** Normalize a path to POSIX separators so globs match the same on every platform. */
function toPosix(p) {
    return sep === "/" ? p : p.split(sep).join("/");
}
/**
 * Recursively collect every file under `root`, returned as paths RELATIVE to `root`
 * with POSIX separators (so they feed both the glob matchers and `ctx.path`). The
 * walk is deterministic: directory entries are sorted before recursion. Synchronous
 * so `runCorpus` stays a plain synchronous library call.
 */
function walkSync(root) {
    const out = [];
    const recur = (absDir, relDir) => {
        const entries = readdirSync(absDir, { withFileTypes: true });
        entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
        for (const entry of entries) {
            const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
            if (entry.isDirectory())
                recur(resolve(absDir, entry.name), rel);
            else if (entry.isFile())
                out.push(rel);
        }
    };
    recur(root, "");
    return out;
}
/**
 * Run a config across a document tree and aggregate findings, returning a
 * CI-meaningful exit code.
 *
 * Traversal: walk every file under `cwd` (default `process.cwd()`). For each file,
 * find the FIRST rule whose `include` matches and whose `exclude` does not, and
 * validate the file against that rule's contract. First-match (not multi-match) is
 * deliberate: it makes the run deterministic and lets a config place a specific
 * rule ahead of a catch-all without a file being double-reported. A file that
 * matches no rule is skipped.
 *
 * Each file is read and validated via `contract.validate(source, { path })` where
 * `path` is the file's path relative to `cwd` (POSIX-separated); the engine stamps
 * that path onto every finding, so findings already carry their file location and
 * are deterministically sorted within the file.
 *
 * Exit-code policy (AC-2): `0` when no `error`-level finding exists across the whole
 * corpus, `1` when any `error`-level finding is present. `2` is reserved for
 * usage/config errors and is raised by the CLI layer, never here — this function
 * only ever returns `0` or `1`, so the CLI can layer `2` on top.
 */
export function runCorpus(config, opts) {
    const root = resolve(opts?.cwd ?? process.cwd());
    const rules = compile(config);
    const findings = [];
    const files = walkSync(root);
    for (const rel of files) {
        const posixRel = toPosix(rel);
        const match = rules.find((r) => r.include(posixRel) && !(r.exclude && r.exclude(posixRel)));
        if (!match)
            continue;
        const source = readFileSync(resolve(root, rel), "utf8");
        const result = match.contract.validate(source, { path: posixRel });
        findings.push(...result.findings);
    }
    const hasError = findings.some((f) => f.level === "error");
    return { findings, exitCode: hasError ? 1 : 0 };
}
//# sourceMappingURL=corpus.js.map