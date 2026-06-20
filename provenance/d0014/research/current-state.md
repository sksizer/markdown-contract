> Research appendix for [[D-0014-markdown-structure-validation|D-0014]] — current-state synthesis (map phase: six subsystem agents, 2026-06-06). Input to the decision; where this and D-0014 differ, D-0014 is authoritative.

# Markdown structure validation in SDLC — current state

This document merges six subsystem maps (lib-model-core, services-ops-cli, skills,
templates-contracts, planning-corpus, downstream) into one authoritative picture of how the SDLC
plugin validates the *structure* of its markdown documents today. Repo root:
`/Users/sksizer2/Developer/dev` (worktree `markdown-validation-adr` @ `main`). All paths are
repo-relative. Where maps conflicted, the more specific file:line citation wins and the conflict is
noted inline.

The single load-bearing finding all six maps converge on: **one real markdown AST parser exists
(`plugin/lib/util/markdown_extract.ts`, remark/mdast), it explicitly names this ADR's seed backlog
item ([[B-8FL9]]) in its own docstring (`:5-9`), yet every validation/gate engine bypasses it for
hand-rolled line-scanners** — producing ~7 copies of the frontmatter regex, 4-6 reimplemented
fence-aware section walkers, 3 ajv setups, and 3 hand-maintained section-alias tables that can
silently drift.

---

## A. Validation inventory (master table)

Deduped across all six maps, grouped by mechanism. "Doc types": the 9 entity types are
decision/standard/principle/milestone/task/backlog/capability/driver/product. Severity terms (error
/ warn-then-autofix / report-only-finding) are normalized.

### A.1 Real-parser checks (ajv JSON-Schema, remark/mdast, mmdc, Astro/zod)

| # | What is checked | Engine | Where (file:line) | Scope | Failure mode |
|---|---|---|---|---|---|
| 1 | Frontmatter conforms to per-type JSON Schema (type `const`, id `pattern`, status enum, required, `additionalProperties:false`, `if/then` conditionals, `useDefaults` synthesizes `tags:[]` before required-check) | ajv Draft 2020-12 (`Ajv2020`, `strict:false, allErrors:true, useDefaults:true` + `ajv-formats`) | `entity.ts:291-340` (`validateFrontmatter`); `model/ops/validate.ts:131-220`; `model/ops/audit.ts:229-268` | all 9 | error (exit 1; `FAIL <path>` + `at <loc>:`) |
| 2 | `_common.json` `$ref` resolved (inline object merge, NOT ajv `$ref`) before validation | hand-rolled merge | `entity.ts:140-243` (`resolveSchema`/`loadEntitySchema`) | all 9 | error if fragment unreadable |
| 3 | schema.json is itself a structurally valid Draft 2020-12 schema | `ajv.compile` | `.claude/skills/project-check/check_entities.ts:195-202` | all 9 | error |
| 4 | `^summary` block-id present (for index transclusion) | regex `hasBlockId` `/(?:^\|\s)\^id\s*$/m` on mdast/text | `util/markdown_extract.ts:120-123`; consumed `services/index/generate.ts:145-147` | catalogued entities | **silent** — blank index cell ("defect to fix at source") |
| 5 | `docs/skills/<slug>.md` mermaid blocks parse | `mmdc` subprocess | `.claude/skills/project-check/check_skill_docs.ts:64,151-213`; `lefthook.yml:109-115` | `docs/skills/*.md` | error (MERMAID); **auto-skips silently if `mmdc` absent** |
| 6 | Site page frontmatter satisfies Starlight `docsSchema()` (title/description strings) | Astro content layer + zod | `site/src/content.config.ts:6`; `npm --prefix site run build` | `site/src/content/docs/**` | error — build fails citing file/field |
| 7 | Index generation reads entities via real AST (the ONE place mdast is consumed) | remark/mdast via `unified` | `util/markdown_extract.ts:44`; `services/index/generate.ts` | catalogued entities | n/a (output side) |

### A.2 Regex / line-scan checks (hand-rolled, the dominant mechanism)

| # | What is checked | Where (file:line) | Scope | Failure mode |
|---|---|---|---|---|
| 8 | Leading `---…---` frontmatter present + parses to a YAML **mapping** | `FRONTMATTER_RE` + `yaml.parse`, defined independently at `entity.ts:48`, `validate.ts:55`, `audit.ts:50`, `migrate.ts:41`, `markdown_extract.ts:77`, `scan-placeholders.ts:27`, `parse-touchpoints.ts:26`, `identifier.ts:257`, `claims/paths.ts:38`, `quantifiers.ts:33`, `scan_corpus_assumptions.ts:54`, `check_entities.ts:72` | all 9 | parse error (drift kind `parse`) |
| 9 | Required H2 sections present; alias→canonical resolution; unknown-H2 rejection (gated on `allow_unknown:false`) | `entity.ts:342-392` (`validateBody`) + `extractH2Headings` `:446-474`, over `body-schema.yaml` | all 9 | error at author-time; **drift kind `prose` (NON-serious, exit 0) at audit** |
| 10 | `schema_version` drift (missing / older-than-current; auto-fixability via on-disk migration chain `migrations/v<n>-to-v<n+1>.ts`) | `audit.ts:336-366,472-499` | all 9 | warn→autofix |
| 11 | Cross-file `depends_on` graph: broken edges + cycles (regex `DEPENDS_ON_TARGET_RE` + DFS) | `audit.ts:51-52,541-740` | **task only** (one map said "task, epic" — `audit.ts:541-740` is task-scoped; epic not present on branch) | drift `depends_on`; serious → exit 1 |
| 12 | id/filename canonical shape `AA-NNNN[-slug].md`; frontmatter-id == filename-id; duplicate ids; missing id | `identifier.ts:49-52,202-274` (`findIdentifierViolations`); op `check-identifiers.ts` | 6 prefixed types (B exempt from id-missing) | error (4 violation kinds; gate exit ≠0) |
| 13 | Task body placeholder scan: `TBD`, `(final name…)`, `(or final…)`, `(pick one)`, `<…>`, empty table cells; inline-code masked, fences skipped; **only REQUIRED sections** | `scan-placeholders.ts:57-196` (patterns `:57-63`) | task | report findings → readiness gate disqualifier |
| 14 | Task touchpoint tables (`## Today` 2-col, `## Files to touch` 3-col): shape (table/prose/missing/bulleted-legacy), column count, Location 5-form grammar (file/symbol#/line:/dir//glob), Kind ∈ new/modify/delete, symbol-on-glob rejected | `parse-touchpoints.ts:87-395` (shape `:146-191`, grammar `:289-331`) | task | per-row `errors[]`; **op always exits 0**, consumer gates |
| 15 | Cited back-ticked path whose basename moved (moved-file detection) | `claims/paths.ts:44-210` | task | finding `disqualifier` |
| 16 | Vacuous universal-quantifier ACs ("every/each/all/sibling" with no pinned set); ACs are `- [ ] AC-N:` checkboxes | `claims/quantifiers.ts:35-55,116-145` | task | `disqualifier` |
| 17 | Claim resolvers aggregate (paths + quantifiers) via registry | `claims/check-claims.ts:48-84`; registry `claims/index.ts` | task | findings keyed by resolver |
| 18 | Task-state frontmatter fields (`status:`/`readiness_verified_at:`) changed only on `main`, not on `task/*` branch | `lint-state-origin.ts` (+ `_lint_state_origin_core.ts`) | task | error (exit 1) |
| 19 | SKILL.md invariants: `required_h2_sections`, `required_phrases` (optionally section-scoped), `forbidden_phrases`, `required_tool_refs` | `gate/ops/_skill_prose_core.ts:343-541` (H2 split `:180-208`); op `gate/ops/skill-prose.ts` | `plugin/skills/*/SKILL.md` (opt-in: only those with sibling `invariants.yaml`) | error (`<path>:<line>: <msg>`, exit 1; pre-commit) |
| 20 | Skill-doc step coverage: every `## N.` / `### Step N —` heading cited in companion doc's mermaid | `check_skill_docs.ts:64-71,223-239` | `plugin/skills/*/SKILL.md` ↔ `docs/skills/*.md` | error (COVERAGE) |
| 21 | Pipe-tail antipattern in SKILL.md examples (`validate… \| tail` w/o pipefail) | `check_pipe_tail.ts:57,128-146` | SKILL.md | error |
| 22 | Legacy `${CLAUDE_PLUGIN_ROOT}…/(scripts\|validators)/` path refs in SKILL.md | `check_no_legacy_script_paths.ts` | SKILL.md + invariants.yaml | error |
| 23 | Script-reference + flag drift: cited `.(py\|sh)` exists + `--help` advertises cited flags | `.claude/scripts/audit_skill_runtime.ts:46-53,161-257` | SKILL.md | error (exit 1) |
| 24 | Entity prose consistency: back-ticked `` `field:` `` / `` `status: val` `` match schema; template has NO frontmatter; `## Operations` table 5-col header | `check_entities.ts:75-79,211-228,310-362,431-456` | entity `*.md` vs `schema.json` | error (field/enum/template); **Operations header WARN-only** |
| 25 | `.base` / `obsidian-index.yaml` Obsidian-Bases view syntax whitelist (top-level keys, view types, filter-expression grammar, sort, property refs) | `validate.ts:324-631` (`validateBaseDocument`, `--flavor base`) | `.base` view files | error |
| 26 | Lease-binding footer `<!-- sdlc-lease: task=… lease=… -->` parseable in PR body | `services/lease/footer.ts:39-62` (`LEASE_FOOTER_RE`); op `lease/ops/parse-footer.ts` | PR body | throws `LeaseFooterMissing` |
| 27 | `TODO`/`FIXME`/`HACK`/`XXX` markers in tracked source | `services/project/ops/scan-todos.ts` (`git grep -nE`) | source files | report (exit 0) |
| 28 | Worktree-scope guard: staged paths vs active worktrees | `gate/ops/worktree-scope.ts`; `lefthook.yml:31-38` | any staged file (path-shape) | error (pre-commit) |
| 29 | Pipe-mask/empty-cell table parsing (`parseOperationsTable`, 3-or-5-col) | `entity.ts:476-548` | entity Operations table | n/a (reader) |

### A.3 JSON-Schema-declared-but-NOT-markdown checks (Zod payload contracts)

| # | What is checked | Where (file:line) | Scope | Failure mode |
|---|---|---|---|---|
| 30 | Report / commit-message payload validates against a **Zod v4** kind contract (JSON→Eta template, NOT markdown structure) | `services/kind_render.ts:44-80`; `report/render.ts`; `commit/render.ts` | report HTML / commit kinds | `OpError("INVALID_INPUT")` w/ prettified Zod issues |

### A.4 LLM-judged checks (no deterministic substitute — the irreducible tier)

| # | What is checked | Where (file:line) | Scope | Failure mode |
|---|---|---|---|---|
| 31 | Uniform-corpus assumption in `## Approach`/`## Proposed` — deterministic scanner emits **candidates**, LLM adjudicates | scanner `scan_corpus_assumptions.ts:75-106,218-238`; LLM step `task-ensure-ready/SKILL.md:159-181` | task | disqualifier **only after LLM confirms** |
| 32 | Subjective ACs / Approach defers design ("feels better", "the implementer decides") | `task-ensure-ready/SKILL.md:119`; contract `implementation-ready.md:106-130` | task | disqualifier (LLM-judged) |
| 33 | Hand-written site pages cite real skills/entities/scripts/versions/counts | `dev-update-docs/SKILL.md:61-104` | `site/src/content/docs/{index,architecture,roadmap,changelog}` | mechanical→fix; semantic→flag user |
| 34 | Principle contradictions (code/docs/conventions vs each principle; principle-vs-principle) | `principle-review/SKILL.md:18-57` | `docs/planning/principles/*` + whole project | report only |
| 35 | Promotion/triage invariants (status+result+last_reviewed shape, wikilink target exists, atomic 2-file commit) | `backlog-triage/SKILL.md:156-165` | backlog → task/milestone | validate-gated |

---

## B. The implicit document model

All six maps independently derive the **same** implicit grammar — and that redundant re-derivation
is itself the problem. An SDLC markdown doc IS:

| Construct | Definition / shape | Validated? | Authority |
|---|---|---|---|
| **Frontmatter** | A single leading `---\n…\n---` fence holding a YAML **mapping**. `schema_version` is a quoted string; `tags`/`related`/`applies_to.paths` are block-style lists. Stripped by regex before any body scan. | ✅ shape (JSON Schema) | every parser; `S-0005`, `D-0004` |
| **H1 / title** | Body opens with exactly one `# <title>` mirroring frontmatter `title`. | ❌ convention only (index reads it via `firstHeadingText` `generate.ts:301-304`; `S-0007:32`/`D-0008:74` mandate it) | conflict: `validateBody` ignores H1 entirely (`entity.ts:469` only knows `## `) vs `S-0007:32` requires exactly one H1 matching title |
| **H2 sections** | `##` headings are THE structural unit + contract boundary; section body = lines until next H2. H3+ (`### Option A`) is free-form, never validated. | ✅ presence/alias/unknown (line-scan) | `entity.ts:446-474`; manifest `body-schema.yaml` |
| **Section aliases** | Canonical name + alias set (Today ↔ Current state; Decision ↔ Recommendation/Conclusion/Resolution; Approach ↔ Plan). | ✅ but declared in 3 places (drift-prone) | `body-schema.yaml` `aliases:`; `scan-placeholders.ts:39-52`; `parse-touchpoints.ts:46-51` |
| **`^block-id`** | Line-terminal `^summary` for index transclusion. | ⚠️ presence detectable (`hasBlockId`) but NOT enforced by `validateBody`; missing → silent blank cell | `markdown_extract.ts:120-123`; `D-0002:22` |
| **Wikilinks `[[…]]`** | Entity cross-ref by id (`[[AA-NNNN-slug]]`, rename-safe); variants `[[t\|alias#anchor]]`. | ⚠️ validated only as frontmatter **string patterns** (`depends_on`/`parent_key`/`supersedes`); body wikilinks unparsed; **resolution never checked** | `wikilinks.ts:19-36`; `D-0008:87,102` defers broken-link checking |
| **Transclusion `![[file#^anchor]]`** | Index embeds `![[id#^summary]]`. | ❌ documented in prose, emitted by index, **never parsed or resolved** by any validator | `index_template.eta:182-186`; `generate.ts:145-146` |
| **Placeholder notation `<…>`** | Angle-bracket "replace before real" — explicitly NOT HTML; scanners must distinguish from real HTML | ⚠️ **task only** (`scan-placeholders.ts:62`); other 8 types ship `<…>` in templates, nothing scans residuals | `D-0008:83,270` |
| **Other placeholders** | `TBD`, `(pick one)`, `(final name…)`, `*Pending…*` (decision), `*To be expanded.*`/`> **Draft.**` (principle), `- none` sentinel (task/milestone Out of scope) | ⚠️ only `TBD`/`(pick one)`/`(final…)` scanned, task-only; the `*Pending*`/`*To be expanded*`/`- none` are conventions, unscanned | `scan-placeholders.ts:57-63`; `implementation-ready.md:46-48` |
| **Typed tables** | `\|`-delimited, header + `\|---\|` separator row, fixed column count, escaped `\|` masked. Cells may carry a sub-grammar. | ✅ task tables only; Operations table 3/5-col reader; non-task tables unchecked | `parse-touchpoints.ts`; `entity.ts:476-548` |
| **Location grammar** | Sub-DSL inside touchpoint cells: `path` / `path#symbol` / `path:line` / `dir/` / `glob*`; resolution semantics keyed by row Kind. | ✅ task only | `parse-touchpoints.ts:33-36,289-331`; `implementation-ready.md:50-72` |
| **Checkbox lists** | `- [ ]` / `- [x]`; task ACs use `- [ ] AC-N:`; milestone success-criteria/deliverables use `- [ ]`. | ⚠️ enforced for task ACs ONLY; milestone checkboxes template-only, unscanned | `quantifiers.ts:35-39`; milestone `body-template.eta` |
| **Fenced code** | ` ``` `/`~~~` blocks are structurally **inert** — every scanner tracks fence state to ignore headings/tables/placeholders inside. | ✅ but reimplemented 4-6× with inconsistent edge-case handling | all line-scanners |
| **HTML-comment footer** | `<!-- sdlc-lease: … -->` in PR-body markdown. | ✅ regex | `lease/footer.ts:40` |

**Two-zone invariant**: frontmatter is *canonical* (status/title/ids live there, schema-validated,
drives migration); body is *derived* (sections elaborate). Documents are markdown + YAML under git,
no database ([[P-0007]], [[D-K9PX]]).

---

## C. Where expected structure is declared today — and drift risks

Five declaration styles coexist for *structure*. **There is no single declarative contract**
spanning frontmatter + sections + block-ids + wikilinks for a doc type; `schema.json` +
`body-schema.yaml` together are the closest, and they apply only to `docs/planning/` entities — not
SKILL.md, PR bodies, or `docs/index.md`.

| Concern | Declared in | Dialect | Interpreted by | Applies to |
|---|---|---|---|---|
| Frontmatter shape | per-type `schema.json` + shared `_common.json` (`$ref` inlined) | JSON Schema Draft 2020-12 | ajv | 9 entities |
| Body H2 sections | per-type `body-schema.yaml` (`order`, `allow_unknown`, `sections[]{name,required,aliases,description}`) | bespoke YAML manifest | `validateBody` | 9 entities |
| New-instance body | per-type `body-template.eta` | Eta | `authoring.ts` + `kind_render.ts` (2 configs) | 9 entities |
| Human prose contract | per-type `definition.md` (Purpose/Frontmatter/Body shape/Lifecycle/Operations/…) | prose + 1 Operations table | `parseOperationsTable` reads only the table; rest is prose | 9 entities |
| Task readiness | `entities/task/implementation-ready.md` + `file-resolution.md` | prose contract | LLM + 2 deterministic scanners | task |
| Skill-prose invariants | per-skill `invariants.yaml` (`required_phrases`/`required_h2_sections`/`forbidden_phrases`/`required_tool_refs`) | bespoke YAML sidecar | `lintSkill` | 14 of ~32 SKILL.md |
| Skill-doc house-style | `plugin/skills/README.md` | prose | `check_skill_docs.ts` | `docs/skills/*.md` |
| id shape/numbering | `identifier.ts:35-52` (`PREFIXES`,`ID_RE`,`FILENAME_RE`) | hardcoded TS + regex | identifier ops | all |
| Task placeholder/table/Location/quantifier rules | `scan-placeholders.ts:39-63`, `parse-touchpoints.ts:33-51`, `claims/*` | **hardcoded TS regex tables** | those ops | task |
| `.base` view whitelist | `validate.ts:324-362` | hardcoded TS allow-sets | `validateBaseDocument` | `.base` |
| Quality-check list | `sdlc.yaml` `quality_checks:` | YAML (schema `sdlc-yaml.schema.json`) | `quality/run-checks.ts` | project |
| Report/commit payload | `entities/<type>/reports|commits/<name>/schema.ts` | Zod v4 | `kind_render.ts` | kinds |
| Site frontmatter | Starlight `docsSchema()` | zod | Astro build | `site/**` |
| Site reference-page shape | template literals `regen.mjs:256-448` | hardcoded JS | regen | regen'd pages |

**What `body-schema.yaml` CAN express** (confirmed by grep across all 9 files — this is the *entire*
enforced vocabulary): per-section `name`, `required: true\|false`, `aliases:[…]`, `description`
(prose, ignored), plus top-level `allow_unknown: true\|false`.

**What it CANNOT express / does not enforce**: section ordering, per-section content rules, table
presence/shape inside a section, placeholder-freeness, block-id presence, transclusion targets,
min/max occurrence, H3 sub-structure, mutually-exclusive section sets, cardinality.

### Concrete drift risks between declarations

1. **`order: strict` is dead config.** Declared in 5/9 manifests — capability, driver, principle,
   product, milestone — but `validateBody` (`entity.ts:342-392`) **never reads the `order` key**
   (grep confirms zero `order` reads in the model validator; the `validate.ts:329/542` `order` hits
   are the unrelated Bases-view key). Section ordering is unenforced everywhere.
   *(All six maps agree; lib-model-core and templates-contracts both grep-confirmed.)*

2. **Section-alias tables triplicated and drift-prone.** `body-schema.yaml aliases` (validator) vs
   `REQUIRED_SECTIONS` (`scan-placeholders.ts:39-52`) vs `SECTION_ALIASES`
   (`parse-touchpoints.ts:46-51`) are three hand-maintained copies of "what counts as the Today/Goal
   section." Confirmed divergence: the task `Today` aliases (`Current state`,
   `Today / current state`) live in the task ops but are **absent from `task/body-schema.yaml`** —
   the manifest and the gate hold different notions of the same section.

3. **Template ↔ manifest order/coverage drift (real, enumerated):**
   - **principle**: manifest lists Summary **first** (`order: strict`); `body-template.eta:11-54`
     emits Summary **last**. definition.md sides with the manifest. Passes only because order is
     unenforced.
   - **decision**: manifest order Summary→Decision→…→Context; template emits
     Summary→**Context→Decision** (inverted). Template also omits optional `## Out of scope` and
     `## References` the manifest declares.
   - **standard**: template omits optional `Scope` and `References`.
   - **capability**: template ships leaf-flavour only (Inputs/Outputs/Underlying), omits tree-root
     sections (Contained sub-features, Lifecycle map); manifest can't express "pick one flavour
     set."
   - Nothing checks the **template against the manifest in CI** — divergence only surfaces when
     someone scaffolds a new instance.

4. **Body validation is non-uniform across entry points.** `entities validate` validates frontmatter
   **only** (does NOT call `validateBody`); body-section validation runs only at author-time
   (`authoring.ts:304`, born-valid) and audit-time (`audit.ts:503`). A hand-edited body that drops a
   required H2 passes `validate` and is caught only by `/sdlc:entities-audit` — where it surfaces as
   **non-serious `prose` drift (exit 0)**, so it never fails a gate.

5. **Same frontmatter error reads differently by entry point.** `entity.ts:validateFrontmatter` uses
   the *raw* ajv message; `validate.ts`/`audit.ts` run `translateAjvError` to the Python-jsonschema
   vocabulary. Three ajv setups, two message vocabularies.

6. **`validateBody` is case-sensitive; task scanners lower-case.** `## summary` (lowercase) would
   fail the body check but pass the task placeholder scan — two different notions of section-name
   matching.

7. **Status-conditional body rules are prose-only.** "decision Summary must be populated once
   accepted", "principle Statement+Summary filled once published", "driver Evidence cited once
   validated", "milestone version unique" — all live in definition.md "Workflow invariants",
   enforced nowhere.

---

## D. Duplication map — same check in N places

| Check | Implemented in (file:line) | N | Notes / known-ness |
|---|---|---|---|
| **Frontmatter slice (`FRONTMATTER_RE`)** | `entity.ts:48`, `validate.ts:55`, `audit.ts:50`, `migrate.ts:41`, `markdown_extract.ts:77`, `scan-placeholders.ts:27`, `parse-touchpoints.ts:26`, `identifier.ts:257`, `claims/paths.ts:38`, `quantifiers.ts:33`, `scan_corpus_assumptions.ts:54`, `check_entities.ts:72`, `update.ts:45` | **~13** | 3 subtly different variants: 2-group vs **3-group** (migrate/update, delimiters round-trip verbatim) vs trailing-`\n`-required vs `[ \t]`-only (identifier). `markdown_extract.ts:77` comments it "mirrors" the others — duplication is **known**. |
| **Fence-aware H2 section walk** | `entity.ts:446-474`, `_skill_prose_core.ts:124-238`, `scan-placeholders.ts:127-196`, `parse-touchpoints.ts:87-144`, `scan_corpus_assumptions.ts:162-238`, `quantifiers.ts:70-110` | **6** | Each its own fence state machine (`startsWith("\`\`\`")` toggling on first 3 chars vs `/^(\`\`\`+\|~~~+)/` comparing `marker[0]`). Indented/longer/tilde fences handled inconsistently. mdast `sectionBody` does this correctly but only `index` uses it. |
| **ajv setup + `translateAjvError` + `getAjv` + `validateSchemaErrors`** | `entity.ts:293-340` (raw msg), `validate.ts:113-220` (translated), `audit.ts:164-268` (translated) | **3** | `validate.ts`/`audit.ts` byte-near-identical (the `pyRepr`/`translateAjvError`/`getAjv`/`validateSchemaErrors` quartet appears twice); `entity.ts` is a simpler third path. |
| **Section-alias / required-section table** | `body-schema.yaml aliases`, `scan-placeholders.ts:39-52` (`REQUIRED_SECTIONS`), `parse-touchpoints.ts:46-51` (`SECTION_ALIASES`) | **3** | Two op-side copies silently drift from the manifest; none sourced from `body-schema.yaml`. `project-check` exists partly to catch this. |
| **Required-H2-present enforcement** | `entity.ts:342-392` (entity bodies, manifest-driven), `_skill_prose_core.ts:453-482` (SKILL.md, invariants-driven) | **2** | Two engines for "is this required H2 present?", different config sources. |
| **Table-row parse (`\|`-mask, cell split, separator detect)** | `scan-placeholders.ts:112-120`, `parse-touchpoints.ts:219-279`, `entity.ts:541-548` | **3** | |
| **`coerceForSchema`** (YAML→JSON-schema coercion, Date→ISO, number→string) | `audit.ts:122-136`, `validate.ts:97-111` | **2** | Identical. |
| **`pyRepr`/`pyTypeName`/`splitLines`/`maskInlineCode`** Python-parity helpers | `audit.ts`, `validate.ts`, `migrate.ts`, `_skill_prose_core.ts`, `parse-touchpoints.ts`, `scan-placeholders.ts`, `scan_corpus_assumptions.ts` | **5-7** | Legacy of the Python→TS port; pinned byte-for-byte by `tests/parity/`. |
| **Placeholder vs corpus-assumption scanner** | `scan-placeholders.ts` vs `scan_corpus_assumptions.ts` (docstring `:16-18`: "Modelled structurally on scan_placeholders.ts") | **2** | Near-clone differing only in section scope + pattern table. |
| **Prose-drift / H2-missing detection** | audit `prose` kind (`audit.ts:503-505`), `dev-update-docs` semantic check, `check_entities.ts` | **3** | Three subsystems detect "doc says X, source says Y", none sharing code. |
| **SKILL.md discovery + component-wise `migrate`-before-`migrate-runtime-state` sort** | `check_skill_prose.ts:92-119`, `check_pipe_tail.ts:170-197`, `audit_skill_runtime.ts:110-129`, `check_skill_docs.ts` | **4** | Verbatim copy-paste incl. comment. User memory names this anti-pattern. |
| **Frontmatter parser (downstream, separate from plugin)** | `regen.mjs:66-149` (custom mini-parser), project-check regex scanners | **2+** | Site ships its own parser specifically to avoid depending on the plugin's; `remark-frontmatter`+`yaml` are in `package.json` but unused under `site/` and `.claude/`. |

**Acknowledged in-tree**: `markdown_extract.ts:5-9` names [[B-8FL9]] ("validate markdown structure
by applying JSON Schema to its AST") as the intended consolidation; the skill-prose / task-scanner
cores carry docstrings noting they were relocated from retired `plugin/scripts/` per [[D-0007]]
**without unifying their parsers**.

---

## E. Binding constraints from prior decisions

| Decision | Status | How it binds this ADR |
|---|---|---|
| **[[D-0007]] deterministic-op-substrate** + **[[D-H7FS]] op-substrate-surface** | open/accepted | **Hard constraint**: the validator is a deterministic op (`defineOp`, `path: string[]`, Zod `input`/`output`, `OpError` taxonomy, `(input, ctx)` handler), lives under `plugin/lib/` (entity-placed or `services/`), generated to CLI/MCP/HTTP — **never a skill-side script** (memory `entity_code_placement`). `entities validate` (`validate.ts:722`) is the precedent surface to extend; `entities audit` is the drift surface. Most ops are `hidden:true` (lefthook/agent-reached plumbing per D-H7FS). |
| **[[D-0006]] typescript-substrate** | accepted | TS/Bun, Zod, ajv are the substrate; `markdown_extract.ts` already on remark/mdast is the AST-library precedent. |
| **[[D-0008]] markdown-standard** / **[[S-0007]] markdown-formatting** | open/proposed | **Boundary partner.** D-0008's enforcement-split table (`:93-97`, restated `S-0007:69-73`) hands structural axes to "the schema validators, **not** the new formatter". This ADR owns frontmatter *shapes* + section *structure* + block-id/table *presence-and-shape*; D-0008 owns characters/whitespace/wrapping + block-id *placement* + table-not-reflowed. **Collision risk**: `^summary` placement, transclusion form, table-not-reflowed are D-0008 *character-placement* axes (`:78-81,245-251`); this ADR must treat the same constructs as *structural assertions* (does `^summary` exist? right columns?) — same constructs, orthogonal properties. The ADR must not re-litigate formatting. |
| **[[D-0008]] Obsidian-first** *(map labelled this "D-0008"; D-0008 is the markdown standard which IS the Obsidian-first standard — single decision)* | open/proposed | Obsidian wikilinks/transclusions/block-ids are first-class and must survive untouched (`markdown_extract.ts:81-83`); `.base` views validated headlessly. |
| **[[D-0004]] entity-definition-architecture** | open/accepted | The structure contract IS the entity surface: `schema.json` (frontmatter) + `body-schema.yaml` (H2 manifest). This ADR generalizes/unifies these; must respect `_common.json` `$ref`, JSON-Schema `default`, the `entity.ts` projection, configurable filenames in `configuration.ts`. **D-0004's open question "body-manifest consolidation" (`:155`)** — whether `body-schema.yaml` folds into `schema.json` or a schema extension keyword — is directly this ADR's design space. |
| **[[D-0005]] repair-on-prepare** | (this ADR's prior) | Defines the **LLM-rule → deterministic-rule promotion path** and the confidence-gated repair posture; the structure validator is the deterministic destination rules promote into. Its "five-layer drift surface" table (`:160-211`) catalogues exactly the bespoke-vs-deterministic drift. Failure posture: hard error at write (born-valid) + non-blocking `Drift` at audit feeding `entities-migrate`. |
| **[[D-0002]] entity-identifier-shape** | accepted | Filename/id/wikilink grammar is a structural contract (id matches filename, uniqueness, immutability); wikilink rename-safety depends on it. |
| **[[D-K9PX]] system-architecture** | accepted | Places "schema + body-manifest validation" in the **model-framework layer** (`:50,62`); frames "body-validator **hook surface** — how entities declare named checks that don't fit schema or manifest" as an **open question** (`:122`) — the extension seam this ADR may settle. |
| **[[P-0005]] schema-over-prose** | published | Governing principle: behavior-driving structure is schema, not prose. "Anything not yet modeled is either not-yet-understood or genuinely unmodelable." |
| **[[P-0001]] prefer-deterministic** + **[[S-0003]]** | published / active | Validator path stays LLM-free (`P-0001:125` names `validate_frontmatter` as a standing application). |
| **[[P-0007]] long-lived-data-formats** | published | "in-body structure will also be enforced as a data model as the entity document evolves" (`:57`) — the explicit charter for body-structure validation. |
| **[[D-ORMG]] data-model** | proposed | "Every artifact with a schema that validates **is** an entity" — defines the per-doc-type contract space the validator's contracts key off. |
| **[[D-7F2M]] why-what-verify-chain** | proposed | Planned entities (Requirement/AcceptanceCriterion/Goal/Driver/Product) will each need body-section contracts; the validator must be generic enough to absorb them (`:195`). |
| **[[S-0005]] entity-definition-contract** | draft | Names the validators (`:54-60`) the ADR consolidates; flags four-artifact-presence + Operations-table checks as not-yet-built follow-ups (T-0001/T-0014). |
| **[[D-TQHZ]] skill** / **[[S-0006]]** | proposed / draft | SKILL.md is itself a structured doc type; a structure contract for skill prose is in scope (`_skill_prose_core.ts` already reads body-schema-style section lists). |
| **schema-document-as-source + consume-what-you-understand** (in-flight ontological integration, PRs #323-326, D-DX1Q/D-WAKO/M-0004 — **not on this branch**) | in-flight | Two-plane split: `schema.json` + `x-ontology` vendor keywords as canonical EntityDef IR source; rust-ontogen (data plane) consumes only the JSON-Schema subset it understands; **full structural/semantic validation stays SDLC-side = this library** (brief item c). |
| **Round-trip fidelity gate** (same in-flight work) | in-flight | parse-all → render-all → `git diff --exit-code` over `docs/planning` (incl. `^summary`, H2 sections, wikilink arrays) is the load-bearing ontological acceptance gate (brief item d). |

---

## F. REQUIREMENTS

Numbered contract for the future library. Each line is testable with a source citation. Deduped
across all six maps (the maps independently produced ~14 requirement lists each; collapsed here to a
non-redundant set).

### MUST

- **REQ-01** — The library parses markdown on **one real AST (remark/mdast)**, not per-construct
  line/regex scanners, retiring the 6 duplicated section-walkers.
  *(`markdown_extract.ts:5-9`; [[B-8FL9]])*
- **REQ-02** — Frontmatter is validated against
  **per-type JSON Schema Draft 2020-12 via ajv + ajv-formats**, with shared-fragment (`$ref`
  `_common.json`) composition and `useDefaults` applied before required-checks.
  *(`entity.ts:291-340`; `_common.json:1-5`; `D-0004:76`; `P-0005`)*
- **REQ-03** — Exactly **one frontmatter-slice definition and one ajv/error-translation path** are
  shared, replacing the ~13 `FRONTMATTER_RE` and 3 ajv-setup copies; error vocabulary is consistent
  across all entry points.
  *(`entity.ts:48`…`check_entities.ts:72`; `validate.ts:131`; `audit.ts:181`)*
- **REQ-04** — A per-doc-type contract declares
  **required vs optional H2 sections, aliases, and unknown-section policy** (today's
  `body-schema.yaml{sections,required,aliases,allow_unknown}`).
  *(`entity.ts:342-392`; all 9 `body-schema.yaml`)*
- **REQ-05** — Section-name matching behavior is **single and consistent** (resolve the
  case-sensitive-`validateBody` vs lower-cased-task-scanner conflict).
  *(`entity.ts:357-362` vs `parse-touchpoints.ts` / `quantifiers.ts`)*
- **REQ-06** — The **section-alias vocabulary is declared once** (in the contract) and consumed by
  validator + placeholder scan + touchpoint parse, replacing the 3 hand-maintained copies; the task
  `Today` aliases currently in code must be sourced from the manifest.
  *(`scan-placeholders.ts:39`; `parse-touchpoints.ts:46`; `decision/body-schema.yaml:35`)*
- **REQ-07** — Scanning is **fenced-code- and inline-code-aware**, with one shared fence state
  machine, so docs can discuss placeholder phrases/headings/tables as subject matter without false
  positives. *(`scan-placeholders.ts:32-35,142-155`; `_skill_prose_core.ts:124-142`)*
- **REQ-08** — Placeholder / spec-drift detection (`<…>`, `TBD`, `(final name…)`, `(or final…)`,
  `(pick one)`, empty table cells) is a **first-class, configurable per-section rule** (not
  hardcoded task-only), with `<…>` distinguished from real HTML.
  *(`scan-placeholders.ts:39-63`; `D-0008:83,270`)*
- **REQ-09** — Typed-table shape is **declarable** (column count/names, per-cell grammar),
  generalizing the hardcoded touchpoint tables and the Location 5-form grammar to any doc type.
  *(`parse-touchpoints.ts:343-395`; `implementation-ready.md:50-72`)*
- **REQ-10** — Obsidian constructs are checkable as **presence + shape**: `^block-id`
  presence/placement, wikilink `[[t\|a#h]]` well-formedness, transclusion `![[f#^id]]` form.
  *(`markdown_extract.ts:120-123`; `wikilinks.ts:19-21`; `generate.ts:145-146`; `D-0002:22`)*
- **REQ-11** — Per-doc-type identifier/filename contracts (`AA-NNNN[-slug]`, prefix, numbering,
  id==filename, uniqueness) remain a **single source of truth**.
  *(`identifier.ts:35-274`; `D-0002`)*
- **REQ-12** — Cross-file structural checks (**dependency-graph cycles/broken edges**) are
  expressible beyond single-document JSON Schema.
  *(`audit.ts:541-740`; `task/schema.json:93` "JSON Schema is single-document")*
- **REQ-13** — The library is a **deterministic `sdlc` op** (`defineOp`, Zod I/O, `OpError`,
  generated CLI/MCP/HTTP adapters) under `plugin/lib/`, **never a skill-side script**, invokable
  both as importable functions and CLI verbs. *(`D-0007:81-99`; `D-H7FS:54`; `model/index.ts`;
  `validate.ts:722`; memory `entity_code_placement`)*
- **REQ-14** — Findings are **machine-parseable, keyed to `<path>:<line>`** (the established
  `{section,phrase,line,snippet}` / `{location,kind,parsed,error}` / `<path>:<line>: <msg>` shapes)
  so skill prose and lefthook/sdlc.yaml gates compose them unchanged.
  *(`scan-placeholders.ts:204-211`; `check_pipe_tail.ts:139-143`)*
- **REQ-15** — Failure modes are **tiered and preserved**: hard error
  (frontmatter/required-section/identifier), warn-then-auto-fix (`schema_version` drift / migration
  chain), report-only finding (placeholders/claims). *(`audit.ts`; `migrate.ts`; `D-0005:48-56`)*
- **REQ-16** — Output is **deterministic and idempotent**, byte-pinnable by golden suites,
  preserving the existing parity contract.
  *(`tests/parity/README.md:38-40`; `validate_absorb_parity.test.ts:93`)*
- **REQ-17** — The library stays **strictly on the structure side of D-0008's enforcement split** —
  owns frontmatter shapes + section structure + presence/shape of constructs; never owns
  line-length/whitespace/fence-form/table-reflow (the formatter's).
  *(`D-0008:93-97,230`; `S-0007:69-73`)*
- **REQ-18** — Expected structure is declared as **schema/config, not hardcoded** (extend
  `schema.json` + `body-schema.yaml`); resolve D-0004's open "body-manifest consolidation".
  *(`D-0004:78,155`; `P-0005`)*
- **REQ-19** — The validator path is **LLM-free** and serves as the deterministic destination for
  D-0005's LLM-rule → deterministic-rule promotion. *(`P-0001:125`; `D-0005:204-213`)*
- **REQ-20** — **Round-trip fidelity** of every parsed construct (frontmatter, `^summary`, H2
  sections, wikilink arrays) is preserved so parse→render→`git diff --exit-code` over
  `docs/planning` is clean. *(in-flight ontological gate, brief item d; D-DX1Q/D-WAKO)*
- **REQ-21** — The library is the **home of full validation** under the two-plane split;
  rust-ontogen consumes only the JSON-Schema subset it understands.
  *(brief item c; ontological-integration plan)*
- **REQ-22** — The library is **general plugin code** (no SDLC-repo carveouts; works for any
  consuming project's doc types) and exposes its structure contracts as inspectable artifacts.
  *(`S-0003:70-73`; `P-0009`)*
- **REQ-23** — Coverage includes the **planning corpus (`docs/planning/**`)**, not only plugin
  source — today the line-scan gates target `plugin/skills/` / `plugin/lib/model/entities/` and only
  `audit_entities.ts` + golden fixtures touch the corpus's structure.
  *(`tests/parity/validators.golden.test.ts:88`; `lefthook.yml`)*

### SHOULD

- **REQ-24** — **Section ordering is enforced** when declared (`order: strict` is authored in 5/9
  manifests but never read). *(grep: zero `order` reads in `entity.ts`/`validate.ts` body path;
  `decision/body-schema.yaml:11`)*
- **REQ-25** — Body templates are **drift-checked against the body-schema contract in CI**, not only
  at instance-author time, since templates are rendered by ≥2 services and template-vs-manifest
  divergence is otherwise silent (and presently real — see §C.3).
  *(`authoring.ts:160,304`; `kind_render.ts:36-37`)*
- **REQ-26** — A deterministic scanner may emit **candidates that an LLM step adjudicates** (the
  corpus-assumption pattern); the contract distinguishes deterministic disqualifiers from LLM-judged
  ones. *(`scan_corpus_assumptions.ts:1-18`; `implementation-ready.md:128-136`)*
- **REQ-27** — A **pluggable resolver registry** supports cross-citation claim checks (path-moved,
  vacuous-quantifier, …) returning `{line, severity, message}`.
  *(`claims/types.ts:38-82`; `implementation-ready.md:138-164`)*
- **REQ-28** — **SKILL.md is treated as a doc-type with its own contract** (required H2s,
  required/forbidden phrases, required tool refs); `invariants.yaml` + `gate skill-prose` is a
  special case of the generic library. *(`_skill_prose_core.ts:18-36,343-541`; [[D-TQHZ]])*
- **REQ-29** — The same "structure validates" gate is **composable as one reusable pipeline stage**
  run uniformly at authoring, edit-time, audit, and CI. *(`B-ZEZR:30-42`; `B-J2KF`; `D-K9PX:122`)*
- **REQ-30** — The library should expose a **body-validator hook surface** for named checks that fit
  neither schema nor manifest (D-K9PX's open question), accommodating per-entity bespoke contracts
  as they promote. *(`D-K9PX:122`; `D-0005` five-layer table)*
- **REQ-31** — External-tool dependencies (if any) **degrade explicitly with a stderr note**,
  avoiding the `mmdc`-style silent half-coverage.
  *(`lefthook.yml:110-114`; `check_skill_docs.ts:369-377`)*

### COULD

- **REQ-32** — **Wikilink / transclusion targets are resolved** (does `[[T-XXXX]]` exist? does
  `![[id#^summary]]` anchor resolve?) — currently unchecked end-to-end; broken-link checking is
  explicitly deferred by D-0008. *(`D-0008:87,102`; `index/SKILL.md:44-49`)*
- **REQ-33** — **Status-conditional body rules** are expressible (decision Summary-once-accepted,
  principle Statement-once-published, driver Evidence-once-validated).
  *(definition.md "Workflow invariants"; currently prose-only)*
- **REQ-34** — **Mutually-exclusive section sets** are expressible (capability tree-root vs leaf
  flavour). *(`capability/body-schema.yaml`; template ships one flavour only)*
- **REQ-35** — **Checkbox-list shape** (`- [ ]`) is enforceable beyond task ACs (milestone
  success-criteria/deliverables are template-only today).
  *(milestone `body-template.eta`; `quantifiers.ts:35-39`)*
- **REQ-36** — Wire into **CI** (`.github/workflows/` does not exist; every gate is
  local-pre-commit-only, bypassable with `--no-verify`) and integrate with Astro Starlight's content
  pipeline (no remark plugin configured) so the corpus's Obsidian-isms stop republishing as dead
  literal text. *(`.github/` absent; `astro.config.mjs` integrations = `[starlight()]` only)*
- **REQ-37** — Land a **committed configuration surface** for whatever formatter/linter is chosen
  (the user is hand-prototyping `rumdl` with zero committed config).
  *(`.claude/settings.local.json:8-20`; no `.rumdl.toml`)*
- **REQ-38** — Bespoke per-doc-type structural prose contracts (task `implementation-ready.md`
  Location grammar, `file-resolution.md`) **migrate into the generic contract**.
  *(`D-0005:160-176`; `parse-touchpoints.ts`)*

---

## G. Open tensions & questions the ADR must address

1. **Body-manifest consolidation (the central design fork).** Does `body-schema.yaml` fold into
   `schema.json` (one JSON-Schema-with-vendor-keywords per type), become a JSON-Schema
   *extension keyword*, or stay a sibling manifest? This is [[D-0004]]'s explicit open question
   (`:155`) and the structural choice the whole library hangs on. Interacts with the in-flight
   `x-ontology` vendor-keyword direction (schema.json as canonical IR).

2. **JSON-Schema-on-AST vs purpose-built section grammar.** [[B-8FL9]]'s framing is "apply JSON
   Schema to the *mdast AST*." But H2 sections, typed tables, `^block-id`, Location grammar, and
   ordering are awkward to express in JSON Schema. Is the contract (a) JSON Schema over a normalized
   AST projection, (b) a richer bespoke schema language, or (c) JSON Schema for frontmatter + a
   separate declarative section/table DSL? The maps disagree implicitly: lib-model-core frames it as
   "one model on mdast"; planning-corpus cites B-8FL9's "JSON Schema to AST" literally.

3. **The D-0008 / this-ADR seam on shared constructs.** `^summary`, transclusion form, and
   table-not-reflowed appear in *both* D-0008's formatter axes (placement/whitespace) and this ADR's
   structural axes (presence/shape). The ADR must state the partition precisely — "I validate
   presence and shape; D-0008 governs placement and whitespace" — so the formatter and validator
   don't both claim the same construct. *(Note: one map labelled the Obsidian-first constraint
   "D-0008" separately; D-0008 IS the markdown/Obsidian-first standard — single decision, not two.)*

4. **Severity uniformity vs current reality.** Today the *same* check has different severity by
   entry point: required-H2 is a hard error at author-time but
   **non-serious `prose` drift (exit 0)** at audit; `entities validate` skips body validation
   entirely. Should the unified library make body-structure failures gating everywhere, or preserve
   the deliberate "born-valid hard / drift soft" asymmetry? [[D-0005]]'s repair posture argues for
   confidence-tiered, not uniformly-hard.

5. **Parity-string lock-in.** ~400 lines of `pyRepr`/`translateAjvError` byte-for-byte Python-parity
   code are pinned by `tests/parity/`. Any consolidation must either preserve these exact strings or
   coordinate retiring the parity suite (T-YBKU). Is byte-parity still a goal, or can the ADR
   declare a clean break?

6. **Where do bespoke per-entity checks live?** Task readiness (`implementation-ready.md` + 2
   scanners + claim registry) is far richer than `body-schema.yaml` can express. Does it (a) promote
   wholesale into the generic contract (REQ-38), (b) stay as a per-entity hook surface (REQ-30 /
   D-K9PX:122 open question), or (c) split — table/placeholder rules generalize, LLM-judged
   disqualifiers stay skill-side? This determines whether the library is "schema + manifest" or
   "schema + manifest + pluggable per-entity hooks."

7. **`order: strict` — enforce or delete?** It is declared in 5/9 manifests and read by nothing.
   Enforcing it will *newly fail* existing instances whose templates emit sections out of manifest
   order (principle, decision — see §C.3). The ADR must choose: implement ordering (and fix the
   templates/instances first), or formally drop the field as dead config.

8. **Round-trip fidelity vs validation coupling.** The in-flight ontological work makes
   parse→render→`git diff` clean a load-bearing gate (REQ-20). A validator that *normalizes* (e.g.
   canonicalizes section order, rewrites aliases to canonical) would break round-trip. The ADR must
   separate "validate (read-only, fidelity-preserving)" from any "repair/normalize" path — and
   reconcile with [[D-0005]] repair-on-prepare, which deliberately *does* mutate.

9. **Scope of `consume-what-you-understand`.** The two-plane split says rust-ontogen consumes only
   the JSON-Schema subset it understands and full validation stays SDLC-side. But if the
   section/table/block-id contract is *not* expressible as JSON Schema, the two planes validate
   different things — ontogen sees only frontmatter. The ADR must state what (if anything) crosses
   the plane boundary and whether the SDLC-side contract is a strict superset of the ontogen-visible
   schema.

10. **CI and enforcement reach.** No `.github/workflows/` exists; all gates are local pre-commit,
    bypassable with `--no-verify`, and skip silently when tools (`mmdc`) are absent. Is server-side
    CI enforcement in scope for this ADR, or strictly the library's API/contract (leaving wiring to
    a follow-up like T-0008)?

11. **Which skills collapse, and when.** `entities-audit`, the deterministic half of
    `task-ensure-ready`, `gate skill-prose`, and `project-check`'s deterministic steps become thin
    config-over-library once this lands; `dev-update-docs`, `principle-review`, and the
    subjective-AC/corpus-assumption disqualifiers do **not** (irreducibly LLM-judged). The ADR
    should state the target collapse surface so the head/tail boundary per [[D-0007]] is explicit
    and the migration is sequenced (not a big-bang rewrite).
