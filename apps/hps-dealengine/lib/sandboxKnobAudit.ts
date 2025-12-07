import { SandboxSettingKey } from "@hps-internal/contracts";

export type SandboxKnobRecommendedAction = "KEEP" | "DROP_BACKLOG";

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
  aivAsisModelingRetailRepairFrictionMethod: {
    key: "aivAsisModelingRetailRepairFrictionMethod",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
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
  aivSoftMaxCompsAgeDays: {
    key: "aivSoftMaxCompsAgeDays",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  aivSoftMaxVsArvMultiplier: {
    key: "aivSoftMaxVsArvMultiplier",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  aivSoftMinComps: {
    key: "aivSoftMinComps",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  aivSoftMinCompsRadius: {
    key: "aivSoftMinCompsRadius",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  arvCompsSetSizeForMedian: {
    key: "arvCompsSetSizeForMedian",
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
  domHardMax: {
    key: "domHardMax",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  domHardMin: {
    key: "domHardMin",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  domSoftMaxWarning: {
    key: "domSoftMaxWarning",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  domSoftMinWarning: {
    key: "domSoftMinWarning",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  investorBenchmarkModelPostureSelectionMode: {
    key: "investorBenchmarkModelPostureSelectionMode",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  maoCalculationMethodArvAivMultiplierSelection: {
    key: "maoCalculationMethodArvAivMultiplierSelection",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  marketLiquidityInputs: {
    key: "marketLiquidityInputs",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  marketPriceTieringBracketBreakpointSource: {
    key: "marketPriceTieringBracketBreakpointSource",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  moiHardMax: {
    key: "moiHardMax",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  moiHardMin: {
    key: "moiHardMin",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  moiSoftMaxWarning: {
    key: "moiSoftMaxWarning",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  moiSoftMinWarning: {
    key: "moiSoftMinWarning",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  postureDefaultMode: {
    key: "postureDefaultMode",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  priceTieringSourceZipPriceBracketsData: {
    key: "priceTieringSourceZipPriceBracketsData",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  providerSelectorCountyOfficialRecords: {
    key: "providerSelectorCountyOfficialRecords",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  providerSelectorMlsCompsDataSource: {
    key: "providerSelectorMlsCompsDataSource",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  providerSelectorZipMetrics: {
    key: "providerSelectorZipMetrics",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  retailRepairFrictionPercentage: {
    key: "retailRepairFrictionPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  speedBandsSlowMinMoi: {
    key: "speedBandsSlowMinMoi",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  zipSpeedBandDerivationMethod: {
    key: "zipSpeedBandDerivationMethod",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  ceilingSelectionConservativeUsesMin: {
    key: "ceilingSelectionConservativeUsesMin",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  ceilingSelectionHighestEligibleInBase: {
    key: "ceilingSelectionHighestEligibleInBase",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  ceilingSelectionPostureControls: {
    key: "ceilingSelectionPostureControls",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  investorFloorCompositionComponentsToggle: {
    key: "investorFloorCompositionComponentsToggle",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  respectFloorCompositionInvestorFloorVsPayoff: {
    key: "respectFloorCompositionInvestorFloorVsPayoff",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  respectFloorFormulaComponentSelector: {
    key: "respectFloorFormulaComponentSelector",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  allocationToggleBuyerVsSeller: {
    key: "allocationToggleBuyerVsSeller",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerCostsAllocationDefaultSellerPays: {
    key: "buyerCostsAllocationDefaultSellerPays",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerCostsTitleQuoteEvidenceRequirement: {
    key: "buyerCostsTitleQuoteEvidenceRequirement",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  listingCostModelSellerCostLineItems: {
    key: "listingCostModelSellerCostLineItems",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsContingencyBidsMissing: {
    key: "repairsContingencyBidsMissing",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsContingencyHeavyScope: {
    key: "repairsContingencyHeavyScope",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsContingencyLightScope: {
    key: "repairsContingencyLightScope",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsContingencyMediumScope: {
    key: "repairsContingencyMediumScope",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsContingencyPercentageByClass: {
    key: "repairsContingencyPercentageByClass",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  repairsEvidenceBidsScopeAttachmentRequirement: {
    key: "repairsEvidenceBidsScopeAttachmentRequirement",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsHardMax: {
    key: "repairsHardMax",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  repairsHardMin: {
    key: "repairsHardMin",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsSoftMaxVsArvPercentage: {
    key: "repairsSoftMaxVsArvPercentage",
    finalImpact: "economic",
    recommendedAction: "KEEP",
  },
  retailListingCostPercentage: {
    key: "retailListingCostPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  retailMakeReadyPerRepairClass: {
    key: "retailMakeReadyPerRepairClass",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  sellerConcessionsCreditsHandlingPolicy: {
    key: "sellerConcessionsCreditsHandlingPolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  sellerNetRetailMakeReadyInputs: {
    key: "sellerNetRetailMakeReadyInputs",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  sourcesEvidenceTitleQuotePdfItemizationRequirement: {
    key: "sourcesEvidenceTitleQuotePdfItemizationRequirement",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  titleQuoteAttachmentRequiredForPublishing: {
    key: "titleQuoteAttachmentRequiredForPublishing",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  uninsurableAdderExtraHoldCosts: {
    key: "uninsurableAdderExtraHoldCosts",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  actual365PayoffDayCountConvention: {
    key: "actual365PayoffDayCountConvention",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  hoaEstoppelFeeCapPolicy: {
    key: "hoaEstoppelFeeCapPolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  hoaRushTransferFeePolicy: {
    key: "hoaRushTransferFeePolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  interestDayCountBasisDefault: {
    key: "interestDayCountBasisDefault",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  paceAssessmentHandlingPayoffRequirementPolicy: {
    key: "paceAssessmentHandlingPayoffRequirementPolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  paceDetectionSourceTaxBillNonAdValoremSelector: {
    key: "paceDetectionSourceTaxBillNonAdValoremSelector",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  perDiemAccrualInputsSeniorJuniorsUsdDay: {
    key: "perDiemAccrualInputsSeniorJuniorsUsdDay",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  seniorPerDiemHardMax: {
    key: "seniorPerDiemHardMax",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  seniorPerDiemHardMin: {
    key: "seniorPerDiemHardMin",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  seniorPerDiemSoftMaxImpliedApr: {
    key: "seniorPerDiemSoftMaxImpliedApr",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  seniorPrincipalHardMax: {
    key: "seniorPrincipalHardMax",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  seniorPrincipalHardMin: {
    key: "seniorPrincipalHardMin",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  seniorPrincipalSoftMaxVsArvPercentage: {
    key: "seniorPrincipalSoftMaxVsArvPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  solarLeaseUcc1GateClearanceRequirement: {
    key: "solarLeaseUcc1GateClearanceRequirement",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  ucc1SearchSourceSelectorCountyStateRegistry: {
    key: "ucc1SearchSourceSelectorCountyStateRegistry",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  ucc1TerminationSubordinationClosingConditionRequirement: {
    key: "ucc1TerminationSubordinationClosingConditionRequirement",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  assignmentFeeVipOverrideMaxArvPercentage: {
    key: "assignmentFeeVipOverrideMaxArvPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  assignmentFeeVipOverrideMinArvPercentage: {
    key: "assignmentFeeVipOverrideMinArvPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerSegmentationFlipperMaxMoi: {
    key: "buyerSegmentationFlipperMaxMoi",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerSegmentationLandlordMinGrossYield: {
    key: "buyerSegmentationLandlordMinGrossYield",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerSegmentationLandlordMinMoi: {
    key: "buyerSegmentationLandlordMinMoi",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerSegmentationWholetailMaxRepairsAsArvPercentage: {
    key: "buyerSegmentationWholetailMaxRepairsAsArvPercentage",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  buyerSegmentationWholetailMinYearBuilt: {
    key: "buyerSegmentationWholetailMinYearBuilt",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerTargetMarginFlipBaselinePolicy: {
    key: "buyerTargetMarginFlipBaselinePolicy",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  buyerTargetMarginFlipMoiBands: {
    key: "buyerTargetMarginFlipMoiBands",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerTargetMarginMoiTierAdjusters: {
    key: "buyerTargetMarginMoiTierAdjusters",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerTargetMarginWholetailFastZip: {
    key: "buyerTargetMarginWholetailFastZip",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  buyerTargetMarginWholetailNeutralZip: {
    key: "buyerTargetMarginWholetailNeutralZip",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerTargetMarginWholetailRangePolicy: {
    key: "buyerTargetMarginWholetailRangePolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  buyerTargetMarginWholetailSlowZip: {
    key: "buyerTargetMarginWholetailSlowZip",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  concessionsLadderStep1: {
    key: "concessionsLadderStep1",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  concessionsLadderStep2: {
    key: "concessionsLadderStep2",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  concessionsLadderStep3: {
    key: "concessionsLadderStep3",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  counterOfferDefaultIncrement: {
    key: "counterOfferDefaultIncrement",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  initialOfferSpreadMultiplier: {
    key: "initialOfferSpreadMultiplier",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  maoNegotiationBandwidthAdjustmentRange: {
    key: "maoNegotiationBandwidthAdjustmentRange",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  minSpreadByArvBand: {
    key: "minSpreadByArvBand",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  negotiationBufferPercentage: {
    key: "negotiationBufferPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  spreadPresentationBorderlineBandHandlingPolicy: {
    key: "spreadPresentationBorderlineBandHandlingPolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  uninsurableAdderFlipMarginPercentage: {
    key: "uninsurableAdderFlipMarginPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  wholesaleFeeModeAssignmentVsDoubleCloseSelection: {
    key: "wholesaleFeeModeAssignmentVsDoubleCloseSelection",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  wholetailMarginPolicyByZipSpeedBand: {
    key: "wholetailMarginPolicyByZipSpeedBand",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  zipSpeedBandPostureControlsMarginHoldingAdjusters: {
    key: "zipSpeedBandPostureControlsMarginHoldingAdjusters",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  auctionUrgencyMarginAdderPolicy: {
    key: "auctionUrgencyMarginAdderPolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  auctionUrgencyTrpMultiplierPolicy: {
    key: "auctionUrgencyTrpMultiplierPolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  daysToMoneyRollForwardRule: {
    key: "daysToMoneyRollForwardRule",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  daysToMoneySelectionMethod: {
    key: "daysToMoneySelectionMethod",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  defaultDaysToCashClose: {
    key: "defaultDaysToCashClose",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  defaultDaysToWholesaleClose: {
    key: "defaultDaysToWholesaleClose",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  dispositionRecommendationListMlsMinDomZip: {
    key: "dispositionRecommendationListMlsMinDomZip",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  dispositionRecommendationListMlsMinDtm: {
    key: "dispositionRecommendationListMlsMinDtm",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  dispositionRecommendationListMlsMinMoi: {
    key: "dispositionRecommendationListMlsMinMoi",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  dispositionRecommendationLogicDtmThresholds: {
    key: "dispositionRecommendationLogicDtmThresholds",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  dispositionRecommendationUrgentCashMaxAuctionDays: {
    key: "dispositionRecommendationUrgentCashMaxAuctionDays",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  dispositionRecommendationUrgentCashMaxDtm: {
    key: "dispositionRecommendationUrgentCashMaxDtm",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  emdTimelineDaysDeadlinePolicy: {
    key: "emdTimelineDaysDeadlinePolicy",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  offerValidityPeriodDaysPolicy: {
    key: "offerValidityPeriodDaysPolicy",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  rightOfFirstRefusalBoardApprovalWindowDaysInput: {
    key: "rightOfFirstRefusalBoardApprovalWindowDaysInput",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  bankruptcyStayGateLegalBlock: {
    key: "bankruptcyStayGateLegalBlock",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  condoSirsMilestoneFlag: {
    key: "condoSirsMilestoneFlag",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  emdPolicyEarnestMoneyStructure: {
    key: "emdPolicyEarnestMoneyStructure",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  emdRefundabilityConditionsGate: {
    key: "emdRefundabilityConditionsGate",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  hoaStatusEvidenceRequiredDocs: {
    key: "hoaStatusEvidenceRequiredDocs",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  insuranceBindabilityEvidence: {
    key: "insuranceBindabilityEvidence",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  insuranceCarrierEligibilitySourcesCitizens: {
    key: "insuranceCarrierEligibilitySourcesCitizens",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  projectReviewEvidence: {
    key: "projectReviewEvidence",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  proofOfInsuranceBindableQuoteRequirement: {
    key: "proofOfInsuranceBindableQuoteRequirement",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  repairsStructuralClassGateFema50Rule: {
    key: "repairsStructuralClassGateFema50Rule",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  scraVerificationGate: {
    key: "scraVerificationGate",
    finalImpact: "risk_compliance",
    recommendedAction: "KEEP",
  },
  secondaryAppraisalRequirementFha: {
    key: "secondaryAppraisalRequirementFha",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  abcConfidenceGradeRubric: {
    key: "abcConfidenceGradeRubric",
    finalImpact: "ux_only",
    recommendedAction: "KEEP",
  },
  allowAdvisorOverrideWorkflowState: {
    key: "allowAdvisorOverrideWorkflowState",
    finalImpact: "ux_only",
    recommendedAction: "KEEP",
  },
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
  deedTaxAllocationBuyerSellerSplitToggle: {
    key: "deedTaxAllocationBuyerSellerSplitToggle",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  dispositionTrackEnablement: {
    key: "dispositionTrackEnablement",
    finalImpact: "strategy_offer",
    recommendedAction: "KEEP",
  },
  doubleCloseAtoBClosingCostCategories: {
    key: "doubleCloseAtoBClosingCostCategories",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  doubleCloseBtoCClosingCostCategories: {
    key: "doubleCloseBtoCClosingCostCategories",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  doubleCloseFundingPointsPercentage: {
    key: "doubleCloseFundingPointsPercentage",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  doubleCloseHoldDaysCalculationMethod: {
    key: "doubleCloseHoldDaysCalculationMethod",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
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
  },
  transactionalFundingPointsDoubleCloseFinancingInput: {
    key: "transactionalFundingPointsDoubleCloseFinancingInput",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
  wholetailRetailMakeReadyInputEvidenceDefaultsToggle: {
    key: "wholetailRetailMakeReadyInputEvidenceDefaultsToggle",
    finalImpact: "unused_legacy",
    recommendedAction: "DROP_BACKLOG",
  },
};

export function getKnobMetadata(key: SandboxSettingKey): SandboxKnobMetadata {
  return SANDBOX_KNOB_METADATA[key];
}

export function isKeepKnob(key: SandboxSettingKey): boolean {
  return SANDBOX_KNOB_METADATA[key].recommendedAction === "KEEP";
}

export const KEEP_SANDBOX_KEYS: SandboxSettingKey[] = Object.values(
  SANDBOX_KNOB_METADATA,
)
  .filter((meta) => meta.recommendedAction === "KEEP")
  .map((meta) => meta.key);

export const DROP_BACKLOG_SANDBOX_KEYS: SandboxSettingKey[] = Object.values(
  SANDBOX_KNOB_METADATA,
)
  .filter((meta) => meta.recommendedAction === "DROP_BACKLOG")
  .map((meta) => meta.key);
