/**
 * Code (TypeScript) artifact verification — typechecks every snippet against the REAL
 * `markdown-contract` build (the workspace package's dist types), so a removed export,
 * changed signature, or wrong argument shape in a snippet fails the check.
 *
 * Level of verification (see check-artifacts.ts for the full policy): each snippet is
 * written to a scratch module (`export {}` appended) and compiled with strict TS
 * (module NodeNext, target ES2022) resolving `markdown-contract` to the workspace
 * build. Catalog snippets are narrative — many deliberately reuse values (`c`, `src`,
 * `doc`, …) introduced by an EARLIER rung without redeclaring or re-importing them —
 * so a fixed set of diagnostics is tolerated:
 *
 *   TS2304/TS2552  cannot find name           — free identifiers carried from context
 *   TS2307         cannot find module         — ONLY for specifiers other than
 *                                               `markdown-contract*` (e.g. `vitest`,
 *                                               a relative `./markdown-contract.config.js`)
 *   TS2571/TS18046 value is of type 'unknown' — `doc.body` navigation: `Infer` is
 *                                               documented as top-level-only (see
 *                                               core/types.ts), so body keys type as
 *                                               unknown; the package's own fixtures
 *                                               navigate via `as any`
 *   TS2532/TS18047/TS18048 possibly null/undefined — snippets deliberately elide
 *                                               null guards for brevity (e.g. reading
 *                                               `tree.frontmatter.data` on a doc shown
 *                                               to have frontmatter)
 *   TS7006         implicit-any parameter     — a downstream consequence of the above
 *
 * Everything else — TS2305 (no exported member), TS2554 (wrong arity), TS2345 (bad
 * argument), syntax errors, … — fails. Consequence, stated honestly: snippets that
 * import from `markdown-contract` get real API-surface checking; expressions rooted
 * in free identifiers are only syntax-checked.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const TOLERATED = new Set([2304, 2552, 2571, 18046, 2532, 18047, 18048, 7006]);
const CANNOT_FIND_MODULE = 2307;

const COMPILER_OPTIONS: ts.CompilerOptions = {
	strict: true,
	noEmit: true,
	skipLibCheck: true,
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.NodeNext,
	moduleResolution: ts.ModuleResolutionKind.NodeNext,
	types: ["node"],
};

/** Whether a TS2307 refers to the package under test (never tolerated) or environment. */
function missingModuleIsMarkdownContract(text: string): boolean {
	return /Cannot find module 'markdown-contract/.test(text);
}

/**
 * Typecheck a batch of snippets in one program. Returns a map of example id →
 * disqualifying diagnostics (empty list = pass). `scratchDir` is created fresh
 * and removed afterwards; it must live INSIDE the workspace so `markdown-contract`
 * resolves through node_modules.
 */
export function checkCodeArtifacts(
	snippets: ReadonlyArray<{ id: string; artifact: string }>,
	scratchDir: string,
): Map<string, string[]> {
	rmSync(scratchDir, { recursive: true, force: true });
	mkdirSync(scratchDir, { recursive: true });

	const fileForId = new Map<string, string>();
	for (const { id, artifact } of snippets) {
		const file = resolve(scratchDir, `${id.toLowerCase()}.ts`);
		// `export {}` forces module scope so sibling snippets' names never collide.
		writeFileSync(file, `${artifact}\nexport {};\n`);
		fileForId.set(file, id);
	}

	const program = ts.createProgram([...fileForId.keys()], COMPILER_OPTIONS);
	const diagnostics = [
		...program.getSyntacticDiagnostics(),
		...program.getSemanticDiagnostics(),
	];

	const failures = new Map<string, string[]>(snippets.map(({ id }) => [id, []]));
	for (const d of diagnostics) {
		const id = d.file ? fileForId.get(resolve(d.file.fileName)) : undefined;
		if (!id) continue;
		const text = ts.flattenDiagnosticMessageText(d.messageText, " ");
		if (TOLERATED.has(d.code)) continue;
		if (d.code === CANNOT_FIND_MODULE && !missingModuleIsMarkdownContract(text)) continue;
		const line =
			d.file && d.start !== undefined
				? d.file.getLineAndCharacterOfPosition(d.start).line + 1
				: 0;
		failures.get(id)?.push(`TS${d.code} (snippet line ${line}): ${text}`);
	}

	rmSync(scratchDir, { recursive: true, force: true });
	return failures;
}
