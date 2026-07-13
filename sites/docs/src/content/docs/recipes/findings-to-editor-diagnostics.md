---
title: Surface findings as editor diagnostics
description: You're building an editor extension or LSP server and want contract violations as squiggles. Findings are plain data — one small mapper turns them into LSP diagnostics.
---

**The situation.** Your team's notes have a contract, and CI enforces it — but
CI is too late. You're building an editor extension (or a small LSP server) and
want violations to show up as **squiggles while people type**: red for errors,
yellow for warnings, hover for the message, the rule id as the diagnostic code.

A finding is already almost a diagnostic: `id`, `level`, `path`, an optional
`pos: { line, col }`, and a ready-to-print `message` (the full shape is in the
[findings reference](/reference/findings/)). The only real work is coordinate
translation — findings are **1-based**, LSP ranges are **0-based** — and a
three-entry severity map.

## 1. A contract and a broken buffer

The contract is the one your CLI runs already; the server just loads the same
file. A small one for this walkthrough:

```yaml
# note.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    title: { type: string, min: 1 }
body:
  sections:
    - section: Summary
      content: { maxWords: 8 }
    - section: Steps
      content: { list: { everyItem: checkbox } }
```

And a buffer someone is mid-edit on — no frontmatter yet, a summary past the
cap on line 5, and an H4 jammed under an H2 on line 12:

```markdown
# Deploy

## Summary

This buffer is mid-edit and its summary already runs past the cap.

## Steps

- [ ] push the tag
- [ ] watch the pipeline

#### Verify
```

## 2. Map Finding → Diagnostic

One function. The three things it encodes: the 1-based → 0-based shift, the
`error`/`warn`/`report` → `1`/`2`/`3` severity map, and the rule that a finding
with **no `pos`** (a whole-document finding) pins to the document start.

```ts
// diagnostics.ts — map contract findings to LSP diagnostics
import { readFileSync } from "node:fs";
import type { Finding } from "markdown-contract";
import { loadContractFile } from "markdown-contract/declarative";

// LSP DiagnosticSeverity: Error = 1, Warning = 2, Information = 3
const SEVERITY = { error: 1, warn: 2, report: 3 } as const;

interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 1 | 2 | 3;
  code: string;
  source: "markdown-contract";
  message: string;
}

function toDiagnostic(f: Finding): Diagnostic {
  // Finding.pos is 1-based (line, optional col); LSP positions are 0-based.
  // A finding with no pos is a whole-document finding — pin it to the start.
  const line = (f.pos?.line ?? 1) - 1;
  const character = (f.pos?.col ?? 1) - 1;
  return {
    range: { start: { line, character }, end: { line, character } },
    severity: SEVERITY[f.level],
    code: f.id,
    source: "markdown-contract",
    message: f.message,
  };
}

// What the server does on didOpen / didChange: validate the buffer text.
const noteContract = loadContractFile("note.contract.yaml");
const text = readFileSync("notes/deploy.md", "utf8"); // stand-in for the buffer
const { findings } = noteContract.validate(text, { path: "notes/deploy.md" });

console.log(JSON.stringify(findings.map(toDiagnostic), null, 2));
```

In a real server the `readFileSync` line is your text-document manager —
`validate` takes the buffer **string** directly, so you never round-trip
through a temp file. `loadContractFile` is the declarative front-end's loader
(see the [YAML reference](/reference/yaml/)); it returns the same `Contract`
object the TypeScript combinators build, with the `validate` door documented in
the [API reference](/reference/api/).

:::note
The package is not yet on npm — build it from source and link/pack it so the
`markdown-contract` imports resolve; see [Getting started](/getting-started/).
:::

## 3. Run it

Against the buffer above, the mapper prints this diagnostics array — three
findings, three squiggles:

```sh
bun diagnostics.ts
```

```json
[
  {
    "range": {
      "start": {
        "line": 0,
        "character": 0
      },
      "end": {
        "line": 0,
        "character": 0
      }
    },
    "severity": 1,
    "code": "frontmatter/required",
    "source": "markdown-contract",
    "message": "frontmatter field ‘title’ is required"
  },
  {
    "range": {
      "start": {
        "line": 4,
        "character": 0
      },
      "end": {
        "line": 4,
        "character": 0
      }
    },
    "severity": 1,
    "code": "content/max-words",
    "source": "markdown-contract",
    "message": "paragraph runs to 12 words; expected at most 8"
  },
  {
    "range": {
      "start": {
        "line": 11,
        "character": 0
      },
      "end": {
        "line": 11,
        "character": 0
      }
    },
    "severity": 2,
    "code": "structure/heading-depth-jump",
    "source": "markdown-contract",
    "message": "heading ‘Verify’ (H4) skips a level under ‘Steps’ (H2)"
  }
]
```

Reading it back against the buffer: the overlong summary sits on source line
**5** and lands at LSP line **4**; the H4 on source line **12** lands at line
**11** as a `severity: 2` warning (yellow, not red). And the first diagnostic
is the interesting one — the buffer has no frontmatter at all, so
`frontmatter/required` has **no `pos` to point at**, and the mapper pins it to
`0:0`, the document start. That's the right home for whole-document findings:
the squiggle sits on the first line, which for a missing-frontmatter finding is
exactly where the fix goes.

:::tip
The ranges above are zero-length (`start === end`). That's valid LSP — clients
like VS Code render an empty range by highlighting the word at that position.
If you want full-line squiggles instead, you have the buffer text in hand:
set `end.character` to that line's length.
:::

## 4. Wire it into the server loop

The mapper is the whole integration; the rest is standard LSP plumbing. On
`didOpen` and `didChange`, validate the buffer and publish:

- **Validate the string you were given.** `validate` never throws — it's the
  "show me everything" door, safe to call on every keystroke against a
  half-typed document. (`read()` is the throwing door; wrong tool for a server
  loop — see the [API reference](/reference/api/).)
- **Publish even when the array is empty.** `publishDiagnostics` replaces the
  previous set per URI, so a clean validation must publish `[]` — otherwise
  the squiggles from three edits ago linger after the user fixes them.
- **The URI is yours, not the finding's.** `f.path` is just whatever you passed
  as `ctx.path`; publish under the text document's own URI and pass the same
  value in as `path` so logs and diagnostics agree.

## What's happening

- **Two coordinate systems, one subtraction.** A finding's `pos` is a 1-based
  `line` with an optional 1-based `col` — the same numbers the CLI prints in
  `path:line`. LSP `Position`s are 0-based, hence `- 1` on both axes, with
  `?? 1` supplying the default when `col` (or all of `pos`) is absent.
- **Severity is contract data.** `level` is resolved from the rule id, not
  chosen at the call site — so `structure/heading-depth-jump` is `warn`
  (severity 2) in every document, and your extension needs no per-rule
  configuration. `report` maps to 3 (Information); no built-in rule defaults to
  it, so you'll only see it from custom rules that opt in. Levels and the full
  id catalog: [findings reference](/reference/findings/).
- **`code` + `source` do the editor-side ergonomics.** The stable rule id as
  the diagnostic `code` lets users filter or suppress per rule; `source:
  "markdown-contract"` labels the hover so your squiggles are distinguishable
  from the spellchecker's.
- **Same data, other renderers.** The CLI's `--format sarif` is this exact
  mapping aimed at code scanning instead of an editor — and a whole-workspace
  diagnostics pass is one `runCorpus` call, grouping the returned findings by
  `f.path` into one publish per file. See
  [Embed & Automate](/examples/embed-and-ci/).

## Next

- [Run validation inside your own build script](/recipes/validate-in-your-own-build/)
  — the same in-process findings feeding a build gate instead of an editor.
- [Errors block the build, warnings annotate the PR](/recipes/warnings-as-pr-annotations/)
  — the severity map's CI twin, via SARIF.
- [Map findings to editor diagnostics](/examples/embed-and-ci/embed-and-ci-10/)
  — the compact example this recipe expands on.
