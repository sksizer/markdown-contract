import type { Meta, StoryObj } from "@storybook/vue3";

import { mockVaults } from "../../mocks";
import AppHeader from "./AppHeader.vue";

/**
 * AppHeader is the reusable app band. Variants compare the bare header, the header
 * with an aggregated vault status summary (driven off `mockVaults`), and a plain
 * re-titled header with no tag.
 */
const meta: Meta<typeof AppHeader> = {
  title: "Kit/AppHeader",
  component: AppHeader,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof AppHeader>;

/** Defaults — no vault summary. */
export const Default: Story = {
  args: {},
};

/** With the aggregated green/findings summary from the mock vaults. */
export const WithStatusSummary: Story = {
  args: { vaults: mockVaults },
};

/** A plain, re-titled header with no tag pill. */
export const Plain: Story = {
  args: {
    title: "Team Handbook",
    subtitle: "single vault view",
    tag: "",
  },
};
