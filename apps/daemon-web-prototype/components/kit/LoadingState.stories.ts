import type { Meta, StoryObj } from "@storybook/vue3";

import LoadingState from "./LoadingState.vue";

/**
 * LoadingState is the first-class running surface. The three variants are the
 * shapes the dashboard reaches for: a centered spinner, a skeleton placeholder
 * while content streams in, and a compact inline spinner.
 */
const meta: Meta<typeof LoadingState> = {
  title: "Kit/LoadingState",
  component: LoadingState,
};
export default meta;

type Story = StoryObj<typeof LoadingState>;

/** Centered ring + label — the default full-panel loader. */
export const Spinner: Story = {
  args: { variant: "spinner", label: "Running validation…" },
};

/** Shimmer placeholder bars while a list streams in. */
export const Skeleton: Story = {
  args: { variant: "skeleton", rows: 4 },
};

/** Compact inline spinner for tight spaces. */
export const Inline: Story = {
  args: { variant: "inline", label: "Re-running…" },
};
