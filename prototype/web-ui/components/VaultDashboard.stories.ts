import type { Meta, StoryObj } from "@storybook/vue3";

import { cleanVault, failingVault, mockVaults, warningVault } from "../mocks";
import VaultDashboard from "./VaultDashboard.vue";

/**
 * VaultDashboard is the assembled screen. Story variants cover the screen-level
 * states the review gate cares about: a healthy all-passing dashboard, the mixed
 * dashboard (the default fixture set, including a failing vault), and the empty
 * onboarding state.
 */
const meta: Meta<typeof VaultDashboard> = {
  title: "Screens/VaultDashboard",
  component: VaultDashboard,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof VaultDashboard>;

/** Every managed vault passes. */
export const AllPassing: Story = {
  args: { vaults: [cleanVault, warningVault] },
};

/** The default fixture set — a clean, a noisy-but-passing, and a failing vault. */
export const Mixed: Story = {
  args: { vaults: mockVaults },
};

/** A single failing vault selected. */
export const Failing: Story = {
  args: { vaults: [failingVault] },
};

/** No vaults managed yet — the onboarding empty state. */
export const Empty: Story = {
  args: { vaults: [] },
};
