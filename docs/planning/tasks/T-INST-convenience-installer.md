---
type: task
schema_version: '5'
id: T-INST
status: open/ready
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
  - '[[T-RELS-release-channels]]'
tags:
  - distribution
  - installer
  - prototype
need_human_review: true
impact: medium
complexity: medium
autonomy: supervised
---
# At least one convenience installer over the released binaries

## Goal

Give users a one-line install path beyond "download the binary": ship **at least one** of a
`curl … | sh` script, a Homebrew tap, or a Scoop/winget manifest, pulling from the GitHub
Releases artifacts ([[T-RELS-release-channels]]) — per the
[[M-0008-single-exec-distribution]] success criteria and
[[D-0012-distribution-single-exec-and-web-ui]] §D5.

## Today

| Location | Role today |
|---|---|
| `.github/workflows/release.yml` | Publishes the binaries + checksums on GitHub Releases ([[T-RELS-release-channels]]); installation is fully manual (download, chmod, place on PATH). |
| `README.md` | Has no one-line install section for the binary. |

## Proposed

One installer for the prototype (recommend a `curl … | sh` script for breadth) that resolves
the latest Release, downloads the right OS/arch binary, verifies its checksum, and installs it
onto PATH. Additional channels are follow-ups.

## Approach

1. **Pick the channel.** A POSIX `install.sh` (curl-pipe-sh) — broadest reach for a prototype;
   a Homebrew tap / Scoop manifest are noted follow-ups.
2. **Resolve + download.** Detect OS/arch, query the latest Release (GitHub API), download the
   matching `markdown-contract-<os>-<arch>` asset.
3. **Verify + install.** Fetch the artifact's `.sha256`, verify it, `chmod +x`, and move it
   onto a PATH dir (prompt/notes for `sudo` or a user-local `~/.local/bin`).
4. **Document.** Add the one-line install command to `README.md`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `install.sh` | new | curl-pipe-sh installer: detect OS/arch → download latest Release asset → verify checksum → place on PATH. |
| `README.md` | modify | Add the one-line install command + a pointer to the unsigned-install notes. |

## Acceptance criteria

- [ ] AC-1: `install.sh` installs the correct OS/arch combined binary from the latest GitHub Release and verifies its SHA-256 before placing it on PATH.
- [ ] AC-2: The installed binary runs `markdown-contract validate` and boots `markdown-contract daemon`.
- [ ] AC-3: The install command is documented in `README.md`.

## Out of scope

- Supporting every package manager — one channel for the prototype; Homebrew/Scoop/winget are follow-ups.
- Signing/notarisation — the prototype ships unsigned ([[T-UNSG-unsigned-install-notes]]).
- Producing/publishing the artifacts — [[T-BMTX-bun-compile-matrix]] / [[T-RELS-release-channels]].

## Dependencies

- Depends on [[T-RELS-release-channels]] (Release artifacts + checksum convention). Governed by [[D-0012-distribution-single-exec-and-web-ui]] §D5.
