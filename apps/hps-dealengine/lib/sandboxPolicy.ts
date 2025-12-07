import type { RepairRates, SandboxConfig } from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";

import { POSTURE_AWARE_KEYS } from "@/constants/sandboxSettings";
import type { Deal } from "@/types";
import { sandboxToAnalyzeOptions } from "./sandboxToAnalyzeOptions";

export type SandboxPolicyOptions = {
  posture: (typeof Postures)[number];
  valuation: {
    aivSafetyCapPercentage?: number;
    aivHardMax?: number;
    aivHardMin?: number;
    aivSoftMaxVsArvMultiplier?: number;
    aivCapOverrideConditionBindableInsuranceRequired?: boolean;
    aivCapOverrideConditionClearTitleQuoteRequired?: boolean;
    aivCapOverrideConditionFastZipLiquidityRequired?: boolean;
    aivCapOverrideApprovalRole?: string;
    aivCapEvidenceVpApprovalLoggingRequirement?: boolean;
    arvHardMax?: number;
    arvHardMin?: number;
    arvSoftMaxVsAivMultiplier?: number;
    arvMinComps?: number;
    arvSoftMaxCompsAgeDays?: number;
    arvCompsSetSizeForMedian?: number;
    buyerCeilingFormulaDefinition?: string;
  };
  floors: {
    floorInvestorAivDiscountP20Zip?: number | null;
    floorInvestorAivDiscountTypicalZip?: number | null;
    floorPayoffMinRetainedEquityPercentage?: number | null;
    floorPayoffMoveOutCashDefault?: number | null;
    floorPayoffMoveOutCashMax?: number | null;
    floorPayoffMoveOutCashMin?: number | null;
  };
  caps: {
    aivSafetyCapPct?: number;
    arvSoftMaxVsAivMultiplier?: number;
  };
  spreads: {
    minSpreadByArvBand?: any[];
    initialOfferSpreadMultiplier?: number;
    minSpreadDefaultPct?: number;
  };
  profit?: {
    assignmentFeeTargetDollars?: number | null;
    assignmentFeeMaxPublicizedPctOfArv?: number | null;
    flipMarginBaselinePct?: number | null;
    wholetailMarginMinPct?: number | null;
    wholetailMarginMaxPct?: number | null;
    wholetailMaxRepairsPctOfArv?: number | null;
    initialOfferSpreadMultiplier?: number | null;
    minSpreadByArvBand?: any[] | null;
  };
  carry: {
    carryMonthsCap?: number;
    carryMonthsFormulaDefinition?: string | null;
    uninsurableAdderExtraHoldCosts?: number | null;
  };
  holdCosts?: {
    flip?: {
      fast?: { monthly_pct_of_arv?: number | null };
      neutral?: { monthly_pct_of_arv?: number | null };
      slow?: { monthly_pct_of_arv?: number | null };
    };
    wholetail?: {
      fast?: { monthly_pct_of_arv?: number | null };
      neutral?: { monthly_pct_of_arv?: number | null };
      slow?: { monthly_pct_of_arv?: number | null };
    };
    wholesale_monthly_pct_of_arv_default?: number | null;
    default_monthly_bills?: {
      tax?: number | null;
      insurance?: number | null;
      hoa?: number | null;
      utilities?: number | null;
    };
  };
  margins: {
    buyerTargetMarginFlipBaselinePolicy?: number;
    uninsurableAdderFlipMarginPercentage?: number | null;
  };
  timeline: {
    urgentMaxDtm?: number;
    offerValidityDays?: number;
    clearToCloseBufferDays?: number | null;
    daysToMoneySelectionMethod?: string | null;
    daysToMoneyDefaultCashCloseDays?: number | null;
    daysToMoneyMaxDays?: number | null;
    defaultDaysToWholesaleClose?: number | null;
    dispositionRecommendationUrgentCashMaxAuctionDays?: number | null;
  };
  disposition: {
    doubleCloseMinSpreadThreshold?: number;
    doubleClosePerDiemCarryModeling?: boolean;
    dispositionTrackEnablement?: string[] | null;
    deedDocumentaryStampRatePolicy?: number | null;
    titlePremiumRateSource?: string | null;
  };
  compliance?: {
    bankruptcyStayGateLegalBlock?: boolean;
    fha90DayResaleRuleGate?: boolean;
    firptaWithholdingGate?: boolean;
    flood50RuleGate?: boolean;
    floodZoneEvidenceSourceFemaMapSelector?: string | null;
    scraVerificationGate?: boolean;
    stateProgramGateFhaVaOverlays?: boolean;
    vaProgramRequirementsWdoWaterTestEvidence?: boolean;
    warrantabilityReviewRequirementCondoEligibilityScreens?: boolean;
  };
  workflow_policy?: {
    analyst_review_borderline_threshold?: number | null;
    cash_presentation_min_spread_over_payoff?: number | null;
    allow_placeholders_when_evidence_missing?: boolean | null;
    allow_advisor_override_workflow_state?: boolean | null;
    confidence_grade_rubric?: string | null;
  };
  ux_policy?: {
    bankers_rounding_mode?: string | null;
    buyer_costs_dual_scenario_when_unknown?: boolean | null;
    buyer_costs_line_item_modeling_method?: string | null;
  };
};

export type AnalyzeRequestPayload = {
  org_id?: string;
  posture: (typeof Postures)[number];
  deal: {
    dealId?: string;
    arv?: number | null;
    aiv?: number | null;
    dom_zip_days?: number | null;
    moi_zip_months?: number | null;
    price_to_list_pct?: number | null;
    local_discount_pct?: number | null;
    options?: { trace?: boolean };
  };
  sandboxPolicy: SandboxPolicyOptions;
  sandboxOptions?: ReturnType<typeof sandboxToAnalyzeOptions>;
  sandboxSnapshot: SandboxConfig;
  repairProfile?: RepairRates;
};

const toNumberOrNull = (value: unknown): number | null => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

const toNumber = (value: unknown): number | undefined => {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (value === null || typeof value === "undefined") return undefined;
  return Boolean(value);
};

const toStringSafe = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const pctToDecimal = (value: unknown): number | undefined => {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (num > 1 || num > 0.5) return num / 100;
  if (num >= 0) return num;
  return undefined;
};

const pickPostureValue = (
  sandbox: SandboxConfig,
  posture: (typeof Postures)[number],
  key: string,
) => {
  const postureConfigs = (sandbox as any)?.postureConfigs ?? {};
  const postureValue = postureConfigs?.[posture]?.[key];
  if (typeof postureValue !== "undefined") return postureValue;
  return (sandbox as any)?.[key];
};

export function buildSandboxPolicyOptions(
  sandbox: SandboxConfig,
  posture: (typeof Postures)[number],
): SandboxPolicyOptions {
  const minSpreadBands = (sandbox as any)?.minSpreadByArvBand;
  const defaultMinSpreadPct = toNumber(
    (Array.isArray(minSpreadBands) ? minSpreadBands[0]?.minSpreadPct : null) ??
      (sandbox as any)?.minSpreadPct ??
      (sandbox as any)?.minSpreadDefaultPct,
  );
  const assignmentFeeTargetDollars = toNumber(
    pickPostureValue(sandbox, posture, "assignmentFeeTarget"),
  );
  const assignmentFeeMaxPublicizedPctOfArv = pctToDecimal(
    pickPostureValue(sandbox, posture, "assignmentFeeMaxPublicizedArvPercentage"),
  );
  const flipMarginBaselinePct = pctToDecimal(
    pickPostureValue(sandbox, posture, "buyerTargetMarginFlipBaselinePolicy"),
  );
  const wholetailMarginMinPct = pctToDecimal(
    pickPostureValue(sandbox, posture, "buyerTargetMarginWholetailMinPercentage"),
  );
  const wholetailMarginMaxPct = pctToDecimal(
    pickPostureValue(sandbox, posture, "buyerTargetMarginWholetailMaxPercentage"),
  );
  const wholetailMaxRepairsPctOfArv = pctToDecimal(
    pickPostureValue(
      sandbox,
      posture,
      "buyerSegmentationWholetailMaxRepairsAsArvPercentage",
    ),
  );
  const carryMonthsFormulaDefinition = toStringSafe(
    pickPostureValue(sandbox, posture, "carryMonthsFormulaDefinition"),
  );
  const uninsurableAdderExtraHoldCosts = toNumber(
    pickPostureValue(sandbox, posture, "uninsurableAdderExtraHoldCosts"),
  );
  const holdCostsFlipFast = pctToDecimal((sandbox as any)?.holdCostsFlipFastZip);
  const holdCostsFlipNeutral = pctToDecimal(
    (sandbox as any)?.holdCostsFlipNeutralZip,
  );
  const holdCostsFlipSlow = pctToDecimal((sandbox as any)?.holdCostsFlipSlowZip);
  const holdCostsWholetailFast = pctToDecimal(
    (sandbox as any)?.holdCostsWholetailFastZip,
  );
  const holdCostsWholetailNeutral = pctToDecimal(
    (sandbox as any)?.holdCostsWholetailNeutralZip,
  );
  const holdCostsWholetailSlow = pctToDecimal(
    (sandbox as any)?.holdCostsWholetailSlowZip,
  );
  const holdingCostsMonthlyDefaultHoa = toNumber(
    (sandbox as any)?.holdingCostsMonthlyDefaultHoa,
  );
  const holdingCostsMonthlyDefaultInsurance = toNumber(
    (sandbox as any)?.holdingCostsMonthlyDefaultInsurance,
  );
  const holdingCostsMonthlyDefaultTaxes = toNumber(
    (sandbox as any)?.holdingCostsMonthlyDefaultTaxes,
  );
  const holdingCostsMonthlyDefaultUtilities = toNumber(
    (sandbox as any)?.holdingCostsMonthlyDefaultUtilities,
  );
  const uninsurableAdderFlipMarginPercentage = pctToDecimal(
    (sandbox as any)?.uninsurableAdderFlipMarginPercentage,
  );
  const daysToMoneySelectionMethod = toStringSafe(
    pickPostureValue(sandbox, posture, "daysToMoneySelectionMethod"),
  );
  const daysToMoneyDefaultCashCloseDays = toNumber(
    pickPostureValue(sandbox, posture, "daysToMoneyDefaultCashCloseDays"),
  );
  const defaultDaysToWholesaleClose = toNumber(
    pickPostureValue(sandbox, posture, "defaultDaysToWholesaleClose"),
  );
  const daysToMoneyMaxDays = toNumber(
    pickPostureValue(sandbox, posture, "daysToMoneyMaxDays"),
  );
  const clearToCloseBufferDays = toNumber(
    pickPostureValue(sandbox, posture, "clearToCloseBufferDays"),
  );
  const dispositionRecommendationUrgentCashMaxAuctionDays = toNumber(
    pickPostureValue(
      sandbox,
      posture,
      "dispositionRecommendationUrgentCashMaxAuctionDays",
    ),
  );
  const dispositionTrackEnablement = Array.isArray(
    (sandbox as any)?.dispositionTrackEnablement,
  )
    ? (sandbox as any).dispositionTrackEnablement.filter(
        (v: unknown) => typeof v === "string",
      )
    : undefined;
  const deedDocumentaryStampRatePolicy = toNumber(
    (sandbox as any)?.deedDocumentaryStampRatePolicy,
  );
  const titlePremiumRateSource = toStringSafe(
    (sandbox as any)?.titlePremiumRateSource,
  );
  const compliance = {
    bankruptcyStayGateLegalBlock: toBoolean(
      (sandbox as any)?.bankruptcyStayGateLegalBlock,
    ),
    fha90DayResaleRuleGate: toBoolean((sandbox as any)?.fha90DayResaleRuleGate),
    firptaWithholdingGate: toBoolean((sandbox as any)?.firptaWithholdingGate),
    flood50RuleGate: toBoolean((sandbox as any)?.flood50RuleGate),
    floodZoneEvidenceSourceFemaMapSelector: toStringSafe(
      (sandbox as any)?.floodZoneEvidenceSourceFemaMapSelector,
    ),
    scraVerificationGate: toBoolean((sandbox as any)?.scraVerificationGate),
    stateProgramGateFhaVaOverlays: toBoolean(
      (sandbox as any)?.stateProgramGateFhaVaOverlays,
    ),
    vaProgramRequirementsWdoWaterTestEvidence: toBoolean(
      (sandbox as any)?.vaProgramRequirementsWdoWaterTestEvidence,
    ),
    warrantabilityReviewRequirementCondoEligibilityScreens: toBoolean(
      (sandbox as any)?.warrantabilityReviewRequirementCondoEligibilityScreens,
    ),
  };

  const workflowPolicy = {
    analyst_review_borderline_threshold: toNumber(
      pickPostureValue(
        sandbox,
        posture,
        "analystReviewTriggerBorderlineBandThreshold",
      ),
    ),
    cash_presentation_min_spread_over_payoff: toNumber(
      pickPostureValue(
        sandbox,
        posture,
        "cashPresentationGateMinimumSpreadOverPayoff",
      ),
    ),
    allow_placeholders_when_evidence_missing: toBoolean(
      pickPostureValue(
        sandbox,
        posture,
        "assumptionsProtocolPlaceholdersWhenEvidenceMissing",
      ),
    ),
    allow_advisor_override_workflow_state: toBoolean(
      pickPostureValue(
        sandbox,
        posture,
        "allowAdvisorOverrideWorkflowState",
      ),
    ),
    confidence_grade_rubric: toStringSafe(
      pickPostureValue(sandbox, posture, "abcConfidenceGradeRubric"),
    ),
  };

  const uxPolicy = {
    bankers_rounding_mode: toStringSafe(
      pickPostureValue(sandbox, posture, "bankersRoundingModeNumericSafety"),
    ),
    buyer_costs_dual_scenario_when_unknown: toBoolean(
      pickPostureValue(
        sandbox,
        posture,
        "buyerCostsAllocationDualScenarioRenderingWhenUnknown",
      ),
    ),
    buyer_costs_line_item_modeling_method: toStringSafe(
      pickPostureValue(
        sandbox,
        posture,
        "buyerCostsLineItemModelingMethod",
      ),
    ),
  };

  return {
    posture,
    valuation: {
      aivSafetyCapPercentage: toNumber(
        pickPostureValue(sandbox, posture, "aivSafetyCapPercentage"),
      ),
      aivHardMax: toNumber((sandbox as any)?.aivHardMax),
      aivHardMin: toNumber((sandbox as any)?.aivHardMin),
      aivSoftMaxVsArvMultiplier: toNumber(
        (sandbox as any)?.aivSoftMaxVsArvMultiplier,
      ),
      aivCapOverrideConditionBindableInsuranceRequired: toBoolean(
        (sandbox as any)?.aivCapOverrideConditionBindableInsuranceRequired,
      ),
      aivCapOverrideConditionClearTitleQuoteRequired: toBoolean(
        (sandbox as any)?.aivCapOverrideConditionClearTitleQuoteRequired,
      ),
      aivCapOverrideConditionFastZipLiquidityRequired: toBoolean(
        (sandbox as any)?.aivCapOverrideConditionFastZipLiquidityRequired,
      ),
      aivCapOverrideApprovalRole: toStringSafe(
        (sandbox as any)?.aivCapOverrideApprovalRole,
      ),
      aivCapEvidenceVpApprovalLoggingRequirement: toBoolean(
        (sandbox as any)?.aivCapEvidenceVpApprovalLoggingRequirement,
      ),
      arvHardMax: toNumber((sandbox as any)?.arvHardMax),
      arvHardMin: toNumber((sandbox as any)?.arvHardMin),
      arvSoftMaxVsAivMultiplier: toNumber(
        (sandbox as any)?.arvSoftMaxVsAivMultiplier,
      ),
      arvMinComps: toNumber((sandbox as any)?.arvMinComps),
      arvSoftMaxCompsAgeDays: toNumber((sandbox as any)?.arvSoftMaxCompsAgeDays),
      arvCompsSetSizeForMedian: toNumber(
        (sandbox as any)?.arvCompsSetSizeForMedian,
      ),
      buyerCeilingFormulaDefinition: toStringSafe(
        (sandbox as any)?.buyerCeilingFormulaDefinition,
      ),
    },
    floors: {
      floorInvestorAivDiscountP20Zip: pctToDecimal(
        (sandbox as any)?.floorInvestorAivDiscountP20Zip,
      ),
      floorInvestorAivDiscountTypicalZip: pctToDecimal(
        (sandbox as any)?.floorInvestorAivDiscountTypicalZip,
      ),
      floorPayoffMinRetainedEquityPercentage: pctToDecimal(
        (sandbox as any)?.floorPayoffMinRetainedEquityPercentage,
      ),
      floorPayoffMoveOutCashDefault: toNumber(
        (sandbox as any)?.floorPayoffMoveOutCashDefault,
      ),
      floorPayoffMoveOutCashMax: toNumber(
        (sandbox as any)?.floorPayoffMoveOutCashMax,
      ),
      floorPayoffMoveOutCashMin: toNumber(
        (sandbox as any)?.floorPayoffMoveOutCashMin,
      ),
    },
    caps: {
      aivSafetyCapPct: toNumber(
        pickPostureValue(sandbox, posture, "aivSafetyCapPercentage"),
      ),
      arvSoftMaxVsAivMultiplier: toNumber(
        (sandbox as any)?.arvSoftMaxVsAivMultiplier,
      ),
    },
    spreads: {
      minSpreadByArvBand: Array.isArray(minSpreadBands)
        ? minSpreadBands
        : undefined,
      initialOfferSpreadMultiplier: toNumber(
        pickPostureValue(sandbox, posture, "initialOfferSpreadMultiplier"),
      ),
      minSpreadDefaultPct: defaultMinSpreadPct,
    },
    profit: {
      assignmentFeeTargetDollars: assignmentFeeTargetDollars ?? null,
      assignmentFeeMaxPublicizedPctOfArv:
        assignmentFeeMaxPublicizedPctOfArv ?? null,
      flipMarginBaselinePct: flipMarginBaselinePct ?? null,
      wholetailMarginMinPct: wholetailMarginMinPct ?? null,
      wholetailMarginMaxPct: wholetailMarginMaxPct ?? null,
      wholetailMaxRepairsPctOfArv: wholetailMaxRepairsPctOfArv ?? null,
      initialOfferSpreadMultiplier: toNumber(
        pickPostureValue(sandbox, posture, "initialOfferSpreadMultiplier"),
      ),
      minSpreadByArvBand: Array.isArray(minSpreadBands)
        ? minSpreadBands
        : undefined,
    },
    carry: {
      carryMonthsCap: toNumber(
        pickPostureValue(sandbox, posture, "carryMonthsMaximumCap"),
      ),
      carryMonthsFormulaDefinition,
      uninsurableAdderExtraHoldCosts,
    },
    holdCosts: {
      flip: {
        fast: { monthly_pct_of_arv: holdCostsFlipFast },
        neutral: { monthly_pct_of_arv: holdCostsFlipNeutral },
        slow: { monthly_pct_of_arv: holdCostsFlipSlow },
      },
      wholetail: {
        fast: { monthly_pct_of_arv: holdCostsWholetailFast },
        neutral: { monthly_pct_of_arv: holdCostsWholetailNeutral },
        slow: { monthly_pct_of_arv: holdCostsWholetailSlow },
      },
      default_monthly_bills: {
        tax: holdingCostsMonthlyDefaultTaxes,
        insurance: holdingCostsMonthlyDefaultInsurance,
        hoa: holdingCostsMonthlyDefaultHoa,
        utilities: holdingCostsMonthlyDefaultUtilities,
      },
    },
    margins: {
      buyerTargetMarginFlipBaselinePolicy: toNumber(
        pickPostureValue(sandbox, posture, "buyerTargetMarginFlipBaselinePolicy"),
      ),
      uninsurableAdderFlipMarginPercentage,
    },
    timeline: {
      urgentMaxDtm: toNumber(
        pickPostureValue(
          sandbox,
          posture,
          "dispositionRecommendationUrgentCashMaxDtm",
        ),
      ),
      offerValidityDays: toNumber(
        pickPostureValue(sandbox, posture, "offerValidityPeriodDaysPolicy"),
      ),
      clearToCloseBufferDays,
      daysToMoneySelectionMethod,
      daysToMoneyDefaultCashCloseDays,
      defaultDaysToWholesaleClose,
      daysToMoneyMaxDays,
      dispositionRecommendationUrgentCashMaxAuctionDays,
    },
    disposition: {
      doubleCloseMinSpreadThreshold: toNumber(
        (sandbox as any)?.doubleCloseMinSpreadThreshold,
      ),
      doubleClosePerDiemCarryModeling: toBoolean(
        (sandbox as any)?.doubleClosePerDiemCarryModeling,
      ),
      dispositionTrackEnablement,
      deedDocumentaryStampRatePolicy,
      titlePremiumRateSource,
    },
    compliance,
    workflow_policy: workflowPolicy,
    ux_policy: uxPolicy,
  };
}

export function buildAnalyzeRequestPayload(params: {
  orgId?: string;
  posture: (typeof Postures)[number];
  dbDealId?: string;
  deal: Deal;
  sandbox: SandboxConfig;
  repairRates?: RepairRates | null;
}): AnalyzeRequestPayload {
  const { orgId, posture, dbDealId, deal, sandbox, repairRates } = params;
  const market: any = (deal as any)?.market ?? {};

  return {
    org_id: orgId,
    posture,
    deal: {
      dealId: dbDealId,
      arv: toNumberOrNull(market.arv ?? market.arv_value),
      aiv: toNumberOrNull(market.as_is_value ?? market.aiv),
      dom_zip_days: toNumberOrNull(
        market.dom_zip ?? market.dom_zip_days ?? market.dom,
      ),
      moi_zip_months: toNumberOrNull(
        market.moi_zip ??
          market.moi_zip_months ??
          market.months_of_inventory ??
          market.months_of_inventory_zip,
      ),
      price_to_list_pct: toNumberOrNull(
        market["price-to-list-pct"] ??
          market.price_to_list_pct ??
          market.price_to_list_ratio,
      ),
      local_discount_pct: toNumberOrNull(
        market.local_discount_20th_pct ?? market.local_discount_pct,
      ),
      options: { trace: true },
    },
    sandboxPolicy: buildSandboxPolicyOptions(sandbox, posture),
    sandboxOptions: sandboxToAnalyzeOptions({ sandbox, posture }),
    sandboxSnapshot: sandbox,
    repairProfile: repairRates ?? undefined,
  };
}

export function mergePostureAwareValues(
  sandbox: SandboxConfig,
  posture: (typeof Postures)[number],
): SandboxConfig {
  const next = { ...(sandbox ?? {}) } as any;
  for (const key of POSTURE_AWARE_KEYS) {
    const val = pickPostureValue(sandbox, posture, key);
    if (typeof val !== "undefined") {
      next[key] = val;
    }
  }
  return next;
}
