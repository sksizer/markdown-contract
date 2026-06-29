---
type: task
schema_version: '5'
id: T-RELS
status: planning/draft
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
  - '[[T-BMTX-bun-compile-matrix]]'
tags:
  - distribution
  - release
  - ci
need_human_review: true
impact: medium
complexity: medium
autonomy: supervised
---
# Publish the binaries via GitHub Releases with checksums

## Goal

Ship the cross-compiled binaries to users: publish each per-OS/arch artifact on **GitHub Releases with checksums**, while the npm package stays the canonical, unchanged artifact — per [[D-0012-distribution-single-exec-and-web-ui]] §D5.

## Today

[[T-BMTX-bun-compile-matrix]] produces binaries locally/in CI, but there is no release pipeline — nothing is uploaded, checksummed, or versioned for download.

## Proposed

A release workflow that, on a version tag, builds the matrix, generates checksums (SHA-256) per artifact, and creates a GitHub Release attaching the binaries + checksums; the npm publish flow is untouched and runs as today.

## Approach

A GitHub Actions release workflow triggered on tag: run the moon compile matrix, emit `*.sha256`, and use the GH CLI / release action to upload artifacts to the Release. Keep npm publish (`tsc` → `dist`) as a separate, unchanged job.

## Files to touch

- `.github/workflows/release.yml` (new).
- checksum generation step; release notes template.

## Acceptance criteria

- [ ] A tagged release produces a GitHub Release with one binary per OS/arch and a checksum for each.
- [ ] The npm package is published unchanged by its existing flow (no coupling to the binary release).
- [ ] Download + checksum-verify of at least one artifact is documented.

## Out of scope

- Convenience installers ([[T-INST-convenience-installer]]).
- Code signing / notarisation (deferred, D-0012 §D5) — v1 is unsigned ([[T-UNSG-unsigned-install-notes]]).

## Dependencies

- Depends on [[T-BMTX-bun-compile-matrix]] (the artifacts to publish). Governed by [[D-0012-distribution-single-exec-and-web-ui]].
