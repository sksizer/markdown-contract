---
type: task
schema_version: '5'
id: T-INST
status: planning/draft
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
  - '[[T-RELS-release-channels]]'
tags:
  - distribution
  - installer
need_human_review: true
impact: medium
complexity: medium
autonomy: supervised
---
# At least one convenience installer over the released binaries

## Goal

Give users a one-line install path beyond "download the binary": ship **at least one** of a Homebrew tap, a Scoop/winget manifest, or a `curl … | sh` script, pulling from the GitHub Releases artifacts — per [[M-0008-single-exec-distribution]] success criteria and [[D-0012-distribution-single-exec-and-web-ui]] §D5.

## Today

[[T-RELS-release-channels]] publishes binaries + checksums on GitHub Releases, but installation is fully manual (download, chmod, place on PATH).

## Proposed

Pick one channel for v1 (recommend a `curl … | sh` installer for breadth, or a Homebrew tap for macOS/Linux) that resolves the latest Release, downloads the right OS/arch binary, verifies its checksum, and installs it onto PATH.

## Approach

Author the chosen installer (script or tap/manifest) against the Release naming + checksum convention from [[T-RELS-release-channels]]; document the install command. Additional channels are follow-ups.

## Files to touch

- the installer artifact (e.g. `install.sh`, or a Homebrew formula / Scoop manifest repo).
- README install section.

## Acceptance criteria

- [ ] At least one convenience installer installs the correct OS/arch binary from the latest GitHub Release and verifies its checksum.
- [ ] The installed binary runs `markdown-contract validate`/`init`.
- [ ] The install command is documented.

## Out of scope

- Supporting every package manager — one channel for v1; others are follow-ups.
- Signing/notarisation — v1 is unsigned ([[T-UNSG-unsigned-install-notes]]).

## Dependencies

- Depends on [[T-RELS-release-channels]] (Release artifacts + checksum convention). Governed by [[D-0012-distribution-single-exec-and-web-ui]].
