import type { Meta, StoryObj } from "@storybook/vue3";

import EmptyState from "./EmptyState.vue";

/**
 * EmptyState is a first-class empty panel. Variants show the distinct empty
 * surfaces the dashboard hits: no vaults onboarded, a clean vault with no
 * findings, and a filter that matched nothing.
 */
const meta: Meta<typeof EmptyState> = {
  title: "Kit/EmptyState",
  component: EmptyState,
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

/** No vaults onboarded yet. */
export const NoVaults: Story = {
  args: {
    icon: "🗂",
    title: "No vaults yet",
    message: "Add a markdown tree to start tracking its contract status.",
  },
};

/** A vault that validates cleanly — nothing to review. */
export const NoFindings: Story = {
  args: {
    icon: "✓",
    title: "All clear",
    message: "This vault validates cleanly — there are no findings to review.",
  },
};

/** A search or filter returned nothing. */
export const NoResults: Story = {
  args: {
    icon: "🔍",
    title: "No matches",
    message: "No findings match the current filter. Try widening it.",
  },
};
