import type { Meta, StoryObj } from "@storybook/vue3";

import { cleanVault, failingVault } from "../mocks";
import RunSummary from "./RunSummary.vue";

/**
 * RunSummary panels the engine's `RunStats` + exit code. Two named variants:
 * a clean run (everything matched, exit 0) vs. a run with unmatched files and a
 * failing exit code.
 */
const meta: Meta<typeof RunSummary> = {
  title: "Runs/RunSummary",
  component: RunSummary,
};
export default meta;

type Story = StoryObj<typeof RunSummary>;

/** Clean run — exit 0. */
export const Clean: Story = {
  args: {
    stats: cleanVault.result.stats,
    exitCode: cleanVault.result.exitCode,
  },
};

/** Failing run — unmatched files present, exit 1. */
export const Failing: Story = {
  args: {
    stats: failingVault.result.stats,
    exitCode: failingVault.result.exitCode,
  },
};
