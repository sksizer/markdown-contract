---
type: task
schema_version: '5'
id: T-SPAE
status: closed/done
created: '2026-06-28'
completion_note: 'Embed shipped via PR #183: scripts/gen-assets.ts rewrites a
  generated manifest (assets.gen.ts) with one `with { type: "file" }` import
  per built SPA asset, so `bun build --compile` embeds the whole UI — the
  explicit-file-import technique, avoiding whole-directory embedding
  (oven-sh/bun#5445); verified by serving UI + API from an empty directory.
  The canonical generate → gen-assets → compile pipeline is now carried by
  examples/single-binary/ (T-UDPO-extract-single-binary-example), whose README
  documents the mechanism, its limitations, and the Deno-compile fallback;
  apps/web keeps its own copy for M-0009.'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[M-0009-local-web-ui-vault-dashboard]]'
  - '[[T-WEBU-nuxt-spa-ui]]'
depends_on:
  - '[[T-WEBU-nuxt-spa-ui]]'
  - '[[T-BMTX-bun-compile-matrix]]'
tags:
  - distribution
  - bun
  - web-ui
  - embed
  - prototype
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Embed the built Nuxt SPA into the binary, served by the daemon

## Goal

Close the packaging loop: make the `bun build --compile` binary carry the built Nuxt SPA
**inside it** and have the daemon ([[T-DAEM-daemon-and-json-api]]) serve those embedded
assets over HTTP — no external files. This is the single open packaging risk in
[[D-0012-distribution-single-exec-and-web-ui]] (§D2 / Open questions: whole-directory
embedding has known gaps, oven-sh/bun#5445), and proving it is what turns
[[M-0008-single-exec-distribution]] from "CLI binary" into "one binary, two faces."

## Today

| Location | Role today |
|---|---|
| `apps/web` (Nuxt SPA) | Built static client from [[T-WEBU-nuxt-spa-ui]] (`apps/web/.output/public`) — served **from disk** by the daemon today, not embedded. |
| `apps/web/src/daemon/server.ts` | `Bun.serve` daemon ([[T-DAEM-daemon-and-json-api]]) that currently reads static assets off the filesystem. |
| `apps/web/src/bin.ts` | The combined-binary entry that [[T-BMTX-bun-compile-matrix]] compiles. |

Whether Bun can bundle the whole built SPA into the executable and serve it correctly
(MIME types, asset paths resolving from inside the binary) is **unproven** — that is this task.

## Proposed

Switch the daemon's static layer from filesystem reads to Bun's in-binary embedding: an
HTML/asset import graph (and/or `Bun.embeddedFiles` / `with { type: "file" }`) so that a
single `bun build --compile` of `apps/web/src/bin.ts` produces one binary that serves the SPA
at `localhost` with no external files.

## Approach

1. **Import the SPA entry.** From the daemon, import the built SPA's HTML entry so Bun pulls
   the client JS/CSS into the compiled binary (the documented HTML-import path,
   [[D-0012-distribution-single-exec-and-web-ui]] §D2). For assets the HTML graph misses, list
   them explicitly via `with { type: "file" }` / `Bun.embeddedFiles`.
2. **Serve embedded.** Replace the filesystem static handler in
   `apps/web/src/daemon/server.ts` with one that resolves requests against the embedded asset
   set, returning correct `Content-Type`s; keep the `/api/*` routes unchanged.
3. **Wire the build order.** The `compile` task ([[T-BMTX-bun-compile-matrix]]) must run
   `build:web` first so the SPA dist exists at compile time; capture that ordering in the
   moon task graph (`build:web` → `compile`).
4. **Document the mechanism + gaps.** Record exactly which embedding mechanism worked, any
   whole-directory limitations hit (#5445/#23852), and the Deno-compile fallback — notes
   [[M-0009-local-web-ui-vault-dashboard]] builds on.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/web/src/daemon/server.ts` | modify | Serve assets from the embedded set (HTML import / `Bun.embeddedFiles`) instead of the filesystem. |
| `apps/web/src/daemon/embed.ts` | new | The embedded-asset entry: import the SPA HTML graph + explicit `Bun.embeddedFiles` list, exposed as a lookup. |
| `apps/web/src/daemon/embed.test.ts` | new | Peer test: the embedded lookup resolves the HTML entry + a hashed asset. |
| `docs/prototype-demo.md` | modify | Add the "how the embed works / limitations / fallback" notes (file created by [[T-DEMO-end-to-end-feasibility-demo]]). |

## Acceptance criteria

- [ ] AC-1: A `bun build --compile` of `apps/web/src/bin.ts` produces a binary that, run as `daemon`, serves the SPA's HTML and hashed JS/CSS over HTTP **with no external files present** (verified by running the binary from an empty directory).
- [ ] AC-2: Embedded assets return correct `Content-Type`s and the SPA loads and calls `/api/validate` end to end from the browser.
- [ ] AC-3: The CLI face of the same binary still passes the `validate`/`init` parity check from [[T-BMTX-bun-compile-matrix]] (the embed does not regress the CLI).
- [ ] AC-4: The working embed mechanism, any whole-directory limitations, and the Deno-compile fallback are documented for [[M-0009-local-web-ui-vault-dashboard]].

## Out of scope

- The SPA content and the daemon/API themselves — [[T-WEBU-nuxt-spa-ui]] / [[T-DAEM-daemon-and-json-api]].
- The cross-compile matrix and release upload — [[T-BMTX-bun-compile-matrix]] / [[T-RELS-release-channels]].
- The production dashboard that consumes this embed mechanism — [[M-0009-local-web-ui-vault-dashboard]].

## Dependencies

- Depends on [[T-WEBU-nuxt-spa-ui]] (the built SPA to embed) and [[T-BMTX-bun-compile-matrix]] (the compile path + build-order wiring). De-risks [[M-0009-local-web-ui-vault-dashboard]]. Governed by [[D-0012-distribution-single-exec-and-web-ui]] §D2/§D3.
