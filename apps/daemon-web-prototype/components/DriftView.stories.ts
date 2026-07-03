import type { Meta, StoryObj } from "@storybook/vue3";

import { cleanDrift, sampleDrift } from "../mocks";
import DriftView from "./DriftView.vue";

/**
 * DriftView renders an `init --check` `DriftResult`. Per the variant convention
 * (see CONVENTIONS.md) every component ships >=2 named story variants so the
 * review gate can compare states side by side. Here the axes are the drift STATE
 * (drifted vs. in-sync) crossed with the presentation VARIANT (unified list vs.
 * side-by-side split):
 *   - `Drifted`         — unified list of added/removed/changed entries
 *   - `SideBySide`      — the same drift, the split presentation variant
 *   - `InSync`          — the clean, no-drift panel
 *   - `SideBySideInSync` — the in-sync state under the split variant
 */
const meta: Meta<typeof DriftView> = {
  title: "Drift/DriftView",
  component: DriftView,
  args: { title: "Config drift", vaultName: "Knowledge Base" },
};
export default meta;

type Story = StoryObj<typeof DriftView>;

/** Drifted corpus as a single unified change-list (added / removed / changed). */
export const Drifted: Story = {
  args: { variant: "unified", drift: sampleDrift },
};

/** The same drift, shown as the side-by-side Added / Removed / Changed split. */
export const SideBySide: Story = {
  args: { variant: "split", drift: sampleDrift },
};

/** In sync — the committed contract still matches the corpus. */
export const InSync: Story = {
  args: { variant: "unified", drift: cleanDrift },
};

/** In sync under the split variant (the in-sync panel takes over either way). */
export const SideBySideInSync: Story = {
  args: { variant: "split", drift: cleanDrift },
};
