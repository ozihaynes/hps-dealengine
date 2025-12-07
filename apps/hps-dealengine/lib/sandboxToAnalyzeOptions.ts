import type { SandboxConfig } from "@hps-internal/contracts";
import { Postures } from "@hps-internal/contracts";

import { ALL_SANDBOX_SETTING_META } from "@/constants/sandboxSettings";
import { mergePostureAwareValues } from "./sandboxPolicy";

export type SandboxAnalyzeOptions = {
  valuation?: {
    aivSafetyCapPercentage?: number;
    aivHardMax?: number;
    aivHardMin?: number;
    aivSoftMaxVsArvMultiplier?: number;
    aivCapOverrideApprovalRole?: string;
    aivCapOverrideConditionBindableInsuranceRequired?: boolean;
    aivCapOverrideConditionClearTitleQuoteRequired?: boolean;
    aivCapOverrideConditionFastZipLiquidityRequired?: boolean;
    aivCapEvidenceVpApprovalLoggingRequirement?: boolean;
    arvHardMax?: number;
    arvHardMin?: number;
    arvSoftMaxVsAivMultiplier?: number;
    arvMinComps?: number;
    arvSoftMaxCompsAgeDays?: number;
    arvCompsSetSizeForMedian?: number;
    buyerCeilingFormulaDefinition?: string;
  };
  floors?: {
    floorInvestorAivDiscountP20Zip?: number | null;
    floorInvestorAivDiscountTypicalZip?: number | null;
    floorPayoffMinRetainedEquityPercentage?: number | null;
    floorPayoffMoveOutCashDefault?: number | null;
    floorPayoffMoveOutCashMax?: number | null;
    floorPayoffMoveOutCashMin?: number | null;
  };
  floorsSpreads?: {
    floorInvestorAivDiscountTypicalZip?: number;
    floorInvestorAivDiscountP20Zip?: number;
    minSpreadByArvBand?: any[];
    initialOfferSpreadMultiplier?: number;
    buyerTargetMarginFlipBaselinePolicy?: number;
    assignmentFeeTarget?: number;
    assignmentFeeMaxPublicizedArvPercentage?: number;
    floorPayoffMinRetainedEquityPercentage?: number;
    floorPayoffMoveOutCashDefault?: number;
    floorPayoffMoveOutCashMin?: number;
    floorPayoffMoveOutCashMax?: number;
  };
  repairs?: {
    repairsSoftMaxVsArvPercentage?: number;
    repairsHardMax?: number;
    repairsContingencyPercentageByClass?: any[];
    repairsContingencyDefaultPercentage?: number;
  };
  carryTimeline?: {
    carryMonthsMaximumCap?: number;
    carryMonthsFormulaDefinition?: string;
    daysToMoneySelectionMethod?: string;
    daysToMoneyDefaultCashCloseDays?: number;
    defaultDaysToWholesaleClose?: number;
    daysToMoneyMaxDays?: number;
  };
  carry?: {
    carryMonthsMaximumCap?: number | null;
    carryMonthsFormulaDefinition?: string | null;
    uninsurableAdderExtraHoldCosts?: number | null;
  };
  holdCosts?: {
    holdCostsFlipFastZip?: number | null;
    holdCostsFlipNeutralZip?: number | null;
    holdCostsFlipSlowZip?: number | null;
    holdCostsWholetailFastZip?: number | null;
    holdCostsWholetailNeutralZip?: number | null;
    holdCostsWholetailSlowZip?: number | null;
    holdingCostsMonthlyDefaultHoa?: number | null;
    holdingCostsMonthlyDefaultInsurance?: number | null;
    holdingCostsMonthlyDefaultTaxes?: number | null;
    holdingCostsMonthlyDefaultUtilities?: number | null;
  };
  timeline?: {
    clearToCloseBufferDays?: number | null;
    daysToMoneySelectionMethod?: string | null;
    daysToMoneyDefaultCashCloseDays?: number | null;
    daysToMoneyMaxDays?: number | null;
    defaultDaysToWholesaleClose?: number | null;
    dispositionRecommendationUrgentCashMaxDtm?: number | null;
    dispositionRecommendationUrgentCashMaxAuctionDays?: number | null;
    offerValidityPeriodDaysPolicy?: number | null;
  };
  profitUninsurable?: {
    uninsurableAdderFlipMarginPercentage?: number | null;
    uninsurableAdderExtraHoldCosts?: number | null;
  };
  profit_and_fees?: {
    assignmentFeeTarget?: number | null;
    assignmentFeeMaxPublicizedArvPercentage?: number | null;
    buyerTargetMarginFlipBaselinePolicy?: number | null;
    buyerTargetMarginWholetailMinPercentage?: number | null;
    buyerTargetMarginWholetailMaxPercentage?: number | null;
    buyerSegmentationWholetailMaxRepairsAsArvPercentage?: number | null;
    initialOfferSpreadMultiplier?: number | null;
    minSpreadByArvBand?: any[] | null;
  };
  disposition_and_double_close?: {
    doubleCloseMinSpreadThreshold?: number | null;
    doubleClosePerDiemCarryModeling?: boolean | null;
    deedDocumentaryStampRatePolicy?: number | null;
    titlePremiumRateSource?: string | null;
    dispositionTrackEnablement?: string[] | null;
  };
  compliance_and_risk_gates?: {
    bankruptcyStayGateLegalBlock?: boolean | null;
    fha90DayResaleRuleGate?: boolean | null;
    firptaWithholdingGate?: boolean | null;
    flood50RuleGate?: boolean | null;
    floodZoneEvidenceSourceFemaMapSelector?: string | null;
    scraVerificationGate?: boolean | null;
    stateProgramGateFhaVaOverlays?: boolean | null;
    vaProgramRequirementsWdoWaterTestEvidence?: boolean | null;
    warrantabilityReviewRequirementCondoEligibilityScreens?: boolean | null;
  };
  wholetail?: {
    buyerSegmentationWholetailMaxRepairsAsArvPercentage?: number;
    buyerTargetMarginWholetailMinPercentage?: number;
    buyerTargetMarginWholetailMaxPercentage?: number;
  };
  debtPayoff?: {
    payoffAccrualBasisDayCountConvention?: string;
    payoffAccrualComponents?: string[];
    payoffLetterEvidenceRequiredAttachment?: boolean;
    payoffAccrualDailyInterestSafetyCap?: number;
    payoffAggressiveOverrideAllowed?: boolean;
  };
  complianceRisk?: {
    bankruptcyStayGateLegalBlock?: boolean;
    fha90DayResaleRuleGate?: boolean;
    firptaWithholdingGate?: boolean;
    flood50RuleGate?: boolean;
    floodZoneEvidenceSourceFemaMapSelector?: string;
    scraVerificationGate?: boolean;
    vaProgramRequirementsWdoWaterTestEvidence?: boolean;
    stateProgramGateFhaVaOverlays?: boolean;
    warrantabilityReviewRequirementCondoEligibilityScreens?: boolean;
  };
  disposition?: {
    doubleCloseMinSpreadThreshold?: number;
    doubleClosePerDiemCarryModeling?: boolean;
    dispositionTrackEnablement?: string[];
    deedDocumentaryStampRatePolicy?: number;
    titlePremiumRateSource?: string;
  };
  workflowUi?: {
    bankersRoundingModeNumericSafety?: boolean;
    assumptionsProtocolPlaceholdersWhenEvidenceMissing?: boolean;
    buyerCostsAllocationDualScenarioRenderingWhenUnknown?: boolean;
  };
  workflow_and_guardrails?: {
    analystReviewTriggerBorderlineBandThreshold?: number | null;
    cashPresentationGateMinimumSpreadOverPayoff?: number | null;
    assumptionsProtocolPlaceholdersWhenEvidenceMissing?: boolean | null;
    bankersRoundingModeNumericSafety?: string | null;
    buyerCostsAllocationDualScenarioRenderingWhenUnknown?: boolean | null;
    buyerCostsLineItemModelingMethod?: string | null;
    abcConfidenceGradeRubric?: string | null;
    allowAdvisorOverrideWorkflowState?: boolean | null;
  };
  ux_policy?: {
    bankersRoundingModeNumericSafety?: string | null;
    buyerCostsAllocationDualScenarioRenderingWhenUnknown?: boolean | null;
    buyerCostsLineItemModelingMethod?: string | null;
  };
  raw?: Record<string, unknown>;
};

const toNumber = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
};

const sanitizeBands = (bands: any): any[] | undefined => {
  if (!Array.isArray(bands)) return undefined;
  return bands
    .map((b) => ({
      bandName: b?.bandName ?? b?.label ?? b?.name,
      maxArv: toNumber(b?.maxArv ?? b?.max_arv),
      minSpread: toNumber(b?.minSpread ?? b?.min_spread),
      minSpreadPct: toNumber(b?.minSpreadPct ?? b?.min_spread_pct),
    }))
    .filter(
      (b) =>
        b.bandName &&
        (typeof b.maxArv === "number" || typeof b.minSpread === "number"),
    );
};

export function sandboxToAnalyzeOptions(params: {
  sandbox: SandboxConfig;
  posture: (typeof Postures)[number];
}): SandboxAnalyzeOptions {
  const { sandbox, posture } = params;
  const s = mergePostureAwareValues(sandbox, posture) as any;

  const raw: Record<string, unknown> = {};
  for (const meta of ALL_SANDBOX_SETTING_META) {
    const val = s?.[meta.key];
    switch (meta.valueType) {
      case "number":
        raw[meta.key] = toNumber(val);
        break;
      case "boolean":
        raw[meta.key] = Boolean(val);
        break;
      case "string":
      case "enum":
        raw[meta.key] = toString(val);
        break;
      case "string[]":
        raw[meta.key] = Array.isArray(val)
          ? val.filter((v: unknown) => typeof v === "string")
          : undefined;
        break;
      case "bands[]":
        raw[meta.key] = Array.isArray(val) ? val : undefined;
        break;
      default:
        raw[meta.key] = val;
    }
  }

  return {
    valuation: {
      aivSafetyCapPercentage: toNumber(s.aivSafetyCapPercentage),
      aivHardMax: toNumber(s.aivHardMax),
      aivHardMin: toNumber(s.aivHardMin),
      aivSoftMaxVsArvMultiplier: toNumber(s.aivSoftMaxVsArvMultiplier),
      aivCapOverrideApprovalRole: toString(s.aivCapOverrideApprovalRole),
      aivCapOverrideConditionBindableInsuranceRequired: Boolean(
        s.aivCapOverrideConditionBindableInsuranceRequired,
      ),
      aivCapOverrideConditionClearTitleQuoteRequired: Boolean(
        s.aivCapOverrideConditionClearTitleQuoteRequired,
      ),
      aivCapOverrideConditionFastZipLiquidityRequired: Boolean(
        s.aivCapOverrideConditionFastZipLiquidityRequired,
      ),
      aivCapEvidenceVpApprovalLoggingRequirement: Boolean(
        s.aivCapEvidenceVpApprovalLoggingRequirement,
      ),
      arvHardMax: toNumber(s.arvHardMax),
      arvHardMin: toNumber(s.arvHardMin),
      arvSoftMaxVsAivMultiplier: toNumber(s.arvSoftMaxVsAivMultiplier),
      arvMinComps: toNumber(s.arvMinComps),
      arvSoftMaxCompsAgeDays: toNumber(s.arvSoftMaxCompsAgeDays),
      arvCompsSetSizeForMedian: toNumber(s.arvCompsSetSizeForMedian),
      buyerCeilingFormulaDefinition: toString(s.buyerCeilingFormulaDefinition),
    },
    floors: {
      floorInvestorAivDiscountP20Zip: toNumber(
        s.floorInvestorAivDiscountP20Zip,
      ),
      floorInvestorAivDiscountTypicalZip: toNumber(
        s.floorInvestorAivDiscountTypicalZip,
      ),
      floorPayoffMinRetainedEquityPercentage: toNumber(
        s.floorPayoffMinRetainedEquityPercentage,
      ),
      floorPayoffMoveOutCashDefault: toNumber(
        s.floorPayoffMoveOutCashDefault,
      ),
      floorPayoffMoveOutCashMax: toNumber(s.floorPayoffMoveOutCashMax),
      floorPayoffMoveOutCashMin: toNumber(s.floorPayoffMoveOutCashMin),
    },
    floorsSpreads: {
      floorInvestorAivDiscountTypicalZip: toNumber(
        s.floorInvestorAivDiscountTypicalZip,
      ),
      floorInvestorAivDiscountP20Zip: toNumber(
        s.floorInvestorAivDiscountP20Zip,
      ),
      minSpreadByArvBand: sanitizeBands(s.minSpreadByArvBand),
      initialOfferSpreadMultiplier: toNumber(s.initialOfferSpreadMultiplier),
      buyerTargetMarginFlipBaselinePolicy: toNumber(
        s.buyerTargetMarginFlipBaselinePolicy,
      ),
      assignmentFeeTarget: toNumber(s.assignmentFeeTarget),
      assignmentFeeMaxPublicizedArvPercentage: toNumber(
        s.assignmentFeeMaxPublicizedArvPercentage,
      ),
      floorPayoffMinRetainedEquityPercentage: toNumber(
        s.floorPayoffMinRetainedEquityPercentage,
      ),
      floorPayoffMoveOutCashDefault: toNumber(s.floorPayoffMoveOutCashDefault),
      floorPayoffMoveOutCashMin: toNumber(s.floorPayoffMoveOutCashMin),
      floorPayoffMoveOutCashMax: toNumber(s.floorPayoffMoveOutCashMax),
    },
    repairs: {
      repairsSoftMaxVsArvPercentage: toNumber(s.repairsSoftMaxVsArvPercentage),
      repairsHardMax: toNumber(s.repairsHardMax),
      repairsContingencyPercentageByClass: Array.isArray(
        s.repairsContingencyPercentageByClass,
      )
        ? s.repairsContingencyPercentageByClass
        : undefined,
      repairsContingencyDefaultPercentage: toNumber(
        s.repairsContingencyDefaultPercentage,
      ),
    },
    carryTimeline: {
      carryMonthsMaximumCap: toNumber(s.carryMonthsMaximumCap),
      carryMonthsFormulaDefinition: toString(s.carryMonthsFormulaDefinition),
      daysToMoneySelectionMethod: toString(s.daysToMoneySelectionMethod),
      daysToMoneyDefaultCashCloseDays: toNumber(
        s.daysToMoneyDefaultCashCloseDays,
      ),
      defaultDaysToWholesaleClose: toNumber(s.defaultDaysToWholesaleClose),
      daysToMoneyMaxDays: toNumber(s.daysToMoneyMaxDays),
    },
    carry: {
      carryMonthsMaximumCap: toNumber(s.carryMonthsMaximumCap),
      carryMonthsFormulaDefinition: toString(s.carryMonthsFormulaDefinition),
      uninsurableAdderExtraHoldCosts: toNumber(s.uninsurableAdderExtraHoldCosts),
    },
    holdCosts: {
      holdCostsFlipFastZip: toNumber(s.holdCostsFlipFastZip),
      holdCostsFlipNeutralZip: toNumber(s.holdCostsFlipNeutralZip),
      holdCostsFlipSlowZip: toNumber(s.holdCostsFlipSlowZip),
      holdCostsWholetailFastZip: toNumber(s.holdCostsWholetailFastZip),
      holdCostsWholetailNeutralZip: toNumber(s.holdCostsWholetailNeutralZip),
      holdCostsWholetailSlowZip: toNumber(s.holdCostsWholetailSlowZip),
      holdingCostsMonthlyDefaultHoa: toNumber(s.holdingCostsMonthlyDefaultHoa),
      holdingCostsMonthlyDefaultInsurance: toNumber(
        s.holdingCostsMonthlyDefaultInsurance,
      ),
      holdingCostsMonthlyDefaultTaxes: toNumber(
        s.holdingCostsMonthlyDefaultTaxes,
      ),
      holdingCostsMonthlyDefaultUtilities: toNumber(
        s.holdingCostsMonthlyDefaultUtilities,
      ),
    },
    timeline: {
      clearToCloseBufferDays: toNumber(s.clearToCloseBufferDays),
      daysToMoneySelectionMethod: toString(s.daysToMoneySelectionMethod),
      daysToMoneyDefaultCashCloseDays: toNumber(
        s.daysToMoneyDefaultCashCloseDays,
      ),
      daysToMoneyMaxDays: toNumber(s.daysToMoneyMaxDays),
      defaultDaysToWholesaleClose: toNumber(s.defaultDaysToWholesaleClose),
      dispositionRecommendationUrgentCashMaxDtm: toNumber(
        s.dispositionRecommendationUrgentCashMaxDtm,
      ),
      dispositionRecommendationUrgentCashMaxAuctionDays: toNumber(
        s.dispositionRecommendationUrgentCashMaxAuctionDays,
      ),
      offerValidityPeriodDaysPolicy: toNumber(
        s.offerValidityPeriodDaysPolicy,
      ),
    },
    wholetail: {
      buyerSegmentationWholetailMaxRepairsAsArvPercentage: toNumber(
        s.buyerSegmentationWholetailMaxRepairsAsArvPercentage,
      ),
      buyerTargetMarginWholetailMinPercentage: toNumber(
        s.buyerTargetMarginWholetailMinPercentage,
      ),
      buyerTargetMarginWholetailMaxPercentage: toNumber(
        s.buyerTargetMarginWholetailMaxPercentage,
      ),
    },
    debtPayoff: {
      payoffAccrualBasisDayCountConvention: toString(
        s.payoffAccrualBasisDayCountConvention,
      ),
      payoffAccrualComponents: Array.isArray(s.payoffAccrualComponents)
        ? s.payoffAccrualComponents
            .filter((v: unknown) => typeof v === "string")
            .map((v: string) => v)
        : undefined,
      payoffLetterEvidenceRequiredAttachment: Boolean(
        s.payoffLetterEvidenceRequiredAttachment,
      ),
      payoffAccrualDailyInterestSafetyCap: toNumber(
        s.payoffAccrualDailyInterestSafetyCap,
      ),
      payoffAggressiveOverrideAllowed: Boolean(
        s.payoffAggressiveOverrideAllowed,
      ),
    },
    complianceRisk: {
      bankruptcyStayGateLegalBlock: Boolean(s.bankruptcyStayGateLegalBlock),
      fha90DayResaleRuleGate: Boolean(s.fha90DayResaleRuleGate),
      firptaWithholdingGate: Boolean(s.firptaWithholdingGate),
      flood50RuleGate: Boolean(s.flood50RuleGate),
      floodZoneEvidenceSourceFemaMapSelector: toString(
        s.floodZoneEvidenceSourceFemaMapSelector,
      ),
      scraVerificationGate: Boolean(s.scraVerificationGate),
      vaProgramRequirementsWdoWaterTestEvidence: Boolean(
        s.vaProgramRequirementsWdoWaterTestEvidence,
      ),
      stateProgramGateFhaVaOverlays: Boolean(s.stateProgramGateFhaVaOverlays),
      warrantabilityReviewRequirementCondoEligibilityScreens: Boolean(
        s.warrantabilityReviewRequirementCondoEligibilityScreens,
      ),
    },
    disposition: {
      doubleCloseMinSpreadThreshold: toNumber(s.doubleCloseMinSpreadThreshold),
      doubleClosePerDiemCarryModeling: Boolean(s.doubleClosePerDiemCarryModeling),
      dispositionTrackEnablement: Array.isArray(s.dispositionTrackEnablement)
        ? s.dispositionTrackEnablement.filter((v: unknown) => typeof v === "string")
        : undefined,
      deedDocumentaryStampRatePolicy: toNumber(s.deedDocumentaryStampRatePolicy),
      titlePremiumRateSource: toString(s.titlePremiumRateSource),
    },
    workflowUi: {
      bankersRoundingModeNumericSafety: Boolean(s.bankersRoundingModeNumericSafety),
      assumptionsProtocolPlaceholdersWhenEvidenceMissing: Boolean(
        s.assumptionsProtocolPlaceholdersWhenEvidenceMissing,
      ),
      buyerCostsAllocationDualScenarioRenderingWhenUnknown: Boolean(
        s.buyerCostsAllocationDualScenarioRenderingWhenUnknown,
      ),
    },
    workflow_and_guardrails: {
      analystReviewTriggerBorderlineBandThreshold: toNumber(
        s.analystReviewTriggerBorderlineBandThreshold,
      ),
      cashPresentationGateMinimumSpreadOverPayoff: toNumber(
        s.cashPresentationGateMinimumSpreadOverPayoff,
      ),
      assumptionsProtocolPlaceholdersWhenEvidenceMissing: Boolean(
        s.assumptionsProtocolPlaceholdersWhenEvidenceMissing,
      ),
      bankersRoundingModeNumericSafety: toString(s.bankersRoundingModeNumericSafety),
      buyerCostsAllocationDualScenarioRenderingWhenUnknown: Boolean(
        s.buyerCostsAllocationDualScenarioRenderingWhenUnknown,
      ),
      buyerCostsLineItemModelingMethod: toString(s.buyerCostsLineItemModelingMethod),
      abcConfidenceGradeRubric: toString(s.abcConfidenceGradeRubric),
      allowAdvisorOverrideWorkflowState: Boolean(s.allowAdvisorOverrideWorkflowState),
    },
    ux_policy: {
      bankersRoundingModeNumericSafety: toString(s.bankersRoundingModeNumericSafety),
      buyerCostsAllocationDualScenarioRenderingWhenUnknown: Boolean(
        s.buyerCostsAllocationDualScenarioRenderingWhenUnknown,
      ),
      buyerCostsLineItemModelingMethod: toString(s.buyerCostsLineItemModelingMethod),
    },
    profitUninsurable: {
      uninsurableAdderFlipMarginPercentage: toNumber(
        s.uninsurableAdderFlipMarginPercentage,
      ),
      uninsurableAdderExtraHoldCosts: toNumber(
        s.uninsurableAdderExtraHoldCosts,
      ),
    },
    profit_and_fees: {
      assignmentFeeTarget: toNumber(s.assignmentFeeTarget),
      assignmentFeeMaxPublicizedArvPercentage: toNumber(
        s.assignmentFeeMaxPublicizedArvPercentage,
      ),
      buyerTargetMarginFlipBaselinePolicy: toNumber(
        s.buyerTargetMarginFlipBaselinePolicy,
      ),
      buyerTargetMarginWholetailMinPercentage: toNumber(
        s.buyerTargetMarginWholetailMinPercentage,
      ),
      buyerTargetMarginWholetailMaxPercentage: toNumber(
        s.buyerTargetMarginWholetailMaxPercentage,
      ),
      buyerSegmentationWholetailMaxRepairsAsArvPercentage: toNumber(
        s.buyerSegmentationWholetailMaxRepairsAsArvPercentage,
      ),
      initialOfferSpreadMultiplier: toNumber(s.initialOfferSpreadMultiplier),
      minSpreadByArvBand: sanitizeBands(s.minSpreadByArvBand),
    },
    disposition_and_double_close: {
      doubleCloseMinSpreadThreshold: toNumber(s.doubleCloseMinSpreadThreshold),
      doubleClosePerDiemCarryModeling: Boolean(
        s.doubleClosePerDiemCarryModeling,
      ),
      deedDocumentaryStampRatePolicy: toNumber(s.deedDocumentaryStampRatePolicy),
      titlePremiumRateSource: toString(s.titlePremiumRateSource),
      dispositionTrackEnablement: Array.isArray(s.dispositionTrackEnablement)
        ? s.dispositionTrackEnablement.filter((v: unknown) => typeof v === "string")
        : undefined,
    },
    compliance_and_risk_gates: {
      bankruptcyStayGateLegalBlock: Boolean(s.bankruptcyStayGateLegalBlock),
      fha90DayResaleRuleGate: Boolean(s.fha90DayResaleRuleGate),
      firptaWithholdingGate: Boolean(s.firptaWithholdingGate),
      flood50RuleGate: Boolean(s.flood50RuleGate),
      floodZoneEvidenceSourceFemaMapSelector: toString(
        s.floodZoneEvidenceSourceFemaMapSelector,
      ),
      scraVerificationGate: Boolean(s.scraVerificationGate),
      stateProgramGateFhaVaOverlays: Boolean(s.stateProgramGateFhaVaOverlays),
      vaProgramRequirementsWdoWaterTestEvidence: Boolean(
        s.vaProgramRequirementsWdoWaterTestEvidence,
      ),
      warrantabilityReviewRequirementCondoEligibilityScreens: Boolean(
        s.warrantabilityReviewRequirementCondoEligibilityScreens,
      ),
    },
    raw,
  };
}
