import type { Meta, StoryObj } from "@storybook/vue3";

import {
  driftVaultStatus,
  errorVaultStatus,
  findingsVaultStatus,
  greenVaultStatus,
} from "~/mocks";
import VaultDetail from "./[id].vue";

/**
 * VaultDetail is the per-vault detail & findings drill-down screen. Variants
 * compare the two presentations over the SAME findings-heavy vault — grouped by
 * contract (pass/fail per contract) vs. a flat severity-sorted list — plus the
 * data states the review gate cares about: the green zero-findings state, the
 * error state (run could not complete), and the drift state (header only; drift
 * detail is a sibling task). All variants are driven off the shared `VaultStatus`
 * fixtures, never inline ad-hoc objects.
 */
const meta: Meta<typeof VaultDetail> = {
  title: "Screens/VaultDetail",
  component: VaultDetail,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof VaultDetail>;

/** Default presentation: findings grouped by contract, with pass/fail per contract. */
export const GroupedByContract: Story = {
  args: { vault: findingsVaultStatus },
};

/** Same findings, the flat presentation: one severity-sorted list (error → warn → report). */
export const FlatSeveritySorted: Story = {
  args: { vault: findingsVaultStatus, presentation: "flat" },
};

/** The required zero-findings state — the vault validates clean. */
export const Green: Story = {
  args: { vault: greenVaultStatus },
};

/** The run could not complete: header shows the error state, the message is surfaced. */
export const Error: Story = {
  args: { vault: errorVaultStatus },
};

/** Header shows the drift state over a green-ish result (drift detail is a sibling task). */
export const Drift: Story = {
  args: { vault: driftVaultStatus },
};
