import type { Settings } from "@hps-internal/contracts";

/**
 * Default sandbox settings for local dev.
 * The app falls back to @hps-internal/contracts.policyDefaults when this is empty.
 */
const settings: Partial<Settings> = {};
export default settings;

/** Types used by the Settings UI to render controls */
export type SandboxSetting = {
  key: string;                   // unique key (for React lists)
  label: string;                 // human-readable label
  path: string;                  // Settings path this control binds to
  input: "number" | "percent" | "currency" | "toggle" | "text" | "select";
  description: string;           // REQUIRED so UI filter code is safe
  min?: number;
  max?: number;
  step?: number;
  token?: string;                // e.g., "<AIV_CAP_PCT>"
  source_of_truth?: "investor_set" | "team_policy_set" | "external_feed";

  // REQUIRED so componentMap[setting.component] never sees undefined
  component: "InputField" | "ToggleSwitch" | "SelectField" | "MultiSelectChecklist" | "DynamicBandEditor";
  props?: Record<string, unknown>;
};

export type SandboxPage = {
  id: string;
  title: string;
  description: string;           // REQUIRED so no optional chaining needed in the UI
  settings: ReadonlyArray<SandboxSetting>;
};

/**
 * Minimal, typed pages config to keep the app compiling cleanly.
 */
export const SANDBOX_PAGES_CONFIG: ReadonlyArray<SandboxPage> = [
  {
    id: "policy",
    title: "Policy & Caps",
    description: "Core guardrails and safety caps.",
    settings: [
      {
        key: "aivSafetyCapPercentage",
        label: "Safety Margin on AIV %",
        path: "aivSafetyCapPercentage",
        input: "percent",
        description: "Cap applied to AIV before offer math.",
        token: "<AIV_CAP_PCT>",
        source_of_truth: "team_policy_set",
        min: 0,
        max: 10,
        step: 0.1,
        component: "InputField",
        props: { suffix: "%", placeholder: "Policy default" }
      }
    ]
  },
  {
    id: "fees",
    title: "Seller Costs (Policy Defaults)",
    description: "Default resale-side cost assumptions.",
    settings: [
      {
        key: "list_commission_pct",
        label: "List Commission %",
        path: "listingCostModelSellerCostLineItems[].defaultPct",
        input: "percent",
        description: "Default list agent commission percentage.",
        token: "<LIST_COMM_PCT>",
        source_of_truth: "team_policy_set",
        min: 0,
        max: 20,
        step: 0.1,
        component: "InputField",
        props: { suffix: "%", placeholder: "Policy default" }
      },
      {
        key: "concessions_pct",
        label: "Seller Concessions %",
        path: "listingCostModelSellerCostLineItems[].defaultPct",
        input: "percent",
        description: "Default seller concessions percentage.",
        token: "<CONCESSIONS_PCT>",
        source_of_truth: "team_policy_set",
        min: 0,
        max: 20,
        step: 0.1,
        component: "InputField",
        props: { suffix: "%", placeholder: "Policy default" }
      },
      {
        key: "sell_close_pct",
        label: "Sell Close Costs %",
        path: "listingCostModelSellerCostLineItems[].defaultPct",
        input: "percent",
        description: "Title & stamps on resale.",
        token: "<SELL_CLOSE_PCT>",
        source_of_truth: "team_policy_set",
        min: 0,
        max: 30,
        step: 0.1,
        component: "InputField",
        props: { suffix: "%", placeholder: "Policy default" }
      }
    ]
  }
];