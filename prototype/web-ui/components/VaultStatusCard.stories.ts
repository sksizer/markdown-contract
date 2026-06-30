import type { Meta, StoryObj } from "@storybook/vue3";

import { cleanVault, failingVault, warningVault } from "../mocks";
import VaultStatusCard from "./VaultStatusCard.vue";

/**
 * VaultStatusCard summarizes one vault's status. Three named variants span the
 * status range the dashboard must distinguish: a clean PASS, a PASS-with-warnings,
 * and a FAIL.
 */
const meta: Meta<typeof VaultStatusCard> = {
  title: "Vaults/VaultStatusCard",
  component: VaultStatusCard,
};
export default meta;

type Story = StoryObj<typeof VaultStatusCard>;

/** Clean vault: exitCode 0, no findings. */
export const Passing: Story = {
  args: { vault: cleanVault },
};

/** Passes CI (exitCode 0) but carries warn/report findings. */
export const Warnings: Story = {
  args: { vault: warningVault },
};

/** At least one error-level finding → FAIL, exitCode 1. */
export const Failing: Story = {
  args: { vault: failingVault },
};
