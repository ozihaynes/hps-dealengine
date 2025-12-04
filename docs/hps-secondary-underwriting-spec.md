HPS Deal Engine Underwriting Manual: Technical Specification
(Conflict-corrected per OFFICIAL HPS D.E. Underwriting Manual(1). This version replaces any prior language that conflicts with the Source of Truth.)

Executive Summary
This module computes cash-purchase underwriting for distressed or speed-driven listings. It establishes a Buyer Ceiling, derives Maximum Allowable Offers (MAOs) for wholesale, flip, and wholetail paths, identifies potential seller shortfalls, and recommends a disposition path. All policies below are aligned to the OFFICIAL manual. Key fixes applied: DOM-based carry months with a hard cap, AIV safety cap and exception rules, buyer cost allocation discipline, target close buffers for insurability or title readiness, and cash presentation gates including a Borderline band.

Core Functions
Top-level orchestrator. Consumes deal and policy data and deterministically computes ceilings, MAOs, payoff, spread, bands, confidence, workflow state, and recommendation.
Disposition recommendation.
Cash or Wholesale when days-to-money (DTM) ≤ 21 days or auction ≤ 14 days.
List or MLS when DTM ≥ 60 days with insurability and favorable ZIP DOM or MOI.
Wholetail when cosmetic and insurable, timing around FHA or VA rules, with documented overrides.
Debt projection. Projects payoff at closing by accruing per-diem from the payoff good-thru date to target close. Defaults to Actual/365 only if the payoff basis is missing. Sums senior principal, per-diem accrual, juniors, HOA arrears, and municipal fines. The earliest compliant target close determines the accrual period.
Risk pricing. Uses market speed heuristics (DOM, MOI, price-to-list), access or occupancy and insurability signals, and hard gates (bankruptcy stay, unbindable insurance per current Citizens 4-Point or Roof forms, PACE or UCC or solar unresolved, condo SIRS or Milestone flags, FHA flip timing, manufactured home certifications). Apply evidence freshness requirements.
Offer capping. Caps all offers to an As-Is Value safety margin. Default cap is 0.97 × AIV. Up to 0.99 × AIV is permitted only when all of the following are true and VP approval is logged: bindable insurance with current 4-Point or RCF pass, clear title quote on file, fast ZIP liquidity. MAOs are clamped to both Buyer Ceiling and the AIV cap.
Workflow gating. Manages NeedsInfo → NeedsReview → ReadyForOffer using the A or B or C confidence rubric, minimum spread by price band, required fields, and legal or operational gates. Any override requires a reason and attachments.
Sensitivity analysis. Bounded what-if engine for repairs, timelines, ARV or AIV, seller credits, and carry. Re-runs the orchestrator and diffs outputs.

Required Inputs and Data Fields
(abbreviated list; full schema retained)
Field
Type
Units
Range or Guardrails
Required
Purpose
deal.market.arv
number
USD
25k to 5M. Warn if ARV < AIV without distress; warn if ARV > 2.5 × AIV; 3+ ARV comps ≤ 90 days with parity
Yes
After-repair anchor
deal.market.as_is_value
number
USD
25k to 5M. Soft-warn if AIV > ARV without justification; 3+ as-is comps ≤ 90 days
Yes
AIV cap basis
deal.market.dom_zip
number
days
0 to 365. Soft-warn < 5 or > 240
Yes
Speed factor
deal.market.moi_zip
number
months
0 to 60. Soft-warn < 1 or > 6
Yes
Supply factor
deal.costs.repairs_base
number
USD
0 to 750k. Soft-warn > 40% of ARV or structural flags
Yes
Repair budget
deal.costs.monthly.taxes
number
USD/yr
non-negative
Yes
Carry input
deal.costs.monthly.insurance
number
USD/yr
non-negative
Yes
Carry input
deal.costs.monthly.hoa
number
USD/yr
non-negative
Yes
Carry input
deal.costs.monthly.utilities
number
USD/mo
non-negative
Yes
Carry input
deal.debt.senior_principal
number
USD
0 to 10M. Soft-warn > 95% of ARV
Yes
Payoff base
deal.debt.senior_per_diem
number
USD/day
0 to 5k/day. Alert if implied APR > 25%
Yes
Payoff accrual
deal.debt.good_thru_date
date
ISO
valid date
Yes
Accrual anchor
deal.timeline.auction_date
date
ISO
valid date
Yes if foreclosure
DTM driver
deal.status.insurance_bindable
bool
—
must be supported by current 4-Point or RCF
Yes
Insurability gate
title_quote_pdf
file ref
—
itemized per FAC 69O-186.003 plus fees
Yes to publish
Close cost evidence

Calculations and Formulas
Notation. All dates evaluated in America/New_York. All currency USD.

1. DaysToMoney
   Candidates: a) auction_date if ≥ today. b) manual_target = today + policy.manual_days_to_money. c) default_cash_close = today + policy.default_cash_close_days.
   Pick the earliest candidate that is ≥ today. If all are < today, set DTM = 0 and urgency = critical.
   Bindability or title buffer: if insurance bindability is unresolved or title is not clear to close, add policy.clear_to_close_buffer_days to the picked target, roll forward for weekends or holidays, then recompute DTM = max(0, target_close − today). Log the buffer reason and dates.
2. Carry Costs
   Carry_Months = min((DOM_zip + 35) / 30, 5.0).
   Hold_Monthly = (Taxes + Insurance + HOA) / 12 + Utilities.
   Carry_Total = Carry_Months × Hold_Monthly.
   Notes: This replaces any DTM-based month logic, including ceil(DTM/30).
3. Buyer Target Margin
   Flip baseline 18% of ARV.

MOI-tier guidance for local conditions:

MOI ≤ 2: 14% to 16%.
MOI 2 to 4: 16% to 18%.
MOI > 4: 18% to 20%.
Wholetail 10% to 14%.

BRRRR governed by DSCR ≥ 1.25x and ZIP cap target.

4. Buyer Costs and Allocation
   Buyer_Costs means buyer-allocated line items per the executed contract or prevailing custom.
   Do not include deed documentary stamps or owner’s title premium by default. Seller pays these by local custom unless the contract clearly allocates otherwise.
   When allocation is unknown or under negotiation, render both allocation scenarios side by side and label any assumption as [INFO NEEDED].
   Always itemize statutory and quoted components: doc stamps per statute, promulgated title premiums per FAC 69O-186.003, recording, lien searches, endorsements, closing fee, HOA estoppel, municipal lien, and similar.
5. Resale Costs
   Compute path-dependent selling or closing components as itemized line items using title quotes and statutory schedules.
   Showing a single composite percent is presentation only. Calculation must be line-item based.
6. Buyer Ceiling
   Buyer_Ceiling = ARV × (1 − Buyer_Target_Margin) − Repairs − Buyer_Costs − Carry_Total.
7. AIV Safety Cap and Final MAO Clamp
   cap_pct = 0.97 by default.
   cap_pct = 0.99 only when insurance is bindable with current forms, title is clear with itemized quote, and ZIP liquidity indicates sub-2-month resale, and VP approval is logged.
   AIV_cap = cap_pct × AIV.
   Final clamp: MAO_final = min(MAO_presentation, AIV_cap, Buyer_Ceiling).
8. Projected Payoff
   Payoff_projected = senior_principal + per_diem × days(good_thru_date → target_close) + juniors + HOA_arrears + municipal_fines. Default day-count Actual/365 if the payoff letter basis is absent, and reconcile when the letter arrives.
9. Shortfall
   Shortfall = Payoff_projected − chosen_MAO (per default path bias or the recommended disposition).
10. Recommendation and Presentation Gates
    Cash eligibility gate: present “Cash” only if MAO_final − Payoff_projected ≥ 10,000.

Otherwise, present “Cash (Shortfall)” and show the deficit table with alternative paths.
Borderline band: if |Net_List − Net_Cash| ≤ 5,000 or Confidence = C, label “Close-Call” and trigger Analyst Review instead of showing a list-favored banner.

Default path bias: Cash or Wholesale when DTM ≤ 21 days or auction ≤ 14 days. List when DTM ≥ 60 days and insurable with favorable ZIP metrics. Wholetail when cosmetic, insurable, and program timing constraints are binding.

11. Workflow State
    NeedsInfo if any required field is missing.
    NeedsReview if spread is below minimum band or Confidence < B.
    ReadyForOffer only when required evidence is present, minimum spread met, confidence A or B, and no hard legal gates.

Output Bundle
The orchestrator returns:
{
"buyer_ceiling": number,
"mao": {
"wholesale": number,
"flip": number,
"wholetail": number,
"as_is_cap": number
},
"respect_floor": number,
"payoff_projected": number,
"shortfall": number,
"recommendation": "Cash/Wholesale" | "List/MLS" | "Hybrid/Wholetail",
"workflow_state": "NeedsInfo" | "NeedsReview" | "ReadyForOffer",
"confidence": { "score": "A" | "B" | "C", "notes": string[] },
"bands": {
"seller_offer_band": [number, number],
"buyer_ask_band": [number, number],
"sweet_spot": number | null,
"gap_flag": boolean
}
}

Decision Logic and Business Rules
Respect Floor and bands. Continue to compute Seller Offer Band and Buyer Ask Band and identify the Sweet Spot overlap. If no overlap exists, mark gap_flag and propose timing or credits to create overlap.
Speed bands. Use ZIP DOM and MOI to set negotiation posture: open closer to Buyer Ceiling and tighten credits in fast bands; widen spread and allow longer DTM in slow bands.
Hard gates. Bankruptcy stay, unbindable insurance, title show-stoppers, PACE unresolved for financed exits, condo SIRS or Milestone problems without a cash plan, FHA flip timing blocks for retail, manufactured home documentation gaps, SCRA holds.

Parameters and Defaults
Buyer target margins: Flip 18% baseline with MOI-tier adjustments as listed. Wholetail 10% to 14%. BRRRR requires DSCR ≥ 1.25x and ZIP cap target.

AIV cap: 0.97 default. Up to 0.99 only with bindable insurance, clear title, fast ZIP liquidity, and VP approval logged.

Minimum wholesale spreads by ARV band:

≤ 200k ARV: 15k
200 to 400k: 20k
400 to 650k: 25k
650k: at least 4% of ARV, and not less than 30k

Repairs contingency: Light 10%, Medium 15%, Heavy 20% to 25%. Add 5 points if bids are missing.

Evidence freshness: primary windows ≤ 90 days. Block ReadyForOffer when citations or quotes are stale unless an authorized override is documented.

External Data Needs
MLS comps for AIV and ARV with photo parity and similarity.
ZIP metrics for DOM, MOI, price-to-list, investor discount distribution for Respect Floor.
Title quote PDF with promulgated premium and line items.
Two bindable insurance quotes with current 4-Point or RCF.
Payoff letter with per-diem and basis.
HOA or COA estoppel and municipal lien searches where applicable.

Validation and Error Handling
Block publishing when carry inputs are missing. Use [INFO NEEDED] tags but do not push placeholders into final answers.
Block ReadyForOffer when any required evidence is stale beyond policy windows or when hard gates are active.
Machine-readable reasons arrays on each block with date stamps and file references.

User Controls
Sensitivity presets: +10% repairs, −2% ARV, +15 days, plus a custom delta set within bounded limits.
Allocation toggles for buyer vs seller paid costs. Default to seller-pays deed stamps and owner’s title. Always show both scenarios when not fixed by contract.

Assumptions and Placeholders
Any temporary composite close percent may be shown for readability, but the calculation must be line-item based. Label any composite shortcut as [INFO NEEDED] until the title quote PDF is attached.
If payoff basis is missing, use Actual/365 and flag for reconciliation.

Quick Implementation Checklist
Replace any carry code that uses ceil(DTM/30) with the DOM formula and 5.0 month cap.
Enforce MAO_final = min(MAO_presentation, cap_pct × AIV, Buyer_Ceiling) with cap_pct rules and logged approvals for 0.99.
Make Buyer_Costs allocation-aware. Default seller pays deed stamps and owner’s title. Render dual scenarios if unknown. Use statutory and quoted line items.
Add clear-to-close buffer days when bindability or title is unresolved, roll forward for weekends or holidays, and recompute DTM. Log the reason.
Add cash presentation gates: 10k minimum spread over payoff for “Cash”, Borderline at ± 5k or Confidence C triggers Analyst Review.

Placeholder ID Map
(selected high-value entries only; all others unchanged)
compute_underwriting: Deterministic orchestrator returning ceilings, MAOs, payoff, bands, confidence, state, and recommendation.
days_to_money_selection: Earliest compliant target close with optional clear-to-close buffer and roll-forward.
aiv_safety_policy: 0.97 default, 0.99 only with insurable + title clear + fast ZIP and VP approval, with evidence dates shown.
workflow_state_gates: Required fields list, min spread by ARV band, confidence rubric, hard gates. Include Borderline handling and cash shortfall labeling in presentation flow.
scenario_deltas: Bounded deltas that re-run compute_underwriting and diff outputs.

Redaction Log
All proprietary logic remains encoded as methods, policies, ranges, constants, and sources present in the Source of Truth. No external invention added. Any gaps are labeled [INFO NEEDED] pending evidence.

Here’s the source-of-truth spec for the Double Close model as implemented in your current code. I pulled this straight from the DoubleClose module and the surrounding wiring in your app, and I’m only documenting what actually exists (rates, switches, formulas, flags, defaults, and how the UI fields feed the math).

Double Close (HPS DealEngine) — Final Implementation
A) Inputs (from the “Double Close” section of the Underwriting tab)
Transaction basics
county (string) → used for deed stamp rate (Miami-Dade exception)

property_type (enum; not priced directly)

type (enum: Same-day, etc.; not priced directly)

days_held (number ≥ 0) → used for carry

same_day_order (enum; display only)

Prices
pab (number ≥ 0) → A→B contract price

pbc (number ≥ 0) → B→C contract price

Title/Settlement buckets (per side)
title_ab, title_bc (numbers ≥ 0) → Title/settlement bucket excluding the HOA/other misc (see defaults)

other_ab, other_bc (numbers ≥ 0) → “Other fees” bucket (incl. estoppel, transfer, rush if applicable)

Owner’s title policy payer (controls inclusion of owner policy in that side’s “title” bucket when autofilling)
owners_title_payer_ab (string; “You” means include owner policy in AB title cost)

owners_title_payer_bc

assumed_owner_payer_ab, assumed_owner_payer_bc (fallbacks for autofill copy)

Association/HOA toggles (affect “other\_\*”)
association_present (string: “No” or other) → if not “No”, HOA fees default in

association_type (string; labeling only)

estoppel_fee (number ≥ 0) (default if HOA present: 350)

transfer_fees (number ≥ 0) (default if HOA present: 150)

rush_estoppel (“Yes”/“No”) (adds 100 if “Yes”)

board_approval (“Yes”/“No”) (flag only; no cost)

Funding and TF
using_tf (boolean)

tf_principal (number ≥ 0) (defaults to pab when autofilling)

tf_points_rate (0..1) (defaults 0.02 when autofilling)

tf_extra_fees (number ≥ 0)

tf_note_executed_fl (“Yes”/“No”/“Unsure”) → controls doc stamps on note

tf_secured (“Yes”/“No”/“Unsure”) → controls intangible tax

Carry
carry_basis (“day” | “month”; default “day”)

carry_amount (number ≥ 0) → per-day if basis=day; per-month if basis=month

Reference ARV for fee-target check
arv_for_fee_check (number ≥ 0; falls back to deal ARV if 0)

Autofill control
use_promulgated_estimates (“Yes”/“No”)

If “Yes” ⇒ allow overwrite even when fields are already set

If “No” ⇒ only fill blanks/zeros

Buyer funds for seasoning flag
buyer_funds (string; e.g., “Cash”, “FHA”, “VA”)

B) Constants & Jurisdictional Rates
Florida deed stamps on deed (AB & BC sides)
Miami-Dade: 0.006 (0.60%)

All other FL counties: 0.007 (0.70%)

Transactional funding taxes (only when using_tf):
Doc stamps on note (only if tf_note_executed_fl = “Yes”): 0.0035 (0.35%) × tf_principal

Intangible tax (only if tf_secured = “Yes”): 0.002 (0.20%) × tf_principal

Owner’s Title Policy premium (FAC 69O-186.003) — used by autofill, included only on the side where the owner’s policy payer equals “You”:
≤ 100,000: price/1000 \* 5.75

100,001 – 1,000,000: 100*5.75 + (price-100,000)/1000 * 5.00

1,000,001 – 5,000,000: previous tier + (price-1,000,000)/1000 \* 2.50

5,000,001 – 10,000,000: previous tiers + (price-5,000,000)/1000 \* 2.25

> 10,000,000: previous tiers + (price-10,000,000)/1000 \* 2.00

Default per-side fees (autofill helpers)
Settlement fee (each side): 750

Base “other” fees (each side): 350

HOA add-ons (if association_present ≠ “No”):

estoppel_fee default: 350

transfer_fees default: 150

rush_estoppel “Yes”: +100

C) Autofill Behavior (idempotent)
When invoked, autofill(dc, deal, calc):
Copies county from property if blank.

Sets anchor prices if blank/zero:

pab ← rounded(calc.instantCashOffer)

pbc ← rounded(calc.buyerCeiling)
(rounded to the nearest $100)

Sets default carry if blank:

If carry_basis blank ⇒ "day"

carry_amount ← (monthlyHold / 30) where monthlyHold comes from the main engine

If using_tf:

tf_principal ← pab (if blank)

tf_points_rate ← 0.02 (if blank or overwrite allowed)

tf_note_executed_fl, tf_secured ← "Unsure" if blank

Per-side title cost suggestion (then split into buckets):

autoTitleCostForSide = settlement(750) + misc(other fees) + owner policy premium (only if payer === "You")

Bucketing:

title_ab / title_bc exclude misc (autoTitleCost - misc)

other_ab / other_bc equal misc

Overwrite rule: if use_promulgated_estimates === "Yes", autofill can overwrite non-zero values; otherwise it only fills blanks/zeros.

D) Core Calculations
Let:
Deed stamp rate
deedRate = (county includes "miami-dade" ? 0.006 : 0.007)

Carry
Carry_Daily = (carry_basis === "month" ? carry_amount/30 : carry_amount)
Carry_Total = Carry_Daily \* max(0, days_held)

Deed stamps on deeds
Deed_Stamps_AB = Pab _ deedRate
Deed_Stamps_BC = Pbc _ deedRate

Transactional funding charges (only if using*tf)
TF_Points*$ = tf_principal _ clamp(tf_points_rate, 0, 1)
DocStamps_Note = asYes(tf_note_executed_fl) ? tf_principal _ 0.0035 : 0
Intangible_Tax = asYes(tf_secured) ? tf_principal \* 0.002 : 0

Extra Closing Load (all explicit closing/friction costs excluding carry)

Extra_Closing_Load =
Deed_Stamps_AB + Deed_Stamps_BC

- Title_AB + Title_BC
- Other_AB + Other_BC
- TF*Points*$ + DocStamps_Note + Intangible_Tax
- TF_Extra_Fees

Spread math

Gross_Spread = Pbc - Pab
Net_Spread_Before_Carry = Gross_Spread - Extra_Closing_Load
Net_Spread_After_Carry = Net_Spread_Before_Carry - Carry_Total

Fee-target check (advisory only)

ARV_for_check = dc.arv_for_fee_check || deal.deal.market.arv
Fee_Target_Threshold = 0.03 \* max(0, ARV_for_check) // 3% of ARV
Fee_Target_Check = (Net_Spread_After_Carry >= Fee_Target_Threshold) ? "YES" : "NO"

Seasoning flag (FHA/VA)

Seasoning_Flag =
(buyer_funds in {FHA, VA} && days_held < 90)
? "HIGH — season ≥90 days or change buyer"
: "OK"

E) Outputs (returned by computeDoubleClose)
Deed_Stamps_AB, Deed_Stamps_BC

Title_AB, Title_BC (title/settlement bucket without HOA misc)

Other_AB, Other_BC (HOA/misc bucket)

TF*Points*$, DocStamps_Note, Intangible_Tax

Extra_Closing_Load

Gross_Spread, Net_Spread_Before_Carry, Net_Spread_After_Carry

Carry_Daily, Carry_Total

Fee_Target_Threshold, Fee_Target_Check

Seasoning_Flag

notes[] (county/rate and reasons why certain TF taxes did or didn’t apply; HOA details; board approval)

In your UI, the “Wholesale Fee w/ Double Close” card (per your last change) displays:
wholesaleFeeWithDC = (BuyerCeiling − RespectFloor) − (Extra_Closing_Load + Carry_Total)
Note this is different from Net_Spread_After_Carry (which uses Pbc − Pab).

F) Deterministic Questions & Their “Weights” (how they move the math)
Below, “weight” means the direction and magnitude relationship to cash outcomes.
Where is the property? (county)

Weight: Linear via deedRate on both AB & BC deeds.

Miami-Dade saves 0.1% on both deeds vs other counties.

What are pab and pbc?

Weight: 1:1 on Gross_Spread (+1 to pbc adds +$1; +1 to pab subtracts −$1).

Also scales deed stamps linearly at the deedRate.

Is there an HOA and which extras apply? (association_present, estoppel_fee, transfer_fees, rush_estoppel)

Weight: Additive in Other_AB/BC. Defaults: +350 estoppel, +150 transfer, +100 rush.

Who pays for the Owner’s Policy on each side? (owners*title_payer*\*)

Weight: If payer is “You”, the FAC premium is added into that side’s title bucket (via autofill).

Premium scales by price tier (piecewise linear).

Are you using transactional funding? (using*tf, tf*\*)

Weight:

Points: linear tf_principal \* tf_points_rate

Doc stamps on note: only if tf_note_executed_fl = “Yes” (0.35% of principal)

Intangible tax: only if tf_secured = “Yes” (0.20% of principal)

tf_extra_fees: additive

How long are you holding? (days_held, carry_basis, carry_amount)

Weight: linear: Carry_Total = perDay _ days_held (or perMonth/30 _ days_held)

ARV reference for target check (arv_for_fee_check or deal ARV)

Weight: 3% of that ARV sets advisory threshold; doesn’t change profit, only the pass/fail message.

Buyer funds (FHA/VA) with short hold (days_held < 90)

Weight: flag only (seasoning risk); no cost impact.

Promulgated estimates toggle (use_promulgated_estimates)

Weight: operational — allows overwriting entered numbers with the model’s defaults (doesn’t change formula, but changes inputs).

G) Bucketing & Display Conventions
Title vs Other

“Title” buckets (title_ab, title_bc) = settlement + owner’s policy (if payer = “You”), excluding HOA/misc.

“Other” buckets (other_ab, other_bc) = HOA/misc (base 350 + estoppel + transfer + rush).

Deed stamps are computed separately for AB and BC.

Carry is separated from Extra Closing Load and subtracted last to produce Net_Spread_After_Carry.

H) Practical Sensitivities (quick levers)
+1 day held ⇒ − Carry_Daily impact on profit.

+1 point on TF_points_rate (i.e., +0.01) ⇒ − (tf_principal × 1%) on profit.

Switching county to Miami-Dade ⇒ +0.1% of (Pab + Pbc) improvement (via lower deed rate).

Changing owner’s policy payer to “You” on a side ⇒ reduces profit by the FAC premium for that side’s price.

Turning on tf_note_executed_fl or tf_secured ⇒ adds 0.35% and/or 0.20% of principal respectively.

I) Relationship to “Wholesale Fee” Cards
Wholesale Fee (card):
BuyerCeiling − RespectFloor

Double Close costs (for card math):
DC_Costs = Extra_Closing_Load + Carry_Total

Wholesale Fee w/ Double Close (card):
(BuyerCeiling − RespectFloor) − DC_Costs

DC Model Profit (independent of that card):
Net_Spread_After_Carry = (Pbc − Pab) − Extra_Closing_Load − Carry_Total

These are distinct pathways on purpose. The card version uses your global underwriting window (Ceiling vs Floor) minus DC friction; the DC engine’s profit is purely the AB/BC spread after DC friction.

J) Validation & Clamping (as implemented)
All monetary inputs coerced to numbers and floored at 0.

tf_points_rate clamped to [0,1].

days_held floored at 0.

Autofill rounds price anchors (pab, pbc) to the nearest $100.

If you want this as a one-pager you can hand to ops, I can format this into a printable PDF or drop it into your codebase as a DOUBLE_CLOSE_SPEC.md.
