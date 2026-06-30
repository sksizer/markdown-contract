# Handoff — Prototype: register / manage vault flow

_Task: `T-5QJV-web-ui-vault-registry`. PR: <https://github.com/sksizer/markdown-contract/pull/118>._

## Summary

Add VaultForm.vue register/manage-vault panel over the mock registry seam: validated add form (missing path / invalid config), per-row edit/remove, inline-panel vs modal flow variants, and 5 Storybook stories. Reuses StatusBadge, design tokens, and the mockApi POST /api/vaults seam.

## Files changed

| Path | Role |
|---|---|
| `docs/planning/tasks/T-5QJV-web-ui-vault-registry.md` | M |
| `prototype/web-ui/components/VaultForm.stories.ts` | A |
| `prototype/web-ui/components/VaultForm.vue` | A |

## Quality checks

OK 2/2 (baseline-gated; no new drift)

## PR

https://github.com/sksizer/markdown-contract/pull/118

## Spawned follow-ups

- none
