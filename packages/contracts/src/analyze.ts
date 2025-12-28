import { z } from "zod";
import { Postures } from "./posture";
import { RepairRatesSchema } from "./repairs";

export const GateStatusSchema = z.enum([
  "pass",
  "watch",
  "fail",
  "info_needed",
]);
export type GateStatus = z.infer<typeof GateStatusSchema>;

const ValuationOptionsSchema = z.object({
  aivSafetyCapPercentage: z.number().optional(),
  aivHardMax: z.number().optional(),
  aivHardMin: z.number().optional(),
  aivSoftMaxVsArvMultiplier: z.number().optional(),
  arvHardMax: z.number().optional(),
  arvHardMin: z.number().optional(),
  arvSoftMaxVsAivMultiplier: z.number().optional(),
  arvMinComps: z.number().optional(),
  arvSoftMaxCompsAgeDays: z.number().optional(),
  arvCompsSetSizeForMedian: z.number().optional(),
  buyerCeilingFormulaDefinition: z.string().optional(),
  aivCapOverrideApprovalRole: z.string().optional(),
  aivCapOverrideConditionBindableInsuranceRequired: z.boolean().optional(),
  aivCapOverrideConditionClearTitleQuoteRequired: z.boolean().optional(),
  aivCapOverrideConditionFastZipLiquidityRequired: z.boolean().optional(),
  aivCapEvidenceVpApprovalLoggingRequirement: z.boolean().optional(),
});

export const AnalyzeSandboxFloorOptionsSchema = z.object({
  floorInvestorAivDiscountP20Zip: z.number().nullable().optional(),
  floorInvestorAivDiscountTypicalZip: z.number().nullable().optional(),
  floorPayoffMinRetainedEquityPercentage: z.number().nullable().optional(),
  floorPayoffMoveOutCashDefault: z.number().nullable().optional(),
  floorPayoffMoveOutCashMax: z.number().nullable().optional(),
  floorPayoffMoveOutCashMin: z.number().nullable().optional(),
});
export type AnalyzeSandboxFloorOptions = z.infer<
  typeof AnalyzeSandboxFloorOptionsSchema
>;

const FloorsSpreadsSchema = z.object({
  floorInvestorAivDiscountTypicalZip: z.number().optional(),
  minSpreadByArvBand: z.array(z.record(z.string(), z.any())).optional(),
  initialOfferSpreadMultiplier: z.number().optional(),
  buyerTargetMarginFlipBaselinePolicy: z.number().optional(),
  assignmentFeeTarget: z.number().optional(),
  assignmentFeeMaxPublicizedArvPercentage: z.number().optional(),
});

const RepairsOptionsSchema = z.object({
  repairsSoftMaxVsArvPercentage: z.number().optional(),
  repairsHardMax: z.number().optional(),
  repairsContingencyPercentageByClass: z
    .array(z.record(z.string(), z.any()))
    .optional(),
});

const CarryTimelineSchema = z.object({
  carryMonthsMaximumCap: z.number().optional(),
  carryMonthsFormulaDefinition: z.string().optional(),
  daysToMoneySelectionMethod: z.string().optional(),
  daysToMoneyDefaultCashCloseDays: z.number().optional(),
  defaultDaysToWholesaleClose: z.number().optional(),
  daysToMoneyMaxDays: z.number().optional(),
});

/**
 * Sandbox knob: Carry Months — Formula Definition (DOM-based)
 * Sandbox knob: Carry Months — Maximum Cap
 * Sandbox knob: Uninsurable Adder (Extra Hold Costs)
 */
const CarryOptionsSchema = z.object({
  carryMonthsFormulaDefinition: z.string().optional(),
  carryMonthsMaximumCap: z.number().optional(),
  uninsurableAdderExtraHoldCosts: z.number().optional(),
});

/**
 * Sandbox knobs:
 * - Hold Costs, Flip (Fast/Neutral/Slow ZIP)
 * - Hold Costs, Wholetail (Fast/Neutral/Slow ZIP)
 * - Holding Costs, Monthly (Default HOA/Insurance/Taxes/Utilities)
 */
const HoldCostsOptionsSchema = z.object({
  holdCostsFlipFastZip: z.number().optional(),
  holdCostsFlipNeutralZip: z.number().optional(),
  holdCostsFlipSlowZip: z.number().optional(),
  holdCostsWholetailFastZip: z.number().optional(),
  holdCostsWholetailNeutralZip: z.number().optional(),
  holdCostsWholetailSlowZip: z.number().optional(),
  holdingCostsMonthlyDefaultHoa: z.number().optional(),
  holdingCostsMonthlyDefaultInsurance: z.number().optional(),
  holdingCostsMonthlyDefaultTaxes: z.number().optional(),
  holdingCostsMonthlyDefaultUtilities: z.number().optional(),
});

/**
 * Timeline & urgency knobs:
 * - Clear-to-Close Buffer Days (Unresolved Title/Insurance)
 * - Days-to-Money (Max Days)
 * - Days-to-Money Selection Method — Earliest Compliant Target Close
 * - Days-to-Money — Default Cash Close Days
 * - Default Days to Wholesale Close
 * - Disposition Recommendation (Urgent/Cash, Max DTM)
 * - Disposition Recommendation (Urgent/Cash, Max Auction Days)
 * - Offer Validity Period — Days Policy
 */
const TimelineOptionsSchema = z.object({
  clearToCloseBufferDays: z.number().optional(),
  daysToMoneySelectionMethod: z.string().optional(),
  daysToMoneyDefaultCashCloseDays: z.number().optional(),
  daysToMoneyMaxDays: z.number().optional(),
  defaultDaysToWholesaleClose: z.number().optional(),
  dispositionRecommendationUrgentCashMaxDtm: z.number().optional(),
  dispositionRecommendationUrgentCashMaxAuctionDays: z.number().optional(),
  offerValidityPeriodDaysPolicy: z.number().optional(),
});

/**
 * Sandbox knob: Uninsurable Adder (Flip Margin Percentage)
 * Included as optional to remain backward compatible with legacy presets.
 */
const ProfitUninsurableOptionsSchema = z.object({
  uninsurableAdderFlipMarginPercentage: z.number().optional(),
  uninsurableAdderExtraHoldCosts: z.number().optional(),
});

const WholetailSchema = z.object({
  buyerSegmentationWholetailMaxRepairsAsArvPercentage: z
    .number()
    .optional(),
  buyerTargetMarginWholetailMinPercentage: z.number().optional(),
  buyerTargetMarginWholetailMaxPercentage: z.number().optional(),
});

const DebtPayoffSchema = z.object({
  payoffAccrualBasisDayCountConvention: z.string().optional(),
  payoffAccrualComponents: z.array(z.string()).optional(),
  payoffLetterEvidenceRequiredAttachment: z.boolean().optional(),
  payoffAccrualDailyInterestSafetyCap: z.number().optional(),
  payoffAggressiveOverrideAllowed: z.boolean().optional(),
});

const ComplianceRiskSchema = z.object({
  bankruptcyStayGateLegalBlock: z.boolean().optional(),
  fha90DayResaleRuleGate: z.boolean().optional(),
  firptaWithholdingGate: z.boolean().optional(),
  flood50RuleGate: z.boolean().optional(),
  floodZoneEvidenceSourceFemaMapSelector: z.string().optional(),
  scraVerificationGate: z.boolean().optional(),
  vaProgramRequirementsWdoWaterTestEvidence: z.boolean().optional(),
  stateProgramGateFhaVaOverlays: z.boolean().optional(),
  warrantabilityReviewRequirementCondoEligibilityScreens: z.boolean().optional(),
});

/** Compliance & risk gates bundle (sandbox-driven). */
const ComplianceAndRiskGatesSchema = z.object({
  bankruptcyStayGateLegalBlock: z.boolean().optional(),
  fha90DayResaleRuleGate: z.boolean().optional(),
  firptaWithholdingGate: z.boolean().optional(),
  flood50RuleGate: z.boolean().optional(),
  floodZoneEvidenceSourceFemaMapSelector: z.string().optional(),
  scraVerificationGate: z.boolean().optional(),
  stateProgramGateFhaVaOverlays: z.boolean().optional(),
  vaProgramRequirementsWdoWaterTestEvidence: z.boolean().optional(),
  warrantabilityReviewRequirementCondoEligibilityScreens: z.boolean().optional(),
});

const DispositionSchema = z.object({
  doubleCloseMinSpreadThreshold: z.number().optional(),
  doubleClosePerDiemCarryModeling: z.boolean().optional(),
  dispositionTrackEnablement: z.array(z.string()).optional(),
  deedDocumentaryStampRatePolicy: z.number().optional(),
  titlePremiumRateSource: z.string().optional(),
});

const WorkflowUiSchema = z.object({
  bankersRoundingModeNumericSafety: z.boolean().optional(),
  assumptionsProtocolPlaceholdersWhenEvidenceMissing: z.boolean().optional(),
  buyerCostsAllocationDualScenarioRenderingWhenUnknown: z.boolean().optional(),
});

const WorkflowAndGuardrailsSchema = z.object({
  analystReviewTriggerBorderlineBandThreshold: z.number().nullable().optional(),
  cashPresentationGateMinimumSpreadOverPayoff: z.number().nullable().optional(),
  assumptionsProtocolPlaceholdersWhenEvidenceMissing: z.boolean().nullable().optional(),
  bankersRoundingModeNumericSafety: z.string().nullable().optional(),
  buyerCostsAllocationDualScenarioRenderingWhenUnknown: z
    .boolean()
    .nullable()
    .optional(),
  buyerCostsLineItemModelingMethod: z.string().nullable().optional(),
  abcConfidenceGradeRubric: z.string().nullable().optional(),
  allowAdvisorOverrideWorkflowState: z.boolean().nullable().optional(),
});

const UxPolicySchema = z.object({
  bankersRoundingModeNumericSafety: z.string().nullable().optional(),
  buyerCostsAllocationDualScenarioRenderingWhenUnknown: z
    .boolean()
    .nullable()
    .optional(),
  buyerCostsLineItemModelingMethod: z.string().nullable().optional(),
});

/** Profit / fees bundle driven by sandbox knobs. */
const ProfitAndFeesSchema = z.object({
  assignmentFeeTarget: z.number().optional(),
  assignmentFeeMaxPublicizedArvPercentage: z.number().optional(),
  buyerTargetMarginFlipBaselinePolicy: z.number().optional(),
  buyerTargetMarginWholetailMinPercentage: z.number().optional(),
  buyerTargetMarginWholetailMaxPercentage: z.number().optional(),
  buyerSegmentationWholetailMaxRepairsAsArvPercentage: z.number().optional(),
  initialOfferSpreadMultiplier: z.number().optional(),
  minSpreadByArvBand: z.array(z.record(z.string(), z.any())).optional(),
});

/** Disposition / double-close bundle driven by sandbox knobs. */
const DispositionDoubleCloseSchema = z.object({
  doubleCloseMinSpreadThreshold: z.number().optional(),
  doubleClosePerDiemCarryModeling: z.boolean().optional(),
  deedDocumentaryStampRatePolicy: z.number().optional(),
  titlePremiumRateSource: z.string().optional(),
  dispositionTrackEnablement: z.array(z.string()).optional(),
});

const AnalyzeSandboxOptionsSchema = z
  .object({
    valuation: ValuationOptionsSchema.optional(),
    floorsSpreads: FloorsSpreadsSchema.optional(),
    floors: AnalyzeSandboxFloorOptionsSchema.optional(),
    repairs: RepairsOptionsSchema.optional(),
    carryTimeline: CarryTimelineSchema.optional(),
    profit_and_fees: ProfitAndFeesSchema.optional(),
    disposition_and_double_close: DispositionDoubleCloseSchema.optional(),
    carry: CarryOptionsSchema.optional(),
    holdCosts: HoldCostsOptionsSchema.optional(),
    timeline: TimelineOptionsSchema.optional(),
    profitUninsurable: ProfitUninsurableOptionsSchema.optional(),
    compliance_and_risk_gates: ComplianceAndRiskGatesSchema.optional(),
    wholetail: WholetailSchema.optional(),
    debtPayoff: DebtPayoffSchema.optional(),
    complianceRisk: ComplianceRiskSchema.optional(),
    disposition: DispositionSchema.optional(),
    workflowUi: WorkflowUiSchema.optional(),
    workflow_and_guardrails: WorkflowAndGuardrailsSchema.optional(),
    ux_policy: UxPolicySchema.optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .partial();
export type AnalyzeSandboxOptions = z.infer<typeof AnalyzeSandboxOptionsSchema>;

const AnalyzeDealSchema = z
  .object({
    dealId: z.string().uuid().optional(),
    arv: z.number().nullable().optional(),
    aiv: z.number().nullable().optional(),
    dom_zip_days: z.number().nullable().optional(),
    moi_zip_months: z.number().nullable().optional(),
    price_to_list_pct: z.number().nullable().optional(),
    local_discount_pct: z.number().nullable().optional(),
    market: z
      .object({
        arv_source: z.string().nullable().optional(),
        arv_as_of: z.string().nullable().optional(),
        arv_valuation_run_id: z.string().nullable().optional(),
        as_is_value_source: z.string().nullable().optional(),
        as_is_value_as_of: z.string().nullable().optional(),
        as_is_value_valuation_run_id: z.string().nullable().optional(),
      })
      .optional(),
    options: z.object({ trace: z.boolean().default(true) }).default({ trace: true }),
  })
  .strict();

/** Envelope inputs for current engine slices; accepts either raw deal metrics or a deal envelope with posture/org/sandbox. */
export const AnalyzeInputSchema = z.union([
  AnalyzeDealSchema,
  z
  .object({
    org_id: z.string().uuid().optional(),
    posture: z.enum(Postures).optional(),
    sandboxOptions: AnalyzeSandboxOptionsSchema.optional(),
    sandboxSnapshot: z.unknown().optional(),
    repairProfile: RepairRatesSchema.extend({
      isDefault: z.boolean().optional(),
    }).partial({
      orgId: true,
      profileId: true,
      profileName: true,
      marketCode: true,
      posture: true,
    }).optional(),
    deal: AnalyzeDealSchema,
  })
  .strict(),
]);

export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

const OfferMenuCashStatusSchema = z.enum(["CASH_OFFER", "CASH_SHORTFALL"]);

const OfferMenuCashFeeMetadataSchema = z
  .object({
    policy_band_amount: z.number().nullable(),
    effective_amount: z.number().nullable(),
    source: z.enum(["policy_band", "user_override"]).nullable(),
  })
  .strict();

const OfferMenuCashTierSchema = z
  .object({
    price: z.number().nullable(),
    close_window_days: z.number().nullable(),
    terms_posture_key: z.string().nullable(),
    notes: z.string().nullable(),
    cash_gate_status: z.enum(["pass", "shortfall", "unknown"]).nullable().optional(),
    cash_deficit: z.number().nullable().optional(),
  })
  .strict();

const OfferMenuCashSchema = z
  .object({
    status: OfferMenuCashStatusSchema.nullable(),
    spread_to_payoff: z.number().nullable(),
    shortfall_amount: z.number().nullable(),
    gap_flag: z.enum(["no_gap", "narrow_gap", "wide_gap"]).nullable().optional(),
    fee_metadata: OfferMenuCashFeeMetadataSchema.nullable(),
    tiers: z
      .object({
        fastpath: OfferMenuCashTierSchema.nullable(),
        standard: OfferMenuCashTierSchema.nullable(),
        premium: OfferMenuCashTierSchema.nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

/** Output surface matching UI cards */
const AnalyzeOutputsSchema = z
  .object({
    arv: z.number().nullable(),
    aiv: z.number().nullable(),
    buyer_ceiling: z.number().nullable(),
    respect_floor: z.number().nullable(),
    wholesale_fee: z.number().nullable(),
    wholesale_fee_dc: z.number().nullable(),
    market_temp_score: z.number().nullable(),
    window_floor_to_offer: z.number().nullable(),
    headroom_offer_to_ceiling: z.number().nullable(),
    cushion_vs_payoff: z.number().nullable(),
    seller_script_cash: z.string().nullable(),

    // Strategy / offer bundle (optional for back-compat)
    aivSafetyCap: z.number().nullable().optional(),
    carryMonths: z.number().nullable().optional(),
    mao_wholesale: z.number().nullable().optional(),
    mao_flip: z.number().nullable().optional(),
    mao_wholetail: z.number().nullable().optional(),
    mao_as_is_cap: z.number().nullable().optional(),
    mao_cap_wholesale: z.number().nullable().optional(),
    buyer_ceiling_unclamped: z.number().nullable().optional(),
    primary_offer: z.number().nullable().optional(),
    primary_offer_track: z
      .enum(["wholesale", "flip", "wholetail", "as_is_cap"])
      .nullable()
      .optional(),

    payoff_projected: z.number().nullable().optional(),
    shortfall_vs_payoff: z.number().nullable().optional(),

    seller_offer_band: z.enum(["low", "fair", "high"]).nullable().optional(),
    buyer_ask_band: z
      .enum(["aggressive", "balanced", "generous"])
      .nullable()
      .optional(),
    sweet_spot_flag: z.boolean().nullable().optional(),
    gap_flag: z
      .enum(["no_gap", "narrow_gap", "wide_gap"])
      .nullable()
      .optional(),
    floor_investor: z.number().nullable().optional(),
    payoff_plus_essentials: z.number().nullable().optional(),
    spread_cash: z.number().nullable().optional(),
    min_spread_required: z.number().nullable().optional(),
    cash_gate_status: z.enum(["pass", "shortfall", "unknown"]).nullable().optional(),
    cash_deficit: z.number().nullable().optional(),
    offer_menu_cash: OfferMenuCashSchema.nullable().optional(),
    borderline_flag: z.boolean().nullable().optional(),

    strategy_recommendation: z.string().nullable().optional(),
    workflow_state: z
      .enum(["NeedsInfo", "NeedsReview", "ReadyForOffer"])
      .nullable()
      .optional(),
    workflow_reasons: z.array(z.string()).nullable().optional(),
    confidence_grade: z.enum(["A", "B", "C"]).nullable().optional(),
    confidence_reasons: z.array(z.string()).nullable().optional(),

    timeline_summary: z
      .object({
        dom_zip_days: z.number().nullable().optional(),
        moi_zip_months: z.number().nullable().optional(),
        days_to_money: z.number().nullable(),
        dtm_selected_days: z.number().nullable().optional(),
        dtm_cash_wholesale_days: z.number().nullable().optional(),
        dtm_list_mls_days: z.number().nullable().optional(),
        dtm_auction_days: z.number().nullable().optional(),
        dtm_source: z.enum(["auction", "cash_wholesale", "list", "unknown"]).nullable().optional(),
        clear_to_close_buffer_days: z.number().nullable().optional(),
        carry_months_raw: z.number().nullable().optional(),
        carry_months_capped: z.number().nullable().optional(),
        carry_months: z.number().nullable(),
        hold_monthly_dollars: z.number().nullable().optional(),
        carry_total_dollars: z.number().nullable().optional(),
        speed_band: z.enum(["fast", "balanced", "slow"]).nullable(),
        urgency: z.enum(["normal", "elevated", "critical"]).nullable(),
        auction_date_iso: z.string().nullable().optional(),
      })
      .optional(),

    risk_summary: z
      .object({
        overall: GateStatusSchema,
        insurability: GateStatusSchema.optional(),
        title: GateStatusSchema.optional(),
        payoff: GateStatusSchema.optional(),
        fha_va_flip: GateStatusSchema.optional(),
        firpta: GateStatusSchema.optional(),
        pace_solar_ucc: GateStatusSchema.optional(),
        condo_sirs: GateStatusSchema.optional(),
        manufactured: GateStatusSchema.optional(),
        scra: GateStatusSchema.optional(),
        reasons: z.array(z.string()),
        per_gate: z.record(
          z.object({
            status: z.enum(["pass", "watch", "fail"]),
            reasons: z.array(z.string()).optional(),
          }),
        ).optional(),
      })
      .optional(),

    evidence_summary: z
      .object({
        confidence_grade: z.enum(["A", "B", "C"]).nullable().optional(),
        confidence_reasons: z.array(z.string()).optional(),
        freshness_by_kind: z.record(
          z.object({
            as_of_date: z.string().nullable().optional(),
            age_days: z.number().nullable().optional(),
            status: z.enum(["fresh", "stale", "missing"]).optional(),
            blocking_for_ready: z.boolean().optional(),
            reasons: z.array(z.string()).optional(),
          }),
        ),
        any_blocking_for_ready: z.boolean().optional(),
        missing_required_kinds: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .strict();

export const AnalyzeResultSchema = z
  .object({
    outputs: AnalyzeOutputsSchema,
    infoNeeded: z.array(z.string()).default([]),
    trace: z.any(),
  })
  .strict();

export type AnalyzeOutputs = z.infer<typeof AnalyzeOutputsSchema>;
export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;
