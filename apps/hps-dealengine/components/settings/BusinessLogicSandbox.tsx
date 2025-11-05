import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '../../shims/google-genai';
import {
  Button,
  DynamicBandEditor,
  Icon,
  InputField,
  Modal,
  MultiSelectChecklist,
  SelectField,
  ToggleSwitch,
} from '../ui';
import { Icons } from '../../constants';
import { SANDBOX_PAGES_CONFIG } from '../../constants/sandboxSettings';
import type { SandboxSettings, SandboxPreset } from '../../types';

const DEALENGINE_STRATEGIST_PERSONA_CHAT = `You are the "DealEngine Strategist," an expert AI assistant for the HPS DealEngine Business Logic Sandbox.

Your sole purpose is to help users understand and configure the sandbox settings. You must adhere to the following directives:

1.  **Tool-Focused:** Your knowledge is strictly limited to the DealEngine sandbox settings provided in this system instruction. Do not answer questions about general real estate, market conditions, or anything outside of the sandbox configuration. If asked something off-topic, politely state that you can only assist with DealEngine settings.
2.  **Professional & Concise:** Provide clear, professional, and direct answers. Avoid conversational filler or overly friendly personas.
3.  **Explain the "Why":** When a user asks about a setting, first explain what the setting does in simple terms. Then, describe its direct business impact on deal calculations. Finally, mention how it might interact with other key settings if relevant.
4.  **Use Only Provided Context:** Base all your answers on the user's query and the sandbox blueprint detailed below. Do not invent information or access external data.

---
### CORE KNOWLEDGE BASE (THE SANDBOX BLUEPRINT)
This is your complete blueprint. You must use this information to answer all questions.

[START SANDBOX BLUEPRINT]

#### 1. 📈 Core Valuation Models
* AIV (Hard Max): InputField (Number), $, The absolute maximum As-Is Value.
* AIV (Hard Min): InputField (Number), $, The absolute minimum As-Is Value.
* AIV (Soft Max Comps Age, Days): InputField (Number), days, Flags stale comps.
* AIV (Soft Max vs ARV Multiplier): InputField (Number), (multiplier), Flags AIV if it exceeds this multiplier of ARV.
* AIV (Soft Min Comps): InputField (Number), comps, Minimum comps for high-confidence AIV.
* AIV (Soft Min Comps Radius): InputField (Number), miles, Default search radius for AIV comps.
* AIV Cap Override Approval Role: SelectField, [Analyst, Underwriter, Manager, VP, Admin], Role to approve AIV soft cap override.
* AIV Cap Override Condition — Bindable Insurance Required: ToggleSwitch, Requires insurance proof for AIV cap override.
* AIV Cap Override Condition — Clear Title Quote Required: ToggleSwitch, Requires title quote for AIV cap override.
* AIV Cap Override Condition — Fast ZIP Liquidity Required: ToggleSwitch, Restricts AIV cap overrides to fast/neutral ZIPs.
* AIV Cap Evidence — VP Approval Logging Requirement: ToggleSwitch, Requires written justification for override.
* AIV Safety Cap Percentage: InputField (Number), %, Global final "safety" reduction on AIV.
* AIV_asIs Modeling — Retail Repair Friction Method: SelectField, [Percentage of Repairs, Fixed Friction Amount, Blended], Formula for retail buyer's repair discount.
* ARV (Comps Set Size for Median): InputField (Number), comps, Number of comps for median ARV.
* ARV (Hard Max): InputField (Number), $, Absolute maximum ARV.
* ARV (Hard Min): InputField (Number), $, Absolute minimum ARV.
* ARV (Min Comps): InputField (Number), comps, Minimum comps for high-confidence ARV.
* ARV (Soft Max Comps Age, Days): InputField (Number), days, Flags stale comps for ARV.
* ARV (Soft Max vs AIV Multiplier): InputField (Number), (multiplier), Flags ARV if less than this multiplier of AIV.
* Buyer Ceiling Formula — Definition: Textarea (Simple Formula), Master formula for Buyer Ceiling.
* DOM (Hard Max): InputField (Number), days, Flags ZIP-level DOM exceeding this.
* DOM (Hard Min): InputField (Number), days, Minimum valid DOM data.
* DOM (Soft Max Warning): InputField (Number), days, Shows 'slow market' warning.
* DOM (Soft Min Warning): InputField (Number), days, Shows 'illiquid market' warning.
* Investor Benchmark Model — Posture Selection Mode (P30/P40/P50): DynamicBandEditor, Maps posture (Conservative, Base, Aggressive) to data percentile (P30, P40, P50).
* MAO Calculation Method — ARV/AIV Multiplier Selection: SelectField, [ARV-Based, AIV-Based, Blended, Min(ARV, AIV)], Selects primary value for MAO formula.
* MOI (Hard Max): InputField (Number), months, Flags ZIP-level MOI exceeding this.
* MOI (Hard Min): InputField (Number), months, Minimum valid MOI data.
* MOI (Soft Max Warning): InputField (Number), months, Shows 'slow market' warning.
* MOI (Soft Min Warning): InputField (Number), months, Shows 'hot market' warning.
* Market Liquidity Inputs — DOM_zip / MOI_zip / SP:LP_pct Inclusion Toggle: MultiSelectChecklist, [DOM, MOI, SP:LP %, Local Investor Discount], Selects indicators for "Market Temp."
* Market Price Tiering — Bracket Breakpoint Source: SelectField, [ZIP Median, County Median, Internal Model], Defines data source for price brackets.
* Posture Default Mode (Conservative/Base/Aggressive): SelectField, [Conservative, Base, Aggressive], Default underwriting posture.
* Price Tiering Source — ZIP Price Brackets Data: SelectField, [Internal Data, CoreLogic, ATTOM], Data provider for ZIP price brackets.
* Provider Selector — County Official Records (Cash Deeds Join): SelectField, [PropStream, ATTOM, CoreLogic, RealQuest], Data provider for cash deeds.
* Provider Selector — MLS/Comps Data Source: SelectField, [StellarMLS, PropStream, ATTOM, Internal CMA Tool], Primary provider for MLS/comps.
* Provider Selector — ZIP Metrics (DOM, MOI, Price-to-List, Investor Discounts): SelectField, [Realtor.com, PropStream, ATTOM, Internal Data], Provider for ZIP stats.
* Retail Repair Friction Percentage (AIV_asIs Modeling): InputField (Number), %, Default friction % if 'Percentage' method selected.
* Speed Bands (Balanced, Max DOM): InputField (Number), days, Max DOM for "Balanced" ZIP.
* Speed Bands (Balanced, Max MOI): InputField (Number), months, Max MOI for "Balanced" ZIP.
* Speed Bands (Fast, Max DOM): InputField (Number), days, Max DOM for "Fast" ZIP.
* Speed Bands (Fast, Max MOI): InputField (Number), months, Max MOI for "Fast" ZIP.
* ZIP Speed Band Derivation Method — From DOM/MOI: SelectField, [Use Most Conservative, Use Most Aggressive, Use Blended Average], Logic to combine DOM/MOI.

#### 2. 🏛️ Floor & Ceiling Formulas
* Ceiling Selection — Conservative Uses Min of Eligible when Data Thin: ToggleSwitch, 'Conservative' posture uses min ceiling if comp data is thin.
* Ceiling Selection — Highest Eligible in Base: ToggleSwitch, 'Base' posture uses highest calculated ceiling.
* Ceiling Selection — Posture (P30/P40/P50) Controls: ToggleSwitch, Allows 'Posture' to control P-value (P30/P40/P50).
* Floor, Investor (AIV Discount, P20 ZIP): InputField (Number), %, AIV discount for Investor Floor in P20 (slowest) ZIP.
* Floor, Investor (AIV Discount, Typical ZIP): InputField (Number), %, Standard AIV discount for Investor Floor.
* Floor, Payoff (Min Retained Equity Percentage): InputField (Number), %, Min equity % seller retains on top of payoff.
* Floor, Payoff (Move-Out Cash, Default): InputField (Number), $, Default "cash for keys" amount.
* Floor, Payoff (Move-Out Cash, Max): InputField (Number), $, Max "cash for keys."
* Floor, Payoff (Move-Out Cash, Min): InputField (Number), $, Min "cash for keys."
* Investor Floor Composition — Components Toggle: MultiSelectChecklist, [AIV Discount, Local Investor Discount, Hard Cost Floor, P20 ZIP Discount], Selects components for 'Investor Floor'.
* Respect Floor Composition — Investor Floor vs PayoffClose + Essentials: ToggleSwitch, If ON, 'Respect Floor' = MAX(Investor Floor, PayoffClose + Essentials).
* Respect Floor Formula — Component Selector: SelectField, [Max(Payoff Floor, Investor Floor), Investor Floor Only, Payoff Floor Only], Final formula for 'Respect Floor'.

#### 3. 💸 Cost & Expense Models
* Allocation Toggle — Buyer vs Seller Paid Closing Costs: SelectField, [Buyer Pays All, Seller Pays All, Standard (Local Custom Split), Seller Pays Owner's Title/Stamps], Default allocation for closing costs.
* Buyer Costs Allocation — Default Seller Pays Deed Stamps & Owner’s Title: ToggleSwitch, If ON, "Standard Split" assumes Seller pays Deed Stamps/Owner's Title.
* Buyer Costs — Title Quote Evidence (PDF) Requirement: ToggleSwitch, Locks "Buyer Costs" until Title Quote PDF is attached.
* Carry Months — Formula Definition (DOM-based): Textarea (Simple Formula), Formula for hold time based on DOM.
* Carry Months — Maximum Cap: InputField (Number), months, Max months of carry cost.
* Hold Costs, Flip (Fast ZIP): InputField (Number), %, Monthly holding cost (% of ARV) for Flip in "Fast" market.
* Hold Costs, Flip (Neutral ZIP): InputField (Number), %, Monthly holding cost (% of ARV) for Flip in "Neutral" market.
* Hold Costs, Flip (Slow ZIP): InputField (Number), %, Monthly holding cost (% of ARV) for Flip in "Slow" market.
* Hold Costs, Wholetail (Fast ZIP): InputField (Number), %, Monthly holding cost (% of ARV) for Wholetail in "Fast" market.
* Hold Costs, Wholetail (Neutral ZIP): InputField (Number), %, Monthly holding cost (% of ARV) for Wholetail in "Neutral" market.
* Hold Costs, Wholetail (Slow ZIP): InputField (Number), %, Monthly holding cost (% of ARV) for Wholetail in "Slow" market.
* Holding Costs, Monthly (Default HOA): InputField (Number), $, Default monthly HOA if unknown.
* Holding Costs, Monthly (Default Insurance): InputField (Number), $, Default monthly insurance (P&I) if unknown.
* Holding Costs, Monthly (Default Taxes): InputField (Number), $, Default monthly property tax if unknown.
* Holding Costs, Monthly (Default Utilities): InputField (Number), $, Default monthly utilities if unknown.
* Listing Cost Model — Seller Cost Line Items (Configurable): DynamicBandEditor, Define line-item resale costs.
* Repairs (Hard Max): InputField (Number), $, Absolute max repair budget.
* Repairs (Hard Min): InputField (Number), $, Absolute min repair budget.
* Repairs (Soft Max vs ARV Percentage): InputField (Number), %, Flags repairs exceeding this % of ARV.
* Repairs Contingency (Bids Missing, Additional Percentage): InputField (Number), %, Additional contingency if no bids attached.
* Repairs Contingency (Heavy Scope): InputField (Number), %, Default contingency for "Heavy Scope."
* Repairs Contingency (Light Scope): InputField (Number), %, Default contingency for "Light Scope."
* Repairs Contingency (Medium Scope): InputField (Number), %, Default contingency for "Medium Scope."
* Repairs Contingency Percentage by Class: DynamicBandEditor, Default contingency based on Repair Class.
* Repairs Evidence — Bids/Scope Attachment Requirement: ToggleSwitch, Locks 'Repairs' input until bid/scope is attached.
* Retail Listing Cost Percentage (sell_close_pct) — Seller Costs: InputField (Number), %, Total % for seller's closing costs on retail list.
* Retail Make-Ready — Per Repair Class Input: DynamicBandEditor, Default "make-ready" cost ($) by repair class.
* Seller Concessions/Credits Handling Policy: SelectField, [Treat as Resale Cost, Reduce Net Offer, Do Not Model], How to treat seller concessions.
* Seller Net (Retail) Make-Ready Inputs — Wholetail/List Paths: ToggleSwitch, Includes 'Make-Ready' costs in Seller Net for Wholetail/List.
* Sources Evidence — Title Quote PDF Itemization Requirement: ToggleSwitch, Requires attached Title Quote to be itemized.
* Title Quote Attachment — Required for Publishing: ToggleSwitch, Requires Title Quote attachment for "ReadyForOffer."
* Uninsurable Adder (Extra Hold Costs): InputField (Number), months, Extra hold months for 'Uninsurable' properties.

#### 4. 🏦 Debt & Payoff Logic
* Actual/365 Payoff Day-Count Convention: SelectField, [Actual/365, 30/360], Day-count for per-diem interest.
* HOA Estoppel Fee Cap Policy: InputField (Number), $, Max HOA Estoppel Fee to include.
* HOA Rush/Transfer Fee Policy: InputField (Number), $, Max HOA Rush/Transfer Fee to include.
* Interest Day-Count Basis (Default): SelectField, [Actual/365, 30/360], Default interest calculation method.
* PACE Assessment Handling — Payoff Requirement Policy: SelectField, [Must Be Paid in Full, Can Be Subordinated, Case-by-Case], Policy for PACE liens.
* PACE Detection Source — Tax Bill Non-Ad-Valorem Selector: SelectField, [Tax Bill API, Title Quote, Manual Only], Data source for auto-detecting PACE.
* Payoff Accrual Basis — Day-Count Convention: SelectField, [Actual/365, 30/360], Day-count for accruing per-diems.
* Payoff Accrual Components — Senior, Juniors, HOA, Municipal, PACE/UCC: MultiSelectChecklist, Select liens included in 'Projected Payoff'.
* Payoff Letter Evidence — Required Attachment: ToggleSwitch, Requires Payoff Letter attachment for "ReadyForOffer."
* Per-Diem Accrual Inputs — Senior/Juniors (USD/day): ToggleSwitch, Use per-diem $ amount (if ON) or calculate (if OFF).
* Senior Per-Diem (Hard Max): InputField (Number), $, Flags senior per-diem over this.
* Senior Per-Diem (Hard Min): InputField (Number), $, Minimum valid per-diem.
* Senior Per-Diem (Soft Max Implied APR): InputField (Number), %, Flags per-diem implying APR > this.
* Senior Principal (Hard Max): InputField (Number), $, Flags senior principal over this.
* Senior Principal (Hard Min): InputField (Number), $, Minimum valid principal.
* Senior Principal (Soft Max vs ARV Percentage): InputField (Number), %, Flags senior principal > this % of ARV.
* Solar Lease/UCC-1 Gate — Clearance Requirement: SelectField, [Must Be Paid/Terminated, Must Be Subordinated, Case-by-Case], Policy for solar leases/UCC-1.
* UCC-1 Search Source Selector — County & State Registry: SelectField, [Sunbiz (FL), County Registry API, Manual Only], Provider for UCC-1 searches.
* UCC-1 Termination/Subordination — Closing Condition Requirement: ToggleSwitch, Requires proof of UCC-1 termination/subordination.

#### 5. 💰 Profit & Risk Policy
* Assignment Fee (Max Publicized, ARV Percentage): InputField (Number), %, Max assignment fee (% ARV) to be marketed.
* Assignment Fee (Target): InputField (Number), $, Default target assignment fee.
* Assignment Fee (VIP Override, Max ARV Percentage): InputField (Number), %, Absolute max assignment fee (% ARV) for override.
* Assignment Fee (VIP Override, Min ARV Percentage): InputField (Number), %, Min assignment fee (% ARV) for override.
* Buyer Segmentation (Flipper, Max MOI): InputField (Number), months, Max MOI for "Flipper" market.
* Buyer Segmentation (Landlord, Min Gross Yield): InputField (Number), %, Min Gross Yield % for "Landlord" deal.
* Buyer Segmentation (Landlord, Min MOI): InputField (Number), months, Min MOI for "Landlord" market.
* Buyer Segmentation (Wholetail, Max Repairs as ARV Percentage): InputField (Number), %, Max repairs (% ARV) for "Wholetail."
* Buyer Segmentation (Wholetail, Min Year Built): InputField (Number), (year), Min Year Built for "Wholetail."
* Buyer Target Margin (Flip, MOI Band...): DynamicBandEditor, Defines target flip margin tiered by Market MOI.
* Buyer Target Margin (Wholetail, Fast ZIP): InputField (Number), %, Target profit margin for Wholetail in "Fast" market.
* Buyer Target Margin (Wholetail, Max Percentage): InputField (Number), %, Max acceptable Wholetail margin.
* Buyer Target Margin (Wholetail, Min Percentage): InputField (Number), %, Min acceptable Wholetail margin.
* Buyer Target Margin (Wholetail, Neutral ZIP): InputField (Number), %, Target profit margin for Wholetail in "Neutral" market.
* Buyer Target Margin (Wholetail, Slow ZIP): InputField (Number), %, Target profit margin for Wholetail in "Slow" market.
* Buyer Target Margin — Flip Baseline Policy: InputField (Number), %, Base target margin for standard flip.
* Buyer Target Margin — MOI-Tier Adjusters: ToggleSwitch, Allows MOI-Tiers to adjust 'Flip Baseline'.
* Buyer Target Margin — Wholetail Range Policy: ToggleSwitch, Enforces 'Min/Max Percentage' for Wholetail margins.
* Concessions Ladder (Step 1): InputField (Number), $, Default concession for 1st counter.
* Concessions Ladder (Step 2): InputField (Number), $, Default concession for 2nd counter.
* Concessions Ladder (Step 3): InputField (Number), $, Default concession for final counter.
* Counter-Offer (Default Increment): InputField (Number), $, Default $ increment for counter-offers.
* Initial Offer (Spread Multiplier): InputField (Number), (multiplier), Multiplier on spread (Ceiling - Floor) to determine initial offer.
* MAO Negotiation Bandwidth — Adjustment Range: InputField (Number), $, $ amount below final MAO for negotiation buffer.
* Min Spread (ARV Band...): DynamicBandEditor, Defines absolute min profit spread tiered by ARV.
* Negotiation Buffer (Percentage): InputField (Number), %, % buffer added to MAO for negotiation.
* Spread Minimum by ARV Band Policy: (Title for 'Min Spread' editor).
* Spread Presentation — Borderline Band Handling Policy: SelectField, [Show as Warning, Show as Negative, Show as OK], How to display spread below minimum.
* Uninsurable Adder (Flip Margin Percentage): InputField (Number), %, Additional profit margin % for 'Uninsurable' properties.
* Wholesale Fee Mode — Assignment vs Double-Close Selection: SelectField, [Default to Assignment, Default to Double-Close, Show Both, Use Max(Assign, DC)], Default disposition path.
* Wholetail Margin Policy — By ZIP Speed Band: ToggleSwitch, Use ZIP Speed targets (if ON) or single baseline (if OFF).
* ZIP Speed Band Posture Controls — Margin & Holding Adjusters: DynamicBandEditor, Auto-adjusts margin/holding costs based on ZIP speed.

#### 6. ⏱️ Timeline & Urgency Rules
* Auction Urgency — Margin Adder Policy: DynamicBandEditor, Adds margin buffer based on auction proximity.
* Auction Urgency — TRP Multiplier Policy: DynamicBandEditor, Applies multiplier to Title Risk Premium based on auction proximity.
* Clear-to-Close Buffer Days (Unresolved Title/Insurance): InputField (Number), days, Buffer days to DTM if title/insurance not clear.
* Days-to-Money (Max Days): InputField (Number), days, Max DTM allowed.
* Days-to-Money Roll-Forward Rule — Weekends/Holidays: SelectField, [Roll to Next Business Day, Roll to Previous, Do Not Adjust], Policy for non-business day closings.
* Days-to-Money Selection Method — Earliest Compliant Target Close: SelectField, [Use Default, Use Earliest Compliant, Use Manual Only], Logic for default DTM.
* Days-to-Money — Default Cash Close Days: InputField (Number), days, Standard days for cash closing.
* Default Days to Cash Close: InputField (Number), days, Default DTM for "Cash" path.
* Default Days to Wholesale Close: InputField (Number), days, Default DTM for "Wholesale" path.
* Disposition Recommendation (List/MLS, Min DOM_ZIP): InputField (Number), days, Min ZIP DOM to recommend "List/MLS."
* Disposition Recommendation (List/GTM): InputField (Number), days, Min DTM to recommend "List/MLS."
* Disposition Recommendation (List/MLS, Min MOI): InputField (Number), months, Min ZIP MOI to recommend "List/MLS."
* Disposition Recommendation (Urgent/Cash, Max Auction Days): InputField (Number), days, Max auction days for "Urgent/Cash."
* Disposition Recommendation (Urgent/Cash, Max DTM): InputField (Number), days, Max DTM for "Urgent/Cash."
* Disposition Recommendation Logic — DTM Thresholds: DynamicBandEditor, Defines DTM thresholds for "Urgency Band" label.
* EMD Timeline (Days) — Deadline Policy: InputField (Number), days, Default days to deposit EMD.
* Offer Validity Period — Days Policy: InputField (Number), days, Offer expiration.
* Right-of-First-Refusal / Board Approval Window — Days Input: InputField (Number), days, Buffer days for HOA/Condo approval.

#### 7. 🚦 Compliance & Risk Gates
* Bankruptcy Stay Gate (Legal Block): ToggleSwitch, Auto-flags/blocks deals in active bankruptcy.
* Condo SIRS/Milestone Flag (Soft Caution/Gate): ToggleSwitch, Flags condo to check for SIRS/Milestone compliance.
* EMD Policy — Earnest Money Structure (Fixed vs Percentage): SelectField, [Fixed Amount, Percentage of Offer], Default EMD structure.
* EMD Refundability Conditions (Gate): Textarea (List), Comma-separated list of refundable conditions.
* FHA 90-Day Resale Rule Gate: ToggleSwitch, Flags FHA 90-day seasoning issues.
* FIRPTA Withholding Gate (Seller Non-Resident Check): ToggleSwitch, Flags foreign sellers for FIRPTA.
* Flood 50% Rule Gate (Substantial Improvement): ToggleSwitch, Flags flood zone deals to check FEMA 50% Rule.
* Flood Zone Evidence Source — FEMA Map Selector: SelectField, [FEMA Map Service (API), Title Report, Insurance Quote], Provider for flood zone status.
* HOA Status Evidence — Required Docs: MultiSelectChecklist, [Estoppel Letter, Condo Questionnaire, Budget, Meeting Minutes], Min docs for HOA check.
* Insurance Bindability Evidence — 4-Point / Citizens Requirements: MultiSelectChecklist, [4-Point, Wind Mitigation, Bindable Quote (PDF), Roof Condition Form (RCF)], Min evidence for insurance.
* Insurance Carrier Eligibility Sources (Citizens): Textarea (List), List of approved carriers to check if 'Citizens' is only option.
* Project Review Evidence — Condo Questionnaire, Budget/Reserves, Insurance, Litigation Letter: MultiSelectChecklist, Full list for Condo Project Review.
* Proof of Insurance — Bindable Quote Requirement (4-Point/RCF): ToggleSwitch, Requires Bindable Quote for "ReadyForOffer."
* Repairs Structural/Class Gate — FEMA 50% Rule: ToggleSwitch, Auto-cross-references 'Structural' repairs with 'Flood Zone'.
* SCRA Verification Gate: ToggleSwitch, Flags foreclosure deals to verify SCRA status.
* Secondary Appraisal Requirement (FHA 91–180 Days) — Gate Setting: ToggleSwitch, Flags FHA secondary appraisal issues.
* State/Program Gate — FHA/VA Overlays (Timing/Inspections): ToggleSwitch, Enables FHA/VA specific requirement checks.
* VA Program Requirements — WDO/Water Test Evidence: ToggleSwitch, Flags VA buyer deals for WDO/Water tests.
* Warrantability Review Requirement — Condo Eligibility Screens: ToggleSwitch, Requires "Warrantability Review" for all condos.

#### 8. 📦 Specialized Disposition Modules
* Deed Documentary Stamp Rate Policy: InputField (Number), (multiplier), Doc stamp rate (e.g., 0.007).
* Deed Tax Allocation — Buyer/Seller Split Toggle: SelectField, [Seller Pays (A-B), You Pay (A-B), End-Buyer Pays (B-C), You Pay (B-C)], Default payer for deed tax.
* Disposition Track Enablement — Cash / Wholesale / Wholetail / List: MultiSelectChecklist, [Cash, Wholesale, Wholetail, List], Enabled disposition tracks.
* Double Close (Min Spread Threshold): InputField (Number), $, Min gross spread to recommend Double Close.
* Double-Close — A-to-B Closing Cost Categories (Configurable): Textarea (List), Your closing costs for A-to-B.
* Double-Close — B-to-C Closing Cost Categories (Configurable): Textarea (List), Your closing costs for B-to-C.
* Double-Close — Funding Points (Transactional Funding) Percentage: InputField (Number), %, Default points for transactional funder.
* Double-Close — Hold Days Calculation Method: SelectField, [Manual Input Only, Use Default], Hold days calculation.
* Double-Close — Per-Diem Carry Modeling (Taxes/Insurance/HOA/Utilities): ToggleSwitch, Includes per-diem carry costs for non-simultaneous holds.
* Title Premium Rate Source — FAC 69O-186.003 Selector: SelectField, [FL Promulgated, TX Promulgated, Custom], Rate table for title insurance.
* Transactional Funding Points — Double-Close Financing Input: InputField (Number), %, Default points (Duplicate).
* Wholetail Retail Make-Ready Input — Evidence/Defaults Toggle: ToggleSwitch, Use 'Retail Make-Ready' costs (if ON) or 'clean-out' cost (if OFF).

#### 9. ⚙️ Workflow & UI Logic
* A/B/C Confidence Grade Rubric: DynamicBandEditor, Defines meaning of confidence grades (A-F).
* Allow Advisor Override (Workflow State): ToggleSwitch, Allows 'Advisor' role to override workflow state.
* Analyst Review Trigger — Borderline Band Threshold: InputField (Number), $, Flag for 'Needs Review' if spread is within this $ of min.
* Assumptions Protocol — [INFO NEEDED] placeholders when evidence missing: ToggleSwitch, Use 'Default' values if real evidence is missing.
* Banker’s Rounding Mode (Numeric Safety): ToggleSwitch, Use Banker's Rounding for all financials.
* Buyer Costs Allocation — Dual Scenario Rendering When Unknown: ToggleSwitch, Show two scenarios if cost allocation is unknown.
* Buyer Costs — Line-Item Modeling Method: SelectField, [Use Line-Item Model, Use % of ARV, Use Fixed Amount], Method for modeling buyer costs.
* Cash Presentation Gate — Minimum Spread Over Payoff: InputField (Number), $, Min $ spread over payoff to present as "Cash Offer."
* Computation Currency — USD: SelectField, [USD, CAD], Default currency.
* Computation Locale — America/New_York Date Handling: SelectField, [America/New_York, ...], Timezone/locale for dates.
* Confidence Grade Inputs — Recency, Count, Variance, DOM: MultiSelectChecklist, [Comp Recency, Comp Count, Comp Variance, Market DOM], Inputs for auto-grader.
* Confidence Grade Threshold for ReadyForOffer: SelectField, [A, B, C, D, F], Min grade for "ReadyForOffer."
* Confidence Provenance — Notes/Audit Trail Array: ToggleSwitch, Requires note for manual confidence grade changes.
* Decision Default Path — Cash/Wholesale DTM Threshold (Days): InputField (Number), days, DTM to auto-select Cash vs Wholesale.
* Default Evidence Freshness Window — Comps: InputField (Number), days, How long Comps report is 'fresh'.
* Default Evidence Freshness Window — Insurance: InputField (Number), days, How long Insurance Quote is 'fresh'.
* Default Evidence Freshness Window — Market Indicators: InputField (Number), days, How long market data (DOM, MOI) is 'fresh'.
* Default Evidence Freshness Window — Title: InputField (Number), days, How long Title Quote is 'fresh'.
* Default Path Bias (Cash/Wholesale or List/MLS): SelectField, [Favor Cash/Wholesale, Favor List/MLS, No Bias], Default bias for recommendation engine.
* Default Underwriting Conservatism Level: SelectField, [Conservative, Base, Aggressive], Default global risk posture.
* Due Diligence Evidence — Allowed File Types: Textarea (List), Comma-separated list of allowed file extensions.
* Due Diligence Evidence — Required Attachments Checklist: MultiSelectChecklist, [Title Quote, Insurance Quote, Repair Bid, Photos, Payoff Letter], Master list of DD docs.
* Evidence Freshness — Payoff Letter Good-Thru Handling: SelectField, [Flag as Stale, Block Offer, Auto-Accrue Per-Diems], How to handle expired Payoff Letters.
* Evidence Logging — Reason/Provenance Required Toggle: ToggleSwitch, Requires 'reason' note when changing key evidence.
* Occupancy Status — Input Enumeration: Textarea (List), Options for 'Occupancy' dropdown.
* Offer Presentation Confidence Gates — Threshold Controls: ToggleSwitch, Enables 'Confidence Grade Threshold' to block offers.
* Offer Rounding (Buyer-Facing Ask): InputField (Number), $, Auto-round final buyer price to nearest $.
* Offer Rounding (Seller-Facing Offer): InputField (Number), $, Auto-round initial seller offer to nearest $.
* Policy Override Logging — AIV Cap Exception: ToggleSwitch, Requires log entry for AIV Cap Exception.
* Posture Selection Regression Rule (Ceilings Must Not Increase When Moving to Conservative): ToggleSwitch, Enforces 'Conservative' <= 'Base' ceiling.
* Provider Selector — Sunbiz/UCC Registry: SelectField, [Sunbiz.org (API), County Registry, Manual Only], Provider for Sunbiz/UCC searches.
* Quality Assurance Method — IQR Outlier Control: ToggleSwitch, Use Interquartile Range (IQR) to flag comp outliers.
* Qualitative Final Review — Sanity Check Questionnaire (Street Context, Catalysts, Risks): Textarea (List), Questions for "Final Review."
* Repairs Baseline — Repair Class Enumeration: Textarea (List), List of Repair Classes (Light, Medium, etc.).
* Scenario Deltas (Max Days): InputField (Number), days, Max days for 'Scenario Modeler'.
* Scenario Deltas (Max Percentage): InputField (Number), %, Max % for 'Scenario Modeler'.
* Sensitivity Presets — Bounded What-If Controls: ToggleSwitch, Enables 'Scenario Deltas' to limit Scenario Modeler.
* Title/Insurance Clear-to-Close Buffer Policy — Days & Reason Logging: ToggleSwitch, Enables 'Clear-to-Close Buffer Days' and requires 'Reason'.
* Transparency Control — “Show Work” Math Appendix Toggle: ToggleSwitch, Enables "Show Work" button in UI.
* Underwriting Conservatism Preset — Global Risk Posture: SelectField, [Conservative, Base, Aggressive], Default global risk posture.
* Underwriting Evidence Freshness Enforcement Policy: ToggleSwitch, Stale evidence blocks "ReadyForOffer."
* Underwriting Workflow States — NeedsInfo / NeedsReview / ReadyForOffer Transition Rules: DynamicBandEditor, Automatic transition rules for workflow.
* VP Approval Role — AIV Cap Override Authorization: SelectField, [Analyst, Underwriter, Manager, VP, Admin], Role to approve AIV Cap override.
* Workflow State (Min Confidence Score): SelectField, [A, B, C, D, F], Min confidence score for "ReadyForOffer."

[END SANDBOX BLUEPRINT]
`;

interface BusinessLogicSandboxProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: SandboxSettings, presetName?: string) => void;
  initialSettings: SandboxSettings;
  presets: SandboxPreset[];
  onLoadPreset: (settings: SandboxSettings) => void;
  onDeletePreset: (id: number) => void;
}

const componentMap: Record<string, React.ComponentType<any>> = {
  InputField,
  SelectField,
  ToggleSwitch,
  MultiSelectChecklist,
  DynamicBandEditor,
  Textarea: (props: any) => {
    const { label, description, ...rest } = props;
    return (
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
        {description && <p className="text-xs text-text-secondary/70 mb-2">{description}</p>}
        <textarea {...rest} className="dark-input w-full h-24 font-mono text-xs" />
      </div>
    );
  },
};

const StrategistChat = ({ settings }: { settings: SandboxSettings }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: 'model',
        content: `Welcome to the DealEngine Strategist. I am an AI assistant with deep knowledge of all 9 sections of the Business Logic Sandbox. How can I help you configure your underwriting policy today?`,
      },
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const history = messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') }],
      }));

      const chat = ai.chats.create({
        model: 'gemini-2.5-pro',
        history: history,
        config: {
          systemInstruction: DEALENGINE_STRATEGIST_PERSONA_CHAT,
        },
      });

      const promptWithContext = `My question is: "${input}"\n\nHere are the current sandbox settings for your analysis:\n\`\`\`json\n${JSON.stringify(settings, null, 2)}\n\`\`\``;

      const response = await chat.sendMessage({ message: promptWithContext });
      let aiContent = response.text;

      aiContent = aiContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .split('\n')
        .map((line: string) => (line.trim().startsWith('* ') ? `<li>${line.substring(2)}</li>` : line))
        .join('\n')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/<\/ul>\n<ul>/g, '');

      const aiMessage = { role: 'model' as const, content: aiContent };
      setMessages([...currentMessages, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage = {
        role: 'model' as const,
        content:
          '<p class="text-accent-orange">Sorry, I encountered an error. Please try again.</p>',
      };
      setMessages([...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-main">
      <div className="p-4 flex-shrink-0">
        <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
          <Icon d={Icons.playbook} size={18} className="text-accent-blue" />
          DealEngine Strategist
        </h3>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-accent-blue text-white' : 'info-card'}`}
            >
              <div
                className="prose prose-invert max-w-none text-text-secondary/90"
                dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }}
              />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm info-card animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 flex-shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
              const target = e.currentTarget;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
            placeholder="Ask about a setting or policy..."
            className="dark-input w-full pr-12 resize-none overflow-y-hidden"
            rows={2}
            style={{ maxHeight: '8rem' }}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 h-8 w-8 p-0 flex items-center justify-center"
            size="sm"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

const BusinessLogicSandbox: React.FC<BusinessLogicSandboxProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  presets,
  onLoadPreset,
  onDeletePreset,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [settings, setSettings] = useState<SandboxSettings>(initialSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPresetActions, setShowPresetActions] = useState<number | null>(null);

  const filteredPages = useMemo(() => {
    if (!searchQuery) return SANDBOX_PAGES_CONFIG;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return SANDBOX_PAGES_CONFIG.map((page) => {
      const filteredSettings = page.settings.filter(
        (setting) =>
          setting.label.toLowerCase().includes(lowerCaseQuery) ||
          setting.description.toLowerCase().includes(lowerCaseQuery)
      );
      return { ...page, settings: filteredSettings };
    }).filter(
      (page) =>
        page.title.toLowerCase().includes(lowerCaseQuery) ||
        page.description.toLowerCase().includes(lowerCaseQuery) ||
        page.settings.length > 0
    );
  }, [searchQuery]);

  const pageConfig = useMemo(
    () => filteredPages[currentPage] || filteredPages[0],
    [currentPage, filteredPages]
  );

  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  React.useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => onSave(settings);

  const handleSaveAsPreset = () => {
    const name = prompt("Enter a name for this preset (e.g., 'Q4 2025 Aggressive Policy'):");
    if (name) {
      onSave(settings, name);
    }
  };

  const handleLoadPreset = (preset: SandboxPreset) => {
    if (
      window.confirm(
        `Are you sure you want to load the "${preset.name}" preset? Any unsaved changes will be lost.`
      )
    ) {
      onLoadPreset(preset.settings);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sandbox-title"
    >
      <div className="bg-bg-main rounded-2xl w-full h-full max-w-screen-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Icon d={Icons.lightbulb} size={24} className="text-accent-orange" />
            <div>
              <h2 id="sandbox-title" className="text-lg font-bold text-text-primary">
                Business Logic Sandbox
              </h2>
              <p className="text-sm text-text-secondary">DealEngine Configuration Orchestrator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveAsPreset} variant="ghost" size="sm">
              Save as Preset...
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </Button>
          </div>
        </div>

        <div className="flex flex-grow overflow-hidden">
          {/* Left Side (Content) */}
          <div className="flex-grow flex flex-col overflow-hidden">
            {/* Main content area with sidebar */}
            <div className="flex flex-grow overflow-hidden">
              {/* Sidebar */}
              <aside className="w-64 p-4 flex flex-col flex-shrink-0">
                <InputField
                  label=""
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-4"
                />
                <nav className="space-y-1 overflow-y-auto flex-grow" aria-label="Sandbox sections">
                  {filteredPages.map((page, index) => (
                    <button
                      key={page.title}
                      onClick={() => setCurrentPage(index)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${pageConfig?.title === page.title ? 'bg-accent-blue text-white' : 'text-text-secondary hover:bg-accent-blue/10 hover:text-text-primary'}`}
                      aria-current={pageConfig?.title === page.title ? 'page' : undefined}
                    >
                      {page.title}
                    </button>
                  ))}
                </nav>
                <div className="mt-4 pt-4">
                  <h4 className="label-xs uppercase mb-2">Presets</h4>
                  <div className="space-y-1">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        className="group relative flex items-center justify-between text-left px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-accent-blue/10 hover:text-text-primary cursor-pointer"
                        onClick={() => handleLoadPreset(p)}
                        onMouseEnter={() => setShowPresetActions(p.id)}
                        onMouseLeave={() => setShowPresetActions(null)}
                      >
                        <span>{p.name}</span>
                        {showPresetActions === p.id && (
                          <Button
                            size="sm"
                            variant="danger"
                            className="h-5 px-1.5 absolute right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePreset(p.id);
                            }}
                            aria-label={`Delete preset ${p.name}`}
                          >
                            &times;
                          </Button>
                        )}
                      </div>
                    ))}
                    {presets.length === 0 && (
                      <p className="text-xs text-text-secondary/60 px-3">No presets saved.</p>
                    )}
                  </div>
                </div>
              </aside>

              {/* Main Content */}
              <main className="flex-grow p-6 overflow-y-auto" tabIndex={0}>
                {pageConfig ? (
                  <>
                    <h3 className="text-xl font-bold text-text-primary mb-1">{pageConfig.title}</h3>
                    <p className="text-sm text-text-secondary mb-6">{pageConfig.description}</p>

                    <div className="space-y-8">
                      {pageConfig.settings.map((setting) => {
                        const Component = componentMap[setting.component];
                        if (!Component)
                          return (
                            <div key={setting.key}>Unknown component: {setting.component}</div>
                          );

                        const value = settings[setting.key];
                        const commonProps = {
                          key: setting.key,
                          label: setting.label,
                          description: setting.description,
                          ...setting.props,
                        };
                        const options = setting.props?.options as any;

                        const renderComponent = () => {
                          if (setting.component === 'ToggleSwitch') {
                            return (
                              <Component
                                {...commonProps}
                                checked={!!value}
                                onChange={() => handleSettingChange(setting.key, !value)}
                              />
                            );
                          }
                          if (setting.component === 'MultiSelectChecklist') {
                            return (
                              <Component
                                {...commonProps}
                                selected={value || []}
                                onChange={(val: string[]) => handleSettingChange(setting.key, val)}
                              />
                            );
                          }
                          if (setting.component === 'DynamicBandEditor') {
                            return (
                              <Component
                                {...commonProps}
                                data={value || []}
                                onChange={(val: any[]) => handleSettingChange(setting.key, val)}
                              />
                            );
                          }
                          if (setting.component === 'SelectField') {
                            return (
                              <Component
                                {...commonProps}
                                value={value ?? ''}
                                onChange={(e: any) =>
                                  handleSettingChange(setting.key, e.target.value)
                                }
                              >
                                {options.map((opt: string) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </Component>
                            );
                          }
                          return (
                            <Component
                              {...commonProps}
                              value={value ?? ''}
                              onChange={(e: any) =>
                                handleSettingChange(setting.key, e.target ? e.target.value : e)
                              }
                            />
                          );
                        };

                        return <div key={setting.key}>{renderComponent()}</div>;
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-text-secondary">No settings match your search.</p>
                  </div>
                )}
              </main>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between p-4 flex-shrink-0">
              <div className="text-sm text-text-secondary">
                Page {currentPage + 1} of {filteredPages.length || 1}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="neutral"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="neutral"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= (filteredPages.length || 1) - 1}
                >
                  Next
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Save & Close Sandbox
                </Button>
              </div>
            </div>
          </div>
          {/* Right Side (Chat) */}
          <aside
            className="w-[450px] flex-shrink-0 flex flex-col bg-black/20"
            aria-label="AI Strategist Chat"
          >
            <StrategistChat settings={settings} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BusinessLogicSandbox;



