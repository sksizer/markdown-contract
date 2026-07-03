import type { Meta, StoryObj } from "@storybook/vue3";

import { failingVault, warningVault } from "../../mocks";
import ContractGroup from "./ContractGroup.vue";

/**
 * ContractGroup is a titled findings group. Variants cover the clean (empty)
 * state, a warnings-only group, a failing group, and a hand-combined mixed group
 * — all driven off the existing fixtures (no new mock files).
 */
const meta: Meta<typeof ContractGroup> = {
  title: "Kit/ContractGroup",
  component: ContractGroup,
  args: { title: "structure/*", subtitle: "Section + heading structure rules" },
};
export default meta;

type Story = StoryObj<typeof ContractGroup>;

/** No findings — the first-class clean state. */
export const Passing: Story = {
  args: { title: "anchors/*", subtitle: "Block-anchor rules", findings: [] },
};

/** Warn/report findings only (passes CI). */
export const Warnings: Story = {
  args: { findings: warningVault.result.findings },
};

/** Includes error-level findings (CI-blocking). */
export const Failing: Story = {
  args: { findings: failingVault.result.findings },
};

/** A mixed group hand-combined from both fixtures' findings. */
export const Mixed: Story = {
  args: {
    title: "all-rules",
    subtitle: "Every contract, combined",
    findings: [...warningVault.result.findings, ...failingVault.result.findings],
  },
};
