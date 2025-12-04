export type SandboxV1Knob = {
  key: string;
  label: string;
  group:
    | "Valuation"
    | "Repairs"
    | "Costs & Carry"
    | "Profit & Offers"
    | "Compliance & Risk"
    | "Workflow";
  governedToken?: string;
  description?: string;
};

export const SANDBOX_V1_KNOBS: SandboxV1Knob[] = [
  {
    key: "aivSafetyCapPercentage",
    label: "AIV Safety Cap %",
    group: "Valuation",
    governedToken: "policy.safety_on_aiv_pct",
  },
  {
    key: "arvSoftMaxVsAivMultiplier",
    label: "ARV Soft Max vs AIV",
    group: "Valuation",
  },
  {
    key: "repairsSoftMaxVsArvPercentage",
    label: "Repairs Soft Max vs ARV %",
    group: "Repairs",
  },
  {
    key: "carryMonthsMaximumCap",
    label: "Carry Months Cap",
    group: "Costs & Carry",
  },
  {
    key: "daysToMoneyDefaultCashCloseDays",
    label: "Days to Money (Cash)",
    group: "Costs & Carry",
    governedToken: "policy.manual_days_to_money",
  },
  {
    key: "minSpreadByArvBand",
    label: "Minimum Spread Bands",
    group: "Profit & Offers",
    governedToken: "policy.min_spread",
  },
  {
    key: "assignmentFeeTarget",
    label: "Assignment Fee Target",
    group: "Profit & Offers",
    governedToken: "policy.assignment_fee_target",
  },
  {
    key: "initialOfferSpreadMultiplier",
    label: "Initial Offer Spread Multiplier",
    group: "Profit & Offers",
  },
  {
    key: "buyerTargetMarginFlipBaselinePolicy",
    label: "Flip Target Margin",
    group: "Profit & Offers",
  },
  {
    key: "fha90DayResaleRuleGate",
    label: "FHA 90-Day Resale Gate",
    group: "Compliance & Risk",
  },
  {
    key: "flood50RuleGate",
    label: "Flood 50% Rule Gate",
    group: "Compliance & Risk",
  },
  {
    key: "payoffLetterEvidenceRequiredAttachment",
    label: "Require Payoff Letter Attachment",
    group: "Compliance & Risk",
  },
  {
    key: "assumptionsProtocolPlaceholdersWhenEvidenceMissing",
    label: "Show Evidence Placeholders",
    group: "Workflow",
  },
];

export function sandboxKnobMap() {
  return Object.fromEntries(SANDBOX_V1_KNOBS.map((k) => [k.key, k])) as Record<
    string,
    SandboxV1Knob
  >;
}
