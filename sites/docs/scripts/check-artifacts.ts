/**
 * Artifact regression check (T-SITE AC-4) — verifies every SHIPPED catalog example's
 * `artifact` (docs/catalog/*.yaml) against the real CLI / library build so the
 * published snippets stay honest. Run via `bun run check-artifacts` or
 * `moon run docs:check-artifacts` (which builds packages/core first). Exits non-zero
 * on any unexpected failure or stale known-failure entry.
 *
 * ── Exact verification level per artifact_kind (read this before trusting a pass) ──
 *
 * cli    Every `markdown-contract …` command line in the artifact is verified against
 *        the REAL built CLI's `--help` output: the subcommand must exist and every
 *        `--flag` must be in the usage surface. The commands are NOT executed and
 *        their transcribed output is NOT diffed — the catalog's invocations reference
 *        fixture trees (./decisions, ./notes, …) that the artifacts do not embed, so
 *        there is nothing self-contained to run. An artifact citing no command fails.
 *
 * yaml   Parsed, then compiled through the REAL declarative front-end
 *        (`markdown-contract/declarative` from the packages/core build):
 *        `kind: contract` docs via loadContract; `kind: config` docs (and bare
 *        `rules:` fragments) via loadConfig with stub files written for referenced
 *        `*.contract.yaml` paths (the referenced files live outside the artifact, so
 *        only the config itself is verified); `frontmatter:`/`body:`/section-list
 *        fragments via compileContractObject. GitHub-Actions step lists are
 *        parse-validated and any `markdown-contract` line in `run:` gets the cli
 *        check. Semantic validation is real; nothing is executed against a corpus.
 *
 * code   Typechecked (strict, module NodeNext) against the real package's dist
 *        types, so removed exports, wrong arities, and bad argument shapes fail.
 *        Narrative snippets reuse identifiers from earlier rungs, so free names,
 *        non-`markdown-contract` module specifiers, and `unknown`-typed `doc.body`
 *        navigation are tolerated — see scripts/checks/code.ts for the precise
 *        diagnostic list and the consequence: snippets are compile-verified, not
 *        executed, and expressions rooted in free identifiers are only syntax-checked.
 *
 * mixed  Only the embedded `markdown-contract …` command lines (if any) are verified,
 *        exactly as for `cli`. The markdown/TS/YAML portions of a mixed artifact are
 *        NOT machine-verified; an artifact with no command line is reported as
 *        "skipped" and counts as neither pass nor failure.
 *
 * Examples with `status: planned` (unshipped capabilities) are EXCLUDED and reported
 * as skipped. Failures expected until the data is corrected upstream live in
 * scripts/checks/known-failures.ts with reasons; a listed example that starts
 * passing fails the run (stale baseline), so tolerance can only shrink.
 */
import { rmSync } from "node:fs";
import { resolve } from "node:path";

import { REPO_ROOT, isPlanned, loadCatalog } from "./catalog.js";
import { checkCliArtifact, loadHelpSurface } from "./checks/cli.js";
import { checkCodeArtifacts } from "./checks/code.js";
import { KNOWN_FAILURES } from "./checks/known-failures.js";
import { checkYamlArtifact } from "./checks/yaml.js";

const CLI_PATH = resolve(REPO_ROOT, "packages/core/dist/cli/index.js");
const SCRATCH_DIR = resolve(import.meta.dirname, "../.artifact-check");

interface Result {
	id: string;
	kind: string;
	status: "pass" | "fail" | "skip";
	notes: string[];
}

const verdict = (id: string, kind: string, errors: string[]): Result => ({
	id,
	kind,
	status: errors.length ? "fail" : "pass",
	notes: errors,
});

const skipped = (id: string, kind: string, note: string): Result => ({
	id,
	kind,
	status: "skip",
	notes: [note],
});

/** Dispatch every catalog example to its kind's checker; `code` runs as one batch. */
function collectResults(help: ReturnType<typeof loadHelpSurface>): Result[] {
	const results: Result[] = [];
	const codeBatch: { id: string; artifact: string }[] = [];

	for (const category of loadCatalog()) {
		for (const example of category.examples) {
			const { id, artifact, artifact_kind: kind } = example;
			if (isPlanned(example)) {
				results.push(skipped(id, kind, "planned — capability not shipped"));
			} else if (kind === "cli") {
				results.push(verdict(id, kind, checkCliArtifact(artifact, help, true)));
			} else if (kind === "yaml") {
				results.push(
					verdict(id, kind, checkYamlArtifact(artifact, resolve(SCRATCH_DIR, id.toLowerCase()), help)),
				);
			} else if (kind === "code") {
				codeBatch.push({ id, artifact });
			} else {
				const hasCommand = /(^|\n)\s*(\$\s+)?(npx\s+|bunx\s+)?markdown-contract\s/.test(artifact);
				results.push(
					hasCommand
						? verdict(id, kind, checkCliArtifact(artifact, help, false))
						: skipped(id, kind, "mixed artifact with no command line — not machine-verified"),
				);
			}
		}
	}

	// One TS program for all code snippets (fast, and diagnostics stay per-file).
	const codeFailures = checkCodeArtifacts(codeBatch, resolve(SCRATCH_DIR, "code"));
	for (const { id } of codeBatch) {
		results.push(verdict(id, "code", codeFailures.get(id) ?? []));
	}
	return results;
}

/** Split failures by the known-failures baseline; flag stale (now-passing) entries. */
function reconcile(results: Result[]): { unexpected: Result[]; tolerated: Result[]; stale: string[] } {
	const known = new Set(KNOWN_FAILURES.map((k) => k.id));
	const failures = results.filter((r) => r.status === "fail");
	return {
		unexpected: failures.filter((r) => !known.has(r.id)),
		tolerated: failures.filter((r) => known.has(r.id)),
		stale: results.filter((r) => r.status !== "fail" && known.has(r.id)).map((r) => r.id),
	};
}

function report(
	results: Result[],
	{ unexpected, tolerated, stale }: ReturnType<typeof reconcile>,
): void {
	const reasons = new Map(KNOWN_FAILURES.map((k) => [k.id, k.reason]));
	const passed = results.filter((r) => r.status === "pass").length;
	const skips = results.filter((r) => r.status === "skip");
	console.log(
		`check-artifacts: ${results.length} artifact(s) — ${passed} passed, ` +
			`${tolerated.length} known failure(s), ${unexpected.length} unexpected failure(s), ${skips.length} skipped`,
	);
	for (const r of skips) console.log(`  SKIP ${r.id} [${r.kind}] — ${r.notes.join("; ")}`);
	for (const r of tolerated) {
		console.log(`  KNOWN-FAIL ${r.id} [${r.kind}] — ${reasons.get(r.id)}`);
		for (const n of r.notes) console.log(`    ${n}`);
	}
	for (const r of unexpected) {
		console.error(`  FAIL ${r.id} [${r.kind}]`);
		for (const n of r.notes) console.error(`    ${n}`);
	}
	for (const id of stale) {
		console.error(`  STALE known-failure entry: ${id} now passes — remove it from known-failures.ts`);
	}
}

function main(): number {
	rmSync(SCRATCH_DIR, { recursive: true, force: true });
	const results = collectResults(loadHelpSurface(CLI_PATH));
	const outcome = reconcile(results);
	report(results, outcome);
	rmSync(SCRATCH_DIR, { recursive: true, force: true });
	return outcome.unexpected.length > 0 || outcome.stale.length > 0 ? 1 : 0;
}

process.exit(main());
