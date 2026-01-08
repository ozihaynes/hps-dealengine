const clonePolicy = (p) => JSON.parse(JSON.stringify(p ?? {}));
const pctToDecimal = (n) => {
    if (n == null)
        return null;
    if (n > 1 || n > 0.5)
        return n / 100;
    if (n >= 0)
        return n;
    return null;
};
const sanitizeBands = (bands) => {
    if (!Array.isArray(bands))
        return undefined;
    let currentMin = 0;
    const normalized = bands
        .map((b) => {
        const maxRaw = typeof b?.maxArv === "number" ? b.maxArv : typeof b?.max_arv === "number" ? b.max_arv : null;
        const max_arv = Number.isFinite(maxRaw) ? Number(maxRaw) : null;
        const min_spread_dollars = typeof b?.minSpread === "number"
            ? b.minSpread
            : typeof b?.min_spread === "number"
                ? b.min_spread
                : typeof b?.min_spread_dollars === "number"
                    ? b.min_spread_dollars
                    : 0;
        const pctRaw = typeof b?.minSpreadPct === "number"
            ? b.minSpreadPct
            : typeof b?.min_spread_pct === "number"
                ? b.min_spread_pct
                : typeof b?.min_spread_pct_of_arv === "number"
                    ? b.min_spread_pct_of_arv
                    : null;
        const min_spread_pct_of_arv = pctRaw != null ? pctToDecimal(pctRaw) ?? undefined : undefined;
        const band = {
            min_arv: currentMin,
            max_arv,
            min_spread_dollars,
            min_spread_pct_of_arv,
        };
        if (max_arv != null && Number.isFinite(max_arv)) {
            currentMin = max_arv;
        }
        return band;
    })
        .filter((b) => b.min_spread_dollars != null);
    return normalized.length > 0 ? normalized : undefined;
};
export function buildUnderwritingPolicyFromOptions(basePolicy, sandboxOptions) {
    const policy = clonePolicy(basePolicy);
    if (!sandboxOptions)
        return policy;
    const ensureValuation = () => (policy.valuation ??= {});
    const ensureFloors = () => (policy.floors ??= {});
    const ensureProfit = () => (policy.profit_policy ??= {});
    const ensureAssignment = () => ((ensureProfit().assignment_fee ??= {}));
    const ensureFlipMargin = () => ((ensureProfit().flip_margin ??= {}));
    const ensureWholetailMargin = () => ((ensureProfit().wholetail_margin ??= {}));
    const ensureDisposition = () => (policy.disposition_policy ??= {});
    const ensureDoubleClose = () => ((ensureDisposition().double_close ??= {}));
    const ensureDocStamps = () => ((ensureDisposition().doc_stamps ??= {}));
    const ensureCompliance = () => (policy.compliance_policy ??= {});
    const ensureHoldCosts = () => (policy.hold_costs ??= {});
    const ensureHoldFlip = () => ((ensureHoldCosts().flip ??= {}));
    const ensureHoldWholetail = () => ((ensureHoldCosts().wholetail ??= {}));
    const ensureHoldDefaults = () => ((ensureHoldCosts().default_monthly_bills ??= {}));
    // Valuation
    if (sandboxOptions.valuation) {
        const v = sandboxOptions.valuation;
        const val = ensureValuation();
        if (v.aivSafetyCapPercentage !== undefined)
            val.aiv_safety_cap_pct = v.aivSafetyCapPercentage;
        if (v.aivHardMax !== undefined)
            val.aiv_hard_max = v.aivHardMax;
        if (v.aivHardMin !== undefined)
            val.aiv_hard_min = v.aivHardMin;
        if (v.aivSoftMaxVsArvMultiplier !== undefined)
            val.aiv_soft_max_vs_arv_multiplier = v.aivSoftMaxVsArvMultiplier;
        if (v.arvHardMax !== undefined)
            val.arv_hard_max = v.arvHardMax;
        if (v.arvHardMin !== undefined)
            val.arv_hard_min = v.arvHardMin;
        if (v.arvSoftMaxVsAivMultiplier !== undefined)
            val.arv_soft_max_vs_aiv_multiplier = v.arvSoftMaxVsAivMultiplier;
        if (v.arvMinComps !== undefined)
            val.arv_min_comps = v.arvMinComps;
        if (v.arvSoftMaxCompsAgeDays !== undefined)
            val.arv_soft_max_comps_age_days = v.arvSoftMaxCompsAgeDays;
        if (v.arvCompsSetSizeForMedian !== undefined)
            val.arv_comps_set_size_for_median = v.arvCompsSetSizeForMedian;
        if (v.buyerCeilingFormulaDefinition)
            val.buyer_ceiling_formula_definition = v.buyerCeilingFormulaDefinition;
        if (v.aivCapOverrideApprovalRole)
            val.aiv_cap_override_min_role = v.aivCapOverrideApprovalRole;
        if (v.aivCapOverrideConditionBindableInsuranceRequired !== undefined) {
            val.aiv_cap_override_require_bindable_insurance = v.aivCapOverrideConditionBindableInsuranceRequired;
        }
        if (v.aivCapOverrideConditionClearTitleQuoteRequired !== undefined) {
            val.aiv_cap_override_require_clear_title_quote = v.aivCapOverrideConditionClearTitleQuoteRequired;
        }
        if (v.aivCapOverrideConditionFastZipLiquidityRequired !== undefined) {
            val.aiv_cap_override_require_fast_zip_liquidity = v.aivCapOverrideConditionFastZipLiquidityRequired;
        }
        if (v.aivCapEvidenceVpApprovalLoggingRequirement !== undefined) {
            val.aiv_cap_override_require_logged_reason = v.aivCapEvidenceVpApprovalLoggingRequirement;
        }
    }
    // Floors
    if (sandboxOptions.floors) {
        const f = sandboxOptions.floors;
        const floors = ensureFloors();
        if (f.floorInvestorAivDiscountP20Zip !== undefined)
            floors.investor_aiv_discount_p20_zip = pctToDecimal(f.floorInvestorAivDiscountP20Zip);
        if (f.floorInvestorAivDiscountTypicalZip !== undefined)
            floors.investor_aiv_discount_typical_zip = pctToDecimal(f.floorInvestorAivDiscountTypicalZip);
        if (f.floorPayoffMinRetainedEquityPercentage !== undefined)
            floors.payoff_min_retained_equity_pct = pctToDecimal(f.floorPayoffMinRetainedEquityPercentage);
        if (f.floorPayoffMoveOutCashDefault !== undefined)
            floors.payoff_move_out_cash_default = f.floorPayoffMoveOutCashDefault;
        if (f.floorPayoffMoveOutCashMax !== undefined)
            floors.payoff_move_out_cash_max = f.floorPayoffMoveOutCashMax;
        if (f.floorPayoffMoveOutCashMin !== undefined)
            floors.payoff_move_out_cash_min = f.floorPayoffMoveOutCashMin;
    }
    // Spreads / ladder
    if (sandboxOptions.floorsSpreads?.minSpreadByArvBand) {
        const bands = sanitizeBands(sandboxOptions.floorsSpreads.minSpreadByArvBand);
        if (bands)
            policy.min_spread_by_arv_band = bands;
        const profit = ensureProfit();
        profit.min_spread_by_arv_band = bands ?? profit.min_spread_by_arv_band;
    }
    if (sandboxOptions.floorsSpreads?.initialOfferSpreadMultiplier !== undefined) {
        ensureProfit().initial_offer_spread_multiplier = sandboxOptions.floorsSpreads.initialOfferSpreadMultiplier ?? null;
    }
    // Carry / timeline
    if (sandboxOptions.carry) {
        if (sandboxOptions.carry.carryMonthsMaximumCap !== undefined) {
            policy.carry_months_cap = sandboxOptions.carry.carryMonthsMaximumCap ?? null;
        }
        if (sandboxOptions.carry.carryMonthsFormulaDefinition) {
            policy.carry_formula_definition = sandboxOptions.carry.carryMonthsFormulaDefinition;
        }
        if (sandboxOptions.carry.uninsurableAdderExtraHoldCosts !== undefined) {
            policy.carry_months_uninsurable_extra = sandboxOptions.carry.uninsurableAdderExtraHoldCosts ?? null;
        }
    }
    if (sandboxOptions.carryTimeline) {
        policy.dtm ??= {};
        if (sandboxOptions.carryTimeline.daysToMoneyMaxDays !== undefined) {
            policy.dtm.max_days_to_money = sandboxOptions.carryTimeline.daysToMoneyMaxDays ?? null;
        }
        if (sandboxOptions.carryTimeline.daysToMoneySelectionMethod) {
            policy.dtm.selection_method = sandboxOptions.carryTimeline.daysToMoneySelectionMethod;
        }
        if (sandboxOptions.carryTimeline.daysToMoneyDefaultCashCloseDays !== undefined) {
            policy.dtm.default_cash_close_days = sandboxOptions.carryTimeline.daysToMoneyDefaultCashCloseDays ?? null;
        }
        if (sandboxOptions.carryTimeline.defaultDaysToWholesaleClose !== undefined) {
            policy.dtm.default_wholesale_close_days = sandboxOptions.carryTimeline.defaultDaysToWholesaleClose ?? null;
        }
        if (sandboxOptions.carryTimeline.carryMonthsMaximumCap !== undefined) {
            policy.carry_months_cap = sandboxOptions.carryTimeline.carryMonthsMaximumCap ?? policy.carry_months_cap ?? null;
        }
        if (sandboxOptions.carryTimeline.carryMonthsFormulaDefinition) {
            policy.carry_formula_definition = sandboxOptions.carryTimeline.carryMonthsFormulaDefinition;
        }
    }
    // Hold costs
    if (sandboxOptions.holdCosts) {
        const hc = sandboxOptions.holdCosts;
        const flip = ensureHoldFlip();
        const wholetail = ensureHoldWholetail();
        const defaults = ensureHoldDefaults();
        if (hc.holdCostsFlipFastZip !== undefined)
            flip.fast = { monthly_pct_of_arv: pctToDecimal(hc.holdCostsFlipFastZip) };
        if (hc.holdCostsFlipNeutralZip !== undefined)
            flip.neutral = { monthly_pct_of_arv: pctToDecimal(hc.holdCostsFlipNeutralZip) };
        if (hc.holdCostsFlipSlowZip !== undefined)
            flip.slow = { monthly_pct_of_arv: pctToDecimal(hc.holdCostsFlipSlowZip) };
        if (hc.holdCostsWholetailFastZip !== undefined)
            wholetail.fast = { monthly_pct_of_arv: pctToDecimal(hc.holdCostsWholetailFastZip) };
        if (hc.holdCostsWholetailNeutralZip !== undefined)
            wholetail.neutral = { monthly_pct_of_arv: pctToDecimal(hc.holdCostsWholetailNeutralZip) };
        if (hc.holdCostsWholetailSlowZip !== undefined)
            wholetail.slow = { monthly_pct_of_arv: pctToDecimal(hc.holdCostsWholetailSlowZip) };
        if (hc.holdingCostsMonthlyDefaultTaxes !== undefined)
            defaults.tax = hc.holdingCostsMonthlyDefaultTaxes ?? defaults.tax ?? null;
        if (hc.holdingCostsMonthlyDefaultInsurance !== undefined)
            defaults.insurance = hc.holdingCostsMonthlyDefaultInsurance ?? defaults.insurance ?? null;
        if (hc.holdingCostsMonthlyDefaultHoa !== undefined)
            defaults.hoa = hc.holdingCostsMonthlyDefaultHoa ?? defaults.hoa ?? null;
        if (hc.holdingCostsMonthlyDefaultUtilities !== undefined)
            defaults.utilities = hc.holdingCostsMonthlyDefaultUtilities ?? defaults.utilities ?? null;
    }
    // Profit / margins
    if (sandboxOptions.profit_and_fees) {
        const p = sandboxOptions.profit_and_fees;
        if (p.assignmentFeeTarget !== undefined)
            ensureAssignment().target_dollars = p.assignmentFeeTarget ?? null;
        if (p.assignmentFeeMaxPublicizedArvPercentage !== undefined) {
            ensureAssignment().max_publicized_pct_of_arv = pctToDecimal(p.assignmentFeeMaxPublicizedArvPercentage);
        }
        if (p.buyerTargetMarginFlipBaselinePolicy !== undefined) {
            ensureFlipMargin().baseline_pct = pctToDecimal(p.buyerTargetMarginFlipBaselinePolicy);
        }
        if (p.buyerTargetMarginWholetailMinPercentage !== undefined) {
            ensureWholetailMargin().min_pct = pctToDecimal(p.buyerTargetMarginWholetailMinPercentage);
        }
        if (p.buyerTargetMarginWholetailMaxPercentage !== undefined) {
            ensureWholetailMargin().max_pct = pctToDecimal(p.buyerTargetMarginWholetailMaxPercentage);
        }
        if (p.buyerSegmentationWholetailMaxRepairsAsArvPercentage !== undefined) {
            ensureWholetailMargin().max_repairs_pct_of_arv = pctToDecimal(p.buyerSegmentationWholetailMaxRepairsAsArvPercentage);
        }
        if (p.initialOfferSpreadMultiplier !== undefined) {
            ensureProfit().initial_offer_spread_multiplier = p.initialOfferSpreadMultiplier ?? null;
        }
        if (p.minSpreadByArvBand) {
            const bands = sanitizeBands(p.minSpreadByArvBand);
            if (bands) {
                policy.min_spread_by_arv_band = bands;
                ensureProfit().min_spread_by_arv_band = bands;
            }
        }
    }
    // Disposition
    if (sandboxOptions.disposition_and_double_close) {
        const d = sandboxOptions.disposition_and_double_close;
        if (d.doubleCloseMinSpreadThreshold !== undefined)
            ensureDoubleClose().min_spread_threshold_dollars = d.doubleCloseMinSpreadThreshold ?? null;
        if (d.doubleClosePerDiemCarryModeling !== undefined)
            ensureDoubleClose().include_per_diem_carry = d.doubleClosePerDiemCarryModeling ?? null;
        if (d.dispositionTrackEnablement)
            ensureDisposition().enabled_tracks = d.dispositionTrackEnablement;
        if (d.deedDocumentaryStampRatePolicy !== undefined)
            ensureDocStamps().deed_rate_multiplier = d.deedDocumentaryStampRatePolicy ?? null;
        if (d.titlePremiumRateSource !== undefined)
            ensureDocStamps().title_premium_rate_source = d.titlePremiumRateSource ?? null;
    }
    // Compliance / gates
    if (sandboxOptions.compliance_and_risk_gates) {
        const c = sandboxOptions.compliance_and_risk_gates;
        const comp = ensureCompliance();
        if (c.bankruptcyStayGateLegalBlock !== undefined)
            comp.bankruptcy_stay_gate_enabled = c.bankruptcyStayGateLegalBlock;
        if (c.fha90DayResaleRuleGate !== undefined)
            comp.fha_90_day_gate_enabled = c.fha90DayResaleRuleGate;
        if (c.firptaWithholdingGate !== undefined)
            comp.firpta_gate_enabled = c.firptaWithholdingGate;
        if (c.flood50RuleGate !== undefined)
            comp.flood_50_gate_enabled = c.flood50RuleGate;
        if (c.floodZoneEvidenceSourceFemaMapSelector !== undefined)
            comp.flood_zone_source = c.floodZoneEvidenceSourceFemaMapSelector ?? null;
        if (c.scraVerificationGate !== undefined)
            comp.scra_gate_enabled = c.scraVerificationGate;
        if (c.stateProgramGateFhaVaOverlays !== undefined)
            comp.fha_va_overlays_gate_enabled = c.stateProgramGateFhaVaOverlays;
        if (c.vaProgramRequirementsWdoWaterTestEvidence !== undefined)
            comp.va_wdo_water_test_gate_enabled = c.vaProgramRequirementsWdoWaterTestEvidence;
        if (c.warrantabilityReviewRequirementCondoEligibilityScreens !== undefined)
            comp.warrantability_review_gate_enabled = c.warrantabilityReviewRequirementCondoEligibilityScreens;
    }
    // Timeline (offer validity etc.)
    if (sandboxOptions.timeline) {
        policy.dtm ??= {};
        if (sandboxOptions.timeline.dispositionRecommendationUrgentCashMaxDtm !== undefined) {
            policy.dtm.urgent_cash_max_dtm_days = sandboxOptions.timeline.dispositionRecommendationUrgentCashMaxDtm ?? null;
        }
        if (sandboxOptions.timeline.dispositionRecommendationUrgentCashMaxAuctionDays !== undefined) {
            policy.dtm.urgent_cash_max_auction_days =
                sandboxOptions.timeline.dispositionRecommendationUrgentCashMaxAuctionDays ?? null;
        }
        if (sandboxOptions.timeline.clearToCloseBufferDays !== undefined) {
            policy.dtm.clear_to_close_buffer_days = sandboxOptions.timeline.clearToCloseBufferDays ?? null;
            policy.clear_to_close_buffer_days = sandboxOptions.timeline.clearToCloseBufferDays ?? null;
        }
        if (sandboxOptions.timeline.daysToMoneyMaxDays !== undefined) {
            policy.dtm.max_days_to_money = sandboxOptions.timeline.daysToMoneyMaxDays ?? policy.dtm.max_days_to_money ?? null;
        }
        if (sandboxOptions.timeline.daysToMoneySelectionMethod) {
            policy.dtm.selection_method = sandboxOptions.timeline.daysToMoneySelectionMethod;
        }
        if (sandboxOptions.timeline.daysToMoneyDefaultCashCloseDays !== undefined) {
            policy.dtm.default_cash_close_days = sandboxOptions.timeline.daysToMoneyDefaultCashCloseDays ?? null;
        }
        if (sandboxOptions.timeline.defaultDaysToWholesaleClose !== undefined) {
            policy.dtm.default_wholesale_close_days = sandboxOptions.timeline.defaultDaysToWholesaleClose ?? null;
        }
        // offerValidityDays retained inside dtm/timeline outputs via engine defaults; no extra mapping needed here.
    }
    // Workflow / UX
    if (sandboxOptions.workflow_and_guardrails) {
        policy.workflow_policy = {
            analyst_review_borderline_threshold: sandboxOptions.workflow_and_guardrails.analystReviewTriggerBorderlineBandThreshold ?? null,
            cash_presentation_min_spread_over_payoff: sandboxOptions.workflow_and_guardrails.cashPresentationGateMinimumSpreadOverPayoff ?? null,
            allow_placeholders_when_evidence_missing: sandboxOptions.workflow_and_guardrails.assumptionsProtocolPlaceholdersWhenEvidenceMissing ?? null,
        };
    }
    if (sandboxOptions.ux_policy) {
        policy.ux_policy = {
            bankers_rounding_mode: sandboxOptions.ux_policy.bankersRoundingModeNumericSafety ?? null,
            buyer_costs_dual_scenario_when_unknown: sandboxOptions.ux_policy.buyerCostsAllocationDualScenarioRenderingWhenUnknown ?? null,
            buyer_costs_line_item_modeling_method: sandboxOptions.ux_policy.buyerCostsLineItemModelingMethod ?? null,
        };
    }
    return policy;
}
