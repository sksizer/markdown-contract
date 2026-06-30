import type { Meta, StoryObj } from "@storybook/vue3";

import ErrorState from "./ErrorState.vue";

/**
 * ErrorState is the first-class failure surface. Variants compare a plain message,
 * a message with an expandable technical detail block, and a compact form.
 */
const meta: Meta<typeof ErrorState> = {
  title: "Kit/ErrorState",
  component: ErrorState,
};
export default meta;

type Story = StoryObj<typeof ErrorState>;

/** A plain, human-readable failure. */
export const Generic: Story = {
  args: {
    title: "Validation failed to run",
    message: "The run could not complete. Check the vault path and try again.",
  },
};

/** Includes a technical detail block (e.g. stderr / stack). */
export const WithDetail: Story = {
  args: {
    title: "Run crashed",
    message: "The validator threw before producing a result.",
    detail:
      "Error: ENOENT: no such file or directory, open '~/vaults/team-handbook/contract.yaml'\n    at Object.openSync (node:fs:600:3)\n    at runCorpus (src/runner/corpus.ts:48:17)",
  },
};

/** A compact failure with no detail block. */
export const Compact: Story = {
  args: {
    title: "Couldn't load vault",
    message: "Network unreachable.",
  },
};
