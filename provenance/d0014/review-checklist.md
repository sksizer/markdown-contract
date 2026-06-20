> Master checklist for [[D-0014-markdown-structure-validation|D-0014]] — turning this in-repo
> decision folder into a **standalone, self-hosting SDLC project** for the `markdown-contract`
> library, then implementing it. Working doc; the source of truth for progress, persists across
> sessions. Non-normative. The closed API-design review (Phases A–U) is preserved verbatim in
> Appendix A.

# D-0014 → `markdown-contract` — project-formation & extraction checklist

The API design is settled — 38 decisions, all folded into `proposed-shape.md` (Appendix A). This
checklist covers the next arc: **stand up a standalone self-hosting SDLC project, bring the existing
material across, reshape it into the project's entities, and build the library.** The examples
become **use-case Drivers**; the question/answer set becomes a consolidated set of **Decisions**
that declare the API; the implementation depth becomes **Milestones**; each milestone's plan becomes
**Tasks**. The live SDLC corpus comes across as the flagship use-case Driver and the test fixtures.

## Locked framing

| Choice | Decision | Implication |
|---|---|---|
| **Library home** | **Standalone git repo** (`markdown-contract`) | A new repo, not a dev-repo package. The SDLC corpus is copied in as fixtures / a use-case driver. |
| **Project shape** | **Full self-hosting** | The new repo runs the SDLC plugin on itself — its own product, drivers, decisions, milestones, tasks, standards — validated by `entities validate`. It dogfoods the corpus the library targets. |

Work order: **bootstrap first.** Phase 0 stands up the standalone repo and brings _all_ existing
evidence + planning material across — the API-design review (Appendix A), `proposed-shape.md`, the
65 example cases, and the `research/` docs — into a self-validating project. Authoring the Drivers,
Decisions, and Milestone ladder (Phases 1–3) and building the library (Phase 5) then happen
**in the new repo**, where `entities validate` is live. The dev repo can't host the new project's
entities (id-collision with the live corpus), so nothing real is authored here — only consolidated
enough to move.

**Progress: Phase 0 (consolidate & bootstrap) is the active gate; Phases 1–5 follow in the new
repo.** The API design itself is settled (Appendix A) — it is an _input_ to Phase 0, not a phase.

## Package & CLI shape

One repo, **one package**, two entry points: a pure **library** (`exports`) and a thin **CLI**
(`bin`). The CLI is just another consumer of the library — no business logic in the shell.

| Layer | Lives in | Touches IO? | Exposed as |
|---|---|---|---|
| **Engine** | `src/core/` | no | library `exports` — one doc × one contract → findings + `tree` + `doc` |
| **Runner** | `src/runner/` | reads files, returns data | library `exports` — config (globs→contracts) → aggregated findings, so SDLC `entities validate` can call it directly |
| **CLI** | `src/cli/` | argv + stdout + exit code | `bin: markdown-contract` — parse args → call runner → format (human / json / sarif) → `process.exit` |

Rules: **imports flow one way — `cli → runner → core`, never back** (enforce with an import-boundary
lint); the only `process.exit` is the CLI's outermost file; the corpus runner is **library API**,
not CLI-only, so other consumers reuse it without shelling out. On Bun the CLI needs ~zero extra
deps (`util.parseArgs`, `Bun.Glob`, `JSON.stringify` for SARIF/JSON), so the single package stays
lean for library consumers. **Split to Bun workspaces (`packages/core` + `packages/cli`) only if**
the CLI later grows heavy deps, needs an independent release cadence, or the core must stay
runtime-agnostic — the one-way source boundary makes that split a file move, not a rewrite.

## Phase 0 — Consolidate & bootstrap (the migration gate)

Stand up the new self-hosting repo and bring **all** existing evidence + planning material across,
consolidated enough that in-library development can proceed. Exit criteria: the new repo is green on
`entities validate` and holds the full provenance, ready for Phases 1–5.

- [ ] **Name it.** Confirm repo + product name (`markdown-contract`?) and the npm/package identity.
- [ ] **Create the repo.** New git repo; `bun init` as one package (library `exports` + CLI `bin`
      skeleton; see Package & CLI shape); license; README stub pointing at the spec.
- [ ] **Install SDLC.** Add the `sdlc` plugin + project settings; scaffold the `docs/planning/` tree
      (`products/ drivers/ decisions/ milestones/ tasks/ standards/ references/ …`); wire
      `entities validate` + lint in CI.
- [ ] **Bring the provenance over.** Move _all_ existing material from this folder into the new repo
      as staging/provenance — Appendix A + the 38 `questions/`, `proposed-shape.md`, `research/`,
      and the 65 example cases (validation + consumption). Land them in a `provenance/` (or
      `_incoming/`) area that `entities validate` does not treat as live entities; Phases 1–2
      re-home them.
- [ ] **Corpus snapshot.** Copy a frozen SDLC corpus slice in as fixtures for
      `DR · validate-sdlc-corpus` (decide snapshot vs. submodule vs. sync script).
- [ ] **Bootstrap identity.** `PR-0001-markdown-contract` (what it is, boundary, drivers & goals) +
      `vision.md` (one-screen north star: validate-and-consume markdown-as-data, reusable anywhere).
- [ ] **Green the gate.** `entities validate` passes in the new repo with the provenance in place.
- [ ] **Cut the cord.** In the dev repo, mark D-0014 spun-out: update its status + add a note
      pointing to the new repo; reconcile [[D-0008]] (formatting) and [[D-0007]] (op boundary)
      references.

## Phase 1 — Drivers (examples → use-case Drivers)

The 54 validation + 11 consumption example cases are **evidence**, not drivers. Consolidate them
into a handful of `kind: use-case` Drivers; each graded case becomes cited Evidence / a fixture
under its driver. **The SDLC corpus comes over here:** the flagship driver is "validate the SDLC
corpus," and the real entity docs come across as its data.

| Proposed Driver (`kind: use-case`) | The use-case | Evidence / fixtures |
|---|---|---|
| `DR · validate-sdlc-corpus` | Validate the live SDLC planning corpus (decisions, tasks, milestones, drivers…) as code — the dogfood | validation/19–21 + the corpus snapshot |
| `DR · author-time-structure` | Surface structural findings (missing / duplicate / disordered sections, leaf content rules) at edit/commit time | validation/01–13 |
| `DR · typed-consumption` | Read a valid doc as a typed model (sections, typed tables, `byAnchor`) for report ops & summaries | consumption/01–11 |
| `DR · obsidian-dialect` | Parse the Obsidian dialect (`^block-id`, `[[wikilink]]`, `![[transclusion]]`) that nothing on npm handles | validation/09b, 15; dialect notes |
| `DR · reusable-corpus-runner` | Validate an arbitrary doc tree (dir→contract mapping), CI-friendly output, outside any one repo | Deferred CLI runner |

- [ ] Confirm/trim the driver set above.
- [ ] Write each `DR-NNNN` (Statement / Who-it-affects / Evidence / Toward resolution).
- [ ] Map every example case → its driver as Evidence; carry the cases over as fixtures.

## Phase 2 — Decisions (questions → consolidated ADRs)

Distill the 38 `questions/` deep-dives + `proposed-shape.md` into ~6 **accepted** Decision entities
that _declare the API_. Consolidate hard — the question docs stay as the provenance trail.

| Proposed Decision (`open/accepted`) | Declares | Folds |
|---|---|---|
| `D · finding-model` | finding id namespace + planes, `pos`, Zod→line remap, merge order, `Ctx` factory | A1 A2 A3 A4 E3 |
| `D · projection` | `DocTree`, remark-gfm, fence-opacity, depth-jump, no-hoist, `lineForPath`, `mdast` | D1 D2 D3 D4 E2 |
| `D · structure-plane` | section grammar findings, block/anchor family, key collisions | B1–B5 C5 F3 F4 |
| `D · content-plane` | `content/*` leaf ids, table extra-columns, code lang, `frontmatter/*` ids | C1 C2 C3 C4 E1 |
| `D · consumption-oom` | `read`/`validate`/`tree`, `ContractError`, `byAnchor`, view types, dual-key, `text(scope)`, doc↔tree | F1 F2 U1–U9 |
| `D · fidelity-and-packaging` | Kind enum, optional Today, post-mortem `docRule`, milestone tightness; op boundary, Obsidian dialect, refuse template-gen; **single-package lib + CLI shape** (`exports` + `bin`, `core ↛ cli`, runner-as-library) | G1–G4 + the README ADR + Package & CLI shape |

- [ ] Confirm the consolidation map (target ~6, not 38).
- [ ] Write each ADR; tag the source question ids it subsumes.
- [ ] **`proposed-shape.md` disposition:** port as the canonical API spec the ADRs point at (a
      `reference` entity), or distribute it into the ADRs — pick one.

## Phase 3 — Milestones (implementation-detail levels)

Milestones = the **levels of implementation detail**, ascending. `version` is the roadmap order.

| Proposed Milestone | Level | Scope | `version` |
|---|---|---|---|
| `M · scaffold` | L0 | package skeleton; S6/S7 spikes (projection + Zod→line remap) prove the plumbing | 0.1.0 |
| `M · projection` | L1 | parse → `DocTree`: remark-gfm, micromark Obsidian ext, §2 invariants | 0.2.0 |
| `M · structure-plane` | L2 | tree-grammar: section sequence, block/anchor family, collisions | 0.3.0 |
| `M · content-plane` | L3 | Zod leaves: frontmatter + typed tables/lists/code, `content/*` findings | 0.4.0 |
| `M · rules-cross-plane` | L4 | named-rule registry, `docRule`, cross-file (`depends_on`, path-moved) | 0.5.0 |
| `M · oom-consumption` | L5 | typed model: `read`/`validate`, views, `byAnchor`, dual-key | 0.6.0 |
| `M · corpus-runner` | L6 | `runner` library API + `markdown-contract` CLI (`bin`): dir→contract config, SARIF/CI; validates the SDLC corpus end-to-end (closes `DR · validate-sdlc-corpus`) | 0.7.0 |

- [ ] Confirm the ladder + version order.
- [ ] Write each `M-NNNN` (Goal / Success criteria / Deliverables → tasks).

## Phase 4 — Implementation plans (Tasks)

Each milestone's plan is its Task set — the implementation plan lives in Task bodies.

- [ ] Per milestone, draft `T-NNNN` tasks (Today / Proposed / Approach / Files-to-touch / Acceptance
      criteria / Out-of-scope).
- [ ] Set the `depends_on` graph (projection → structure → content → rules → oom → runner).
- [ ] List each milestone's tasks in its `tasks:` frontmatter.

## Phase 5 — Implement

- [ ] Build milestone by milestone (L0 → L6). Spikes (S6/S7) land first as `M · scaffold` tasks.
- [ ] Each milestone closes its driver evidence — the carried-over example cases become the test
      suite that proves the use-case.
- [ ] Promote the **Deferred / future** items (Appendix A) into milestones as they come due — the
      CLI corpus runner is already `M · corpus-runner`; severity-override and severity-drives-type
      are candidate L4/L5 tasks.

## Appendix A — API design decision log (closed: Phases A–U)

The settled API-design review — 38 decisions across cross-cutting foundations (A), grammar (B),
leaves (C), projection (D), frontmatter (E), OOM (F), corpus fidelity (G), the apply/build pass (H),
and consumption (U) — all resolved and folded into `proposed-shape.md`. Kept verbatim below as the
provenance the Phase 2 ADRs distil. Each item links its `questions/<id>.md` deep-dive.

## Phase A — Cross-cutting foundations (unblock the rest)

- [x] **A1 · [Finding-id namespace + registry](questions/A1-finding-id-namespace.md).** Adopt a flat
      `area/name` id scheme and enumerate a central registry (`structure/*`, `content/*`,
      `frontmatter/*`, `table/*`, `list/*`, `code/*`)? Today only a handful are named.
      _Surfaced: most cases._ — **Resolution:** slash-delimited `area/…/name`, central `FINDINGS`
      registry, 5 areas; `content` sub-segments by leaf type (`content/<leaf>/<check>`). See
      [questions/A1](questions/A1-finding-id-namespace.md).
- [x] **A2 · [`pos` for absence-class findings](questions/A2-pos-for-absence-findings.md).** A
      missing section / anchor / column has no node. Make `Finding.pos` optional, or define a
      fallback (parent heading → first body heading → line 1)?
      _Surfaced: 01a, 02a, 06a, 14b, 16, 18b._ — **Resolution:** `Finding.pos` optional; localize to
      nearest existing container, omit (document-level) when nothing contains the absence. See
      [questions/A2](questions/A2-pos-for-absence-findings.md).
- [x] **A3 · [S7 Zod-issue → line remap scope](questions/A3-zod-issue-line-remap.md).** Does the
      issue-path → SourcePos remap cover leaf cell / item / key paths (`[row, col]`, item index,
      frontmatter key), not just section paths? Commit it, or keep gated but define the contract.
      _Surfaced: 07a, 11, 11a, 12a, 20b._ — **Resolution:** Option 2 — commit the remap (leaf Zod
      path → projection node's `pos`, line granularity); present-but-wrong → exact line, absent → A2
      container; S7 proves the plumbing. See [questions/A3](questions/A3-zod-issue-line-remap.md).
- [x] **A4 · [Doc self-bugs (quick)](questions/A4-doc-self-bugs.md).** §4 returns
      `{ findings, value }` but §6 destructures `{ findings, doc }` — pick one key. `Ctx` is
      referenced but never defined. _Surfaced: 16, 18b._ — **Resolution:** key is `doc` (rename
      `value`→`doc`); `Ctx` = rule-author finding factory
      `{ path; finding({id,message,level?,pos?}) }` (engine fills path/level/pos; engine-internal
      findings bypass it). See [questions/A4](questions/A4-doc-self-bugs.md).

## Phase B — Grammar findings

- [x] **B1 · [section-missing](questions/B1-section-missing.md).** Canonical id
      (`structure/section-missing`?) + message; for an absent `oneOf`, list all spellings or just
      the canonical one, and one group finding or one per member? _01a, 02a, 06a, 08a._ —
      **Resolution:** `structure/section-missing` (error); one finding per missing slot; a missing
      `oneOf` lists all spellings in one message. See
      [questions/B1](questions/B1-section-missing.md).
- [x] **B2 · [duplicate + cross-alias](questions/B2-duplicate-and-cross-alias.md).**
      `structure/duplicate-section` pos = first / second / each? Two members of one `oneOf` both
      present → reuse duplicate-section or mint `structure/oneOf-ambiguous`? _03a, 06b._ —
      **Resolution:** duplicate heading → `structure/duplicate-section`, one finding per extra
      occurrence at its line; two `oneOf` members → distinct `structure/oneOf-ambiguous` at the
      later member. See [questions/B2](questions/B2-duplicate-and-cross-alias.md).
- [x] **B3 · [unpermitted unknown section](questions/B3-unpermitted-unknown-section.md).** Unknown
      before `gap()` / under `allowUnknown:false` → its own id (`structure/unknown-section`) or
      folded into `structure/section-order`? _05, 21b._ — **Resolution:** distinct
      `structure/unknown-section` (error) at the offending heading; fires only where unknowns are
      disallowed. See [questions/B3](questions/B3-unpermitted-unknown-section.md).
- [x] **B4 · [gap-count](questions/B4-gap-count.md).** `gap({min,max})` out-of-range id / message /
      pos; malformed `min > max` = build error or document finding? _05b._ — **Resolution:** ids
      accepted — `structure/gap-count` (per-doc) + `contract/malformed` (build-time) — but
      `gap({min,max})` bounds may be cut; gate `gap-count` on the feature landing. See
      [questions/B4](questions/B4-gap-count.md).
- [x] **B5 · [multi-section disorder](questions/B5-multi-section-disorder.md).** Several recognized
      sections jointly out of order → one finding per displaced section or one for the first
      inversion? _04a, 19a._ — **Resolution:** one `structure/section-order` per out-of-order
      section (a clean swap → one); not first-inversion- only. See
      [questions/B5](questions/B5-multi-section-disorder.md).

## Phase C — Leaf findings

- [x] **C1 · [content/* namespace + levels](questions/C1-content-namespace-levels.md).** Enumerate
      content-leaf ids (`content/max-words`, `table/min-rows`, `table/column-mismatch`,
      `list/every-item`, `list/min-items`, `code/lang`, `table/cell`) + a default level each.
      _09a, 10a, 10b, 11, 11a, 12a, 13a, 20b._ — **Resolution:** `content/*` registry block as
      proposed; default `error`, except `content/prose/max-words` = `warn`; all overridable. See
      [questions/C1](questions/C1-content-namespace-levels.md).
- [x] **C2 · [table extra columns](questions/C2-table-extra-columns.md).** Add
      `extraColumns?: "ignore" | "error"` to `table()` (default?), so the extra-column failure is
      reachable; missing vs extra = one directional id or two? _10b, 10c._ — **Resolution:**
      `extraColumns?: "ignore"|"error"` (default `ignore`); two ids `content/table/column-missing` +
      `content/table/column-extra` (renamed `column-mismatch` → `column-missing`); columns stay
      flat. See [questions/C2](questions/C2-table-extra-columns.md).
- [x] **C3 · [per-row/item/cell pos + aggregation](questions/C3-per-element-pos-aggregation.md).**
      One finding per failing cell/item or aggregate per row/column? Localize to the cell
      (`SourcePos.col`) in v1 or defer? Give `ListItem` a `pos`. _11, 11a, 12a, 20b._ —
      **Resolution:** one finding per failing cell/item (Zod issue → line via A3); cell
      character-`col` deferred; `ListItem` gains `pos`. See
      [questions/C3](questions/C3-per-element-pos-aggregation.md).
- [x] **C4 · [code lang](questions/C4-code-lang.md).** Absent info-string vs wrong tag — same id?
      `warn` (absent) vs `error` (wrong)? _13a._ — **Resolution:** one id `content/code/lang`
      (error) for both wrong-tag and absent; message renders the received value; no split. See
      [questions/C4](questions/C4-code-lang.md).
- [x] **C5 · [missing block + gap content](questions/C5-missing-block-gap-content.md).** "Declared
      content leaf finds no matching block" (a section with no table) → `structure/table-missing` (+
      list/code siblings)? Should `gap()` accept a per-admitted-section spec (`{ each: ... }`), or
      steer that to a parent `rule()`? _21, 21a._ — **Resolution:** declared leaf, no block →
      `structure/block-missing` (leaf-agnostic; **reclassified from `content/<leaf>/missing` per
      F3-B** — block presence/kind is structural) at the section heading; per-admitted-section
      content → a parent `rule()`, not `gap({each})`. See
      [questions/C5](questions/C5-missing-block-gap-content.md).

## Phase D — Projection (S6)

- [x] **D1 · [remark-gfm](questions/D1-remark-gfm.md).** Commit `remark-gfm` as the dependency that
      yields `table`/`list` nodes (promote from spike). _10, 12, 21a._ — **Resolution:** bring in
      `remark-gfm` ^4 (tables + task-list checkboxes); stay on unified/remark at current majors;
      `markdown-rs` is the rust-ontogen-plane option only. See
      [questions/D1](questions/D1-remark-gfm.md).
- [x] **D2 · [fence-awareness](questions/D2-fence-awareness.md).** Promote "a `##` line inside a
      fenced code block is not a heading" from an S6 open question to a committed §2 invariant.
      _21b._ — **Resolution:** committed §2 invariant — fenced `code` value is opaque, never
      re-scanned for headings/anchors/tables. See [questions/D2](questions/D2-fence-awareness.md).
- [x] **D3 · [heading-depth jump](questions/D3-heading-depth-jump.md).** H2→H4: attach as a direct
      child (no synthesized intermediate); emit `structure/heading-depth-jump` as warn or error?
      _14a._ — **Resolution:** attach as direct child; emit `structure/heading-depth-jump` (warn) —
      the skip cascades into confusing wrong-level matches, so we name the root cause
      (self-contained; benign rumdl MD001 overlap). See
      [questions/D3](questions/D3-heading-depth-jump.md).
- [x] **D4 · [block in blockquote/list](questions/D4-block-in-blockquote-or-list.md).** A
      table/list/code nested in a blockquote or list item → error, warn + flatten, or silent hoist?
      _21a._ — **Resolution:** do **not** hoist (not at this time) — nested blocks aren't
      section-level; a declared leaf then finds none → C5's `structure/block-missing` (no new id;
      nested-aware message deferrable). See
      [questions/D4](questions/D4-block-in-blockquote-or-list.md).

## Phase E — Frontmatter

- [x] **E1 · [frontmatter/* ids](questions/E1-frontmatter-ids.md).** Reserve `frontmatter/enum`,
      `frontmatter/unknown-key`, `frontmatter/type`, `frontmatter/required`. _07a._ —
      **Resolution:** `frontmatter/*` registry keyed by Zod issue code — required / type / enum /
      unknown-key / refine, and `pattern/<kind>` sub-segmented by the Zod discriminator
      (regex/url/datetime/…); all error, overridable. See
      [questions/E1](questions/E1-frontmatter-ids.md).
- [x] **E2 · [per-key lines](questions/E2-per-key-lines.md).** Add a key→line index to
      `DocTree.frontmatter` (`keyLines` or `lineForPath()`) for per-field localization. _07a._ —
      **Resolution:** `lineForPath(path)` (handles nesting like `["prs",0]`), engine-built from a
      position-aware YAML parse; not a flat `keyLines`. See
      [questions/E2](questions/E2-per-key-lines.md).
- [x] **E3 · [merge order](questions/E3-merge-order.md).** Document in §4: findings sorted by
      ascending `pos.line`, frontmatter before body on ties, stable across runs. _08a, 19a._ —
      **Resolution (v1):** ascending `pos.line`; no-`pos` first; tie-break col → plane order
      (frontmatter→structure→content→rule) → emission; stable across runs. See
      [questions/E3](questions/E3-merge-order.md).

## Phase F — OOM

- [x] **F1 · [read() + value](questions/F1-read-and-value.md).** Define
      `ContractError extends Error { findings }`; `read()` throws on error-level only (warn too?);
      state `value` is undefined iff an error-level finding exists. _18, 18b._ — **Resolution:**
      `ContractError extends Error { findings }`; `read()` throws on error only (warn doesn't);
      `doc` present iff no error finding. `validate` also returns `tree: DocTree` (+ `tree.mdast`)
      as an analysis artifact; deeper Zod-result threading deferred. See
      [questions/F1](questions/F1-read-and-value.md).
- [x] **F2 · [byAnchor types](questions/F2-byanchor-types.md).** Doc-root
      `byAnchor(id): BlockView | undefined` + narrowing to `TableView` (or a typed
      `byAnchorTable()`); search all sections or root only? _15b._ — **Resolution:** Uniform
      `byAnchor(id): BlockView | undefined` (doc = whole document, section = within);
      `kind`-discriminated union, narrow via `if (b?.kind === "table")`.
      **Union-only — no `byAnchorTable()`.** Missing → `undefined`;
      declared-anchor-resolves-to-nothing is F3.
- [x] **F3 · [anchor binding](questions/F3-anchor-unresolved.md).** A content-record table whose
      declared `anchor` resolves wrong → absent / wrong-kind / wrong-position. _15a._ —
      **Resolution:** three states, all **structural** (decision B): absent → reuse
      `structure/anchor-missing` (kept over `anchor-unresolved`); wrong-kind → new
      `structure/block-kind` (leaf-agnostic, `node.kind === expected`, pos = offending block);
      wrong-position → falls to `anchor-missing`. All error. Unifies with C5's reclassified
      `structure/block-missing` into one structure-plane block/anchor family; §3: a leaf helper =
      structural kind-gate + content Zod.
- [x] **F4 · [camelCase collision](questions/F4-camelcase-collision.md).** Build-time throw vs lazy
      finding; per level or whole tree; normalization rule; runtime mirror. _18a._ — **Resolution:**
      declared×declared → build-time throw `contract/key-collision`; checked **per sibling level**;
      normalization **Unicode-aware** (`/[^\p{L}\p{N}]+/u`, locale-independent, lodash-camelCase),
      invalid-id/caseless → exact-bracket fallback;
      **new runtime `structure/key-collision` (error by default, overridable)** for an unknown peer
      shadowing a declared key (complements B2).

## Phase G — Modelling fidelity (real corpus)

- [x] **G1 · [Kind enum](questions/G1-kind-enum.md).** Align §5.2 to the live `Kind` set. _20._ —
      **Resolution:** `z.enum(["new","modify","delete"])` — the sketch bends to the corpus
      (`parse-touchpoints.ts` `VALID_KINDS`, which the contract replaces); template untouched.
- [x] **G2 · [optional Today](questions/G2-optional-today.md).** `## Today` optional + is the
      `Current state` alias real? _20._ — **Resolution:** `optional(section("Today"))` —
      `required: false` in `body-schema.yaml:26`; `Current state` is a phantom heading (zero corpus
      occurrences) so the dead `oneOf` alias collapses to a plain `section`.
- [x] **G3 · [completion via frontmatter](questions/G3-completion-via-frontmatter.md).** Completion
      is frontmatter (`completion_note`), not a body section; what's the real cross-plane `docRule`?
      _20a._ — **Resolution:** drop the phantom `## Completion note` body section + its docRule
      (completion is frontmatter-only, already in `schema.ts:207`); the
      **real cross-plane docRule is the post-mortem** (PR #464) — body grammar declares
      `Post-mortem` (3 ordered H3s), a `docRule` gates its presence on `status`. `docRule` stays in
      v1.
- [x] **G4 · [milestone/skill tightness](questions/G4-milestone-skill-tightness.md).** Model the
      lenient schema as-is or tighter? Child structure on gap()-admitted subsections? _21._ —
      **Resolution:** model **level-by-level at the schema's own tightness** (milestone H2s tight;
      Deliverables' H3s `gap()`-open). **Child structure belongs to _declared_ sections only**;
      `gap()` carries no structural expectation and gains no `{ each }` — structure-on-free-form is
      a contradiction (sharpens C5 Part 2). Inspecting admitted sections = imperative `rule()`
      escape only.

## Phase H — Apply + build (after the decisions above)

- [x] **H1 · Fold deltas into proposed-shape.md** — **done (2026-06-19).** One deliberate pass
      applied all 29 decisions: A4 (`value`→`doc`, `Ctx` factory); §3 leaf = structural kind-gate +
      content Zod (F3), `extraColumns` (C2), `gap()` carries no child structure (G4); the
      structure-plane block/anchor family (`anchor-missing`/`block-missing`/`block-kind`/
      `key-collision`, C5 Part 1 content→structure); §2 invariants (D1–D4), `lineForPath` (E2),
      `tree.mdast`/`ListItem.pos`/`rowPos` (C3/F1); §4 `pos?` (A2), `validate→{findings,doc,tree}` +
      `read`/`ContractError` (F1), finding order (E3), finding planes (A1); §5.2 G1/G2/G3; §6 F2
      `byAnchor`, F4 collision + Unicode normalization; §7 spike scope narrowed. Inline
      `(F3)`/`(G1)` tags point each line at its decision.
- [x] **H2 · OOM-additive sharpening** — **done (2026-06-19).** §1 "the validator never depends on
      the model"; §6 OOM is "additive and optional" (built on demand via `read`/`validate().doc`);
      README consequence reframed (`doc`, additive — model can ship after the validator). Findings
      path = projection + Zod + grammar only.
- [x] **H3 · Build + exercise the consumption (OOM) tier — mirror the validation process.**
      **Done (2026-06-20):** 11 graded `examples/consumption/` cases (01–11) exercising the OOM API
      (`read`/`validate`/`tree`, dual-key `doc.body.X`, `SectionView`, `TableView`, `byAnchor` →
      `BlockView`, nested `.sections`, `body.unknown[]`, `ContractError`, the post-mortem shape),
      each linked to its validation sibling; they surfaced **9 consumption decisions (U1–U9)**
      (Phase U below, 9/9 resolved), **now folded into proposed-shape.md §6** —
      `ListView`/`BlockView`/`CodeView`/ `ParagraphView` defined, `kind` discriminants,
      `SectionGroup` dual-key, `text(scope)`, `doc.byAnchor`, the `doc`↔`tree` boundary.
- [x] **H4 · Patch affected validation examples** — **done (2026-06-20).** Patched 18 (`add`→`new`,
      `value`→`doc`, `ContractError`), 15a (`anchor-not-found`→`structure/anchor-missing` +
      `block-kind`), 20/20a (post-mortem + frontmatter `completion_note`, G1/G2/G3), 10b
      (`column-missing`), 10c (`extraColumns`/`column-extra`), 16/16a (post-mortem docRule), and the
      validation index labels.

## Phase U — Consumption (OOM) review

Resolves what the **consumer-read surface** (§6 OOM) adds on top of the validator (A–G). Surfaced by
[examples/consumption/](examples/consumption/); each item links a `questions/U<n>-…md` deep-dive;
decided deltas fold into proposed-shape.md §6 in one pass.
**Progress: 9 / 9 — all resolved and folded into §6 (2026-06-20).** (Consolidated here from the
former consumption-review-checklist.md.) Recommendations are pre-drafted in each `questions/U…` doc
— _proposed_ lines below are the standing recommendation pending your lock.

- [x] **U1 · [`ListView` shape](questions/U1-listview-shape.md).** §6 names `lists: ListView[]` but
      never defines it. _c04._ — **Resolution:** lean iterable mirror — `extends Iterable<ListItem>`
      + `{ ordered; items; length; pos }`; no `column()`/`find()`/`itemPos()` (items carry `pos`);
      drop the redundant `[Symbol.iterator]` line (and from `TableView`) at the §6 fold.
- [x] **U2 · [`BlockView` arms](questions/U2-blockview-arms.md).** Only the `table` arm is defined.
      _c07._ — **Resolution:** `BlockView = TableView | ListView | CodeView | ParagraphView`,
      `kind`-discriminated; add `kind` to `TableView`/`ListView`; thin
      `CodeView {kind,lang,value,pos}`
      + `ParagraphView {kind,text,pos}` mirroring `BlockNode`;
      `TableView<Row=Record<string,string>>`
      default; no `anchor` on views.
- [x] **U3 · [`sections` dual-key](questions/U3-sections-dual-key.md).** Is `doc.body.X.sections`
      dual-keyed like `doc.body`? _c08._ — **Resolution:** yes, dual-keyed recursively (typed keys +
      bracket + camelCase + `.section()` + `unknown[]`); fix §6's `Record<string,SectionView>` type.
- [x] **U4 · [`text()` flattening](questions/U4-text-flattening.md).** What does `text()` include?
      _c04._ — **Resolution:** parametrized `text(scope: "prose" | "all" = "prose")` — `"prose"`
      (default) = this section's `paragraph` prose only; `"all"` = full flattened subtree (all
      blocks
      + nested subsections) for search/indexing.
- [x] **U5 · [`unknown[]` shape](questions/U5-unknown-sections-shape.md).** Gap-admitted sections in
      `body.unknown`. _c09._ — **Resolution:** `body.unknown: SectionView[]`, positional, **always**
      `[]` (never undefined), holds both `gap()` and `allowUnknown` admissions; `.name` the only
      handle.
- [x] **U6 · [absent-optional access](questions/U6-absent-optional-access.md).** Reading an absent
      optional section. _c04, c11._ — **Resolution:** absent optional ⇒ `undefined` (the `?` key);
      present-empty ⇒ a view with empty `text()`; required keys are non-optional (absence is an
      error, F1).
- [x] **U7 · [`doc` root surface](questions/U7-doc-root-surface.md).** What `doc` exposes beyond
      `{frontmatter,body}`. _c02, c07._ — **Resolution:** `doc = { frontmatter, body, byAnchor }`;
      doc-wide `byAnchor` (F2); **no** `doc.tree`/`mdast` (those live on `validate().tree`, U9);
      positions on views. Nothing heavier until needs emerge.
- [x] **U8 · [dynamic `TableView`](questions/U8-dynamic-tableview.md).** Undeclared table typing.
      _c07, c05._ — **Resolution:** same interface, `Row = Record<string,string>` default; `string`
      cells; `column()`/`find()` typed `string`. Cell types come only from the contract.
- [x] **U9 · [`tree` vs `doc`](questions/U9-tree-vs-doc.md).** Which door for analysis? _c02._ —
      **Resolution:** `doc` = contract-typed reads (valid docs only); `tree` = raw mdast /
      unmodelled structure / **always returned** (even on invalid docs). State the boundary in §6.

## Deferred / future (not part of the current question work)

- [ ] **Config-driven CLI corpus runner.** A `markdown-contract` CLI that takes a declarative config
  (YAML/JSON) mapping **directories/globs → which contract applies**, validates a whole tree in one
  run, and aggregates findings with CI-friendly output (SARIF / JSON / human) and exit codes. E.g.:

  ```yaml
  # markdown-contract.yaml
  rules:
    - glob: "docs/planning/decisions/**/*.md"
      contract: "./contracts/decision.ts"
    - glob: "docs/planning/tasks/**/*.md"
      contract: "./contracts/task.ts"
  output: sarif
  ```

  Sits **above** the engine and the per-type contracts: the engine validates *one doc vs one
  contract*; this runner maps _a file tree → contracts_ and runs en masse — the concrete realization
  of D-0014's "generic, configurable, reusable-outside-this-repo" goal (SDLC's `entities validate`
  becomes one in-repo consumer of the same engine).

  **Boundary to preserve:** this does **not** reopen "TS not a YAML schema dialect." The _contracts_
  stay TypeScript + Zod; the declarative YAML here is only the runner's **file→contract mapping +
  output config** (orchestration, not schema) — where YAML/JSON is fine. The single-doc CLI surface
  is already anticipated by the D-0007 op adapters + Migration phase-5 SARIF/CI wiring; the **new**
  piece is the directory→contract mapping + batch/corpus run. Pick up _after_ the Phase C–G question
  work; consider promoting to its own backlog item.

- [ ] **Per-node severity overrides (validation).** Beyond the registry's per-id default level (A1)
      and the existing per-contract override (A4), let **most nodes in the contract tree** carry a
      `level:` override — e.g. `section("Why", { level: "warn" })`, per-leaf, per-rule — so a node's
      findings downgrade/upgrade from the registry default. Open: **granularity** (a node-wide level
      vs a per-finding-id map) and **inheritance** (independent per node vs cascade to children —
      lean independent). A pure extension of "severity is contract data" (A1/A4). For later
      assessment.

- [ ] **Severity drives the inferred OOM type.** The _level_ of an **absence** finding feeds back
      into `Infer<Contract>`: a required element whose absence is `error` → a **required** field
      (`why: SectionView`); downgraded to `warn` → an **optional** field (`why?: SectionView`).
      Toggling the override re-emits the inferred type, so the consumer's static type states exactly
      which fields are guaranteed. Applies only to the **absence/presence** class
      (`section-missing`, `anchor-missing`, `block-missing`); content-*shape* findings (bad
      enum, malformed table) don't change optionality. Reconcile with `optional()` into one rule —
      **optional-or-warn ⇒ optional; required-and-error ⇒ required**. The type-level machinery
      (per-node `level` literal → `T` vs `T | undefined`) is S7 territory and goes **beyond Zod**.
      Composes with the override above (two separate features). For later assessment.
