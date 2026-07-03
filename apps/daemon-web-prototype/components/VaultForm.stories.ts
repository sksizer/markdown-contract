import type { Meta, StoryObj } from "@storybook/vue3";

import { mockVaultStatuses } from "../mocks";
import VaultForm from "./VaultForm.vue";

/**
 * VaultForm is the register / manage-vault flow over the mock registry. Variants
 * cover the two presentation flows (inline panel vs modal dialog), the empty
 * onboarding registry, and the two AC-2 validation error states (missing path,
 * invalid config). All variants are args-driven off the shared mock fixtures.
 */
const meta: Meta<typeof VaultForm> = {
  title: "Vaults/VaultForm",
  component: VaultForm,
};
export default meta;

type Story = StoryObj<typeof VaultForm>;

/** Inline panel: the managed-vault list with an always-open add/edit form below. */
export const InlinePanel: Story = {
  args: { variant: "inline", vaults: mockVaultStatuses },
};

/** Modal dialog: the same flow with the add/edit form in an open modal (second flow variant). */
export const Modal: Story = {
  args: { variant: "modal", vaults: mockVaultStatuses },
};

/** Empty registry — the onboarding "add your first vault" state. */
export const EmptyRegistry: Story = {
  args: { variant: "inline", vaults: [] },
};

/** AC-2: missing path — the required-path error renders eagerly. */
export const MissingPathError: Story = {
  args: {
    variant: "inline",
    vaults: mockVaultStatuses,
    initialDraft: { name: "New Vault", path: "" },
    eagerValidation: true,
  },
};

/** AC-2: invalid config — a non-YAML config path surfaces the config error eagerly. */
export const InvalidConfigError: Story = {
  args: {
    variant: "inline",
    vaults: mockVaultStatuses,
    initialDraft: { name: "New Vault", path: "~/vaults/new", configPath: "contract.txt" },
    eagerValidation: true,
  },
};
