/**
 * Corpus runner — config (globs → contracts) → aggregated findings across a tree
 * of documents. This is library API, NOT CLI-only, so other consumers (e.g. an
 * SDLC `entities validate`) reuse it without shelling out. It reads files and
 * returns data; it does not own argv or `process.exit`.
 *
 * Depends on `../core`; never imports from `../cli`. See
 * `provenance/d0014/review-checklist.md` (M·corpus-runner, L6).
 */

export type { CorpusConfig, RunStats } from "./corpus.js";
export { compileMatcher, defineConfig, runCorpus } from "./corpus.js";
