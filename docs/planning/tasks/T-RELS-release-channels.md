---
type: task
schema_version: '5'
id: T-RELS
status: open/ready
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[T-UDPO-extract-single-binary-example]]'
  - '[[M-0009-local-web-ui-vault-dashboard]]'
depends_on:
  - '[[T-BMTX-bun-compile-matrix]]'
  - '[[T-SPAE-spa-embed]]'
tags:
  - distribution
  - release
  - ci
  - prototype
need_human_review: true
impact: medium
complexity: medium
autonomy: supervised
---
# Publish the prototype binaries via GitHub Releases with checksums

## Goal

Ship the cross-compiled **combined CLI + daemon** binaries to users: on a version tag,
publish each per-OS/arch artifact on **GitHub Releases with SHA-256 checksums**, while the
npm package stays the canonical, unchanged artifact — per
[[D-0012-distribution-single-exec-and-web-ui]] §D5 and the
[[M-0008-single-exec-distribution]] prototype.

## Today

| Location | Role today |
|---|---|
| `examples/single-binary/` | The canonical example the released binary builds from ([[T-UDPO-extract-single-binary-example]]) — the artifact ships from here until [[M-0009-local-web-ui-vault-dashboard]] retargets distribution at `apps/web`. |
| `examples/single-binary/moon.yml#compile` | The per-target `compile` tasks ([[T-BMTX-bun-compile-matrix]], not yet landed) that emit the binaries into `dist-bin/` — to be built in CI but never uploaded. |
| `.github/workflows/ci.yml` | Push/PR CI (the host-binary smoke arrives with [[T-BMTX-bun-compile-matrix]]); there is **no tag-triggered release workflow**. |
| `package.json` | The npm publish flow (`tsc` → `dist`); runs as today, untouched here. |

Nothing is uploaded, checksummed, or versioned for download.

## Proposed

A tag-triggered GitHub Actions workflow that builds the full matrix
([[T-BMTX-bun-compile-matrix]], which embeds the SPA via [[T-SPAE-spa-embed]]), generates a
SHA-256 per artifact, and creates a GitHub Release attaching the binaries + checksums. The npm
publish flow is separate and unchanged.

## Approach

1. **Release workflow.** Add `.github/workflows/release.yml` triggered on `v*` tags: run the
   moon `compile` matrix for all six triples, collect `dist-bin/*`.
2. **Checksums.** Generate `markdown-contract-<os>-<arch>.sha256` per artifact (and/or a single
   `SHA256SUMS`).
3. **Publish.** Use the GH CLI / a release action to create the Release and upload the binaries
   + checksums; render release notes from a template that links the unsigned-install guidance
   ([[T-UNSG-unsigned-install-notes]]).
4. **Keep npm separate.** The npm publish job (`tsc` → `dist`) stays its own, unchanged job —
   no coupling to the binary release.
5. **Document verify.** Document download + `shasum -c` for at least one artifact.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `.github/workflows/release.yml` | new | Tag-triggered: build the matrix, checksum each artifact, create the GitHub Release. |
| `.github/release-notes-template.md` | new | Release-notes template (assets list + link to unsigned-install guidance). |
| `examples/single-binary/scripts/checksums.ts` | new | Emit per-artifact SHA-256 (and/or `SHA256SUMS`) over `dist-bin/*`. |

## Acceptance criteria

- [ ] AC-1: A tagged release produces a GitHub Release with one combined CLI+daemon binary per OS/arch and a SHA-256 checksum for each.
- [ ] AC-2: The npm package is published unchanged by its existing flow (no coupling to the binary release).
- [ ] AC-3: Download + checksum-verify of at least one artifact is documented and the documented command succeeds.
- [ ] AC-4: The release notes link the unsigned-install guidance ([[T-UNSG-unsigned-install-notes]]).

## Out of scope

- Convenience installers ([[T-INST-convenience-installer]]).
- Code signing / notarisation (deferred, [[D-0012-distribution-single-exec-and-web-ui]] §D5) — the prototype ships unsigned ([[T-UNSG-unsigned-install-notes]]).
- Building/compiling the binaries — [[T-BMTX-bun-compile-matrix]].

## Dependencies

- Depends on [[T-BMTX-bun-compile-matrix]] (the artifacts to publish) and [[T-SPAE-spa-embed]] (so the released binary carries the embedded UI). The release builds from `examples/single-binary/` ([[T-UDPO-extract-single-binary-example]]) until [[M-0009-local-web-ui-vault-dashboard]] retargets distribution at `apps/web`. Governed by [[D-0012-distribution-single-exec-and-web-ui]] §D5.
