import type { Meta, StoryObj } from "@storybook/vue3";

import {
  emptyVaultList,
  errorVaultStatus,
  greenVaultStatus,
  mockVaultStatuses,
  runningVaultStatus,
} from "~/mocks";
import Dashboard from "./index.vue";

/**
 * Dashboard is the all-vaults "are they all green?" home view. Variants compare
 * the two LAYOUTS over the same five-state vault list — the status card grid vs.
 * the dense table — plus the data states the review gate cares about: the
 * reassuring all-green home, the first-run empty state, and the single-state
 * running / error cards (so the running indicator and surfaced error message read
 * in isolation). Every variant is driven off the shared `VaultStatus` fixtures,
 * never inline ad-hoc objects.
 */
const meta: Meta<typeof Dashboard> = {
  title: "Screens/Dashboard",
  component: Dashboard,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Dashboard>;

/** Default layout: a status card per vault, covering all five states. */
export const Grid: Story = {
  args: { vaults: mockVaultStatuses },
};

/** Same five-state list, the dense table layout — one row per vault. */
export const Table: Story = {
  args: { vaults: mockVaultStatuses, layout: "table" },
};

/** The reassuring home: every vault green — "are they all green?" answered yes. */
export const AllGreen: Story = {
  args: { vaults: [greenVaultStatus] },
};

/** First-run: no vaults registered yet — the empty state with an add affordance. */
export const Empty: Story = {
  args: { vaults: emptyVaultList.vaults },
};

/** A vault mid-run: the running indicator with no result yet. */
export const Running: Story = {
  args: { vaults: [runningVaultStatus] },
};

/** The run could not complete: the error message is surfaced on the card. */
export const WithError: Story = {
  args: { vaults: [errorVaultStatus] },
};
