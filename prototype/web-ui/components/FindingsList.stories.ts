import type { Meta, StoryObj } from "@storybook/vue3";

import { cleanVault, failingVault } from "../mocks";
import FindingsList from "./FindingsList.vue";

/**
 * FindingsList renders an engine `Finding[]`. Per the variant convention
 * (see CONVENTIONS.md) every component ships >=2 named story variants so the
 * review gate can compare states side by side. Here: the empty state vs. a
 * populated mixed-severity list vs. an errors-only slice.
 */
const meta: Meta<typeof FindingsList> = {
  title: "Findings/FindingsList",
  component: FindingsList,
  args: { title: "Findings" },
};
export default meta;

type Story = StoryObj<typeof FindingsList>;

/** Clean document — the empty state. */
export const Empty: Story = {
  args: { findings: cleanVault.result.findings },
};

/** A real mixed list: error + warn + report findings together. */
export const Populated: Story = {
  args: { findings: failingVault.result.findings },
};

/** Only the error-level findings (the CI-blocking subset). */
export const ErrorsOnly: Story = {
  args: {
    title: "Errors",
    findings: failingVault.result.findings.filter((f) => f.level === "error"),
  },
};
