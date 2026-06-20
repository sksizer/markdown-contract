> Question C4 for [[D-0014-markdown-structure-validation|D-0014]] — `code({ lang })` failure shape.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# C4 · code lang

**Surfaced by:** [[13a-code-wrong-lang|13a]].

## The question

`code({ lang: "ts" })` requires a fenced code block tagged `ts`. It can fail two ways: a
**wrong tag** (```` ```js ````) or an **absent info-string** (a bare ```` ``` ````). Two bits:
**(1)** same finding id for both, or split; **(2)** is absent a softer `warn` than a wrong tag's
`error`?

## Recommendation — one id, `error`, message renders the received value

**One id: `content/code/lang` (error)** for both. It's a single assertion — "this block's language
must be `ts`" — and neither a bare fence nor `js` satisfies it. The *message* carries the difference
by rendering what was received:

- wrong tag → `Expected code language "ts", got "js"`
- absent → `Expected code language "ts", got none`

**Don't split absent vs wrong into two levels.** A registry id has one default level (A1); making
absent `warn` and wrong `error` would force *two ids* (`code/lang-missing` + `code/lang-wrong`) for
one rule — over-engineering for a code fence. An author who genuinely wants absent treated softer
overrides `level` per contract; the default stays a single `error`.

(Consistent with B-phase: one assertion → one id; the message renders the received value, exactly as
`section-order` / `frontmatter/enum` do.)

## Decision

**Resolved (2026-06-19).** One id `content/code/lang` (`error`) for both a wrong tag and an absent
info-string — one assertion ("language must be `ts`"); the message renders the received value
(`Expected code language "ts", got "js"` / `… got none`). No split into two ids or two levels; an
author who wants absent treated softer overrides `level` per contract. Fold into proposed-shape.md
at H1 (the `content/code/lang` registry entry + template).
