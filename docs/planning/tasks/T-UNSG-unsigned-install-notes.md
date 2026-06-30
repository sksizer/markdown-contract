---
type: task
schema_version: '5'
id: T-UNSG
status: open/ready
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
  - prototype
need_human_review: true
impact: low
complexity: small
autonomy: supervised
---
# Unsigned-prototype install notes (Gatekeeper / SmartScreen override guidance)

## Goal

Since the prototype binaries ship **unsigned** (signing/notarisation deferred —
[[D-0012-distribution-single-exec-and-web-ui]] §D5), document the per-OS steps users need to
run an unsigned binary, so the unsigned decision doesn't become a silent adoption blocker for
[[M-0008-single-exec-distribution]].

## Today

| Location | Role today |
|---|---|
| `.github/workflows/release.yml` | Publishes unsigned binaries ([[T-RELS-release-channels]]); macOS Gatekeeper and Windows SmartScreen will warn/block on first run. |
| `README.md` / `docs/` | No "running the unsigned binary" guidance for users to follow. |

## Proposed

A short, linked "Running the unsigned binary" doc section covering macOS (Gatekeeper: remove
quarantine / Open anyway), Windows (SmartScreen: More info → Run anyway), and Linux
(`chmod +x`), plus the checksum-verify step — referenced from the Release notes and README.

## Approach

1. **Write the guidance** as `docs/install-unsigned.md`: per-OS override steps + the
   `shasum -c` verification step.
2. **Link it** from the Release notes template ([[T-RELS-release-channels]]) and `README.md`
   (and the `install.sh` output, [[T-INST-convenience-installer]]).
3. **Note the future path.** Record the deferred signing path (Apple Developer ID +
   notarisation; Windows OV/EV cert) per [[D-0012-distribution-single-exec-and-web-ui]] §D5.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/install-unsigned.md` | new | Per-OS run-the-unsigned-binary steps (macOS/Windows/Linux) + checksum verification + the deferred-signing note. |
| `README.md` | modify | Link the unsigned-install guidance from the install section. |
| `.github/release-notes-template.md` | modify | Link the unsigned-install guidance (template created by [[T-RELS-release-channels]]). |

## Acceptance criteria

- [ ] AC-1: A documented, per-OS procedure (macOS / Windows / Linux) lets a user run the unsigned binary, including the checksum-verify step.
- [ ] AC-2: The guidance is linked from both the Release notes template and `README.md`.
- [ ] AC-3: The deferred signing path (Developer ID / notarisation; Windows OV/EV) is recorded as a known follow-up.

## Out of scope

- Actually signing / notarising the binaries — deferred ([[D-0012-distribution-single-exec-and-web-ui]] §D5); this task only documents the unsigned path.
- The installer itself — [[T-INST-convenience-installer]].

## Dependencies

- Depends on [[T-RELS-release-channels]] (the Release the notes attach to). Governed by [[D-0012-distribution-single-exec-and-web-ui]] §D5.
