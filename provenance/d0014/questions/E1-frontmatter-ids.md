> Question E1 for [[D-0014-markdown-structure-validation|D-0014]] — the `frontmatter/*` finding
> registry. Part of the open-decision review (see ../review-checklist.md). Non-normative; records
> the decision, folded into proposed-shape.md at step H1.

# E1 · frontmatter/* ids

**Surfaced by:** [[07a-frontmatter-enum-and-unknown-key|07a]].

## The question

Frontmatter is validated by the per-type Zod schema (`schema.ts`). Each Zod failure becomes a
`frontmatter/*` finding (via the A3 remap), but only `frontmatter/enum` was ever named. Enumerate
the `frontmatter/*` registry block + default levels.

## Proposed registry (the `frontmatter/*` block)

Default `error` (frontmatter is the strict contract); all overridable. The id is chosen from the Zod
**issue code**:

| Zod issue | id | fires when |
|---|---|---|
| `invalid_type`, received `undefined` | `frontmatter/required` | a required field is absent |
| `invalid_type` (other) | `frontmatter/type` | wrong scalar type (string vs number, …) |
| `invalid_enum_value` | `frontmatter/enum` | value outside the allowed set |
| `invalid_string` (regex / url / email / datetime / …) | `frontmatter/pattern/<kind>` | a `.regex()` or string-format check fails; `<kind>` = the Zod discriminator |
| `unrecognized_keys` (`.strict()`) | `frontmatter/unknown-key` | a key not in the schema |
| `custom` (`.superRefine` / `.refine`) | `frontmatter/refine` | a within-frontmatter conditional / cross-field rule; message from the refinement |

`pos` per A2 + E2 (the frontmatter key's line once E2 lands; the frontmatter block otherwise).

**`pattern` sub-segments by kind** (consistent with A1's `content/<leaf>/<check>` depth): Zod's
`invalid_string` issue carries a `validation` discriminator, so the engine appends it mechanically —
`frontmatter/pattern/regex` (custom `.regex()`), `frontmatter/pattern/url`,
`frontmatter/pattern/datetime`, `frontmatter/pattern/date`, `frontmatter/pattern/email`, … So a
consumer can filter `frontmatter/pattern/*` (all format failures) or `frontmatter/pattern/url` (just
URLs). The corpus leans on `regex` / `datetime` / `date` / `url`, so the granularity pays off. The
other ids stay **flat** — `type` / `enum` / `required` / `unknown-key` sub-kinds are clear from the
message, so depth there would be noise. (Rule: add a segment only where the sub-kinds are
meaningfully distinct problems a consumer would filter separately.)

(Note: the conditional `closed/* ⇒ completion_note` is modelled as a cross-plane `docRule`, not a
frontmatter `.superRefine` — see G3. `frontmatter/refine` is for refinements *within* the
frontmatter schema.)

## Decision

**Resolved (2026-06-19).** The `frontmatter/*` registry block, keyed by Zod **issue code** (all
default `error`, overridable): `invalid_type`+received-`undefined` → `frontmatter/required`;
`invalid_type` → `frontmatter/type`; `invalid_enum_value` → `frontmatter/enum`; `invalid_string`
→ `frontmatter/pattern/<kind>` (kind = the Zod `invalid_string` discriminator: `regex` for custom
patterns, `url`/`email`/`datetime`/`date`/… — sub-segmented like A1's `content/<leaf>/<check>`);
`unrecognized_keys` → `frontmatter/unknown-key`;
`custom` (`.superRefine`/`.refine`) → `frontmatter/refine`. The message borrows the Zod text; `pos`
via E2. Fold into proposed-shape.md at H1 (the `frontmatter/*` registry block + the issue-code → id
map).
