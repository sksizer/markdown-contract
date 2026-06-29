---
type: task
schema_version: '5'
id: T-UNSG
status: planning/draft
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on:
  - '[[T-RELS-release-channels]]'
tags:
  - distribution
  - docs
  - security
need_human_review: true
impact: low
complexity: small
autonomy: supervised
---
# Unsigned-v1 install notes (Gatekeeper / SmartScreen override guidance)

## Goal

Since v1 binaries ship **unsigned** (signing/notarisation deferred — [[D-0012-distribution-single-exec-and-web-ui]] §D5), document the per-OS steps users need to run an unsigned binary, so the unsigned decision doesn't become a silent adoption blocker.

## Today

The binaries ([[T-BMTX-bun-compile-matrix]]) and Release channel ([[T-RELS-release-channels]]) are unsigned; macOS Gatekeeper and Windows SmartScreen will warn/block on first run, with no guidance for users.

## Proposed

A short, linked "Running the unsigned binary" doc section covering macOS (Gatekeeper: remove quarantine / Open anyway), Windows (SmartScreen: More info → Run anyway), and Linux (chmod +x), plus the checksum-verify step — referenced from the Release notes and README.

## Approach

Write the guidance as a docs page / README section; link it from the Release template and installer output. Note the future signing path (Apple Developer ID / Windows OV-EV) as deferred per D-0012.

## Files to touch

- README / docs "install" section.
- the Release notes template (link to the guidance).

## Acceptance criteria

- [ ] A documented, per-OS procedure (macOS / Windows / Linux) lets a user run the unsigned binary, including checksum verification.
- [ ] The guidance is linked from Release notes and the install docs.

## Out of scope

- Actually signing / notarising the binaries — deferred (D-0012 §D5); this task only documents the unsigned-v1 path.

## Dependencies

- Depends on [[T-RELS-release-channels]] (the Release the notes attach to). Governed by [[D-0012-distribution-single-exec-and-web-ui]].
