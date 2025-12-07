#!/usr/bin/env node
/**
 * Regenerates packages/contracts/src/sandboxMeta.generated.ts from
 * apps/hps-dealengine/constants/sandboxSettingsSource.ts.
 *
 * Normalizes every sandbox knob into a typed, classified metadata record.
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(
  repoRoot,
  "apps",
  "hps-dealengine",
  "constants",
  "sandboxSettingsSource.ts",
);
const postureAwarePath = path.join(
  repoRoot,
  "apps",
  "hps-dealengine",
  "constants",
  "sandboxSettings.ts",
);
const outputPath = path.join(
  repoRoot,
  "packages",
  "contracts",
  "src",
  "sandboxMeta.generated.ts",
);

const readSourceFile = (filePath) =>
  ts.createSourceFile(
    path.basename(filePath),
    fs.readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

const findInitializer = (sf, identifier) => {
  let found = null;
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === identifier
    ) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return found;
};

const evalNode = (node) => {
  if (!node) return undefined;
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return node.text;
    case ts.SyntaxKind.NumericLiteral:
      return Number(node.text);
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NullKeyword:
      return null;
    case ts.SyntaxKind.UndefinedKeyword:
      return undefined;
    case ts.SyntaxKind.ArrayLiteralExpression:
      return node.elements.map(evalNode);
    case ts.SyntaxKind.PrefixUnaryExpression:
      return -evalNode(node.operand);
    case ts.SyntaxKind.ObjectLiteralExpression: {
      const obj = {};
      for (const prop of node.properties) {
        if (
          ts.isPropertyAssignment(prop) ||
          ts.isShorthandPropertyAssignment(prop)
        ) {
          const name = prop.name
            ? prop.name.getText().replace(/['"]/g, "")
            : prop.name;
          const value = ts.isShorthandPropertyAssignment(prop)
            ? evalNode(prop.objectAssignmentInitializer)
            : evalNode(prop.initializer);
          obj[name] = value;
        }
      }
      return obj;
    }
    default:
      throw new Error(`Unsupported syntax kind: ${ts.SyntaxKind[node.kind]}`);
  }
};

const extractArrayLiteral = (filePath, identifier) => {
  const sf = readSourceFile(filePath);
  const init = findInitializer(sf, identifier);
  if (!init || !ts.isArrayLiteralExpression(init)) {
    throw new Error(`Could not find array initializer for "${identifier}".`);
  }
  return evalNode(init);
};

const inferValueType = (definition) => {
  const { component, defaultValue } = definition;
  if (component === "ToggleSwitch") return "boolean";
  if (component === "MultiSelectChecklist") return "string[]";
  if (component === "DynamicBandEditor") return "bands[]";
  if (component === "Textarea") return "string";
  if (component === "SelectField") return "enum";
  if (component === "InputField") {
    if (typeof defaultValue === "number") return "number";
    if (typeof defaultValue === "string") return "string";
  }
  if (typeof defaultValue === "number") return "number";
  if (typeof defaultValue === "boolean") return "boolean";
  if (typeof defaultValue === "string") return "string";
  if (Array.isArray(defaultValue)) return "string[]";
  return "unknown";
};

const inferValueKind = (definition, valueType) => {
  const suffix = (definition.props?.suffix || "").toString().toLowerCase();
  const prefix = (definition.props?.prefix || "").toString().toLowerCase();
  const label = (definition.label || "").toLowerCase();

  if (valueType === "boolean") return "boolean";
  if (valueType === "enum") return "enum";
  if (valueType === "string[]") return "string[]";
  if (valueType === "bands[]") return "bands[]";
  if (valueType === "string") return "string";

  const contains = (text, needle) => text.includes(needle);

  if (prefix.includes("$") || contains(label, "$")) return "currency";
  if (contains(suffix, "%") || contains(label, "%")) return "percent";
  if (contains(suffix, "days") || contains(label, "days")) return "days";
  if (contains(suffix, "months") || contains(label, "months")) return "months";
  if (contains(suffix, "years") || contains(label, "years")) return "years";
  if (contains(suffix, "miles")) return "distanceMiles";
  if (contains(suffix, "multiplier") || contains(label, "multiplier"))
    return "multiplier";

  return "number";
};

const postureAwareKeys = new Set(
  extractArrayLiteral(postureAwarePath, "POSTURE_AWARE_KEYS") || [],
);

const settingDefs = extractArrayLiteral(sourcePath, "allSettingDefs");

const defaultHome = "sandbox";

const FIXEDNESS = {
  VARIABLE: "variable",
  FIXED: "fixed",
  UIONLY: "uiOnly",
};

const OVERRIDES = {
  aivSafetyCapPercentage: {
    fixedOrVariable: FIXEDNESS.VARIABLE,
    policyTokenKey: "aiv_safety_cap_pct",
    engineUsageHint: "Cap AIV vs ARV for safety.",
  },
  aivSoftMaxVsArvMultiplier: {
    policyTokenKey: "aiv_soft_max_vs_arv_multiplier",
    engineUsageHint: "Soft ceiling for AIV vs ARV.",
  },
  arvSoftMaxVsAivMultiplier: {
    policyTokenKey: "arv_soft_max_vs_aiv_multiplier",
    engineUsageHint: "Soft floor for ARV vs AIV.",
  },
  arvMinComps: {
    policyTokenKey: "arv_min_comps",
    engineUsageHint: "Comps required for ARV confidence.",
  },
  arvSoftMaxCompsAgeDays: {
    policyTokenKey: "arv_comps_max_age_days",
    engineUsageHint: "Stale comps guardrail.",
  },
  floorInvestorAivDiscountTypicalZip: {
    policyTokenKey: "investor_floor_aiv_discount_typical",
    engineUsageHint: "Investor floor discount in typical ZIPs.",
    fixedOrVariable: FIXEDNESS.VARIABLE,
  },
  minSpreadByArvBand: {
    policyTokenKey: "min_spread_by_arv_band",
    engineUsageHint: "Spread gate per ARV band.",
  },
  initialOfferSpreadMultiplier: {
    policyTokenKey: "initial_offer_spread_multiplier",
    engineUsageHint: "Initial offer relative to spread target.",
  },
  buyerTargetMarginFlipBaselinePolicy: {
    policyTokenKey: "buyer_target_margin_flip",
    engineUsageHint: "Baseline flip margin.",
  },
  assignmentFeeTarget: {
    policyTokenKey: "assignment_fee_target",
    engineUsageHint: "Target assignment fee gate.",
  },
  assignmentFeeMaxPublicizedArvPercentage: {
    policyTokenKey: "assignment_fee_max_pct_arv",
    engineUsageHint: "Max publicized fee as % ARV.",
  },
  repairsSoftMaxVsArvPercentage: {
    policyTokenKey: "repairs_soft_max_vs_arv_pct",
    engineUsageHint: "Soft cap repairs vs ARV.",
  },
  repairsHardMax: {
    policyTokenKey: "repairs_hard_max",
    engineUsageHint: "Hard cap repairs dollars.",
    fixedOrVariable: FIXEDNESS.VARIABLE,
  },
  repairsContingencyPercentageByClass: {
    policyTokenKey: "repairs_contingency_pct_by_class",
    engineUsageHint: "Contingency by repair class.",
  },
  carryMonthsMaximumCap: {
    policyTokenKey: "carry_months_cap",
    engineUsageHint: "Max carry months clamp.",
  },
  carryMonthsFormulaDefinition: {
    policyTokenKey: "carry_months_formula",
    engineUsageHint: "Carry months formula selector.",
  },
  daysToMoneySelectionMethod: {
    policyTokenKey: "dtm_selection_method",
    engineUsageHint: "How to derive Days-to-Money.",
  },
  daysToMoneyDefaultCashCloseDays: {
    policyTokenKey: "dtm_default_cash_close_days",
    engineUsageHint: "Default DTM for cash close.",
  },
  defaultDaysToWholesaleClose: {
    policyTokenKey: "dtm_wholesale_days",
    engineUsageHint: "Default wholesale close days.",
  },
  buyerSegmentationWholetailMaxRepairsAsArvPercentage: {
    policyTokenKey: "wholetail_max_repairs_pct_arv",
    engineUsageHint: "Wholetail eligibility cap on repairs.",
  },
  buyerTargetMarginWholetailMinPercentage: {
    policyTokenKey: "wholetail_margin_min_pct",
    engineUsageHint: "Wholetail min margin.",
  },
  buyerTargetMarginWholetailMaxPercentage: {
    policyTokenKey: "wholetail_margin_max_pct",
    engineUsageHint: "Wholetail max margin.",
  },
  bankruptcyStayGateLegalBlock: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  fha90DayResaleRuleGate: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  firptaWithholdingGate: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  flood50RuleGate: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  scraVerificationGate: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  vaProgramRequirementsWdoWaterTestEvidence: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  stateProgramGateFhaVaOverlays: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  warrantabilityReviewRequirementCondoEligibilityScreens: {
    fixedOrVariable: FIXEDNESS.FIXED,
    readOnly: true,
  },
  payoffLetterEvidenceRequiredAttachment: {
    fixedOrVariable: FIXEDNESS.FIXED,
  },
  ucc1TerminationSubordinationClosingConditionRequirement: {
    fixedOrVariable: FIXEDNESS.FIXED,
  },
  solarLeaseUcc1GateClearanceRequirement: {
    fixedOrVariable: FIXEDNESS.FIXED,
  },
  floodZoneEvidenceSourceFemaMapSelector: {
    fixedOrVariable: FIXEDNESS.FIXED,
  },
};

const CATEGORY_DEFAULTS = {
  "Core Valuation Models": FIXEDNESS.VARIABLE,
  "Floor & Ceiling Formulas": FIXEDNESS.VARIABLE,
  "Cost & Expense Models": FIXEDNESS.VARIABLE,
  "Debt & Payoff Logic": FIXEDNESS.FIXED,
  "Profit & Risk Policy": FIXEDNESS.VARIABLE,
  "Timeline & Urgency Rules": FIXEDNESS.VARIABLE,
  "Compliance & Risk Gates": FIXEDNESS.FIXED,
  "Specialized Disposition Modules": FIXEDNESS.VARIABLE,
  "Workflow & UI Logic": FIXEDNESS.VARIABLE,
};

const FIXED_KEYWORDS = [
  "hard max",
  "hard min",
  "fha",
  "va ",
  "firpta",
  "scra",
  "flood",
  "warrant",
  "bankruptcy",
  "foreclosure",
  "right-of-first-refusal",
];

const meta = settingDefs.map((definition) => {
  if (!definition.key) {
    throw new Error("Encountered sandbox setting without a key.");
  }
  const valueType = inferValueType(definition);
  const valueKind = inferValueKind(definition, valueType);
  const options = Array.isArray(definition.props?.options)
    ? definition.props.options
    : undefined;
  const override = OVERRIDES[definition.key] ?? {};
  const labelLower = (definition.label || "").toLowerCase();
  const category = definition.pageTitle;
  const hasFixedKeyword = FIXED_KEYWORDS.some((kw) => labelLower.includes(kw));

  const fixedOrVariable =
    override.fixedOrVariable ??
    (definition.props?.disabled ? FIXEDNESS.FIXED : undefined) ??
    (category === "Compliance & Risk Gates" ? FIXEDNESS.FIXED : undefined) ??
    (category === "Debt & Payoff Logic" ? FIXEDNESS.FIXED : undefined) ??
    (hasFixedKeyword ? FIXEDNESS.FIXED : undefined) ??
    CATEGORY_DEFAULTS[category] ??
    FIXEDNESS.VARIABLE;

  return {
    key: definition.key,
    pageTitle: definition.pageTitle,
    category: definition.pageTitle,
    label: definition.label,
    description: (definition.description || "").trim(),
    helpText: (definition.description || "").trim(),
    component: definition.component,
    type: valueType,
    valueType,
    valueKind,
    defaultValue: definition.defaultValue ?? null,
    defaultValueSource: JSON.stringify(definition.defaultValue ?? null),
    options,
    postureAware: postureAwareKeys.has(definition.key),
    home: defaultHome,
    readOnly: override.readOnly === true ? true : Boolean(definition.props?.disabled),
    fixedOrVariable,
    policyTokenKey: override.policyTokenKey,
    engineUsageHint: override.engineUsageHint,
  };
});

const keys = new Set();
meta.forEach((m) => {
  if (keys.has(m.key)) {
    throw new Error(`Duplicate sandbox key found: ${m.key}`);
  }
  keys.add(m.key);
});

const valueTypes = Array.from(new Set(meta.map((m) => m.valueType))).sort();
const valueKinds = Array.from(new Set(meta.map((m) => m.valueKind))).sort();
const homes = Array.from(new Set(meta.map((m) => m.home))).sort();
const fixedness = Array.from(new Set(meta.map((m) => m.fixedOrVariable))).sort();

const stringify = (val) => JSON.stringify(val, null, 2);

const fileHeader = `// AUTO-GENERATED by scripts/generate-sandbox-meta.cjs
// Source of truth: ${path.relative(repoRoot, sourcePath)}
// Do not edit manually; update the source and re-run the generator.
`;

const fileBody = `
export type SandboxValueType = ${valueTypes.map((t) => `"${t}"`).join(" | ")};
export type SandboxValueKind = ${valueKinds.map((t) => `"${t}"`).join(" | ")};
export type SandboxSettingHome = ${homes.map((t) => `"${t}"`).join(" | ")};
export type SandboxFixedOrVariable = ${fixedness.map((t) => `"${t}"`).join(" | ")};

export interface SandboxSettingMeta {
  key: string;
  pageTitle: string;
  category: string;
  label: string;
  description: string;
  helpText: string;
  component: string;
  type: SandboxValueType;
  valueType: SandboxValueType;
  valueKind: SandboxValueKind;
  defaultValue: unknown;
  defaultValueSource: string;
  options?: string[];
  postureAware: boolean;
  home: SandboxSettingHome;
  readOnly: boolean;
  fixedOrVariable: SandboxFixedOrVariable;
  policyTokenKey?: string;
  engineUsageHint?: string;
}

export const SANDBOX_SETTING_META = ${stringify(meta)} satisfies SandboxSettingMeta[];
export const SANDBOX_META_BY_KEY: Record<string, SandboxSettingMeta> = Object.fromEntries(
  SANDBOX_SETTING_META.map((m) => [m.key, m]),
);
`;

fs.writeFileSync(outputPath, `${fileHeader}${fileBody}`);
console.log(
  `Wrote ${meta.length} settings to ${path.relative(repoRoot, outputPath)}.`,
);
