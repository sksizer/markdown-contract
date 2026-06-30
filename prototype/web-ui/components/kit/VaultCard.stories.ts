import type { Meta, StoryObj } from "@storybook/vue3";

import { cleanVault, failingVault, warningVault } from "../../mocks";
import VaultCard from "./VaultCard.vue";

/**
 * VaultCard summarizes one vault with a status token. Variants span every status
 * the dashboard distinguishes — the two derivable states (green / findings) plus
 * the externally-driven live states (drift / running / error) passed via the
 * `status` override — and a selected state.
 */
const meta: Meta<typeof VaultCard> = {
  title: "Kit/VaultCard",
  component: VaultCard,
};
export default meta;

type Story = StoryObj<typeof VaultCard>;

/** Clean vault — derived status is green. */
export const Green: Story = {
  args: { vault: cleanVault },
};

/** Has findings — derived status is findings. */
export const Findings: Story = {
  args: { vault: failingVault },
};

/** Live drift state, forced via the status override. */
export const Drift: Story = {
  args: { vault: warningVault, status: "drift" },
};

/** Live running state — a run is in progress. */
export const Running: Story = {
  args: { vault: cleanVault, status: "running" },
};

/** Live error state — the run could not complete. */
export const Error: Story = {
  args: { vault: failingVault, status: "error" },
};

/** Selected card — outlined in the status accent. */
export const Selected: Story = {
  args: { vault: failingVault, selected: true },
};
