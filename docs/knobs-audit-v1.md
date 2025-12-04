# Sandbox & Underwriting Knobs Audit (v1)

Report generated on 2025-12-02. Inventory and usage classification of sandbox/underwriting knobs (auto-derived from registry and code references).
This document is informational only; no behavior changes were made.

## Summary

- Total knobs: 196
- Economic: 40
- Risk/Compliance: 17
- Strategy/Offer: 0
- UX-only: 139
- Unused/Legacy: 0
- Knobs with analytics_gap (math/risk not surfaced on overview/trace): 57

## Detail

| Key | Label | Category | Impact | Used In (major files/folders) | UI Surfaces | Analytics Gap | Notes |
| --- | ----- | -------- | ------ | ----------------------------- | ----------- | ------------- | ----- |
| bankruptcyStayGateLegalBlock | Bankruptcy Stay Gate (Legal Block) | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| condoSirsMilestoneFlag | Condo SIRS/Milestone Flag (Soft Caution/Gate) | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| emdPolicyEarnestMoneyStructure | EMD Policy — Earnest Money Structure (Fixed vs Percentage) | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| emdRefundabilityConditionsGate | EMD Refundability Conditions (Gate) | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| fha90DayResaleRuleGate | FHA 90-Day Resale Rule Gate | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| firptaWithholdingGate | FIRPTA Withholding Gate (Seller Non-Resident Check) | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| flood50RuleGate | Flood 50% Rule Gate (Substantial Improvement) | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| floodZoneEvidenceSourceFemaMapSelector | Flood Zone Evidence Source — FEMA Map Selector | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| hoaStatusEvidenceRequiredDocs | HOA Status Evidence — Required Docs | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| insuranceBindabilityEvidence | Insurance Bindability Evidence — 4-Point / Citizens Requirements | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| insuranceCarrierEligibilitySourcesCitizens | Insurance Carrier Eligibility Sources (Citizens) | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| projectReviewEvidence | Project Review Evidence — Condo Questionnaire, Budget/Reserves, Insurance, Litigation Letter | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| proofOfInsuranceBindableQuoteRequirement | Proof of Insurance — Bindable Quote Requirement (4-Point/RCF) | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| repairsStructuralClassGateFema50Rule | Repairs Structural/Class Gate — FEMA 50% Rule | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| scraVerificationGate | SCRA Verification Gate | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| secondaryAppraisalRequirementFha | Secondary Appraisal Requirement (FHA 91–180 Days) — Gate Setting | Compliance & Risk Gates | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| stateProgramGateFhaVaOverlays | State/Program Gate — FHA/VA Overlays (Timing/Inspections) | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| vaProgramRequirementsWdoWaterTestEvidence | VA Program Requirements — WDO/Water Test Evidence | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| warrantabilityReviewRequirementCondoEligibilityScreens | Warrantability Review Requirement — Condo Eligibility Screens | Compliance & Risk Gates | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Compliance/risk flagging knob. |
| aivAsisModelingRetailRepairFrictionMethod | AIV_asIs Modeling — Retail Repair Friction Method | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivCapEvidenceVpApprovalLoggingRequirement | AIV Cap Evidence — VP Approval Logging Requirement | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivCapOverrideApprovalRole | AIV Cap Override Approval Role | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivCapOverrideConditionBindableInsuranceRequired | AIV Cap Override Condition — Bindable Insurance Required | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivCapOverrideConditionClearTitleQuoteRequired | AIV Cap Override Condition — Clear Title Quote Required | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivCapOverrideConditionFastZipLiquidityRequired | AIV Cap Override Condition — Fast ZIP Liquidity Required | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivHardMax | AIV (Hard Max) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| aivHardMin | AIV (Hard Min) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| aivSafetyCapPercentage | AIV Safety Cap Percentage | Core Valuation Models | economic | apps/hps-dealengine/services/engine.ts, apps/hps-dealengine/lib/sandboxPolicy.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox, underwrite | yes | Cap AIV vs ARV for safety.; Policy token: aiv_safety_cap_pct |
| aivSoftMaxCompsAgeDays | AIV (Soft Max Comps Age, Days) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivSoftMaxVsArvMultiplier | AIV (Soft Max vs ARV Multiplier) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Soft ceiling for AIV vs ARV.; Policy token: aiv_soft_max_vs_arv_multiplier |
| aivSoftMinComps | AIV (Soft Min Comps) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| aivSoftMinCompsRadius | AIV (Soft Min Comps Radius) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| arvCompsSetSizeForMedian | ARV (Comps Set Size for Median) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| arvHardMax | ARV (Hard Max) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| arvHardMin | ARV (Hard Min) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| arvMinComps | ARV (Min Comps) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Comps required for ARV confidence.; Policy token: arv_min_comps |
| arvSoftMaxCompsAgeDays | ARV (Soft Max Comps Age, Days) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Stale comps guardrail.; Policy token: arv_comps_max_age_days |
| arvSoftMaxVsAivMultiplier | ARV (Soft Max vs AIV Multiplier) | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxPolicy.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Soft floor for ARV vs AIV.; Policy token: arv_soft_max_vs_aiv_multiplier |
| buyerCeilingFormulaDefinition | Buyer Ceiling Formula — Definition | Core Valuation Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| domHardMax | DOM (Hard Max) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| domHardMin | DOM (Hard Min) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| domSoftMaxWarning | DOM (Soft Max Warning) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| domSoftMinWarning | DOM (Soft Min Warning) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| investorBenchmarkModelPostureSelectionMode | Investor Benchmark Model — Posture Selection Mode (P30/P40/P50) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| maoCalculationMethodArvAivMultiplierSelection | MAO Calculation Method — ARV/AIV Multiplier Selection | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| marketLiquidityInputs | Market Liquidity Inputs — DOM_zip / MOI_zip / SP:LP_pct Inclusion Toggle | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| marketPriceTieringBracketBreakpointSource | Market Price Tiering — Bracket Breakpoint Source | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| moiHardMax | MOI (Hard Max) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| moiHardMin | MOI (Hard Min) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| moiSoftMaxWarning | MOI (Soft Max Warning) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| moiSoftMinWarning | MOI (Soft Min Warning) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| postureDefaultMode | Posture Default Mode (Conservative/Base/Aggressive) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| priceTieringSourceZipPriceBracketsData | Price Tiering Source — ZIP Price Brackets Data | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| providerSelectorCountyOfficialRecords | Provider Selector — County Official Records (Cash Deeds Join) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| providerSelectorMlsCompsDataSource | Provider Selector — MLS/Comps Data Source | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| providerSelectorZipMetrics | Provider Selector — ZIP Metrics (DOM, MOI, Price-to-List, Investor Discounts) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| retailRepairFrictionPercentage | Retail Repair Friction Percentage (AIV_asIs Modeling) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| speedBandsBalancedMaxDom | Speed Bands (Balanced, Max DOM) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| speedBandsBalancedMaxMoi | Speed Bands (Balanced, Max MOI) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| speedBandsFastMaxDom | Speed Bands (Fast, Max DOM) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| speedBandsFastMaxMoi | Speed Bands (Fast, Max MOI) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| speedBandsSlowMinDom | Speed Bands (Slow, Min DOM) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| speedBandsSlowMinMoi | Speed Bands (Slow, Min MOI) | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| zipSpeedBandDerivationMethod | ZIP Speed Band Derivation Method — From DOM/MOI | Core Valuation Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| allocationToggleBuyerVsSeller | Allocation Toggle — Buyer vs Seller Paid Closing Costs | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerCostsAllocationDefaultSellerPays | Buyer Costs Allocation — Default Seller Pays Deed Stamps & Owner’s Title | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerCostsTitleQuoteEvidenceRequirement | Buyer Costs — Title Quote Evidence (PDF) Requirement | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| carryMonthsFormulaDefinition | Carry Months — Formula Definition (DOM-based) | Cost & Expense Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Carry months formula selector.; Policy token: carry_months_formula |
| carryMonthsMaximumCap | Carry Months — Maximum Cap | Cost & Expense Models | economic | apps/hps-dealengine/lib/sandboxPolicy.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Max carry months clamp.; Policy token: carry_months_cap |
| holdCostsFlipFastZip | Hold Costs, Flip (Fast ZIP) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdCostsFlipNeutralZip | Hold Costs, Flip (Neutral ZIP) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdCostsFlipSlowZip | Hold Costs, Flip (Slow ZIP) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdCostsWholetailFastZip | Hold Costs, Wholetail (Fast ZIP) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdCostsWholetailNeutralZip | Hold Costs, Wholetail (Neutral ZIP) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdCostsWholetailSlowZip | Hold Costs, Wholetail (Slow ZIP) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdingCostsMonthlyDefaultHoa | Holding Costs, Monthly (Default HOA) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdingCostsMonthlyDefaultInsurance | Holding Costs, Monthly (Default Insurance) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdingCostsMonthlyDefaultTaxes | Holding Costs, Monthly (Default Taxes) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| holdingCostsMonthlyDefaultUtilities | Holding Costs, Monthly (Default Utilities) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| listingCostModelSellerCostLineItems | Listing Cost Model — Seller Cost Line Items (Configurable) | Cost & Expense Models | economic | apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx, packages/contracts/src/settings.ts | sandbox, underwrite | yes | Feeds analyze payload or math. |
| repairsContingencyBidsMissing | Repairs Contingency (Bids Missing, Additional Percentage) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| repairsContingencyHeavyScope | Repairs Contingency (Heavy Scope) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| repairsContingencyLightScope | Repairs Contingency (Light Scope) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| repairsContingencyMediumScope | Repairs Contingency (Medium Scope) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| repairsContingencyPercentageByClass | Repairs Contingency Percentage by Class | Cost & Expense Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Contingency by repair class.; Policy token: repairs_contingency_pct_by_class |
| repairsEvidenceBidsScopeAttachmentRequirement | Repairs Evidence — Bids/Scope Attachment Requirement | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| repairsHardMax | Repairs (Hard Max) | Cost & Expense Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Hard cap repairs dollars.; Policy token: repairs_hard_max |
| repairsHardMin | Repairs (Hard Min) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| repairsSoftMaxVsArvPercentage | Repairs (Soft Max vs ARV Percentage) | Cost & Expense Models | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Soft cap repairs vs ARV.; Policy token: repairs_soft_max_vs_arv_pct |
| retailListingCostPercentage | Retail Listing Cost Percentage (sell_close_pct) — Seller Costs | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| retailMakeReadyPerRepairClass | Retail Make-Ready — Per Repair Class Input | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| sellerConcessionsCreditsHandlingPolicy | Seller Concessions/Credits Handling Policy | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| sellerNetRetailMakeReadyInputs | Seller Net (Retail) Make-Ready Inputs — Wholetail/List Paths | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| sourcesEvidenceTitleQuotePdfItemizationRequirement | Sources Evidence — Title Quote PDF Itemization Requirement | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| titleQuoteAttachmentRequiredForPublishing | Title Quote Attachment — Required for Publishing | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| uninsurableAdderExtraHoldCosts | Uninsurable Adder (Extra Hold Costs) | Cost & Expense Models | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| actual365PayoffDayCountConvention | Actual/365 Payoff Day-Count Convention | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| hoaEstoppelFeeCapPolicy | HOA Estoppel Fee Cap Policy | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| hoaRushTransferFeePolicy | HOA Rush/Transfer Fee Policy | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| interestDayCountBasisDefault | Interest Day-Count Basis (Default) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| paceAssessmentHandlingPayoffRequirementPolicy | PACE Assessment Handling — Payoff Requirement Policy | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| paceDetectionSourceTaxBillNonAdValoremSelector | PACE Detection Source — Tax Bill Non-Ad-Valorem Selector | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| payoffAccrualBasisDayCountConvention | Payoff Accrual Basis — Day-Count Convention | Debt & Payoff Logic | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| payoffAccrualComponents | Payoff Accrual Components — Senior, Juniors, HOA, Municipal, PACE/UCC | Debt & Payoff Logic | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| payoffLetterEvidenceRequiredAttachment | Payoff Letter Evidence — Required Attachment | Debt & Payoff Logic | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| perDiemAccrualInputsSeniorJuniorsUsdDay | Per-Diem Accrual Inputs — Senior/Juniors (USD/day) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| seniorPerDiemHardMax | Senior Per-Diem (Hard Max) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| seniorPerDiemHardMin | Senior Per-Diem (Hard Min) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| seniorPerDiemSoftMaxImpliedApr | Senior Per-Diem (Soft Max Implied APR) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| seniorPrincipalHardMax | Senior Principal (Hard Max) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| seniorPrincipalHardMin | Senior Principal (Hard Min) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| seniorPrincipalSoftMaxVsArvPercentage | Senior Principal (Soft Max vs ARV Percentage) | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| solarLeaseUcc1GateClearanceRequirement | Solar Lease/UCC-1 Gate — Clearance Requirement | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| ucc1SearchSourceSelectorCountyStateRegistry | UCC-1 Search Source Selector — County & State Registry | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| ucc1TerminationSubordinationClosingConditionRequirement | UCC-1 Termination/Subordination — Closing Condition Requirement | Debt & Payoff Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| ceilingSelectionConservativeUsesMin | Ceiling Selection — Conservative Uses Min of Eligible when Data Thin | Floor & Ceiling Formulas | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| ceilingSelectionHighestEligibleInBase | Ceiling Selection — Highest Eligible in Base | Floor & Ceiling Formulas | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| ceilingSelectionPostureControls | Ceiling Selection — Posture (P30/P40/P50) Controls | Floor & Ceiling Formulas | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| floorInvestorAivDiscountP20Zip | Floor, Investor (AIV Discount, P20 ZIP) | Floor & Ceiling Formulas | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| floorInvestorAivDiscountTypicalZip | Floor, Investor (AIV Discount, Typical ZIP) | Floor & Ceiling Formulas | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Investor floor discount in typical ZIPs.; Policy token: investor_floor_aiv_discount_typical |
| floorPayoffMinRetainedEquityPercentage | Floor, Payoff (Min Retained Equity Percentage) | Floor & Ceiling Formulas | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| floorPayoffMoveOutCashDefault | Floor, Payoff (Move-Out Cash, Default) | Floor & Ceiling Formulas | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| floorPayoffMoveOutCashMax | Floor, Payoff (Move-Out Cash, Max) | Floor & Ceiling Formulas | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| floorPayoffMoveOutCashMin | Floor, Payoff (Move-Out Cash, Min) | Floor & Ceiling Formulas | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| investorFloorCompositionComponentsToggle | Investor Floor Composition — Components Toggle | Floor & Ceiling Formulas | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| respectFloorCompositionInvestorFloorVsPayoff | Respect Floor Composition — Investor Floor vs PayoffClose + Essentials | Floor & Ceiling Formulas | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| respectFloorFormulaComponentSelector | Respect Floor Formula — Component Selector | Floor & Ceiling Formulas | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| assignmentFeeMaxPublicizedArvPercentage | Assignment Fee (Max Publicized, ARV Percentage) | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Max publicized fee as % ARV.; Policy token: assignment_fee_max_pct_arv |
| assignmentFeeTarget | Assignment Fee (Target) | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/services/engine.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Target assignment fee gate.; Policy token: assignment_fee_target |
| assignmentFeeVipOverrideMaxArvPercentage | Assignment Fee (VIP Override, Max ARV Percentage) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| assignmentFeeVipOverrideMinArvPercentage | Assignment Fee (VIP Override, Min ARV Percentage) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerSegmentationFlipperMaxMoi | Buyer Segmentation (Flipper, Max MOI) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerSegmentationLandlordMinGrossYield | Buyer Segmentation (Landlord, Min Gross Yield) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerSegmentationLandlordMinMoi | Buyer Segmentation (Landlord, Min MOI) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerSegmentationWholetailMaxRepairsAsArvPercentage | Buyer Segmentation (Wholetail, Max Repairs as ARV Percentage) | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Wholetail eligibility cap on repairs.; Policy token: wholetail_max_repairs_pct_arv |
| buyerSegmentationWholetailMinYearBuilt | Buyer Segmentation (Wholetail, Min Year Built) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerTargetMarginFlipBaselinePolicy | Buyer Target Margin — Flip Baseline Policy | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/lib/sandboxPolicy.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Baseline flip margin.; Policy token: buyer_target_margin_flip |
| buyerTargetMarginFlipMoiBands | Buyer Target Margin (Flip, by MOI) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerTargetMarginMoiTierAdjusters | Buyer Target Margin — MOI-Tier Adjusters | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerTargetMarginWholetailFastZip | Buyer Target Margin (Wholetail, Fast ZIP) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerTargetMarginWholetailMaxPercentage | Buyer Target Margin (Wholetail, Max Percentage) | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Wholetail max margin.; Policy token: wholetail_margin_max_pct |
| buyerTargetMarginWholetailMinPercentage | Buyer Target Margin (Wholetail, Min Percentage) | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Wholetail min margin.; Policy token: wholetail_margin_min_pct |
| buyerTargetMarginWholetailNeutralZip | Buyer Target Margin (Wholetail, Neutral ZIP) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerTargetMarginWholetailRangePolicy | Buyer Target Margin — Wholetail Range Policy | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| buyerTargetMarginWholetailSlowZip | Buyer Target Margin (Wholetail, Slow ZIP) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| concessionsLadderStep1 | Concessions Ladder (Step 1) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| concessionsLadderStep2 | Concessions Ladder (Step 2) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| concessionsLadderStep3 | Concessions Ladder (Step 3) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| counterOfferDefaultIncrement | Counter-Offer (Default Increment) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| initialOfferSpreadMultiplier | Initial Offer (Spread Multiplier) | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/lib/sandboxPolicy.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Initial offer relative to spread target.; Policy token: initial_offer_spread_multiplier |
| maoNegotiationBandwidthAdjustmentRange | MAO Negotiation Bandwidth — Adjustment Range | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| minSpreadByArvBand | Spread Minimum by ARV Band Policy | Profit & Risk Policy | risk_compliance | apps/hps-dealengine/lib/sandboxPolicy.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx | sandbox, underwrite | yes | Spread gate per ARV band.; Policy token: min_spread_by_arv_band |
| negotiationBufferPercentage | Negotiation Buffer (Percentage) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| spreadPresentationBorderlineBandHandlingPolicy | Spread Presentation — Borderline Band Handling Policy | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| uninsurableAdderFlipMarginPercentage | Uninsurable Adder (Flip Margin Percentage) | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| wholesaleFeeModeAssignmentVsDoubleCloseSelection | Wholesale Fee Mode — Assignment vs Double-Close Selection | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| wholetailMarginPolicyByZipSpeedBand | Wholetail Margin Policy — By ZIP Speed Band | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| zipSpeedBandPostureControlsMarginHoldingAdjusters | ZIP Speed Band Posture Controls — Margin & Holding Adjusters | Profit & Risk Policy | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| deedDocumentaryStampRatePolicy | Deed Documentary Stamp Rate Policy | Specialized Disposition Modules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| deedTaxAllocationBuyerSellerSplitToggle | Deed Tax Allocation — Buyer/Seller Split Toggle | Specialized Disposition Modules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| dispositionTrackEnablement | Disposition Track Enablement — Cash / Wholesale / Wholetail / List | Specialized Disposition Modules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| doubleCloseAtoBClosingCostCategories | Double-Close — A-to-B Closing Cost Categories (Configurable) | Specialized Disposition Modules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| doubleCloseBtoCClosingCostCategories | Double-Close — B-to-C Closing Cost Categories (Configurable) | Specialized Disposition Modules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| doubleCloseFundingPointsPercentage | Double-Close — Funding Points (Transactional Funding) Percentage | Specialized Disposition Modules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| doubleCloseHoldDaysCalculationMethod | Double-Close — Hold Days Calculation Method | Specialized Disposition Modules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| doubleCloseMinSpreadThreshold | Double Close (Min Spread Threshold) | Specialized Disposition Modules | economic | apps/hps-dealengine/lib/sandboxPolicy.ts, apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| doubleClosePerDiemCarryModeling | Double-Close — Per-Diem Carry Modeling (Taxes/Insurance/HOA/Utilities) | Specialized Disposition Modules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| titlePremiumRateSource | Title Premium Rate Source — FAC 69O-186.003 Selector | Specialized Disposition Modules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| transactionalFundingPointsDoubleCloseFinancingInput | Transactional Funding Points — Double-Close Financing Input | Specialized Disposition Modules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| wholetailRetailMakeReadyInputEvidenceDefaultsToggle | Wholetail Retail Make-Ready Input — Evidence/Defaults Toggle | Specialized Disposition Modules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| auctionUrgencyMarginAdderPolicy | Auction Urgency — Margin Adder Policy | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| auctionUrgencyTrpMultiplierPolicy | Auction Urgency — TRP Multiplier Policy | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| clearToCloseBufferDays | Clear-to-Close Buffer Days (Unresolved Title/Insurance) | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| daysToMoneyDefaultCashCloseDays | Days-to-Money — Default Cash Close Days | Timeline & Urgency Rules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Default DTM for cash close.; Policy token: dtm_default_cash_close_days |
| daysToMoneyMaxDays | Days-to-Money (Max Days) | Timeline & Urgency Rules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts | sandbox | yes | Feeds analyze payload or math. |
| daysToMoneyRollForwardRule | Days-to-Money Roll-Forward Rule — Weekends/Holidays | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| daysToMoneySelectionMethod | Days-to-Money Selection Method — Earliest Compliant Target Close | Timeline & Urgency Rules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | How to derive Days-to-Money.; Policy token: dtm_selection_method |
| defaultDaysToCashClose | Default Days to Cash Close | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| defaultDaysToWholesaleClose | Default Days to Wholesale Close | Timeline & Urgency Rules | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Default wholesale close days.; Policy token: dtm_wholesale_days |
| dispositionRecommendationListMlsMinDomZip | Disposition Recommendation (List/MLS, Min DOM_ZIP) | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| dispositionRecommendationListMlsMinDtm | Disposition Recommendation (List/MLS, Min DTM) | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| dispositionRecommendationListMlsMinMoi | Disposition Recommendation (List/MLS, Min MOI) | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| dispositionRecommendationLogicDtmThresholds | Disposition Recommendation Logic — DTM Thresholds | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| dispositionRecommendationUrgentCashMaxAuctionDays | Disposition Recommendation (Urgent/Cash, Max Auction Days) | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| dispositionRecommendationUrgentCashMaxDtm | Disposition Recommendation (Urgent/Cash, Max DTM) | Timeline & Urgency Rules | economic | apps/hps-dealengine/lib/sandboxPolicy.ts | sandbox | yes | Feeds analyze payload or math. |
| emdTimelineDaysDeadlinePolicy | EMD Timeline (Days) — Deadline Policy | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| offerValidityPeriodDaysPolicy | Offer Validity Period — Days Policy | Timeline & Urgency Rules | economic | apps/hps-dealengine/lib/sandboxPolicy.ts | sandbox | yes | Feeds analyze payload or math. |
| rightOfFirstRefusalBoardApprovalWindowDaysInput | Right-of-First-Refusal / Board Approval Window — Days Input | Timeline & Urgency Rules | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| abcConfidenceGradeRubric | A/B/C Confidence Grade Rubric | Workflow & UI Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| allowAdvisorOverrideWorkflowState | Allow Advisor Override (Workflow State) | Workflow & UI Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| analystReviewTriggerBorderlineBandThreshold | Analyst Review Trigger — Borderline Band Threshold | Workflow & UI Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| assumptionsProtocolPlaceholdersWhenEvidenceMissing | Assumptions Protocol — [INFO NEEDED] placeholders when evidence missing | Workflow & UI Logic | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| bankersRoundingModeNumericSafety | Banker’s Rounding Mode (Numeric Safety) | Workflow & UI Logic | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| buyerCostsAllocationDualScenarioRenderingWhenUnknown | Buyer Costs Allocation — Dual Scenario Rendering When Unknown | Workflow & UI Logic | economic | apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts, packages/contracts/src/analyze.ts | sandbox | yes | Feeds analyze payload or math. |
| buyerCostsLineItemModelingMethod | Buyer Costs — Line-Item Modeling Method | Workflow & UI Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
| cashPresentationGateMinimumSpreadOverPayoff | Cash Presentation Gate — Minimum Spread Over Payoff | Workflow & UI Logic | ux_only | (sandbox registry only) | sandbox | no | Sandbox UI/config only. |
