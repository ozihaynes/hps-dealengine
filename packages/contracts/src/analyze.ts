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
  aivSoftMaxVsArvMultiplier: z.number().optional(),
  arvSoftMaxVsAivMultiplier: z.number().optional(),
  arvMinComps: z.number().optional(),
  arvSoftMaxCompsAgeDays: z.number().optional(),
});

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

const AnalyzeSandboxOptionsSchema = z
  .object({
    valuation: ValuationOptionsSchema.optional(),
    floorsSpreads: FloorsSpreadsSchema.optional(),
    repairs: RepairsOptionsSchema.optional(),
    carryTimeline: CarryTimelineSchema.optional(),
    wholetail: WholetailSchema.optional(),
    debtPayoff: DebtPayoffSchema.optional(),
    complianceRisk: ComplianceRiskSchema.optional(),
    disposition: DispositionSchema.optional(),
    workflowUi: WorkflowUiSchema.optional(),
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
    borderline_flag: z.boolean().nullable().optional(),

    strategy_recommendation: z.string().nullable().optional(),
    workflow_state: z
      .enum(["NeedsInfo", "NeedsReview", "ReadyForOffer"])
      .nullable()
      .optional(),
    confidence_grade: z.enum(["A", "B", "C"]).nullable().optional(),
    confidence_reasons: z.array(z.string()).nullable().optional(),

    timeline_summary: z
      .object({
        days_to_money: z.number().nullable(),
        carry_months: z.number().nullable(),
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
      })
      .optional(),

    evidence_summary: z
      .object({
        confidence_grade: z.enum(["A", "B", "C"]).nullable(),
        confidence_reasons: z.array(z.string()),
        freshness_by_kind: z.object({
          comps: z.enum(["fresh", "stale", "missing"]).optional(),
          payoff_letter: z.enum(["fresh", "stale", "missing"]).optional(),
          title_quote: z.enum(["fresh", "stale", "missing"]).optional(),
          insurance: z.enum(["fresh", "stale", "missing"]).optional(),
          repairs: z.enum(["fresh", "stale", "missing"]).optional(),
        }),
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
