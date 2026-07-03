import type { Meta, StoryObj } from "@storybook/vue3";

import { STATUS_ORDER } from "../../design/tokens";
import StatusBadge from "./StatusBadge.vue";

/**
 * StatusBadge names one of the five vault states. Each state gets its own named
 * variant so the review gate can compare the visual language side by side, plus a
 * `Gallery` that lines all five up together.
 */
const meta: Meta<typeof StatusBadge> = {
  title: "Kit/StatusBadge",
  component: StatusBadge,
};
export default meta;

type Story = StoryObj<typeof StatusBadge>;

/** Clean — no findings, in sync. */
export const Green: Story = {
  args: { status: "green" },
};

/** Validation surfaced findings to review. */
export const Findings: Story = {
  args: { status: "findings" },
};

/** Config or structure has drifted from the contract. */
export const Drift: Story = {
  args: { status: "drift" },
};

/** A validation run is in progress. */
export const Running: Story = {
  args: { status: "running" },
};

/** The run could not complete. */
export const Error: Story = {
  args: { status: "error" },
};

/** All five states lined up — the full status legend. */
export const Gallery: Story = {
  render: () => ({
    components: { StatusBadge },
    setup() {
      return { order: STATUS_ORDER };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <StatusBadge v-for="key in order" :key="key" :status="key" />
      </div>
    `,
  }),
};
