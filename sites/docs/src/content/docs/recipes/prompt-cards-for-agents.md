---
title: Feed an agent prompt-cards guaranteed to parse
description: Your agent's prompt templates live as markdown cards. One contract makes a malformed card fail in review — so the runtime path reads typed data with no try/catch.
---

**The situation.** Your AI agent's prompt templates live as markdown "cards" in
`cards/` — one file per task, with a model config in frontmatter, the system
prompt as prose, and a few-shot block the runtime feeds in as JSON. Today the
loader is a pile of regexes, and a card with a typo'd frontmatter key or a
malformed examples block doesn't fail in review — it fails **at runtime, in
production**, when the agent picks it up.

The fix is one contract with two doors: CI uses the never-throws door to catch
the bad card at review time, and the runtime uses the typed door — `read()` —
which hands back exactly the payload the agent consumes.

## 1. The card

A card looks like this — `name`, `model`, and `temperature` up top, then a
**System** prompt, a **Guardrails** checklist, and an optional **Examples**
section whose JSON block carries a `^examples` anchor so the loader can address
it:

````md
---
name: support-triage
model: claude-opus-4-8
temperature: 0.2
---

## System

You are the triage assistant for the support inbox. Classify each incoming
message, draft a first reply, and route anything you cannot resolve.

## Guardrails

- [ ] Cite a docs page for every claim about product behavior
- [ ] Escalate to a human when the customer mentions a legal issue
- [ ] Never promise a refund or a delivery date

## Examples

```json
[
  { "input": "Where did my invoice go?", "label": "billing" },
  { "input": "The export button 500s every time", "label": "bug" }
]
```
^examples
````

## 2. Define the contract in code

Because the consumer is TypeScript, author the contract in TypeScript — the
same definition that validates the card also types the read-back. Frontmatter
is a Zod schema; the body grammar pins the three sections:

```ts
// prompt-card.ts — the contract, defined once, imported by CI and runtime alike.
import { contract, sections, section, optionalSection, list, code } from "markdown-contract";
import { z } from "zod";

export const PromptCard = contract({
  frontmatter: z
    .object({
      name: z.string().min(1),
      model: z.string().min(1),
      temperature: z.number().min(0).max(2),
    })
    .strict(),
  body: sections({ order: "strict", allowUnknown: false }, [
    section("System"),
    section("Guardrails", { content: list({ everyItem: "checkbox", minItems: 1 }) }),
    optionalSection("Examples", {
      content: code({ lang: "json" }),
      anchor: "examples",
    }),
  ]),
});
```

`anchor: "examples"` makes the `^examples` block-id part of the contract: an
Examples section without it is a `structure/anchor-missing` error, so the
loader can rely on `byAnchor("examples")` resolving. (An absent Examples
section is fine — the slot is optional.)

## 3. Read a card into the payload

`read()` is the "give me the data or fail" door: it returns the typed card, or
throws. The loader is therefore straight-line code — every access below is
statically typed by the contract above:

```ts
// load-card.ts — the runtime loader: typed card in, JSON payload out.
import { readFileSync } from "node:fs";
import { PromptCard } from "./prompt-card";

export function loadCard(path: string) {
  // read() returns the typed Doc, or throws ContractError — no defensive checks needed here.
  const card = PromptCard.read(readFileSync(path, "utf8"), { path });

  const examples = card.body.section("Examples")?.byAnchor("examples");
  return {
    name: card.frontmatter.name,
    model: card.frontmatter.model,
    temperature: card.frontmatter.temperature,
    system: card.body.System.text(),
    guardrails: card.body.Guardrails.lists[0].items.map((item) => item.text),
    examples: examples?.kind === "code" ? JSON.parse(examples.value) : [],
  };
}

console.log(JSON.stringify(loadCard(process.argv[2]), null, 2));
```

Run it on the card from step 1 and you get the exact JSON an agent runtime
would consume:

```sh
bun load-card.ts cards/support-triage.md
```

```json
{
  "name": "support-triage",
  "model": "claude-opus-4-8",
  "temperature": 0.2,
  "system": "You are the triage assistant for the support inbox. Classify each incoming message, draft a first reply, and route anything you cannot resolve.",
  "guardrails": [
    "Cite a docs page for every claim about product behavior",
    "Escalate to a human when the customer mentions a legal issue",
    "Never promise a refund or a delivery date"
  ],
  "examples": [
    {
      "input": "Where did my invoice go?",
      "label": "billing"
    },
    {
      "input": "The export button 500s every time",
      "label": "bug"
    }
  ]
}
```

:::note
At runtime the body group is dual-keyed — `card.body.system` (camelCase alias)
resolves the same section as `card.body.System`. The *statically typed* keys
are the exact heading names, though, and an optional slot reads back through
`.section(name)` — that's why the loader spells it `card.body.System` and
`card.body.section("Examples")`. See [the model reference](/reference/model/).
:::

## 4. When a card is malformed

Say someone commits `cards/summarize-thread.md` with `temperature: 3` and a
Guardrails list written as plain bullets instead of checkboxes. `read()` throws
`ContractError`, which carries the error-level findings as data — each one
pinned to a source line:

```ts
import { readFileSync } from "node:fs";
import { ContractError } from "markdown-contract";
import { PromptCard } from "./prompt-card";

const path = "cards/summarize-thread.md";
try {
  PromptCard.read(readFileSync(path, "utf8"), { path });
} catch (err) {
  if (!(err instanceof ContractError)) throw err;
  for (const f of err.findings) {
    console.error(`${f.path}:${f.pos?.line} ${f.id} — ${f.message}`);
  }
}
```

```text
cards/summarize-thread.md:4 frontmatter/type — frontmatter field ‘temperature’ is too large
cards/summarize-thread.md:13 content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
cards/summarize-thread.md:14 content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
```

That catch block is for demonstration — the point of this recipe is that the
**runtime never needs it**, because CI refuses to merge a card that would make
`read()` throw.

## 5. Gate the cards in CI

The gate imports the *same* contract module and runs the corpus runner over
`cards/` — no YAML, no separate source of truth:

```ts
// check-cards.ts — the CI gate: validate every card, exit non-zero on any error.
import { defineConfig, runCorpus, formatFinding } from "markdown-contract";
import { PromptCard } from "./prompt-card";

const { findings, exitCode, stats } = runCorpus(
  defineConfig({
    rules: [{ include: ["cards/**/*.md"], contract: PromptCard, name: "prompt-card" }],
  }),
);

console.log(`${stats.filesMatched} card(s) checked`);
for (const f of findings) console.error(`${f.path} ${formatFinding(f)}`);
process.exit(exitCode);
```

With the broken card from step 4 in the tree:

```text
2 card(s) checked
cards/summarize-thread.md [frontmatter/type] (line 4): frontmatter field ‘temperature’ is too large
cards/summarize-thread.md [content/list/item-kind] (line 13): list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
cards/summarize-thread.md [content/list/item-kind] (line 14): list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
```

The script exits **1**, so the PR fails; with only clean cards it prints
`1 card(s) checked` and exits **0**. Wire it in as one step:

```yaml
# .github/workflows/cards.yml
name: cards
on: [push, pull_request]
jobs:
  prompt-cards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then run the gate:
      - run: bun check-cards.ts
```

## What's happening

- **Two doors, one contract.** `validate()` returns findings as data and never
  throws — that's what `runCorpus` drives in CI. `read()` returns the typed
  `Doc` or throws `ContractError` — that's the runtime door. Both run the same
  validation pass, so a card that survives CI cannot make `read()` throw. Full
  signatures in the [API reference](/reference/api/).
- **The payload is the typed model.** `card.frontmatter` is typed by the Zod
  schema; `card.body.System.text()` is the prompt prose; the Guardrails
  checklist reads back as list items; and the `^examples` anchor resolves to a
  `.kind`-discriminated block view — narrow on `kind === "code"` and take its
  `value`. See [the model reference](/reference/model/) and the
  [dialect reference](/reference/dialect/) for how anchors bind to blocks.
- **`frontmatter/type`** and **`content/list/item-kind`** are engine rule ids;
  the full catalog is in the [findings reference](/reference/findings/).

## Next

- [Run validation inside your own build script](/recipes/validate-in-your-own-build/) —
  more on `runCorpus`, stats, and exit codes.
- [Consume as Data](/examples/consume-as-data/) — the typed model surface, one
  accessor at a time.
- [Surface findings as editor diagnostics](/recipes/findings-to-editor-diagnostics/) —
  put the same positioned findings in front of card authors as they type.
