# Variant convention (Storybook)

This prototype uses **Storybook as the primary prototyping harness**. Its whole
point is comparing alternative states and designs side by side, so the harness
only earns its keep if every component and screen ships **more than one** story.

## The rule

> **Every component and screen ships at least two named story variants** that
> show its meaningfully different states, so the review gate
> ([[T-UTKU-web-ui-prototype-review]]) can compare them at a glance.

Concretely:

1. **One `*.stories.ts` per component**, co-located next to the SFC under
   `components/` (Storybook globs `components/**/*.stories.@(ts|js)`).
2. **At least two named exports** (the variants). Name them for the *state* they
   show, not "Story1/Story2". Use the recurring pairs:
   - `Empty` / `Populated` (collections — e.g. `FindingsList`)
   - `Passing` / `Failing` (status — e.g. `VaultStatusCard`, `RunSummary`)
   - `Clean` / `WithErrors` and friends (severity spread)
   - screen-level: `AllPassing` / `Mixed` / `Empty` (e.g. `VaultDashboard`)
3. **Drive variants off the mock fixtures**, never inline ad-hoc objects. Import
   from `~/mocks` (`mocks/`): `cleanVault`, `warningVault`, `failingVault`,
   `mockVaults`, and the builders. New states get a new fixture/builder in
   `mocks/`, then a story variant that uses it — so the app shell and Storybook
   always show the same data.
4. **Cover the extremes plus one in-between** where it adds signal (e.g.
   `Passing` / `Warnings` / `Failing`): the boundary cases are where review
   decisions actually get made.

## Why two-minimum (not one)

A single "happy path" story can't be compared against anything, so it hides the
states that drive design decisions — the empty state, the error state, the
"passing but noisy" state. Requiring `>=2` named variants forces those states to
be authored up front and keeps the harness a genuine side-by-side comparison
surface rather than a component gallery.

## Checklist for a new component/screen

- [ ] SFC under `components/`, data in via props, imports nothing from Nuxt or
      the engine `src/`.
- [ ] Peer `*.stories.ts` with a `title` grouped sensibly
      (`Findings/…`, `Vaults/…`, `Runs/…`, `Screens/…`).
- [ ] **>=2 named variants**, named for their state.
- [ ] Variants built from `mocks/` fixtures/builders, not inline literals.
