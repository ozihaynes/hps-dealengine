import { SandboxSettingKey } from "@hps-internal/contracts";

export type SandboxKnobRecommendedAction = "KEEP";
// DROP_BACKLOG removed in Phase 7 Slice A - all remaining knobs are KEEP

export type SandboxKnobFinalImpact =
  | "economic"
  | "risk_compliance"
  | "strategy_offer"
  | "data_evidence"
  | "operational_workflow"
  | "integration_connector"
  | "safety_observability"
  | "ux_only"
  | "unused_legacy";

export interface SandboxKnobMetadata {
  key: SandboxSettingKey;
  finalImpact: SandboxKnobFinalImpact;
  recommendedAction: SandboxKnobRecommendedAction;
}

export const SANDBOX_KNOB_METADATA: Record<SandboxSettingKey, SandboxKnobMetadata> = {
  aivCapEvidenceVpApprovalLoggingRequirement: {
    key: "aivCapEvidenceVpApprovalLoggingRequirement",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivCapOverrideApprovalRole: {
    key: "aivCapOverrideApprovalRole",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivCapOverrideConditionBindableInsuranceRequired: {
    key: "aivCapOverrideConditionBindableInsuranceRequired",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivCapOverrideConditionClearTitleQuoteRequired: {
    key: "aivCapOverrideConditionClearTitleQuoteRequired",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivCapOverrideConditionFastZipLiquidityRequired: {
    key: "aivCapOverrideConditionFastZipLiquidityRequired",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivHardMax: {
    key: "aivHardMax",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivHardMin: {
    key: "aivHardMin",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivSafetyCapPercentage: {
    key: "aivSafetyCapPercentage",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivSoftMaxVsArvMultiplier: {
    key: "aivSoftMaxVsArvMultiplier",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  arvCompsMaxRadiusMiles: {
    key: "arvCompsMaxRadiusMiles",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  arvCompsSetSizeForMedian: {
    key: "arvCompsSetSizeForMedian",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  arvCompsSqftVariancePercent: {
    key: "arvCompsSqftVariancePercent",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
    arvHardMax: {
    key: "arvHardMax",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  arvHardMin: {
    key: "arvHardMin",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  arvMinComps: {
    key: "arvMinComps",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  arvSoftMaxCompsAgeDays: {
    key: "arvSoftMaxCompsAgeDays",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  arvSoftMaxVsAivMultiplier: {
    key: "arvSoftMaxVsAivMultiplier",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  buyerCeilingFormulaDefinition: {
    key: "buyerCeilingFormulaDefinition",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  speedBandsBalancedMaxDom: {
    key: "speedBandsBalancedMaxDom",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  speedBandsBalancedMaxMoi: {
    key: "speedBandsBalancedMaxMoi",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  speedBandsFastMaxDom: {
    key: "speedBandsFastMaxDom",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  speedBandsFastMaxMoi: {
    key: "speedBandsFastMaxMoi",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  speedBandsSlowMinDom: {
    key: "speedBandsSlowMinDom",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  speedBandsSlowMinMoi: {
    key: "speedBandsSlowMinMoi",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  zipSpeedBandDerivationMethod: {
    key: "zipSpeedBandDerivationMethod",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  zipSpeedBandPostureControlsMarginHoldingAdjusters: {
    key: "zipSpeedBandPostureControlsMarginHoldingAdjusters",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  floorInvestorAivDiscountP20Zip: {
    key: "floorInvestorAivDiscountP20Zip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  floorInvestorAivDiscountTypicalZip: {
    key: "floorInvestorAivDiscountTypicalZip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  floorPayoffMinRetainedEquityPercentage: {
    key: "floorPayoffMinRetainedEquityPercentage",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  floorPayoffMoveOutCashDefault: {
    key: "floorPayoffMoveOutCashDefault",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  floorPayoffMoveOutCashMax: {
    key: "floorPayoffMoveOutCashMax",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  floorPayoffMoveOutCashMin: {
    key: "floorPayoffMoveOutCashMin",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  carryMonthsFormulaDefinition: {
    key: "carryMonthsFormulaDefinition",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  carryMonthsMaximumCap: {
    key: "carryMonthsMaximumCap",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdCostsFlipFastZip: {
    key: "holdCostsFlipFastZip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdCostsFlipNeutralZip: {
    key: "holdCostsFlipNeutralZip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdCostsFlipSlowZip: {
    key: "holdCostsFlipSlowZip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdCostsWholetailFastZip: {
    key: "holdCostsWholetailFastZip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdCostsWholetailNeutralZip: {
    key: "holdCostsWholetailNeutralZip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdCostsWholetailSlowZip: {
    key: "holdCostsWholetailSlowZip",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdingCostsMonthlyDefaultHoa: {
    key: "holdingCostsMonthlyDefaultHoa",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdingCostsMonthlyDefaultInsurance: {
    key: "holdingCostsMonthlyDefaultInsurance",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdingCostsMonthlyDefaultTaxes: {
    key: "holdingCostsMonthlyDefaultTaxes",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  holdingCostsMonthlyDefaultUtilities: {
    key: "holdingCostsMonthlyDefaultUtilities",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  repairsContingencyPercentageByClass: {
    key: "repairsContingencyPercentageByClass",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  repairsHardMax: {
    key: "repairsHardMax",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  repairsSoftMaxVsArvPercentage: {
    key: "repairsSoftMaxVsArvPercentage",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  uninsurableAdderExtraHoldCosts: {
    key: "uninsurableAdderExtraHoldCosts",
    finalImpact: "economic",
    recommendedAction: "KEEP",
    // Reclassified in Phase 7 Slice A - consumed by engine at policy_builder.ts:155-156
  },
  payoffAccrualBasisDayCountConvention: {
    key: "payoffAccrualBasisDayCountConvention",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  payoffAccrualComponents: {
    key: "payoffAccrualComponents",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  payoffLetterEvidenceRequiredAttachment: {
    key: "payoffLetterEvidenceRequiredAttachment",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  assignmentFeeMaxPublicizedArvPercentage: {
    key: "assignmentFeeMaxPublicizedArvPercentage",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  assignmentFeeTarget: {
    key: "assignmentFeeTarget",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  buyerSegmentationWholetailMaxRepairsAsArvPercentage: {
    key: "buyerSegmentationWholetailMaxRepairsAsArvPercentage",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  buyerTargetMarginFlipBaselinePolicy: {
    key: "buyerTargetMarginFlipBaselinePolicy",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  buyerTargetMarginWholetailMaxPercentage: {
    key: "buyerTargetMarginWholetailMaxPercentage",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  buyerTargetMarginWholetailMinPercentage: {
    key: "buyerTargetMarginWholetailMinPercentage",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  initialOfferSpreadMultiplier: {
    key: "initialOfferSpreadMultiplier",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  minSpreadByArvBand: {
    key: "minSpreadByArvBand",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  clearToCloseBufferDays: {
    key: "clearToCloseBufferDays",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  daysToMoneyDefaultCashCloseDays: {
    key: "daysToMoneyDefaultCashCloseDays",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  daysToMoneyMaxDays: {
    key: "daysToMoneyMaxDays",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  daysToMoneySelectionMethod: {
    key: "daysToMoneySelectionMethod",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  defaultDaysToWholesaleClose: {
    key: "defaultDaysToWholesaleClose",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  dispositionRecommendationUrgentCashMaxAuctionDays: {
    key: "dispositionRecommendationUrgentCashMaxAuctionDays",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
    // Reclassified in Phase 7 Slice A - consumed by engine at policy_builder.ts:295-297
  },
  dispositionRecommendationUrgentCashMaxDtm: {
    key: "dispositionRecommendationUrgentCashMaxDtm",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  offerValidityPeriodDaysPolicy: {
    key: "offerValidityPeriodDaysPolicy",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  bankruptcyStayGateLegalBlock: {
    key: "bankruptcyStayGateLegalBlock",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  fha90DayResaleRuleGate: {
    key: "fha90DayResaleRuleGate",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  firptaWithholdingGate: {
    key: "firptaWithholdingGate",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  flood50RuleGate: {
    key: "flood50RuleGate",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  floodZoneEvidenceSourceFemaMapSelector: {
    key: "floodZoneEvidenceSourceFemaMapSelector",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  scraVerificationGate: {
    key: "scraVerificationGate",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  stateProgramGateFhaVaOverlays: {
    key: "stateProgramGateFhaVaOverlays",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  vaProgramRequirementsWdoWaterTestEvidence: {
    key: "vaProgramRequirementsWdoWaterTestEvidence",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  warrantabilityReviewRequirementCondoEligibilityScreens: {
    key: "warrantabilityReviewRequirementCondoEligibilityScreens",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  // Note: abcConfidenceGradeRubric and allowAdvisorOverrideWorkflowState removed in Phase 7 Slice B
  // These knobs were defined but never consumed by any UI component.
  analystReviewTriggerBorderlineBandThreshold: {
    key: "analystReviewTriggerBorderlineBandThreshold",
    finalImpact: "operational_workflow",
    recommendedAction: "KEEP",
  },
  assumptionsProtocolPlaceholdersWhenEvidenceMissing: {
    key: "assumptionsProtocolPlaceholdersWhenEvidenceMissing",
    finalImpact: "operational_workflow",
    recommendedAction: "KEEP",
  },
  bankersRoundingModeNumericSafety: {
    key: "bankersRoundingModeNumericSafety",
    finalImpact: "operational_workflow",
    recommendedAction: "KEEP",
  },
  buyerCostsAllocationDualScenarioRenderingWhenUnknown: {
    key: "buyerCostsAllocationDualScenarioRenderingWhenUnknown",
    finalImpact: "operational_workflow",
    recommendedAction: "KEEP",
  },
  buyerCostsLineItemModelingMethod: {
    key: "buyerCostsLineItemModelingMethod",
    finalImpact: "ux_only",
    recommendedAction: "KEEP",
  },
  cashPresentationGateMinimumSpreadOverPayoff: {
    key: "cashPresentationGateMinimumSpreadOverPayoff",
    finalImpact: "operational_workflow",
    recommendedAction: "KEEP",
  },
  deedDocumentaryStampRatePolicy: {
    key: "deedDocumentaryStampRatePolicy",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  dispositionTrackEnablement: {
    key: "dispositionTrackEnablement",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  doubleCloseMinSpreadThreshold: {
    key: "doubleCloseMinSpreadThreshold",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  doubleClosePerDiemCarryModeling: {
    key: "doubleClosePerDiemCarryModeling",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  titlePremiumRateSource: {
    key: "titlePremiumRateSource",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  }
};

export function getKnobMetadata(key: SandboxSettingKey): SandboxKnobMetadata | undefined {
  return SANDBOX_KNOB_METADATA[key];
}

export function isKeepKnob(key: SandboxSettingKey): boolean {
  // Defensive: return false for knobs without metadata (e.g., DROP_BACKLOG removed knobs)
  return SANDBOX_KNOB_METADATA[key]?.recommendedAction === "KEEP";
}

export const KEEP_SANDBOX_KEYS: SandboxSettingKey[] = Object.values(
  SANDBOX_KNOB_METADATA,
)
  .filter((meta) => meta.recommendedAction === "KEEP")
  .map((meta) => meta.key);

// DROP_BACKLOG knobs removed in Phase 7 Slice A cleanup
// All 112 DROP_BACKLOG knobs were removed from source and archived in database
export const DROP_BACKLOG_SANDBOX_KEYS: SandboxSettingKey[] = [];
