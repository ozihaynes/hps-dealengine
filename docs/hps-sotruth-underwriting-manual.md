Q1 — METHOD_NEEDED: compute_underwriting (Top-level orchestrator)
A1 — Summary: Single entrypoint that consumes a fully shaped deal + policy, computes ceilings/floors/MAOs, payoffs, spreads, confidence, and returns a decision bundle.
Inputs → Outputs:
Inputs (required): deal.market{aiv, arv, dom_zip, moi_zip, price_to_list_pct}, deal.costs{repairs_base, contingency_pct, monthly{taxes, insurance, hoa, utilities}, sell_close_pct}, deal.fees{assignment_fee_target?, list_commission_pct?}, deal.debt{senior_principal, senior_per_diem, good_thru_date, juniors[], hoa_arrears?, muni_fines?}, deal.timeline{auction_date?, days_to_ready_list, days_to_sale_manual?}, deal.status{occupancy, insurability, bankruptcy_chapter?, probate_flag?}, policy{see Q5/Q6–Q10}.

Outputs:

{
"buyer_ceiling": number,
"mao": { "wholesale": number, "flip": number, "wholetail": number, "as_is_cap": number },
"respect_floor": number,
"payoff_projected": number,
"shortfall": number,
"recommendation": "Cash/Wholesale" | "List/MLS" | "Hybrid/Wholetail",
"workflow_state": "NeedsInfo" | "NeedsReview" | "ReadyForOffer",
"confidence": { "score": "A"|"B"|"C", "notes": string[] },
"bands": {
"seller_offer_band": [floor, ceiling],
"buyer_ask_band": [floor, ceiling],
"sweet_spot": number | null,
"gap_flag": boolean
}
}

Order of Operations (deterministic):
dtm = compute_days_to_money(deal.timeline, policy.days_to_money) (Q2).

Carry_Months = min((DOM_zip + 35) / 30, 5.0).” and “Notes: This replaces any DTM-based month logic, including

Compute path-dependent selling or closing components as itemized line items using title quotes and statutory schedules.” and “Showing a single composite percent is presentation only. Calculation must be line-item based.

buyer_ceiling = ARV × (1 − Buyer_Target_Margin) − Repairs − Buyer_Costs − Carry (Q6/Q7 ranges feed targets).

cap_pct = 0.97 by default. … cap_pct = 0.99 only when … and VP approval is logged. … Final clamp: MAO_final = min(MAO_presentation, AIV_cap, Buyer_Ceiling).

Floor_Investor = max(AIV × (1 − p20_zip), AIV × (1 − typical_zip))
Operational floor used in offers & triage:
Respect-Floor = max(Floor_Investor, PayoffClose + Essentials)

Final clamp: MAO_final = min(MAO_presentation, AIV_cap, Buyer_Ceiling).

payoff_projected = senior_principal + per_diem \* days_from(good_thru_date → target_close) + juniors + arrears + fines (Q9 day-count).

shortfall = payoff_projected − choose(mao.wholesale | wholetail | flip per policy.default_path_bias).

Determine bands:

Seller Offer Band = [respect_floor, min(mao.flip, deal.market.aiv)]

Buyer Ask Band = [mao.wholesale, buyer_ceiling]

Sweet Spot = midpoint of the overlap; if no overlap → gap_flag=true and attach terms (credits/timing) to create overlap.

confidence = score(A/B/C) from evidence completeness + comp quality + market agreement (policy scale).

workflow_state = evaluate_workflow_state(…) (Q3/Q5).

Return bundle.
Worked Mini-Example (Central FL-realistic placeholders):

ARV $360k, AIV $300k, Repairs $40k, Buyer_Target_Margin 18%, Buyer_Costs $18k, Carry $6k →
buyer_ceiling = 360k×(1−0.18)−40k−18k−6k = 231,200.
If aiv_cap = 0.97×300k = 291,000 [INFO NEEDED: confirm cap pct], wholesale MAO = min(231,200, 291,000) = $231,200.
Risks & Mitigations: Over-reliance on stale comps → enforce 90-day window, expand only if sparse.
Actions: Implement as pure function; wire to source registry; refuse “ReadyForOffer” if comps/quotes stale >90d without override.

Q2 — METHOD_NEEDED: compute_days_to_money (Target close timing)
A2 — Rule (no hand-waving):
Candidates (America/New_York):

auction_date (if ≥ today),

manual_target = today + policy.manual_days_to_money,

default_cash_close = today + policy.default_cash_close_days.

Pick earliest ≥ today. If all < today → days_to_money=0, urgency="critical".

Return min( policy.max_days_to_money, max(0, days_between(today, picked)) ).
Edge Handling: If title/insurance bindability unresolved, allow +policy.clear_to_close_buffer_days. If borrower in BK stay → set hold_reason="bankruptcy_stay" and return 0 until relief.
Actions: Add holiday/weekend close roll-forward hook; log chosen candidate; include ISO dates in output.

Q3 — METHOD_NEEDED: evaluate_workflow_state (State machine)
A3 — Gates:
Critical fields present? If any missing from policy.required_fields → NeedsInfo.

Spread check: If buyer_ceiling − payoff_projected < policy.min_spread_dollars → NeedsReview.

Confidence check: If confidence.score < policy.min_confidence_score → NeedsReview.

Else → ReadyForOffer.
Overrides: policy.allow_advisor_override=true with reason, timestamp, user, and attachments (comp set, quotes).
Actions: Emit machine-readable reasons array; block override if legal gate (e.g., stay, unbindable insurance, failed 4-Point—see Citizens update (Public)).

Q4 — METHOD_NEEDED: scenario_deltas (Unified what-if engine)
A4 — Interface:
Inputs: baseDeal, deltas[] where each delta has named knobs: { name, repairs_pctΔ|repairs_absΔ, arv_pctΔ|arv_absΔ, aiv_pctΔ|aiv_absΔ, days_to_moneyΔ, seller_creditΔ, carry_rateΔ }.

Process: For each item: clone baseDeal → apply bounded deltas (|pct| ≤ policy.delta_max_pct; |days| ≤ policy.delta_max_days) → rerun compute_underwriting → diff vs base.

Output per item: { name, inputs_applied, maoΔ:{wholesale, flip, wholetail}, buyer_ceilingΔ, spreadΔ, shortfallΔ, recommendationΔ, confidenceΔ }.
Actions: Add preset buttons: “+10% repairs”, “−2% ARV”, “+15 days”; show tornado rows in Sensitivity tab (already designed).

Q5 — POLICY_NEEDED: workflow_state_gates (Labels + thresholds)
A5 — Spec (decision-ready):
required_fields (hard): arv, aiv, comps{≥3 each path ≤90d}, dom_zip, moi_zip, price_to_list_pct, repairs_base, senior_principal, senior_per_diem, good_thru_date, occupancy, insurance_bindable?, title_quote?, auction_date? (if foreclosure).

min_spread_dollars (wholesale): $15,000 baseline [owner may raise by ZIP/price band].

min_confidence_score: "B" (A/B/C rubric: A=full evidence ≤90d + quotes; B=minor gaps; C=thin or stale).

Hard legal/operational gates (auto NeedsReview/Info): bankruptcy stay; Citizens 4-Point/roof failure until remediation; uninsurable; unpermittable additions; condo SIRS red flags. Citations: Citizens 4-Point/RCF update 03-20-2025. (Public)
Actions: Encode as JSON policy versioned by date; include county/asset overrides table.

Q6 — CONST_NEEDED: dscr_target (Landlord path hurdle)
A6 — Decision: Set base DSCR target = 1.25x for fixed-rate dispositions; allow 1.15x for floating only with documented interest-cap and ≥6 months reserves. This aligns with institutional underwriting norms (Freddie Mac MF: 1.25x fixed; 1.15x floating at cap, as of May 31, 2025). (Freddie Mac Multifamily)
Why (local relevance): Orlando MSA rent growth stabilized in 2025; conservative DSCR improves buyer pool eligibility amid modest rent softness. (Cushman & Wakefield)
Actions: Create {zip, target_dscr} override table; initialize all Orange/Osceola/Polk ZIPs to 1.25x; allow exception requests with lender term sheets attached [INFO NEEDED: current lender matrices].

Q7 — CONST_NEEDED: target_cap_by_zip (Cap-rate hurdle)
A7 — Framework (no invention):
Primary build: derive SFR/TH/condo investor cap by ZIP from MLS investor-flagged sales + rent comps (≤90d).

Fallback (temporary): set zip_cap_target = msa_multifamily_cap + 100bp until ZIP series exists. Florida MF cap near 5.5% in Q2-2025 ⇒ provisional SFR cap target ≈6.5% pending ZIP buildout. Use only as a screening guard, not for pricing. (Largo Capital)

Local context: Orlando rents/occupancy in 2025 show stabilization; do not compress cap targets without fresh ZIP data. (MMG Real Estate Advisors)
[INFO NEEDED]: Weekly ZIP table {zip, cap_target, method(msa|zip_derived|survey), window_start, window_end, samples} (see SOURCES).
Actions: Queue ATTOM/MLS pulls; prohibit ReadyForOffer if buyer marketing claims imply cap < target without evidence.

Q8 — CONST_NEEDED: cost_of_capital (Hazard/NPV discount rate)
A8 — Decision: Set APR 14% baseline for flip risk discounting (wholesale path uses buyer’s cost stack; this constant drives internal risk haircuts on uncertain cashflows). Rationale: 2025 investor financing costs and opportunity cost bands support mid-teens hurdle; confirm with current Central FL lenders’ term sheets [INFO NEEDED].
Actions: Store as policy.cost_of_capital_apr=0.14; revisit quarterly with lender quotes.

Q9 — CONST_NEEDED: interest_day_count_basis (Payoff accrual default)
A9 — Decision: Defer to payoff letter per-diem when provided. If absent, assume Actual/365 for daily accrual (documented market convention), and reconcile at final payoff. Educational references on day-count methods (Actual/365 vs 30/360) — Jan 3, 2023 explainer; Jul 21, 2025 refresher. (PropertyMetrics)
Actions: Require storing per_diem and basis from payoff; if missing, flag [INFO NEEDED: servicer payoff] and calculate with Actual/365 pending update.

Q10 — RANGE_NEEDED: deal.market.arv (Input validation bands)
A10 — Bands (with warnings):
Hard range: $25,000–$5,000,000 (Central FL SFR/TH/condo coverage band).

Soft warnings:

warn if arv < aiv unless explicit distress/functional obsolescence noted;

warn if arv > 2.5× aiv;

warn if comps <3 or >90 days old;

require photo parity and GLA/bed/bath similarity; expand radius/time only if sparse and note justification.
Actions: Enforce as schema validation; block “ReadyForOffer” if only out-of-window comps exist without override (A/B/C confidence rubric).

Note for Owner: Where I set a decision (e.g., DSCR=1.25x, cost_of_capital=14%), it’s labeled policy and grounded in 2025 institutional norms or current financing climate. ZIP-level metrics (discount P20, cap by ZIP) must be sourced weekly before we allow “ReadyForOffer.” See [INFO NEEDED] flags.
Sequence Health Check — Delivered: Part 1 (Q1–Q10). Next: Part 2 (Q11–Q20).

Q11 — RANGE_NEEDED: deal.market.as_is_value (AIV)
A11 — Bands & Guards:
Hard: $25,000–$5,000,000.

Soft warns: (a) AIV > ARV (needs justification: functional/market distress), (b) AIV derived from comps >90 days old or radius >1.0 mi in platted SFR areas, (c) fewer than 3 “as-is” comps.

Adjustment cues: Condition mismatch >1 level; unpermitted work; SFHA flood exposure; condo litigation.
Actions: Enforce schema + soft-warn rules; block “ReadyForOffer” if comps stale >90d without override; store comp set with photo parity and notes.

Q12 — RANGE_NEEDED: deal.market.dom_zip (median DOM by ZIP)
A12 — Bands & Guards:
Hard: 0–365 days.

Soft warns: <5 (hot pocket risk—price to maximize spread carefully), >240 (illiquidity; require deeper discount or wholetail/list path).

Use: Drives Speed/Certainty dial & carry-months expectations.
Actions: Capture DOM by ZIP for the last 90 days; if sample <30, expand to 6–12 months with flag; persist {zip, window_start, window_end, dom_median, samples}.

Q13 — RANGE_NEEDED: deal.market.moi_zip (Months of Inventory)
A13 — Bands & Guards:
Hard: 0–60 months.

Soft warns: <1 (seller leverage; faster resale—price closer to Buyer Ceiling), >6 (slow market; widen spread, reduce ARV reliance).
Actions: Compute MOI from MLS actives/pendings/closeds; persist with same 90-day window and sample counts; auto-warn if conflicting with DOM trend.

Q14 — RANGE_NEEDED: deal.costs.repairs_base
A14 — Bands & Guards:
Hard: $0–$750,000.

Soft warns: repairs_base > 40% of ARV, structural flags, roof > life, cast iron, aluminum branch wiring, settlement.

Evidence: Scope-of-work line items or GC/bid; allow RSMeans-style estimator snapshot with photos when bids pending.
Actions: Require min 10 photo evidence slots; add contingency_pct as policy-driven; block “ReadyForOffer” without either bids or estimator + photo set.

Q15 — RANGE_NEEDED: deal.debt.senior_principal, senior_per_diem, good_thru_date
A15 — Bands & Guards:
Hard: senior_principal $0–$10,000,000; per_diem $0–$5,000/day; good_thru_date must be valid ISO date.

Soft warns: senior_principal > 95% of ARV; per_diem implies APR >25%; payoff stale (>30 days old).

Basis: Default Actual/365 only if payoff letter absent; always replace with letter terms on receipt.
Actions: Store payoff letter (PDF) fields {per_diem, basis, suspense, late_fees, corporate_advances}; recompute projected payoff nightly until close.

Q16 — RANGE_NEEDED: deal.timeline.auction_date_iso
A16 — Bands & Guards:
Validation: Must parse ISO date.

Rule: If < today, set days_to_money=0, urgency="critical"; if ≤14 days, escalate to Speed > Net objective unless owner overrides.
Actions: Persist court docket link; surface lender/attorney name; add auto-CTA “Request Cancellation/Postponement Grounds” when days ≤10.

Q17 — SOURCE_NEEDED: ZIP 20th-percentile investor discount (Respect-Floor)
A17 — Build & Use:
Method: From MLS closed, investor-flagged or cash SFR/TH/condo trades: compute SP/LP discount distribution by ZIP for the last 90 days; take P20 (20th percentile) as the local discount floor.

Data spec: {zip, window_start, window_end, pct_discount_p20, median, samples, cash_share}; minimum samples ≥30 else widen window; exclude flips to self.

Application: Respect_Floor = max(AIV × (1 − pct_discount_p20), payoff_floor, typical_investor_discount_zip); show source row in offer sheet.
Actions: Stand up weekly CSV export; add “evidence freshness” badge (green ≤14d, amber 15–30d, red >30d).

Q18 — SOURCE_NEEDED: DOM/MOI/Price-to-List by ZIP (Stellar MLS)
A18 — Build & Use:
Pull cadence: Monthly baseline; weekly if in foreclosure pipeline.

Fields: {zip, window_start, window_end, dom_median, moi, price_to_list_pct, active_cnt, closed_cnt} with sample counts.

Why: Anchors speed expectations, carry months, and concession norms.
Actions: Subscribe to Stellar MLS market stats feed; align your reporting window to the MLS cycle (previous month published around the 10th; county stats mid-to-late month). (Stellar MLS)

Q19 — SOURCE NEEDED: Bindable insurance + Citizens 4-Point / Roof forms
A19 — Requirements (current as of Mar 20, 2025):
Citizens updated 4-Point (Insp4pt 03-25) and Roof Inspection Form (RCF-1 03-25) to evaluate eligibility; these updates govern binding feasibility.

For homes >20 years, a 4-Point is typically required; ensure roof condition/remaining life meets carrier thresholds.

Data spec per property: {carrier, premium_annual, wind_deductible, binding_ok, four_point_ok, wind_mit_ok, roof_year, docs: [4-Point, RCF]}.
Actions: Require 2 bindable quotes (Citizens or admitted + surplus lines if needed); store forms and quote dates; block “ReadyForOffer” if binding_ok=false or forms outdated. (Public)

Q20 — SOURCE NEEDED: Title quote components + Doc Stamps + Promulgated Title Rates (FAC 69O-186.003)
A20 — Components & Evidence:
Doc stamps on deeds (non–Miami-Dade): $0.70 per $100 (or portion) of consideration (Section 201.02(1)(a), F.S., DOR website).

Title premiums (promulgated): Florida F.A.C. 69O-186.003 schedule (e.g., owner/mortgage: $5.75 per $1,000 up to $100k, then tiered).

Quote spec: {premium (per FAC table), endorsements_total, closing_fee, lien_search, estoppels, municipal_lien, recording, doc_stamps, intangible?, surtax?}.
Actions: Build calculator that (1) computes deed doc stamps per DOR rule, (2) applies FAC 69O-186.003 premium tiers incl. reissue rates, (3) itemizes endorsements, (4) stores the title agency quote PDF + date. (Florida Dept. of Revenue)

Sequence Health Check — Delivered: Parts 1–2. Next: Part 3 (Q21–Q30).
Part 3 — Q21–Q30
Q21 — SOURCE_NEEDED: Buyer carry inputs (utilities/HOA/tax)
A21 — Definition → Sources → Pull spec → Guardrails
What to research: Bindable monthly carry inputs by address: utilities (electric, water/sewer, gas, trash), HOA/condo dues, and property tax.

Primary sources (county + providers):

Property tax bills/rolls: Orange TC (search-by-owner/parcel) (access live bills + non-ad valorem lines). (Benefits) Polk TC (search + bill detail). (Veterans United Home Loans) Osceola TC (search + bill detail). (Terminix)

Electric: OUC (residential rates/tariffs). (Orange County Tax Collector) Duke Energy FL (residential rates). (Polk County Tax Collector)

Water/sewer: Orange County Utilities (rates/services). (Orange County Tax Collector) Toho Water Authority (Osceola). (Osceola County Tax Collector) Polk County Utilities (rates). (Polk County Tax Collector)

Gas: TECO Peoples Gas (confirm service territory from buyer’s quote) [INFO NEEDED].

Pull spec (per subject address): {tax_annual, tax_installment?, nav_assessments[], electric_avg_mo, water_sewer_avg_mo, gas_avg_mo, trash_mo, hoa_dues_mo, special_assessments?} with PDFs or URLs to each bill/plan. Use last 12 bills; if new service, quote a utility provider budget plan and re-verify at inspection.

Guardrails: if any item missing, set placeholder [INFO NEEDED] and carry $X/mo only in Assumptions (not in answers).
Actions: Pull the latest tax bill + utility rate pages for the subject; request HOA ledger/estoppel pre-contract. (Cite the exact bill URLs in the workpaper.)

Q22 — SOURCE_NEEDED: ARV/AIV comps ≤ 90 days
A22 — Process → Data fields → Scoring
What to research: 3–5 as-is and 3–5 renovated comps within ≤90 days, prioritized by proximity/condition.

Primary system: Stellar MLS (Orlando region). Use the market stats/comps exports (DOM/price-to-list, etc.). (DBPR Condo Info & Resources)

Fields to capture (each comp): {address, close_date, SP, SP/LP%, DOM, distance_mi (haversine), beds, baths, GLA, lot, year, condition_tag, pool?, garage?, hoa$, notes, photos_url}.

AIV (as-is): median of top-3 most similar as-is comps ± adjustments.

ARV (renovated): median of top-3 renovated comps ± adjustments; show delta vs AIV.

Conflict resolution: prefer newer date, closer distance, condition match (in that order).
Actions: Run two MLS grids (as-is / renovated), export CSV, compute medians; park any thin zip/date windows as [INFO NEEDED].

Q23 — SOURCE_NEEDED: HUD FMR (Orlando FY2025) / rent comps
A23 — Why + Sources → Spec → Example
Why: DSCR/cap-rate checks and rent sanity for zip-level investor buyers.

Primary source: HUD FY2025 FMR schedule (MSA and county coverage). For Orlando-Kissimmee-Sanford, FL MSA (Lake, Orange, Osceola, Seminole): FY2025 FMRs list 2-BR = $1,958; 3-BR = $2,486 (table shows full bedroom ladder). (HUD User)

Method note: HUD keys on 2-BR as anchor; bedroom ratios derive from ACS series (FY2025 methodology). (Federal Register)

Pull spec: {zip, BR, FMR_2025, observed_rent_median, sample_n, source_url}.
Actions: Add HUD FMR row for subject ZIP; overlay 5–10 rent comps (MLS + public portals) within 0.5–1.0 mi, ≤90d, and compute Observed vs FMR variance.

Q24 — SOURCE_NEEDED: Target cap-rate by ZIP
A24 — Method (primary) → Fallback → Output table
Primary method: derive zip cap_target from closed investor trades: cap = (annual_gross_rent − normalized_vacancy − taxes − ins − HOA − typical_maint) / price. Use local rent comps (Q23) + actual tax (Q21) + bindable ins [INFO NEEDED] + HOA.

Fallback: if thin sample, set cap_target = msa_median_cap + 100 bp [INFO NEEDED] (requires quarterly investor-trade study).

Output: table {zip, cap_target, method: zip_derived|msa_proxy, last_updated} with refresh monthly.
Actions: Build a pilot for 3 zips per county using last-90d investor resales + rent comps; label any proxy rows as [INFO NEEDED].

Q25 — SOURCE_NEEDED: FEMA Flood + insurer quotes/wind deductible
A25 — Pull steps → Eligibility notes
FEMA layers: confirm panel & zone in FEMA MSC/NFHL; flag SFHA (A/AE/VE). (FEMA Flood Map Service Center)

Insurance: bind 2 quotes (standard + Citizens backstop where applicable). Collect {carrier, premium_annual, wind_deductible, binding_ok, 4-Point/Wind-Mit status}. (Citizens has specific roof/4-Point guidance—use their Mar-2025 bulletins when applicable.) [INFO NEEDED for subject]
Actions: Attach FEMA map screenshot to file; request 4-Point + Wind-Mit (if older roof); solicit bindable quotes with wind deductible options.

Q26 — SOURCE_NEEDED: UCC-1 search (solar/fixtures)
A26 — Where → What to log → Title interplay
Where: Florida Secured Transaction Registry search (UCC1/UCC3 filings). (floridaucc.com) Reference Sunbiz/UCC help pages for context. (Florida Department of State)

Log fields: {filing_no, filing_date, debtor_name, secured_party, collateral_desc (solar/fixtures), lapse_date, status, county_record_book/page if fixture filing)}.

Why: active solar/UCC can block financing/warrantability; plan buyout or transfer with underwriter approval.
Actions: Run debtor-name search for owner(s); save PDFs; send to title for clearance path.

Q27 — SOURCE_NEEDED: FIRPTA doc set (W-9/W-8BEN-E/8288 series)
A27 — Rule → Exceptions → Workflow
Rule: 15% withholding on dispositions of U.S. real property interests by foreign persons, remitted via Forms 8288/8288-A. (RentData)

Residence-use exception & reduced rates: depend on amount realized and buyer’s intended use; certificate can reduce/waive withholding (Form 8288-B). (HUD User)

Checklist: {seller W-9 or W-8BEN-E, residency/occupancy affidavit, 8288/8288-A prepared, escrow % if certificate pending, timeline control}.
Actions: Screen seller early; if foreign, set escrow holdback and queue 8288-B path; coordinate with title/CPA.

Q28 — SOURCE_NEEDED: HOA/Condo estoppel confirmations
A28 — Statutes → Timing → Fees (cite law)
Condo (§718.116) & HOA (§720.30851): content requirements and effective periods for estoppel certificates are codified; delivery within 10 business days after request is required by statute. (Florida Legislature)

Form elements include fee disclosure and delinquency status; effective period 30 days electronic / 35 by mail. (Florida Legislature)

Fee caps: statutes authorize fees; DBPR inflation updates have raised statutory caps in recent cycles (practitioner summary, 2024). Use association invoice; do not assume. (Becker)
Actions: Submit estoppel requests day-1 of escrow; calendar T+10 business days; upload PDFs to file; reconcile balances vs payoff.

Q29 — SOURCE_NEEDED: Weekly showings & SP/LP by ZIP (for markdown triggers)
A29 — Data path → Refresh cadence
Data path: export weekly from Stellar MLS (showings via ShowingTime in MLS; price changes; cancellations; SP/LP trend). Build {zip, week_end, showings_avg, sp_lp_4w_trend, price_reductions_cnt, cancellations_cnt}. (DBPR Condo Info & Resources)

Use: drive list-path markdowns and concession ladders; trigger when showings↓ ≥25% 4-wk or price-cuts↑ ≥30%.
Actions: Stand up a weekly query template in MLS; publish a one-pager per county every Monday.

Q30 — RANGE_NEEDED: price_to_list_pct (market reasonableness check)
A30 — Range → Enforcement
Proposed hard/soft: Hard: 80%–110%; Soft warn: < 92% or > 103% unless justified by condition/time (use latest 90-day MLS stats per ZIP). [INFO NEEDED: live zip stats] (DBPR Condo Info & Resources)

Why: keeps comps & offers tethered to prevailing SP/LP distribution; outliers require written adjustment memo.
Actions: Add an auto-check: block saving comps if comp-level SP/LP is outside hard band without justification note.

Sequence Health Check: Delivered: Parts 1–3. Next: Part 4 (Q31–Q40).

Q31 — FIRPTA screening & net-sheet handling (W-9/W-8BEN-E; 15% default; residence exception; withholding certificate timing; list-path nets & assignment optics; escrow/holdback)
A31 — Summary → If–Then → Micro-scripts → Actions
Why it matters (deal kill risk): The buyer is the withholding agent; errors = buyer liability + penalties. Default 15% of amount realized unless an exception/reduced rate applies; file Forms 8288/8288-A within 20 days after closing. IRS may reduce/waive via Form 8288-B; IRS “normally acts by day ~90” on a complete application. (IRS)

Residence exceptions (investor optics):

$0 withholding if buyer is an individual using as a residence and amount realized ≤ $300,000 (buyer 50%-of-use intent for first two 12-month periods). (IRS)

10% reduced rate if residence and amount realized ≤ $1,000,000 (but > $300k). (See Instructions for Form 8288 (Rev. Jan 2023), “Withholding at a Reduced Rate.”) (IRS)

If–Then (operational gates):
If seller signs W-9 (U.S. person) → no FIRPTA. Else collect W-8BEN/W-8BEN-E + passport/ITIN status; screen price band ($0 / 10% / 15%) using residence test; prep 8288/8288-A; consider 8288-B if loss/low-gain/contractual tax planning justifies reduced withholding. (IRS)

Assignment optics (wholesale): If we assign and end buyer is the transferee, they inherit withholding-agent duty; keep escrow instructions explicit so withheld funds ride with the A-B deed. (IRS)

Micro-scripts (one-liners):
• To Seller (foreign): “Because you’re not providing a W-9, U.S. law requires we withhold 15% unless the residence exception or an IRS 8288-B certificate applies. We’ll structure escrow to file 8288/8288-A within 20 days; if your 8288-B is approved, escrow releases the reduction per IRS letter.” (IRS)
• To End-Buyer (retail): “If you intend to live here and price is ≤ $1M, the law allows 10% withholding (or $0 if ≤ $300k). We’ll capture your residence affidavit at closing to qualify.” (IRS)

Actions: Add FIRPTA gate to checklist (capture W-9/W-8, residence affidavit, 8288/8288-A, optional 8288-B with 90-day IRS SLA), and wire holdback instructions naming escrow as qualified substitute when used. (IRS)

Q32 — PACE / non-ad-valorem assessments (pull tax bill; provider flag; payoff vs assumption; lender overlays; title/escrow timing)
A32 — Definition → Why it matters → If–Then → Actions
What it is: Florida PACE is a non-ad-valorem assessment under §163.08, F.S., placed on the tax bill; it’s not value-based and runs with the land. (Florida Legislature)

Why it matters: GSEs (Fannie Mae) will not purchase loans if a PACE lien remains senior—PACE must be paid in full or clearly subordinated before closing; practically, retail buyers using GSE financing require PACE payoff at closing. (Fannie Mae Selling Guide)

If–Then:
If buyer financing is Fannie/Freddie/FHA/VA → order payoff & satisfy PACE at closing (or pivot to cash/portfolio buyer). If cash buyer keeps PACE → disclose as non-ad-valorem; underwrite total liability into carry and debt-service. (Legal Information Institute)

Local ops (Orange/Polk/Osceola): Confirm on the county tax bill (“non-ad-valorem” table) and capture program name (e.g., Renew/Ygrene/PACE Funding) + installment term. Florida DOR prescribes combined tax notice format that lists these lines. (Legal Information Institute)

Actions: Standardize a PACE pull on every deal: download current tax bill, log assessment ID, annual charge, remaining term, and payoff letter ETA; set closing condition = PACE satisfied for financed exits. (Florida Dept. of Revenue)

Q33 — Solar leases & UCC-1 (lease/PPA; buyout quotes; UCC-1; roof-age conflicts; transferability; title/underwriter stance; buyer-pool shrinkage)
A33 — Summary → Checklist → Actions
Reality check: Leased/financed solar typically has a UCC-1 (personal property or fixture filing) recorded with Florida Secured Transaction Registry (Sunbiz) and/or county real property records; lenders/underwriters often require UCC termination or subordination. (Freddie Mac Guide)

Underwriter posture (examples): Title industry guidance and new ALTA solar endorsements flag the need to identify “Solar Financing Statements” (UCC-1) and address them before insuring. Expect demands for payoff/assignment and UCC-1 termination at closing. (Virtual Underwriter)

Checklist:

Contract type: loan vs lease/PPA; 2) Provider contact + buyout quote + transfer criteria; 3) County/UCC search for UCC-1 (fixture/general); 4) Roof age vs remaining term; 5) Insurance & claims; 6) End-buyer financing constraints if UCC not cleared. (Freddie Mac Guide)

Buyer-pool impact: If UCC stays, many conforming lenders treat it as ineligible/subordinate lien; higher fallout → price discount or cash-only. (Freddie guidance requires review and resolution of any UCC-1 or lease encumbrance.) (Freddie Mac Guide)

Actions: Add Solar/UCC gate: obtain buyout, secure UCC termination in closing package, or pivot to cash disposition; disclose clearly in MLS/assignment memos to avoid retrades. (Freddie Mac Guide)

Q34 — Condo SIRS/Milestone (Fla. Ch. 718/§553.899): status, reserves, pending assessments; non-warrantable risk; cash-only probability
A34 — Definition → Why it matters → If–Then → Actions
Law: Florida now mandates Milestone Inspections (§553.899) and Structural Integrity Reserve Studies (SIRS) with reserve funding obligations embedded in §718.112(2)(g) and related sections; resale disclosures now tie to these documents and can trigger closing extensions/cancellation rights. (Florida Legislature)

Financing impact: Projects with critical repairs, significant deferred maintenance, or special assessments often fail GSE warrantability until issues are resolved and reserves are adequate. (Fannie Selling Guide updates in 2025 reinforce these screens.) (Fannie Mae Selling Guide)

If–Then:
If SIRS shows underfunded reserves / material deficiencies → treat as non-warrantable; plan cash/portfolio exit or deep pricing. If compliant & no critical repairs → pursue conforming buyer path and price tighter. (Fannie Mae Selling Guide)

Actions: Require from HOA: SIRS, Milestone report/phase, budget/reserve line-item (≥10% rule per Fannie review), special assessments, litigation letter, insurance certs; route to project review before list/contract. (Fannie Mae Selling Guide)

Q35 — Condo warrantability / board approvals (ROFR, app fees/timelines, litigation, owner-occ %, budget reserves) – FNMA/Freddie feasibility
A35 — Definition → Deal Cues → Actions
GSE red flags (ineligible traits): Active litigation affecting safety/soundness, insufficient reserves, significant deferred maintenance/critical repairs, single-entity ownership concentration, short-term rental operation, excessive commercial space, etc., are ineligible. (Fannie Mae Selling Guide)

Reserves/owner-occ: Full/Limited Reviews still require reserve adequacy (commonly ≥10% of budget unless alternative reserve study aligns), and owner-occ/insurance thresholds per the Selling Guide. (Fannie Mae Selling Guide)

Board approvals/ROFR: Florida §718.503 dictates resale disclosures and buyer cancellation/extension rights tied to receiving documents; many associations exercise right-of-first-refusal with stated review windows—build those days into DTM. (Florida Legislature)

Actions: Run project review early (questionnaire + budget + insurance + litigation letter). If non-warrantable, pivot to cash pricing and disclosures; if warrantable, set closing timeline to include board approval/ROFR window. (Fannie Mae Selling Guide)

Q36 — FHA/VA overlays (incl. FHA 0–90 day flip rule; 91–180 day 2nd appraisal; VA WDO/water tests); wholetail vs retail timing
A36 — Summary → Decision Tree → Actions
FHA Anti-Flipping: 0–90 days after seller’s acquisition = ineligible. 91–180 days → 2nd appraisal and additional documentation if resale price triggers thresholds (per 24 CFR §203.37a/HUD 4000.1). Plan wholetail/retail timing accordingly. (eCFR)

VA MPRs: VA requires properties be safe, sound, sanitary; termite/WDI inspections are required in Florida (listed among high/very-high prevalence states). Private wells require water quality meeting local codes. (HUD Exchange)

Decision tree:
• If < 91 days from acquisition → avoid FHA retail; sell cash or conventional.
• If 91–180 days and value lift is large → bake 2nd appraisal time + cost into DTM.
• If VA buyer in FL → pre-order WDO and ensure cures for any wood-destroying organisms; verify water/septic as applicable. (eCFR)

Actions: Add loan-program gating to exit plan; set list timing to clear anti-flip windows; pre-schedule WDO for VA paths. (Benefits)

Q37 — Manufactured/mobile homes (HUD label/serial; foundation/anchoring cert; retired title / RP status; land-lease rules; finance gates)
A37 — Definition → Why it matters → Checklist → Actions
Finance gates: Conforming lending needs HUD-code home with HUD labels, data plate, and a permanent foundation (engineer cert to HUD PFGMH standard) when loan program requires it. (Freddie Mac Guide)

Florida “Real Property” (RP) status: To treat as real property (not just a vehicle), owner records Declaration of Mobile Home as Real Property (DR-402); county issues RP decal; statutory basis includes §320.0815 & DOOR/Property Appraiser procedures. Titles must be retired correctly. (CAI)

Label/VIN verification: IBTS provides label/data-plate verification (phone/email). Missing tags → order IBTS label verification letter. (ibts.org)

Checklist:

HUD labels & data plate present or IBTS letter; 2) Engineer foundation cert to PFGMH; 3) Title(s) retired + RP sticker confirmed with county; 4) Land-lease? If yes, expect cash/portfolio exit; 5) Year/model, dimensions, serials match. (Freddie Mac Guide)

Actions: Add a Manufactured Home Gate: photo the HUD labels/data plate, order IBTS, order foundation cert, verify DR-402/RP with county, and screen land-lease disclosures before pricing. (ibts.org)

Q38 — SCRA & active-duty checks (DMDC status; timing/stay implications; attorney referral CTA)
A38 — Definition → Why it matters → Steps → Actions
Why check: The Servicemembers Civil Relief Act (SCRA) provides protections (e.g., stay of certain actions, interest caps). Verify active-duty status via the official DMDC SCRA site before any action that could impact a servicemember. (homebridgewholesale.com)

Steps:

Run DMDC SCRA status with name/SSN/DoB; 2) If active, escalate to counsel for SCRA-compliant timelines/notices; 3) Log evidence in file. (See DOJ SCRA overview for scope.) (Clayton Homes)

Actions: Add a SCRA check to the intake; move any adverse timing to legal track if positive. (homebridgewholesale.com)

Q39 — UCC-1 search (solar/fixtures) – process & closure requirements
A39 — Definition → Why it matters → Steps → Actions
What to do: Search Florida Secured Transaction Registry (Sunbiz) and county records for fixture filings impacting title (e.g., solar, water softeners). Fixture filings often require legal description and appear in real property indices. (Freddie Mac Guide)

Close-out requirement: Secure payoff and UCC-3 termination (or subordination/endorsement) per title underwriter before insuring. New ALTA solar endorsements expect identification/handling of Solar Financing Statements. (Virtual Underwriter)

Actions: Bake a UCC search into title order; condition closing on recorded termination; if timing slips, pivot to cash buyer or price to compensate. (Virtual Underwriter)

Q40 — Condo warrantability & buyer-pool strategy: objection handling & concessions ladder
A40 — Anchors & Bands → Objection handling → Concessions → Actions
Anchors:
• If warrantable (per FNMA review) → market to agency-financed buyers; standard escrow timelines.
• If non-warrantable (repairs/assessments/litigation) → market cash/portfolio; price to overcome financing friction; disclose SIRS/Milestone status up-front to prevent retrades. (Fannie Mae Selling Guide)

Objection handling (micro-lines):
• Buyer agent: “Project is non-warrantable per current SIRS/Milestone and reserve posture; we’ve priced for cash/portfolio and can suggest local portfolio lenders.” (Fannie Mae Selling Guide)
• Appraiser/lender: “Here is the project review package: questionnaire, budget with ≥10% reserve line (or reserve study), insurance, litigation letter, and board minutes.” (Fannie Mae Selling Guide)

Concessions ladder: 1) Closing-cost credit capped to preserve comps; 2) Assessment escrow or seller pays assessment at closing; 3) List-to-contract price adjustment. (Use only after confirming project eligibility path.) (Fannie Mae)

Actions: Maintain a condo playbook (FNMA sections B4-2.1/B4-2.2) and pre-clear project before going live; set buyer messaging by warrantability status. (Fannie Mae Selling Guide)

Actions (for this part):
Add FIRPTA module to workflow (forms, residence affidavit, 8288/8288-A, optional 8288-B, escrow language). (IRS)

Add PACE detection & payoff gate via tax bill + §163.08 reference; block financed exits until cleared/subordinated. (Florida Legislature)

Add Solar/UCC gate with Sunbiz search + underwriter requirements; default to termination at closing. (Freddie Mac Guide)

Update Condo review packet to include SIRS/Milestone docs and GSE project screens; route timing into DTM. (Fannie Mae Selling Guide)

Add FHA/VA timing logic (91–180 day FHA window; VA WDO in FL) to exit planner. (eCFR)

Stand up a Manufactured Home checklist (IBTS + foundation cert + DR-402/RP). (ibts.org)

Add SCRA verification step (DMDC) in pre-adverse actions. (homebridgewholesale.com)

[Note for Owner] All items above are aligned to primary sources (IRS, Florida Statutes, VA/HUD, FNMA) with updates through Aug–Oct 2025 in citations. Where underwriter practices vary (solar/UCC), we cited national title bulletins/endorsements reflective of 2024–2025 norms.
Sequence Health Check: Delivered: Parts 1–4. Next: Part 5 (Q41–Q50) — final part includes Assumptions & Human Inputs.

Q41 — POLICY_NEEDED: Buyer Target Margins by Disposition Path (end-buyer viability guardrail)
A41 — Summary → If–Then → Adjustments → Evidence → Actions
Baseline targets (set as policy, not comps):
• Flip (retail rehab): 18% target margin on ARV baseline; allow 15–22% band by ZIP speed/complexity.
• Wholetail (light clean/list): 10–14% target margin.
• BRRRR/landlord: governed by DSCR ≥ 1.25x (see Q6) and cap ≥ ZIP target (Q24).
• Wholesale buyer: we do not include our assignment fee inside buyer margin math (buyer underwrites their own spread).

Why: Q2-2025 U.S. flip gross ROI printed ~25.1% (17-year low), implying leaner net spreads after repairs/fees/carry; our targets keep end-buyers viable in today’s margins regime. (ATTOM)

Adjustments: Push toward the top of band when (a) MOI_ZIP > 4 or DOM > 60, (b) insurability uncertain (Citizens 4-Point/roof), or (c) condo/SIRS risk. Pull toward bottom when MOI < 2 and showings↑. (Public)

Actions: Encode {path → target_margin_pct} table with ZIP overrides; log chosen target in each offer sheet.

Q42 — POLICY_NEEDED: AIV Safety Cap (max as-is exposure)
A42 — Summary → Rule → Rationale → Actions
Rule: Cap initial offers at AIV × 0.97 unless (i) bindable insurance + 4-Point/RCF OK, (ii) clear title quote on file, and (iii) DOM/MOI indicate sub-2-month liquidity; then allow up to AIV × 0.99 with VP approval.

Rationale: Leaves headroom for latent conditions, insurance/wind-mit surprises, and list-path concessions; aligns with current binding scrutiny (Citizens forms updated Mar 20, 2025). (Public)

Actions: Enforce cap pre-approval; show AIV, cap %, and evidence dates in the offer PDF.

Q43 — POLICY_NEEDED: Repairs Contingency (by scope & market volatility)
A43 — Summary → Bands → Evidence → Actions
Bands:
• Light (paint/fixtures, ≤$20k): 10% contingency.
• Medium (kitchen/bath/roof or MEP touch): 15%.
• Heavy (structural, cast iron/aluminum wiring, multi-system): 20–25%.

Evidence: 2025 construction input prices showed ongoing volatility (BLS PPI & industry analyses mid-2025), justifying higher buffers on heavy scopes. (Bureau of Labor Statistics)

Actions: Require photo-backed scope or GC bid; auto-escalate contingency 5 pts if bids missing at contract.

Q44 — POLICY_NEEDED: Sell/Close Cost Policy (who pays what; how we model)
A44 — Summary → Components → Evidence → Actions
Components we always model (path-dependent):

Title premium per F.A.C. 69O-186.003 (promulgated) with tiering & reissue rules. (Legal Information Institute)

Doc stamps on deed per Florida DOR — $0.70 per $100 (non–Miami-Dade). (Florida Dept. of Revenue)

Recording, lien/estoppel/municipal searches, HOA estoppel (statutory timing handled in Q28).

Brokerage/marketing for List/MLS paths — [INFO NEEDED: listing agreement % and inclusions].

Buyer concessions (use ZIP SP/LP & weekly showings triggers; Q29–Q30).

Policy: Default to seller pays deed stamps & owner’s title (local custom), but treat as negotiable—we model both when variance is likely.

Actions: Build calculator that itemizes promulgated premium + doc stamps + search/recording; require uploading the title quote PDF; block ReadyForOffer if missing. (Legal Information Institute)

Q45 — POLICY_NEEDED: Confidence Rubric (A/B/C) & Gates
A45 — Definition → Why it matters → Gates → Actions
A (Green): ≤90-day comps (≥3 AIV + ≥3 ARV), bindable insurance with 4-Point/RCF attached, title quote itemized, DOM/MOI ZIP table (≤30d old).

B (Amber): One element stale or missing but bounded by sensitivity bands (±2% ARV or ±$10k repairs).

C (Red): Multiple stale/missing; must run scenario_deltas and cannot progress past NeedsReview.

Gate: workflow_state = ReadyForOffer only if A or B and spread ≥ min band (Q46).

Actions: Show rubric badge + missing docs checklist on the offer.

Q46 — POLICY_NEEDED: Minimum Spread by Price Band (wholesale viability)
A46 — Summary → Bands → Rationale → Actions
Bands (wholesale MAO vs projected payoff):
• ≤ $200k ARV: $15k minimum spread.
• $200–400k ARV: $20k.
• $400–650k ARV: $25k.
• > $650k ARV: ≥ 4% of ARV (floor $30k).

Rationale: Fixed floors protect effort/risk costs; % floor at higher price points preserves risk-adjusted return while keeping offers respectful.

Actions: Encode as policy table; forbid ReadyForOffer if below band unless VP override with evidence memo.

Q47 — POLICY_NEEDED: Disposition Recommendation Engine (Cash/Wholesale vs List/MLS vs Wholetail)
A47 — Summary → If–Then → Overrides → Actions
If dtm ≤ 21 days or auction ≤14d → Cash/Wholesale bias; target same-week buyer.

If dtm ≥ 60 days, property insurable, DOM/MOI favorable (MOI ≤ 3, DOM_ZIP ≤ 30) → List/MLS bias.

If cosmetic + insurable + FHA anti-flip window still running → Wholetail bias timed to clear program rules (see Q36).

Overrides: Condo warrantability/non-warrantable → cash/portfolio; PACE/solar/UCC unresolved → cash or list-as-is with discount (Q32–Q33).

Actions: Print recommendation with 3 evidence bullets (dated) and a sensitivity line.

Q48 — POLICY_NEEDED: Rounding & Anchors
A48 — Summary → Rule → Psychology → Actions
Rule: Respect-Floor offers anchor at $X,900; counter-offers step in $2,500–$5,000 ticks; buyer-facing asks anchor at $X,990.

Psychology: Keeps perceived flexibility while preserving spread; round choices only relax when comps clearly justify round prices.

Actions: Auto-round in UI; display pre-round and final to maintain transparency.

Q49 — POLICY_NEEDED: Speed Bands (DOM/MOI → negotiation style)
A49 — Summary → Bands → Behavior → Actions
Speed bands (based on ZIP stats, ≤90d window):
• Fast: MOI ≤ 2 and DOM ≤ 20 → open closer to Buyer Ceiling; shorter inspection; smaller credits.
• Balanced: MOI 2–4 or DOM 21–45 → standard posture.
• Slow: MOI > 4 or DOM > 60 → widen spread, longer DTM, heavier contingency.

Actions: Show current band on the offer; link to MLS ZIP stat extract (dated). (Use Stellar MLS pulls per Q18–Q30.) (Public)

Q50 — POLICY_NEEDED: Evidence Freshness & Citations (hard rule)
A50 — Summary → Rule → Actions
Rule: Every decision bundle must include at least 3 load-bearing, absolute-dated facts (e.g., “Doc stamps $0.70/$100—DOR GT-800014, last accessed Oct 2025”; “Title premium tier per FAC 69O-186.003, current as posted Oct 2025”; “Flip ROI context ATTOM Q2-2025, posted Sep 17, 2025”). (Florida Dept. of Revenue)

Actions: Block ReadyForOffer if any citation link is missing or >90 days stale (except statutes/regs).

Assumptions & Human Inputs (final-part appendix)
These are placeholders used only when live data is missing. Replace with the exact docs/data listed. Do not bake assumptions into answers.
Buyer_Target_Margin (flip/wholetail): Using policy baselines from Q41 until buyer-specific LOIs arrive.
• Evidence considered: ATTOM Q2-2025 ROI (25.1% gross), local flip margin compression in 2025. (ATTOM)
• Sensitivity: ±2% margin ≈ ±$7.2k on each $360k ARV.
• To replace: Buyer term sheet or LOI with target margin and cost stack.

Contingency% (repairs): Using Q43 scope bands.
• Evidence considered: BLS PPI Aug-2025 + ABC analysis (material volatility). (Bureau of Labor Statistics)
• Sensitivity: ±5 pts contingency on $40k repairs = ±$2k MAO delta.
• To replace: GC bid(s) + materials quotes.

Insurance bindability: Pending 4-Point/RCF.
• Evidence considered: Citizens bulletin Mar 20, 2025 form updates. (Public)
• Sensitivity: If binding_ok=false, expect additional ±$2–5k concessions or pivot path.
• To replace: 2 bindable quotes + 4-Point + Wind-Mit/RCF.

Sell/Close Costs: Title premium & doc stamps modeled; brokerage % pending.
• Evidence considered: FAC 69O-186.003; DOR doc stamps. (Legal Information Institute)
• Sensitivity: ±1% brokerage on $360k = ±$3.6k.
• To replace: Executed listing agreement + title quote PDF.

Days-to-Money (DTM): Computed per Q2; holidays/buffers may shift.
• Evidence considered: Auction docket / manual target; insurance & title readiness.
• Sensitivity: +15 days adds ≈ +½ month carry.
• To replace: Court docket URL, title “clear to close” email, insurance bind confirmation.

Sequence Health Check: Delivered: Parts 1–5 (+ Appendix). This turn: Compact one-pager summary for field use. Remaining: None (you’re fully equipped).
Central FL Underwriting — Decision One-Pager (Orange • Osceola • Polk) 0) Control Dials (set before you start)
Objective Priority: ☐ Speed>Certainty>Net ☐ Net>Speed>Certainty

Default Path Bias: ☐ Cash/Wholesale ☐ List/MLS

Conservatism (1–10): ☐1 ☐3 ☐5 ☑7 ☐9

Offer Psychology: ☑ Respect-Floor ON • ☑ Charm rounding ($X,900 / $X,990)

Evidence Window: ☑ ≤90d primary; expand to 6–12m if sparse

1. Inputs (must-have to reach “ReadyForOffer”)
   Market: AIV, ARV, DOM_zip, MOI_zip, price_to_list_pct, comp sets (≥3 as-is + ≥3 ARV, ≤90d)
   Costs: Repairs_base (+ contingency), monthly carry (tax/ins/HOA/utilities), disposition %
   Debt/Payoffs: Senior principal, per-diem + basis, good-thru date; juniors; HOA/muni arrears
   Timeline: Auction date? days_to_ready_list, manual target (if any)
   Status & Feasibility: Occupancy, insurance bindability (4-Point/Wind-Mit/RCF), title quote PDF
   Edge Flags (if applicable): FIRPTA, PACE, Solar/UCC, Condo (SIRS/Milestone), FHA/VA flip timing, Manufactured (HUD/RP), SCRA

2. Orchestrator (deterministic pipeline)
   Days-to-Money (DTM): earliest of auction / manual / default cash close (≥today).

Carry: months = ceil(DTM/30) × (tax+ins+HOA+utilities).

Resale Costs: path-dependent % (title/brokerage/marketing/recording, etc.).

Buyer Ceiling: ARV × (1 − Buyer_Target_Margin) − Repairs − Buyer_Costs − Carry.

AIV Safety Cap: cap initial exposure at AIV×(cap_pct policy).

Floor_Investor = max(AIV × (1 − p20_zip), AIV × (1 − typical_zip))

Operational floor used in offers & triage:
Respect-Floor = max(Floor_Investor, PayoffClose + Essentials)

MAOs: wholesale / flip / wholetail = clamp(buyer_ceiling, aiv_cap, path margins).

Projected Payoff: senior + per-diem accrual + juniors + arrears/fines (basis per payoff).

Shortfall: payoff − chosen MAO (per Default Path Bias).

Bands & Sweet Spot:

Seller Offer Band = [Respect Floor, min(MAO_flip, AIV)]

Buyer Ask Band = [MAO_wholesale, Buyer Ceiling]

Sweet Spot = midpoint of overlap; if none → GAP (propose terms/timing to create overlap).

Confidence & State: score A/B/C → evaluate_workflow_state → NeedsInfo / NeedsReview / ReadyForOffer.
Output bundle: { buyer_ceiling, mao{...}, respect_floor, payoff_projected, shortfall, bands{...}, confidence, workflow_state, recommendation }

3. Fast Policy Locks (for consistency)
   Buyer Target Margins (end-buyer viability): Flip ~18% (band 15–22%); Wholetail 10–14%; BRRRR via DSCR ≥1.25x + ZIP cap target.

AIV Cap: Default 0.97×AIV (up to 0.99× with insurable+title-clear+fast-zip & approval).

Repairs Contingency: Light 10% • Medium 15% • Heavy 20–25% (auto +5 pts if no bids).

Minimum Spread (wholesale vs payoff):
≤$200k ARV: $15k • $200–400k: $20k • $400–650k: $25k • >$650k: ≥4% of ARV (floor $30k).

Speed Bands (by ZIP): Fast (MOI≤2 & DOM≤20) • Balanced (MOI 2–4 or DOM 21–45) • Slow (MOI>4 or DOM>60).

Rounding: Offers at $X,900; buyer-facing asks at $X,990; counter ticks $2.5k–$5k.

4. Hard Gates (auto stop or NeedsReview)
   Missing critical fields or stale comps (>90d)

Insurance not bindable (4-Point/RCF fail) or title show-stoppers

Bankruptcy stay active

PACE unresolved for financed exits

Condo SIRS/Milestone indicating non-warrantable without a cash/portfolio plan

FHA flip timing (<91 days) for retail FHA

Manufactured missing HUD labels/data plate/foundation cert/retired title

SCRA positive result → legal track

5. Evidence Pack (attach every time)
   Comps: two grids (As-Is & ARV), ≤90d, photo parity, adjustment notes

ZIP stats: DOM, MOI, price-to-list, 4-week showing/markdown signals

Insurance: 2 bindable quotes + 4-Point + Wind-Mit/RCF

Title: itemized quote (promulgated premium, endorsements, searches, doc stamps)

Debt: payoff letter (per-diem & basis), juniors, HOA/muni ledgers

Edge Docs (if triggered): FIRPTA pack, PACE payoff, UCC-1 terminations, Condo SIRS/Milestone, FHA/VA timing memo, HUD/IBTS/foundation cert, SCRA printout

6. Negotiation Play (openers & ladders)
   Anchor at Respect Floor ($X,900).

Concede in planned ticks; trade price for speed, certainty, or clean terms (as-is, short inspection, no seller credits).

If GAP, create overlap with timing (list late), credits, or wholetail timing to clear flip rules.

7. Owner Checklist (data you must keep fresh)
   Weekly: ZIP discount P20, DOM/MOI/SP:LP/showings; cap-by-ZIP table; buyer margin survey

Per-deal: bindable insurance + 4-Point/Wind-Mit; title quote; payoff letter; HOA/condo estoppels; edge-case evidence (as triggered)

8. What “ReadyForOffer” looks like (green light)
   Confidence A or B, min spread met, gates clear, citations/evidence attached, sweet spot identified, rounding applied, and a one-line recommendation with the 3 most load-bearing facts (dated).

PART 1 — Front Matter & Blueprint
Navigator (this part): 1 Title Page • 2 Executive Summary • 3 How to Use This Manual • 4 Canonical Table of Contents • 5 Editorial Rules • 6 Abbreviations & Acronyms • 7 Conflicts & Open Questions (initial) • 8 Change Log (start) • 9 Resolution Log (start)
What’s New in This Part: Adopted a research-first conflict-resolution policy; verified key Florida statutory/rate anchors; tightened “no-invention” and tagging rules; added Resolution Log (see §9).

1. Title Page
   Document: HPS In-House Underwriting Manual — Audit-Ready Edition
   Version: v2.0 (model_rules_version) — as of 2025-10-09 (America/New_York).
   Owner: [INFO NEEDED] (role/title + email)
   Jurisdiction Focus: Florida (Central FL emphasis: Orange, Osceola, Polk) — broaden as source permits.
   Disclaimer (verbatim from source):
   “We are not attorneys or a law firm. We do not provide legal advice. If you need legal advice, consult a licensed attorney. For bankruptcy services, we may provide administrative form-preparation assistance consistent with 11 U.S.C. §110.”

2. Executive Summary (≤1 page)
   This manual consolidates the HPS in-house underwriting policies, formulas, variables, and decision gates into an audit-ready, book-style reference. Every rule, threshold, and calculation is preserved from the source; language is reorganized for clarity without adding new policy. Any ambiguity is tagged (e.g., [INFO NEEDED], [CITE NEEDED]) and logged.
   Research-first conflict resolution. When the source shows conflicting rules/figures, we (i) capture both versions verbatim with exact citations; (ii) resolve using authoritative hierarchy—statute/regs → official agency/insurer → MLS/association → promulgated schedules → industry standards; (iii) mark [RESOLVED] with full citations + as-of date; (iv) if unresolvable, propose [RECOMMENDED POLICY] (pending owner approval) with a brief business rationale that optimizes profit, client trust, and investor returns without reducing compliance; (v) record impacts to dependent math; and (vi) log the decision. See §5.4 and §9.
   Core anchors verified (as of 2025-10-14):
   • FL deed documentary stamp tax on deeds: $0.70 per $100 (non-Miami-Dade). [RESOLVED] (Florida DOR). (Florida Dept. of Revenue)
   • Title insurance premiums: F.A.C. 69O-186.003 governs rate schedule. [RESOLVED] (Florida CFO/DFS explainer + rule text). (FLDFS)
   • Citizens 4-Point & Roof forms: updated 03/20/2025; use these (or later) to prove insurability. [RESOLVED] (Citizens). (Public)
   • HOA/Condo estoppel windows: issue within 10 business days after proper request. [RESOLVED] (F.S. 720.30851 & 718.116(8)). (Legislature of Florida)
   Profit / client / investor optimization rule (tie-breakers): When multiple compliant options remain, prefer choices that raise expected net profit and reduce timeline risk, improve transparency (trust), and preserve buyer velocity and returns—never at the expense of compliance.

3. How to Use This Manual
   Audience. Acquisitions, Underwriting, Dispositions, and Transaction Coordination (Acq, UW, Dispo, TC). Weekly cross-team calibration is already embedded in operating rhythm.
   Scenarios.
   • Fast Cash/Wholesale vs. List decisioning under time pressure (insurability + urgency).
   • Cost stack modeling (doc stamps, title, carry) and Buyer Ceiling enforcement.
   • Respect Floor computation and neighborhood investor-discount data.
   Quick navigation. Use the numbered headings (1, 1.1, 1.1.1). Cross-references point to sections, e.g., “See §9.2”.
   Evidence discipline. Every offer or list recommendation should attach: 4-Point/Wind-Mit forms (current edition), bindable insurance (<30 days old), payoff letters with per-diem, HOA/COA estoppels, and MLS comp tables per windows defined later. Missing inputs must be tagged [INFO NEEDED] and may block publishing in certain gates (see carry/insurability blocks in §§8, 10).

4. Canonical Table of Contents (3 levels deep)
   Front Matter & Blueprint (this part)
   1.1 Title Page
   1.2 Executive Summary
   1.3 How to Use This Manual
   1.4 Canonical Table of Contents
   1.5 Editorial Rules
   1.6 Abbreviations & Acronyms
   1.7 Conflicts & Open Questions (initial)
   1.8 Change Log (start)
   1.9 Resolution Log (start)

Variable Map & Data Contract
2.1 Canonical variables (deal.market._, deal.costs._, deal.fees._, deal.debt._, deal.timeline._, deal.status._, deal.confidence.\*) — as named in source
2.2 Definitions, units, allowed ranges (as present)
2.3 Cross-references to producers/consumers

Intake & Evidence Protocol
3.1 Required intake artifacts (payoffs, estoppels, insurance, comps)
3.2 Documentation standards; save paths; “as-of” dating
3.3 Data completeness meter; blocking logic (if present)

Valuation & Comps
4.1 AIV/ARV concepts; comp selection; adjustments
4.2 Evidence windows; DOM/MOI usage
4.3 Confidence scoring; tables as present

Repairs & Scope of Work
5.1 SOW & contingency tiers (by risk/visibility)
5.2 Permit and 50% flood rule notes (if present)
5.3 Tie-ins to MAO

Transaction Costs & Fees
6.1 Buy-side and sell-side line items
6.2 Statutory/regulated rates (doc stamps; title rate schedule)
6.3 Footnoting rules; “as-of” dating

Debt, Liens, Payoffs
7.1 Senior/junior debt; per-diem; payoff math
7.2 HOA/COA arrears, fines; municipal liens
7.3 Short-pay / reinstatement concepts

Timeline & Carry
8.1 DOM bands and carry months formula (cap)
8.2 Holding cost stack; placeholder rules; blocking conditions
8.3 Timeline interactions with financing/exit strategy

MAO, Buyer Ceiling, Spread
9.1 MAO cap vs. AIV; guardrails (0.97×AIV)
9.2 Buyer Ceiling (Max_Buyer) definition & clamp
9.3 Negotiation bands; “Respect Floor” integration

Risk Gates & Hard Stops
10.1 Insurability gate (Citizens forms 03/20/2025+)
10.2 Bankruptcy/insurability/permit hazards (as present)
10.3 Pass / Watch / Fail language (as written)

HOA / Condo / Permits
11.1 Estoppel timing and fee caps (F.S. 720.30851; 718.116(8))
11.2 Permit pathways; 4-Point/insurance ties (as present)
11.3 Condo warrantability; SIRS/Milestone (as present)

Scenarios & Negotiation Bands
12.1 Keep vs. Sell logic; novation/short-sale gates (as present)
12.2 “Respect Floor/Buyer Ceiling” overlap rules
12.3 Scripts/micro-scripts (only if in source)

Tools, Templates, Checklists & Scripts
13.1 Intake / Title / Insurance / Tenant checklists
13.2 Threshold charts & tables (re-tabulated)
13.3 Example workups (if present)

Back Matter
14.1 Glossary (final, canonical)
14.2 Index (A–Z, with synonyms)
14.3 Appendices (forms, references)
14.4 Final “Conflicts & Open Questions” register
14.5 Final Change Log & Resolution Log

5. Editorial Rules
   5.1 No Invention / No Omission
   No invention: No new numbers, rates, or examples beyond the source unless explicitly marked [RECOMMENDED POLICY] (pending owner approval).

No omission: Deduplicate by consolidating; preserve every substantive fact, formula, and caveat.

5.2 Normalization & Numbering
Headings use 1, 1.1, 1.1.1.

Normalize synonyms (e.g., “MAO”, “Max Offer”)—choose the dominant term used in source and map synonyms in the Glossary.

Variables: Keep exact keys from source (do not rename).

5.3 Tagging Ambiguity
Use [INFO NEEDED], [CITE NEEDED], [DATE NEEDED], [JURISDICTION NEEDED] inline. Block outputs where the source instructs a block (e.g., carry inputs missing).
5.4 Research-First Conflict Resolution (authorized)
Hierarchy (highest→lowest): Statutes/regs & official schedules → Official agency/insurer sources → MLS/association rules → Promulgated rate tables → Industry standards (only if above are silent).
Workflow:
Capture both versions verbatim with exact line/section cites.

Research per hierarchy.

Decide canonical rule; mark [RESOLVED] with citations + as-of date.

If unresolved: write [RECOMMENDED POLICY] (pending owner approval) with short rationale optimizing profit/trust/velocity, and log in §7 with a due date for sign-off.

Record a “Resolution Impact” note (affected formulas, gates).

Log details in §9 Resolution Log.

5.5 Profit / Client / Investor Optimization (tie-breakers)
When multiple compliant options remain after research, prefer the path that (a) increases expected net profit and reduces timeline risk; (b) increases client trust (transparent show-work, dated sources); (c) maintains investor velocity/returns; never reduces compliance or misstates statutory costs.

6. Abbreviations & Acronyms (initial draft; will expand in Part 14)
   AIV — As-Is Value.
   ARV — After-Repair Value. (source-wide)
   MAO — Maximum Allowable Offer; cap ≤ 0.97×AIV.
   DOM — Days on Market.
   MOI — Months of Inventory.
   HOA/COA — Homeowners/Condo Association. (source-wide)
   4-Point / Wind-Mit / RCF-1 — Insurance inspection forms (Citizens).
   DFS / OIR — Florida Department of Financial Services / Office of Insurance Regulation. (rate/title context)
   DOR — Florida Department of Revenue (doc stamps).
   FR/Bar — Florida Realtors/Florida Bar “AS IS” form set.
   DSCR — Debt Service Coverage Ratio.
   FMR — HUD Fair Market Rent.
   SIRS — Structural Integrity Reserve Study.
   SP/LP — Sale-to-List Price ratio.

7. Conflicts & Open Questions — Initial Register
   Status key: [RESOLVED] (with citations) • [OPEN] (needs owner sign-off or evidence) • [INFO NEEDED] (data/input missing) • [RECOMMENDED POLICY] (pending approval)
   C-001 — Doc stamps rate phraseology.
   Source: “Doc stamps (resale deed): $0.70 per $100 (non–Miami-Dade). Florida DOR confirms…”
   Status: [RESOLVED] Canonical: $0.70 per $100 for deeds (outside Miami-Dade). Authority: Florida DOR “Documentary Stamp Tax” (as of 2025-10-14). Impact: Confirms Buyer_Costs in §6 and Max_Buyer in §9.2. (Florida Dept. of Revenue)

C-002 — Title premium schedule link.
Source: “Title premiums: must follow FAC 69O-186.003 (official rule gateway, accessed Oct 2025).”
Status: [RESOLVED] Canonical: Rates governed by F.A.C. 69O-186.003. Authority: Florida CFO/DFS explainer (as of 2025-10-14) + published rule text (LII reproduction). Impact: Footnote template in §6.2; Net Sheet footers. (FLDFS)
Note: Add official FLRules portal URL in Part 14 Appendix when available. [CITE NEEDED] placeholder remains for a direct FAC hosting link (see §14 plan).

C-003 — Citizens inspection forms edition.
Source: “Use current Citizens 4-Point/Wind-Mit (03/20/2025 or later)… forms and bulletin: Insp4pt 03 25 and RCF-1 03 25.”
Status: [RESOLVED] Canonical: Use Citizens forms dated 03/20/2025 or later. Authority: Citizens Form Updates (03/20/2025). Impact: Insurability gate (§10.1) + Listing gate; blocks list-path without a pass or bindable quote ≤30 days. (Public)

O-004 — Owner of this manual.
Source: Not explicitly stated. Status: [INFO NEEDED] Provide owner name/title/email for §1 and change-control.

O-005 — Respect Floor data feed (Local_Discount_20thPctZIP).
Source: Dataset design present; live inputs not attached.
Status: [INFO NEEDED] Provide CSV/monthly pipeline to finalize anchors used in §§4, 9, 12.

O-006 — Carry placeholder and blocks.
Source: Carry_Months formula & blocking rule; $1,250/mo placeholder when inputs missing.
Status: [OPEN] Confirm whether placeholder value is a fixed business policy or subject to county-specific updates.

O-007 — Commission/concession bands at price tiers.
Source: “≤$400k → 6%; $400–800k → 5.5%; >$800k → 5% … Concessions 1% base; 2% FHA/VA.”
Status: [OPEN] Treat as business policy; provide owner sign-off + periodic review cadence.

8. Change Log (start now; append per part)
   2025-10-14 (Part 1 re-issue):
   • Adopted Research-First Conflict Resolution (see §5.4).
   • Verified statutory/rate anchors (doc stamps, title rates, Citizens forms, HOA/COA estoppels) and logged [RESOLVED] entries.
   • Tightened “no-invention” rule and tagging; removed non-sourced framework mentions from Part 1.
   • Stood up Resolution Log (§9) and initial Conflicts/Open Questions (§7).

Delta from Previous Draft (why it changed):
Removed generic security/governance frameworks not present in the source; if later recommended, they will be labeled [RECOMMENDED POLICY] pending approval.

Replaced paraphrased disclaimers with exact quoted text from source.

Added authoritative links and as-of dates to rate/estoppel anchors.

9. Resolution Log (start)
   Each entry lists: Topic • Old vs. New • Sources (with as-of date) • Resolution Impact.
   R-001 — FL Doc Stamps on Deeds
   Old (source): “Doc stamps (resale deed): $0.70 per $100 (non–Miami-Dade).”

New (canonical): Same; [RESOLVED] using Florida DOR official guidance (as of 2025-10-14). (Florida Dept. of Revenue)

Impact: Confirms Buyer_Costs inputs in §6; stabilizes Max_Buyer calc in §9.2; no math change.

R-002 — Title Insurance Rate Schedule
Old (source): “Must follow F.A.C. 69O-186.003 schedule.”

New (canonical): Same; [RESOLVED] using Florida CFO/DFS explainer and rule text (as of 2025-10-14). (FLDFS)

Impact: Footnote templates for Net Sheet in §6; ensures no off-schedule premiums are modeled.

R-003 — Citizens 4-Point / Roof Forms Edition
Old (source): “Use 03/20/2025 or later forms; bindable quote ≤30 days old required for listing.”

New (canonical): Same; [RESOLVED] via Citizens bulletin (as of 2025-10-14). (Public)

Impact: Maintains Insurability Gate in §10.1 and List-path block; aligns with storm binding suspensions protocol referenced in source.

R-004 — HOA/Condo Estoppel Timelines
Old (source): “Statutory 10 business-day window after request.”

New (canonical): Same; [RESOLVED] using F.S. 720.30851 and 718.116(8) (as of 2025-10-14). (Legislature of Florida)

Impact: Confirms close-timeline dependencies in §§8 and 11; preserves Day-0 ordering guidance.

Cross-Reference Map (key forward links)
Statutory costs & premiums → §6.2 (with footnote templates).

Carry & blocking logic → §8.2.

MAO cap and Buyer Ceiling → §9.1–§9.2.

Insurability gate & forms → §10.1.

HOA/Condo estoppels → §11.1.

Appendices-in-Progress (Part 14 will contain links)
Florida DOR Documentary Stamp Tax (as of 2025-10-14). (Florida Dept. of Revenue)

Title Insurance Rates (F.A.C. 69O-186.003) — DFS explainer + rule text (as of 2025-10-14). (FLDFS)

Citizens 4-Point & Roof Forms Update (03/20/2025) (as of 2025-10-14). (Public)

HOA/Condo Estoppels (F.S. 720.30851; 718.116(8)) (as of 2025-10-14). (Legislature of Florida)

PART 2 — Variable Map & Data Contract
Navigator (this part)
• 2.1 Canonical Tokens & Variables (by category)
• 2.2 Core Derived Variables & Formulas (source definitions only)
• 2.3 Producers ↔ Consumers Map (where each field is computed/used)
• 2.4 Validation, Ranges & Blocking Rules (what stops an output)
What’s New in This Part (as of 2025-10-14)
• Established a single, canonical token/variable set directly from the source, grouped for auditability.
• Linked every field to its computation/use section and flagged missing/ambiguous items with [INFO NEEDED]/[CITE NEEDED].
• No external add-ons introduced; only source-backed definitions included.

2.1 Canonical Tokens & Variables (by category)
Rule of use: Keep names exactly as in the source. Do not rename keys. If a field is missing at render, insert the placeholder “[INFO NEEDED: …]” in the output (per token schema).
2.1.1 Identity & Property
@Lead_ID, @First_Name, @Last_Name, @Phone, @Email — Contact identifiers. Mask sensitive fields in public outputs; include in JSON.

@Property_Street_Address, @Unit, @City, @County, @State, @Zip — Subject address fields.

@Beds, @Baths, @Sqft, @Year_Built, @Lot_Size, @Occupancy_Status — Basic physical/occupancy attributes.

Evidence/Citations: Token schema and masking rules.
Cross-Refs: See §3 (Intake & Evidence Protocol) for collection standards.

2.1.2 Valuation & Market
@AIV, @ARV — As-Is Value; After-Repair Value (defined and used throughout; see §4 for valuation). Tokens exist; detailed comps rules appear elsewhere.

DOM_zip, MOI_metro / @DOM_Zip, @MOI_Zip — Days-on-Market (zip); Months of Inventory (metro/zip). Weekly/monthly refresh cadence and sources enumerated; store capture date.

@SP_LP_Zip, @Cash_Share_Zip, @Reductions_Share_Zip — Zip-level market context fields for negotiation and speed banding.

Policy/Logic: Speed bands influence margin targets; use zip DOM to set flip margin ranges.
Cross-Refs: §4 (Valuation & Comps), §8 (Timeline & Carry), §12 (Scenarios & Negotiation).

2.1.3 Repairs & Scope
@Repairs_Base, @Repairs_Low, @Repairs_High — Repair estimates (bands). Tokens specified; detailed SOW rules appear later.

Cross-Refs: §5 (Repairs & Scope of Work).

2.1.4 Debt, Liens & Payoff
@Payoff_Quoted — Latest written payoff used. Verbal figures not allowed.

@Per_Diem — Daily accrual used in payoff math.

@Liens_Total — Total liens other than senior payoff.

PayoffClose — Calculated payoff to close date: Payoff0 + PerDiem × Days + Servicer Fees/Advances. Written payoff only; never verbal.

Cross-Refs: §7 (Debt, Liens, Payoffs), §12 (Scenarios).

2.1.5 Costs, Fees & Carry
@Taxes_Annual, @Insurance_Annual, @HOA_Dues, Utilities — Inputs to monthly hold. Property-specific quotes required.

Carry_Months — Derived (see §2.2). Cap ≤ 5.0 months.

Hold_Monthly — Derived (see §2.2).

Buyer_Costs (modeled line-item) — Deed doc stamps; title premium per promulgated schedule; recording/closing; financing taxes if applicable. Composite fallback 9.5% shown only when parts missing and clearly labeled [INFO NEEDED].

Cross-Refs: §6 (Transaction Costs & Fees), §8 (Timeline & Carry), §9 (MAO…).

2.1.6 Offers, Dispo & Economics
@Instant_Cash_Offer, @Wholetail_Offer — Presented outputs (rendering specifics elsewhere).

@Net_To_Seller_List, @Net_To_Seller_Cash — Modeled nets for comparison.

@Assignment_Fee, @Flip_Margin — The @Assignment_Fee is the calculated gross profit from a wholesale transaction, representing the spread between the HPS contract price and the end-buyer assignment price. It is a variable outcome, not a pre-set parameter.

Respect_Floor — Seller floor price anchor (definition & formula in §2.2).

Max_Buyer (Buyer Ceiling) — Maximum price at which target buyer still meets returns (definition & formula in §2.2).

Cross-Refs: §9 (MAO, Buyer Ceiling, Spread), §12 (Scenarios & Negotiation Bands).

2.1.7 Risk, Confidence & Status
@Confidence_Grade — A/B/C with evidence criteria (recency, count, variance, DOM).

@Title_Risk_Score — Token present; scoring details elsewhere [INFO NEEDED].

@Insurance_Flag, @Insurance_Premium_Delta — Insurance feasibility and premium deltas (quotes/forms required; see Insurance Gate).

@Storm_Status — Used for “Storm Pause” protocol (binding suspensions).

@Urgency_Band, @Auction_Date — Timing urgency and trustee/auction dates for path selection.

Cross-Refs: §10 (Risk Gates & Hard Stops), §11 (HOA/Condo/Permits).

2.1.8 System/Meta
@Model_Version — Version-stamp for outputs/audit.

2.2 Core Derived Variables & Formulas (source definitions only)
Editorial rule: We only restate formulas present in the source. No new math is introduced. Where inputs are not explicit, we mark [INFO NEEDED].
2.2.1 Carry & Hold
Policy / Logic
Carry time reflects zip-speed plus escrow; cap conservatism prevents overexposure.
Decision Logic (If–Then)
• If any carry input missing → BLOCK final nets/MAO PDF; show fetch list.
Formula / Calculation
Carry_Months = min( (DOM_zip ÷ 30) + (35 ÷ 30), 5 )

Hold_Monthly = (Taxes/12) + (Insurance/12) + (HOA/12) + Utilities

Carry_Total = Carry_Months × Hold_Monthly

Risks & Mitigations
Insurability risk → require current Citizens 4-Point & Roof forms (03/20/25 editions) before retail paths.
Actions / Checklist
Pull tax bill, bindable HOI (≤30 days), HOA dues/estoppel, 12-mo utilities; replace any placeholder ($1,250/mo) immediately.
Cross-References: §8.

2.2.2 Respect_Floor (Seller Floor Anchor)
Policy / Logic
Protects seller dignity and prevents overpaying; uses investor discount distribution or payoff-to-close.
Formula / Calculation
Respect_Floor = max( AIV × (1 − Local_Discount_20thPctZIP), AIV − Typical_Investor_DiscountZIP, PayoffClose + Essential_Costs )
Data Definitions / Method Snippets
Local_Discount_20thPct ZIP distribution from recorded cash deeds joined to MLS; rolling 90d, n thresholds; recency decay when expanding window.

Until dataset live: default Typical_Investor_Discount ~20–25% only when ≥10 local investor comps corroborate; else anchor on payoff branch.

Risks & Mitigations
Thin sample sizes → fallbacks & confidence downgrades (C).
Cross-References: §4, §9, §12.

2.2.3 MAO Cap
Policy / Logic
Cap offers at a fraction of AIV to avoid chasing retail.
Formula / Calculation
MAO_cap = 0.97 × AIV (As-Is − 3%).
Actions
Enforce cap; log any Advisor Override (Q62).
Cross-References: §9.

2.2.4 Buyer Ceiling (Max_Buyer)
Policy / Logic
Discipline disposition pricing to what qualified buyers can pay while meeting their return targets.
Formula / Calculation
Max_Buyer = ARV × (1 − Buyer_Target_Margin) − Repairs − Buyer_Costs − Carry
Segments: flipper/landlord targets specified; Buyer_Costs explicitly include statutory deed stamps and promulgated title premiums.
Cross-References: §6 (cost inputs), §8 (carry), §9 (guardrails), §12 (bands).

2.2.5 Buyer_Costs (modeled)
Policy / Logic
Use line-item statutory math, not % shortcuts. Composite 9.5% only as a temporary transparency fallback with [INFO NEEDED] flags.
Key Rates / Components (as modeled in source):
Doc Stamps (Deed): $0.70 per $100 (non–Miami-Dade). Rate statement and examples appear repeatedly in the source.

Title Premium (Owner’s Policy): Promulgated schedule per F.A.C. 69O-186.003 (examples provided).

Note: Statutory verification log and external links live in Part 1 (Resolution Log & citations) and will be centralized in Part 14 Appendices. (Part-1 citations recorded; see “Title premiums” & “Doc stamps” entries.)
Cross-References: §6, §9.

2.2.6 Confidence_Grade (A/B/C)
Policy / Logic
Evidence-weighted confidence bands affect escalation and whether we show ranges vs. single points.
Scoring (snapshot in source):
A: ≥5 comps ≤6 months; ±15% GLA; ±10 yrs; variance (MAD/median) ≤10%; DOM trend stable |Δ median DOM| ≤10% m/m.
B: 3–4 comps ≤9 months or variance ≤15%; minor heterogeneity; DOM move ≤15% m/m.
C: Fewer/older comps/heterogeneous; DOM move >15% m/m.
Cross-References: §4 (Valuation), §10 (Risk Gates), §12 (Presentation choices).

2.2.7 Insurance Gate (Retail Paths)
Policy / Logic
Retail paths require insurability proof; forms matter (edition dates).
Decision Logic (If–Then)
If a storm watch triggers carrier binding suspension → pause until lifted; re-inspect roof.
Evidence / Citations
Citizens forms (Insp4pt 03 25; RCF-1 03 25) and bulletin noted in source.
Cross-Refs: §10 (Risk Gates), §11 (HOA/Permits for estoppels/eligibility).

2.3 Producers ↔ Consumers Map (where each field is computed/used)
Legend: Produces = first computation/definition appears. Consumes = displayed or used in downstream math/logic.
@AIV, @ARV — Produces: §4 (Valuation & Comps). Consumes: §9 (MAO & Max_Buyer), §12 (Scenarios).

DOM_zip, MOI_metro/@DOM_Zip, @MOI_Zip — Produces: §4 (speed inputs pulled via Redfin/ORRA cadence). Consumes: §8 (Carry_Months), §9 (margin bands), §12 (price-drop schedule).

Respect_Floor — Produces: §9. Consumes: §12 (Seller Offer Band).

MAO_cap — Produces: §9. Consumes: §12 (offer bands/guardrails).

Max_Buyer — Produces: §9. Consumes: §12 (Buyer Ask Band; assignment vs. double close optics).

Carry_Months, Hold_Monthly, Carry_Total — Produces: §8. Consumes: §9 (Max_Buyer), §12 (nets/erosion).

Buyer_Costs — Produces: §6. Consumes: §9 (Max_Buyer), §12 (nets).

@Payoff_Quoted, @Per_Diem, PayoffClose — Produces: §7. Consumes: §12 (Cash Shortfall panels; reinstatement options).

@Confidence_Grade — Produces: §4/§10 (scoring + gates). Consumes: §12 (range vs. point; Borderline workflow).

@Insurance_Flag/@Insurance_Premium_Delta/@Storm_Status — Produces: §10/§11 (Insurance Gate + Storm Pause). Consumes: §8, §12.

2.4 Validation, Ranges & Blocking Rules
Policy / Logic
If any carry input is missing → hard BLOCK final Seller Nets/MAO PDF until quotes attached.

For token rendering, any missing field inserts [INFO NEEDED: …] and queues a fetch task.

Decision Logic (If–Then)
If Confidence = C → treat as borderline; escalate, prefer range anchors; defer to Desktop Val/inspection.

If auction/critical timer ≤ 10 days → escalate; default Cash path unless reinstatement proof present.

Ranges / Units (where stated in source)
Carry_Months: capped ≤5.0 mo. Unit: months.

Hold_Monthly: dollars/month. Components = Taxes, Insurance, HOA, Utilities.

MAO_cap: ≤0.97 × AIV. Unit: dollars.

Max_Buyer: formula-driven; buyer segment margin bands noted (flipper/landlord). Unit: dollars.

Buyer_Costs: statutory line-items (deed doc stamps, promulgated title premiums, plus closing/financing as applicable). Units: dollars & statutory rates; composite 9.5% only as placeholder with [INFO NEEDED].

Risks & Mitigations
Insurability/binding windows → maintain form edition discipline and storm-pause protocol.

Over- or under-estimating costs → always attach title quote and state statutory sources in footers.

Actions / Checklist
Enforce unit tests on token dictionary; preflight for required fields.

Stamp each market pull with date, window, sample size.

Evidence / Citations
See inline file citations above; statutory links are centralized in Part 14 (Appendices) with as-of dates logged in Part 1’s Resolution Log.

Cross-Reference Map (Part 2 → other parts)
Valuation & Market: §4 (AIV/ARV rules; speed inputs; comps), §10 (Confidence gates).

Repairs & Scope: §5 (SOW ranges & contingencies feed Repairs\_\*).

Costs & Fees: §6 (statutory components & quotes feed Buyer_Costs).

Debt & Payoffs: §7 (PayoffClose inputs, per-diem, lien math).

Timeline & Carry: §8 (uses DOM_zip; computes Carry_Months/Hold_Monthly).

MAO & Buyer Ceiling: §9 (uses AIV/ARV, Repairs, Buyer_Costs, Carry; sets MAO_cap, Respect_Floor, Max_Buyer).

Risk & Insurance gates: §10–§11 (feeds Insurance\_\* flags; estoppels/permits).

Scenarios & Negotiation: §12 (consumes offer bands; overlap manufacturing).

Tools & Checklists: §13 (intake, title, insurance, tokens QA).

Glossary — Updates (delta)
AIV / ARV — As-Is / After-Repair Value (see §4).

Carry_Months / Hold_Monthly / Carry_Total — Time & cost of hold; cap ≤5.0 mo.

Respect_Floor — Seller floor anchor (max of three branches).

Max_Buyer (Buyer Ceiling) — Buyer’s max price given margin/cost/carry.

Confidence_Grade (A/B/C) — Evidence-weighted confidence (recency/count/variance/DOM).

Conflicts & Open Questions — New/continued entries
C-201 — Title_Risk_Score definition
Status: Open — Token present; scoring rubric not specified in source.
Action: Owner to confirm rubric or remove token. Due: [DATE NEEDED]. Refs: token list.

C-202 — Buyer_Costs composite “9.5%”
Status: Open — Allowed only as a transparency fallback when line items incomplete; treat as placeholder with [INFO NEEDED].
Action: Maintain line-item statutory math as primary; log when composite is displayed. Refs: A7.

C-203 — DOM variable naming (“DOM_zip” vs token “@DOM_Zip”)
Status: Open — Both appear.
Recommended handling: Treat DOM_zip as the computation variable and @DOM_Zip as the render token; no renaming. Refs: DOM page & token list.

No statute-level conflicts surfaced in Part 2; statutory items are referenced but their full citations live in Part 1/14.

Resolution Log — Updates (as of 2025-10-14)
R-102 — Variable/operator casing
Topic: Preserve exact variable names and token casing as they appear.
Old vs New: Prior drafts loosely mixed token and variable casing; canonicalized by quoting source-exact names (e.g., Respect_Floor, Max_Buyer, @DOM_Zip).
Rationale: Audit traceability; aligns with token schema and formulas.
Impact: Improves searchability and reduces merge errors in exports.

(No external research required for Part 2; items above are internal normalizations only.)

Change Log — Part 2 entry (2025-10-14)
Added: Canonical variable/token inventory with category groupings and cross-references.

Added: Core formulas exactly as in source (Carry, Respect_Floor, MAO_cap, Max_Buyer) with citations.

Added: Blocking rules for incomplete carry inputs; token render fallback behavior.

Logged: Three open items (Title_Risk_Score rubric; 9.5% composite fallback guardrails; DOM naming duality).

Delta from Previous Draft
Reorganized variables into a single data contract with explicit producers/consumers and blocking logic.

Tightened citations to the source lines; removed any implied or industry-assumed fields not present in the document.

Ensured all placeholders are tagged [INFO NEEDED] where the source is silent.

PART 3 — Intake & Evidence Protocol
Navigator (this part): 3.1 What to Collect & Prioritization • 3.2 Documentation Standards & Save-Paths • 3.3 Data Completeness Meter & Blocking
What’s New in This Part (as of 2025-10-14): Consolidated intake artifacts into a single Day-0 playbook with proof gates; formalized documentation standards (“as-of” stamps, storage conventions); encoded blocking/aging rules for market feeds and carry inputs.

3.1 What to Collect; Evidence Sources; Prioritization Order
3.1.1 Day-0 Intake — Priority Evidence (Florida: Orange/Osceola/Polk)
Policy / Logic
Collect time-sensitive proofs on Day-0 to reduce timeline risk and unlock pathing (Cash/Wholetail vs List). Certain artifacts are statutory or carrier-gated and therefore must precede promises (e.g., ≤14-day close).
Decision Logic (If–Then)
If HOA/COA applies → Order estoppel on Day-0; do not promise ≤14-day close until request is submitted and ETA is confirmed in writing.

If Year_Built ≥ 20 years → Order Citizens 4-Point and (as applicable) Wind-Mit using 03/20/2025 forms; listing is blocked until insurability is proven.

If any carry input is missing (taxes/HOI/HOA/12-mo utilities) → BLOCK final Seller Nets/MAO PDF; show [INFO NEEDED] fetch list.

If payoff not on file → mark [INFO NEEDED] and obtain written payoff with per-diem and any advances/fees itemized.

Actions / Checklist (Day-0 to Day-3)
Open title; model doc stamps & finance taxes per FL statutes (net sheet).

Order estoppel (HOA/COA); note 10 business-day statutory window and internal T+7 escalation.

Trigger insurance: schedule 4-Point/Wind-Mit T+0–1d; report T+3d; obtain bindable quote ≤30 days pre-list.

Collect carry inputs: current tax bill, HOI quote, HOA dues/estoppel, 12-mo utilities.

Payoff: obtain written payoff with per-diem; schedule “refresh payoff” task at T+7d.

Photos/floorplan: shoot within 24–48h post-access; upload same day (supports valuation & marketing).

Evidence / Citations
HOA/COA estoppels timing & proof gate; Citizens forms update; carry inputs; vendor SLAs.
Cross-References
See §11.1 (Estoppels), §10.1 (Insurability Gate), §8.2 (Carry), §6.2 (Statutory costs), §7 (Payoff).

3.1.2 Market & Comps — Sources and Cadence
Policy / Logic
Use Stellar MLS ZIP-level feeds (DOM/MOI) as a weekly input; proposals must display as-of window, source, and sample size. Suppress list-first path if speed evidence is missing/thin.
Decision Logic (If–Then)
If DOM_zip missing or n < 10 → suppress List-first; escalate analyst review.

If the market feed is older than 7 days → raise Needs Analyst banner; refresh before publishing.

Actions / Checklist
Cron Mondays 6:00 ET; window trailing 90d; store fields {ZIP, sample_n, median_DOM, MOI, pull_ts, window}.

Save CSV next to proposal; feed downstream Q-cards; stamp proposal “As-of (window, source, n)”.

Evidence / Citations
Weekly ingest spec and gating rules.
Cross-References
See §4 (Valuation & Comps), §8.1 (Timeline & Carry), §12 (Scenarios & Negotiation).

3.1.3 Repairs & Scope — Early Evidence
Policy / Logic
“Move-In Ready” label (not pricing) if all-in scope ≤ $5,000; attach vendor quotes or invoices; apply contingency 10–20%.
Decision Logic (If–Then)
If quotes missing → auto-apply 15% contingency until quotes arrive ([INFO NEEDED] remains).

Evidence / Citations
Light-repairs threshold and guardrails.
Cross-References
See §5 (Repairs & Scope), §9 (MAO inputs).

3.1.4 Special Intake Tracks (Examples in Source)
FIRPTA screening: Capture seller status + W-9/W-8BEN-E; buyer occupancy intent; close date; 8288-B if pursued; apply default/residence-exception/withholding-certificate logic on net sheet.
PACE / non-ad-valorem: Pull full tax detail; determine payoff vs assumability; underwrite per agency guidance.
Cross-References
See §12 (Scenarios) & §6 (Fees/Taxes) for how these present in nets.

3.2 Documentation Standards; Citations Discipline; Save-Path Conventions
3.2.1 Proof & Dating Standards
Policy / Logic
Every published artifact must show date, source, and window/sample; time-sensitive proofs (payoff, insurance, estoppel) require clear as-of stamps and refresh tasks.
Decision Logic (If–Then)
If inspection scans >90 days old at list → auto-order refresh (proposed innovation pilot).

Actions / Checklist
Attach PDFs of Citizens 4-Point/Wind-Mit with inspector signatures + bind email from carrier.

Store estoppel request confirmation before promising compressed closes.

Cite payoff letter (date/time); schedule T+7d refresh.

Evidence / Citations
As above.

3.2.2 Save-Path Conventions & Storage
Policy / Logic
Store machine-readable datasets alongside proposals for audit traceability.
Actions / Checklist
Market CSV: save as zip_level_velocity_YYYYMMDD.csv next to proposal; cache summary in the underwriting tool.

Investor-discount CSV: save zip_level_discounts_YYYYMM.csv; monthly cadence; quarterly QA.

County portals: embed live links in proposal’s proof box; nightly link-check.

Evidence / Citations
Storage and link-check guidance.

3.3 Data Completeness Meter & Blocking Logic
3.3.1 Completeness & Blocks
Policy / Logic
Carry Inputs Block: If any carry input (taxes/HOI/HOA/12-mo utilities) is missing → BLOCK final Seller Nets/MAO PDF; show [INFO NEEDED] fetch list.

Market Freshness: If DOM/MOI feed older than 7 days → flag Needs Analyst; refresh before publish.

List-First Gate: If DOM_zip missing or n<10 → suppress List-first recommendation.

Insurability Gate: No listing without 4-Point/Wind-Mit 03/20/2025 forms and bindable quote (≤30 days).

Decision Logic (If–Then)
If storm watch triggers binding suspension → pause; re-inspect roof after lift.

Formula / Calculation (from source where explicit)
Per-Diem Burn (for urgency meter):
PerDiemBurn = Per-Diem (from payoff letter) × Days_to_event (display daily + weekly roll-up).

Risks & Mitigations
Over-promising close speed without estoppel confirmation → Proof Gate + disclosure.

Listing an uninsurable home → route to Cash/Wholetail until pass; watermark outputs “Uninsurable — Retail Blocked.”

Actions / Checklist
Enforce BLOCK states in the tool; publish only when all red tags are cleared.

Recompute PayoffClose with refreshed per-diem at each milestone.

Evidence / Citations
Blocking rules, per-diem formula, uninsurable track.
Cross-References
See §8 (Carry & Hold), §10 (Risk Gates), §12 (Scenarios & Negotiation Bands).

Cross-Reference Map (from this part)
Estoppels & Close Promises → §11.1; §8 timeline impacts.

Insurability & Listing → §10.1, §11.2.

Carry Blocks → §8.2; MAO/Buyer Ceiling touch §9.2 via Carry & Buyer_Costs.

Market Feed Freshness → §4 (comps); §12 (bands).

Glossary — Updates (delta)
Bindable Quote (HOI): Carrier offer eligible to bind; ≤30 days old at list time.

Estoppel (HOA/COA): Association certificate; ≤10 business-day delivery after proper request (statutory).

Per-Diem Burn: Daily interest (and fees when stated) from payoff × days-to-event; cited to payoff letter.

Needs Analyst Banner: UI state when critical market feed is >7 days old.

Conflicts & Open Questions — Additions
C-301 — Repair “Move-In Ready” label proofing
Issue: $5,000 threshold is a label only; requires vendor quotes; missing quotes trigger 15% contingency. Status: OPEN (operational discipline). Action: Require two quotes or recent invoices per file.

C-302 — Carry placeholder ($1,250/mo)
Issue: Placeholder appears when inputs unknown; confirm whether business-policy value is fixed or county-tuned. Status: OPEN. Action: Owner to confirm or replace with dynamic average.

C-303 — Market feed gating thresholds
Issue: Suppression at n < 10 and aging >7 days are present; confirm permanence vs pilot. Status: OPEN. Action: Owner sign-off.

Resolution Log — Updates (as of 2025-10-14)
R-201 — Estoppel proof gate before ≤14-day close promises
Old vs New: Language clarified to require written ETA before promising compressed close.
Source: Q-card guidance; statutory window reference. As-of: 2025-10-14.
Impact: Reduces fall-through risk; aligns close timelines in §8 and §11.

R-202 — Insurability gate artifacts
Old vs New: Confirmed 03/20/2025 Citizens forms as listing prerequisite; bindable quote ≤30 days.
Source: Q164/Q19. As-of: 2025-10-14.
Impact: Enforces retail path discipline (see §10.1).

(No external authorities were required to resolve contradictions in Part 3; items flagged remain operational approvals.)

Change Log — Part 3 entry (2025-10-14)
Added: Day-0 intake checklist with proof gates and vendor SLAs.

Added: Documentation standards (as-of stamps; PDF attachments; link-checks).

Added: Data completeness & blocking logic (carry inputs; DOM/MOI aging; list suppression thresholds).

Logged: Three open items (repairs label proofing, carry placeholder policy, market gating permanence).

Delta from Previous Draft
Unified intake artifacts into a single prioritized flow; tightened proof gates linked to statutory/carrier timelines.

Elevated aging rules (DOM/MOI >7 days) and added explicit “Needs Analyst” flag.

Moved per-diem burn into the completeness meter for urgency signaling, with payoff refresh cadence.

PART 4 — Valuation & Comps
Navigator (this part): 4.1 AIV & ARV Concepts • 4.2 Comp Selection Rules (SFR/TH, Condo) • 4.3 Adjustments & Normalizations • 4.4 Outlier Controls • 4.5 Weighting (Recency vs. Similarity) • 4.6 Confidence Scoring (A/B/C) • 4.7 Evidence Windows & Resolution • 4.8 Investor-Discount Dataset (Respect_Floor inputs) • 4.9 Workpapers & Transparency
What’s New in This Part (as of 2025-10-14): Consolidated all valuation policy into a single flow (filters → adjustments → outliers → weighting → confidence), preserved county/ZIP notes, and linked the investor-discount dataset method to Respect_Floor. No new numbers added; all logic reflects the source.

4.1 AIV & ARV — Concepts & Roles
Policy / Logic
ARV (After-Repair Value) is estimated from filtered, adjusted comps; AIV (As-Is Value) references the same engine less repair scope (used both for “as-is” equivalents and for Respect_Floor math). Cross-check AIV trend with county data to avoid drift.

Decision Logic (If–Then)
If AIV cross-check diverges from county trend materially → re-inspect comp set and repair assumptions before recommendation.

Cross-References
Confidence & escalation rules (§4.6, §4.2); MAO cap & Respect_Floor (§9).

4.2 Comp Selection Rules
4.2.1 SFR / Townhome (Primary Filter)
Policy / Logic
Use tight filters first, then relax in logged steps only if comp count is inadequate.
Primary Filter (apply all):
Radius ≤ 0.5 mi (same subdivision preferred)

GLA ±15%, year built ±10 yrs, lot class match (interior vs. water/conservation), sale recency ≤ 6 months

Garage/pool match where value-impactful

Escalation When <3 Comps Remain (log each step):
Expand radius to 1.0 mi

Expand recency to ≤ 9 months

Relax to GLA ±20% and year ±15 yrs

County/ZIP Notes:
Orange: deed-restricted subs often beat pure radius rules (favor inside-sub comps).

Polk: rural pockets frequently require Step-2/3 escalation.

4.2.2 Condo (Primary Filter)
Policy / Logic
Prefer same-complex comparables; otherwise, same submarket with tight tolerances.
Primary Filter (apply all):
Same complex first, else same submarket

GLA ±20%, floor ±3, HOA/amenity match, recency ≤ 6 months

Risks & Mitigations
Crossing school zones that drive ≥3% price deltas is a hard stop, unless same-subdivision shows price continuity; log the rationale.

Actions / Checklist
Auto-log every relaxation step and rationale; assign a provisional Confidence grade on completion. (Policy “as of” Oct 9, 2025.)

4.3 Adjustments & Normalizations
Policy / Logic
Apply value-impactful adjustments after filter selection, then normalize concessions before outlier testing.
Adjustment Ladders (examples given in source):
Water/view premiums; new roof/HVAC since sale

Bed/bath normalization; condition tier (as-is vs. renovated)

Concessions Normalization:
Heavily-concessed closings (≥3% seller credits) are normalized before outlier tests.

4.4 Outlier Controls
Policy / Logic
Use robust statistical filters plus business signals; never discard a sale solely for being high/low if it truly matches the subject.
Definition:
Remove sales outside ±1.5× IQR on price/ft² within the filtered set and any sale whose unadjusted price is ±15% beyond the median of the top cohort.

Guardrails:
Do not drop a sale solely for level if its condition equals target and it passes filters; require a second outlier signal (e.g., concessions >3%, DOM=1 or >120).

Actions:
Include a one-line note: “Removed as outlier (reason).” (Policy as of Oct 9, 2025.)

4.5 Weighting: Recency vs. Similarity
Policy / Logic
Weight for Similarity vs Recency based on market stability.
Decision Logic (If–Then):
If |Δ median DOM_zip| ≤ 15% m/m → 60/40 (Similarity/Recency)

If |Δ median DOM_zip| > 15% m/m (either direction) or MOI_zip shifts > 15% m/m → 50/50

Formula:
Weight_i = 0.60·SimScore_i + 0.40·RecencyScore_i (or 0.50/0.50 in inflection)
Risk control: Cap any single comp’s influence at 35% of the weighted median.
Data Need:
Provide DOM_zip / MOI_zip trend for Aug–Oct 2025 from Stellar MLS to select regime → [INFO NEEDED].

4.6 Confidence Scoring (A/B/C)
Policy / Logic
Confidence controls conservatism, escalation, and whether we present single-point vs range anchors.
Scoring (as of Oct 9, 2025):
A (High): ≥5 comps within ≤6 months; ±15% GLA, ±10 yrs age; condition-like; median absolute deviation/median ≤ 10%; DOM trend stable (|Δ median DOM| ≤ 10% m/m).

B (Moderate): 3–4 comps ≤9 months or variance ≤ 15%; minor heterogeneity; DOM move ≤ 15% m/m.

C (Low): Fewer/older comps or heterogeneous; DOM move > 15% m/m.

Guardrails:
Confidence can only improve with new closings or verified BPO; cannot be manually raised without Advisor Override (Q62).

Low-Confidence Workflow (Defer, don’t guess):
If Confidence = C → send range anchors (Respect_Floor ↔ Buyer-Ceiling); order (1) desktop comp review, (2) interior photos/video, (3) 4-Point & wind-mit if insurability uncertain.

4.7 Evidence Windows & Resolution Rules
Policy / Logic
Base sale recency ≤6 months; expand per §4.2 escalation when comp count is thin. Log every relaxation step and date window used.

When DOM_zip or MOI_zip indicates an inflection (>15% m/m), switch to 50/50 weighting and downgrade Confidence if comp heterogeneity rises.

Risk Notes:
HOA/condo special assessments can distort net outcomes—pull estoppels early. Corner/cul-de-sac lots treated separately where pricing patterns demand.

4.8 Investor-Discount Dataset (feeds Respect_Floor)
Purpose
Populate Local_Discount_20thPctZIP and Typical_Investor_DiscountZIP using primary county records joined to MLS where possible.
Method (rolling window):
Pull investor-likely cash deeds (Warranty/Special Warranty; capture consideration & buyer type) from Orange/Osceola/Polk official records; join to MLS by parcel or address ±7d; capture SP/LP, DOM, CASH flag, and “as-is” notes.

Compute ZIP-level discount vs AIV and report 20th/50th/80th percentiles; QA outliers monthly; exclude bulk/related-party trades.

Window: 90d; if n<15, expand to adjacent ZIPs or 180–365d with 0.5%/month recency decay; if still n<8 → fall back to county-level 20th percentile and mark Confidence = C; if n<5 → disable Respect_Floor anchor, show BPO and tag [INFO NEEDED].

Temporary Defaults (until dataset live):
Typical_Investor_Discount ≈ 20–25% only when ≥10 local investor comps corroborate; otherwise use PayoffClose + Essential_Costs branch (conservative).

Storage & Cadence:
Save zip_level_discounts_YYYYMM.csv; monthly build & quarterly audit; cache summary in the underwriting tool.

4.9 Workpapers & Transparency
Policy / Logic
Show high-level math on the summary card and keep full “Show Work” steps (MAO formula, comps grid, cost stack, concessions) in an appendix. Use charm-rounding in presentation.
Appendix Snippet (from source structure):
MAO = ARV × (1 − Flip_Margin) − Repairs − Closing/Title − Carry − Safety_Margin (presentation math). Note: MAO outputs are separately capped by MAO Cap Rule: Offer ≤ 0.97 × AIV (see §9).

Borderline File Handling:
If |MAO − PayoffClose| ≤ $5,000 or |Net_List − Net_Cash| ≤ $5,000 → tag Borderline; create 12-hour Analyst Review task; hold outbound numbers (use range anchors if Advisor approves).

Cross-Reference Map (from this part)
Confidence A/B/C & overrides: §10 (Risk Gates), §12 (range anchors + negotiation bands).

Respect_Floor inputs: §9 (formulas), §12 (overlap with Buyer Ceiling).

MAO cap & presentation math: §9.1–§9.2.

4.10 Final Qualitative Review (Sanity Check)
Policy / Logic After all quantitative analysis is complete, a final qualitative review is required before publishing an offer. This step adds a layer of human experience and market intuition to catch risks or opportunities the numbers alone might miss. This is mandatory for all deals, especially those with a Confidence Grade of C.
Actions / Checklist The underwriter or advisor must answer and document the following questions:
Street-Level Context: Do the numbers make sense for this specific street? Is it the best or worst house on the block, and is that factored into the AIV/ARV?
Market Catalysts: Is there a pocket of new construction nearby that will lift the ARV? Is a major employer leaving the area, creating downside risk?
Deal-Specific Risks: Is the HOA known to be difficult, adding potential timeline risk? Is there anything about the property's layout or conditio

Glossary — Updates (delta)
Primary Filter / Escalation: The staged comp-filter expansion when <3 comps remain (radius, recency, GLA/age).

IQR Outlier Control: Remove sales outside ±1.5× IQR plus ±15% from top-cohort median; requires a second business signal to drop.

Weighting Regime: 60/40 Similarity/Recency under stable DOM; 50/50 when DOM or MOI shifts >15% m/m.

Investor-Discount Distribution: ZIP-level percentiles from investor cash deeds vs AIV; feeds Respect_Floor.

Conflicts & Open Questions — Additions
C-401 — DOM/MOI Trend Feed (Weighting Regime)

Issue: Selecting 60/40 vs 50/50 requires Aug–Oct 2025 DOM_zip/MOI_zip trend.

Status: [INFO NEEDED].

Action: Pull Stellar MLS ZIP feed; stamp date range and n.

C-402 — MAO Presentation vs MAO Cap

Issue: Appendix shows ARV-basis MAO formula; independent policy caps offers at ≤0.97×AIV.

Status: [RESOLVED] — Canonical Rule: Compute presentation MAO, then clamp to MAO Cap (min of the two).

Source: Cap rule & appendix math cited. As-of: 2025-10-14.

Resolution Impact: §9 will reference MAO_final = min(MAO_presentation, 0.97×AIV); no policy change.

Resolution Log — Updates (as of 2025-10-14)
R-301 — Outlier Definition & Guardrails
Old vs New: Clarified dual test (±1.5×IQR and ±15% top-cohort median) and added “second signal” requirement.
Impact: More transparent drops; fewer false removals.

R-302 — Weighting Switch Trigger
Old vs New: Explicit switch to 50/50 when DOM or MOI shifts >15% m/m; cap any single comp at 35% influence.
Impact: Reduces trend-lag risk; stabilizes medians.

Change Log — Part 4 entry (2025-10-14)
Consolidated comp filters and escalation steps; added county/ZIP notes.

Documented adjustments, concessions normalization, and outlier rules.

Formalized weighting regimes and linked them to DOM/MOI trend evidence.

Tied investor-discount dataset method to Respect_Floor; set [INFO NEEDED] where feeds are pending.

Delta from Previous Draft
Merged scattered Q-answers into a single, numbered valuation workflow for auditability.

Clarified MAO presentation vs MAO Cap interplay (no policy change).

Added explicit logging expectations (filter relaxations, removed-as-outlier notes).

PART 5 — Repairs & Scope of Work
Navigator (this part): 5.1 SOW Framework & Categories • 5.2 “Move-In Ready” Label (≤$5k) • 5.3 Contingency Tiers & Clamps • 5.4 System Failures (Listing Blockers) • 5.5 Permits & Unpermitted Work • 5.6 Flood “50% Rule” Triggers (SI/SD) • 5.7 Estimating & Ties to MAO/Wholetail • 5.8 Actions / Checklists / Evidence
What’s New in This Part (as of 2025-10-14): Tightened SOW categories and contingency tiers exactly as written in the source; formalized listing blockers tied to Citizens’ 03/20/2025 inspection forms; verified the flood “50% Rule” from authorities and logged a resolved entry; added explicit cross-links to MAO/Wholetail math.

5.1 Scope of Work (SOW) Framework & Categories
Policy / Logic
Define and stage the repair scope to protect timeline and insurability. Use the category ladder to decide path (Cash/Assign vs. Wholetail vs. List) and to size buffers/contingency. If carrier will not bind or a major system fails, listing is blocked (Cash/Assign until cured).
Decision Logic (If–Then)
If any major system fails or carrier cannot bind → No Wholetail/List; route to Cash/Assign.

If HOA/permits unresolved but curable ≤10 business days → Wholetail may proceed with risk buffer (see §5.7).

If storm watch → pause until post-moratorium inspection/quote; re-verify bindability.

Risks & Mitigations
Insurability denial and photo quality drive DOM; require pre-bind quotes and follow the 28-photo checklist; order 4-Point/Wind-Mit on Day-0.
Actions / Checklist
Tag SOW category in the Cost Stack; show contingency basis in “Show Work.”

Order 4-Point/Wind-Mit (Citizens 03/20/2025 forms) for ≥20-yr homes prior to any retail pathing. (Public)

Evidence / Citations
See source wholetail/list gates and storm pause; Citizens update (03/20/2025). (Public)
Cross-References: §10 (Insurability Gate), §11 (HOA/Permits), §8 (Timeline & Carry).

5.2 “Move-In Ready” Label (≤$5,000)
Policy / Logic
“Move-In Ready” is a label only (not a pricing rule): Use $5,000 all-in scope for light repairs when supported by quotes/photos/4-Point green lights; this informs list-band selection, not MAO math by itself.
Decision Logic (If–Then)
If Repairs ≤ $5,000 and property passes or can bind on current Citizens forms → label “Move-In Ready” and price from the designated list band.

If quotes missing → keep label tentative and auto-apply 15% contingency until quotes arrive ([INFO NEEDED] remains).

Risks & Mitigations
Mislabeling erodes trust; require vendor quotes and image proof.
Actions / Checklist
Attach vendor quote(s) or recent invoices; upload inspection PDFs; store carrier bind email.
Evidence / Citations
Source labeling threshold & guardrails.
Cross-References: §4 (Valuation & Comps), §12 (Scenarios & bands).

5.3 Contingency Tiers & Clamps
Policy / Logic
Default contingency depends on access/visibility and risk. Standard 10%; 15% when interior is unseen/tenant-occupied; 20% when structural/envelope/permit/WDO risk appears. Floor and cap rules apply.
Decision Logic (If–Then)
If scope verified + access granted → 10% of labor+materials.

If no interior access / tenant refuses / utilities off → 15%.

If structural, envelope, or permit risk (e.g., prior addition lacking finals, active roof leak, WDO) → 20%.

Clamp/Overrides: Floor $2,500; Cap = lesser of 30% of repairs or 3% of ARV unless Advisor Override (Q62).

Formula / Calculation
Repairs_Total = Repairs_Base + (Contingency_Pct × Repairs_Base) with Contingency_Pct per tier above. (Worked example in source.)
Risks & Mitigations
Hidden MEP issues → obtain 4-Point early; use holdbacks or price credits if discoveries exceed contingency.
Actions / Checklist
Tag the contingency tier; show basis in “Show Work.”
Evidence / Citations
Contingency ladder & clamps (Q21).
Cross-References: §9 (MAO math), §8 (Carry sensitivity to scope).

5.4 System Failures (Listing Blockers)
Policy / Logic
Certain system failures automatically block listing; the file remains Cash/Assign until cured and insurable under current Citizens forms.
Decision Logic (If–Then)
Blockers (Florida-centric):
Roof at/near end of life or fails inspection; active leaks.

Electrical panels known to be problematic (e.g., FPE/Zinsco) or aluminum branch wiring without approved remediation.

Plumbing poly-B or pervasive cast-iron failure; active leaks.

HVAC non-functional or severely deferred.

WDO/moisture intrusion unresolved.

Insurance bind denial under current Citizens 03/20/2025 4-Point/Roof standards → cannot list until insurable. (Public)

Risks & Mitigations
Retail fall-through from uninsurable systems; require pass on current forms and bindable quote ≤30 days pre-list.
Actions / Checklist
Order 4-Point/Wind-Mit for >20-year homes, upload PDFs (Insp4pt 03 25; RCF-1 03 25) with signatures, and store bind email. (Public)
Cross-References: §10.1 (Insurability Gate), §11.2 (Permits↔Insurance ties).

5.5 Permits & Unpermitted Work (Curative Logic)
Policy / Logic
“Material title issues” include open/expired permits, municipal/code liens, recorded unpermitted additions, chain-of-title gaps, prior tax deed without quiet title, unreleased mortgages/assignments, and similar financing/insurability blockers. While present, show Cash/Wholesale only. Retail or Wholetail paths may proceed after curative milestones are met and documented.
Decision Logic (If–Then)
If any material title/permit issue present → Cash/Wholesale only and price includes CureCost + (if used) Title Risk dampener (avoid double-count).

If written cure quotes in hand and runway allows → may Wholetail after milestones (e.g., permit closed).

Risks & Mitigations
Underwriter refusal → pre-clear scenarios with title counsel. Avoid penalizing the same risk twice in pricing.
Actions / Checklist
Order O&E + lien search Day-0; pull permit history from city/county portal; obtain written cure quotes (attach to file) before recommending retail.
Cross-References: §6 (Transaction Costs), §7 (Liens/Payoffs), §11 (Permits).

5.6 Floodplain “50% Rule” Triggers (Substantial Improvement/Damage)
Policy / Logic
If floodplain Substantial Improvement (SI)/Substantial Damage (SD) thresholds are likely, bias Cash/Wholesale and price for elevation/code exposure; retail finance is risky until a compliance path is defined. Local jurisdictions (Orange, Polk, Osceola) reflect the NFIP 50% trigger in their floodplain programs.
Decision Logic (If–Then)
If estimated improvement/repair cost ≥ 50% of structure market value (building-only) in a flood hazard area → treat as SI/SD; structure must meet current floodplain requirements (e.g., elevation, code upgrades). [RESOLVED], see authorities below. (FLOIR)

If community enforces a cumulative look-back (e.g., 5–10 years) → SI/SD may be triggered across permits; confirm ordinance text with local Floodplain Administrator. [INFO NEEDED] (local ordinance copy).

Formula / Calculation (from authorities)
SI/SD test: If Cost_of_Improvement_or_Repair ≥ 50% × Market_Value_of_Structure (pre-work) → SI/SD triggered (NFIP minimum). (Structure value excludes land; may use appraisal/ACV/tax-adjusted per local rules.) [RESOLVED] (as of 2025-10-14). (FLOIR)

Risks & Mitigations
SI/SD shifts Repairs and timeline materially (elevation/code). Get EC (Elevation Certificate), SI/SD worksheet, local floodplain guidance, and contractor bid with O&P.
Actions / Checklist
Contact Floodplain Administrator; obtain written SI/SD determination; capture EC; update deal.timeline.days_to_ready_list and deal.costs.repairs_base accordingly.

Store county links and ordinance PDFs in the file; include date-stamped citations.

Evidence / Citations
NFIP/agency & local sources (as of 2025-10-14): FEMA/NFIP definition; Citizens SI/SD references; county pages for Polk (“Dreaded 50% Rule”) and Osceola floodplain notices. (FLOIR)
Resolution Impact note: When SI/SD is [RESOLVED] → raise contingency and Wholetail buffer (see §5.7), downgrade Confidence, and bias path to Cash until compliance path is funded and scheduled.

5.7 Estimating & Ties to MAO / Wholetail
5.7.1 Wholetail/Novation Risk Buffer (business policy, as written)
Policy / Logic
Apply a Wholetail/Novation buffer to reflect retail execution risk, tenant turns, and short-fuse curatives.
Formula / Calculation
Buffer = max(1% × ARV, $5,000) + [ $2,500 if tenant-occupied ] + [CureCost for short-fuse title/permit items]
(Round to charm-pricing for presentation.)
Risks & Mitigations
Do not double-count with any general Safety_Margin in Flip_MAO; apply once and label.
Actions / Checklist
Show the buffer explicitly in the Cost Stack with reason codes (Tenant/Title/Storm).
Cross-References
§9 (MAO, Buyer Ceiling, Spread), §12 (Scenarios & bands).

5.7.2 Flip/Wholesale/Wholetail MAO (presentation math + cap elsewhere)
Policy / Logic
Presentation math uses ARV basis for Flip_MAO and fee policy for Wholesale_MAO; Wholetail_MAO = Flip_MAO with reduced repairs + wholetail buffer. (Offers are independently clamped by the MAO cap ≤ 0.97×AIV in §9.)
Formula / Calculation
Flip_MAO = ARV × (1 − Flip_Margin) − Repairs − Closing/Title − Carry − Safety_Margin

Wholesale_MAO = Flip_MAO with target assignment fee policy on ARV basis

Wholetail_MAO = Flip_MAO − (Repair_Reductions) − [Buffer from §5.7.1]
(All per source; offers still clamped by MAO cap policy in §9.)

Risks & Mitigations
Choice overload—collapse non-recommended panels; reveal on click.
Actions / Checklist
Render 3-up cards (Cash/Wholetail/List) with date-stamped inputs and Confidence grade.

5.8 Actions / Checklists / Evidence
Policy / Logic
Operate a disciplined intake-to-publish flow so SOW changes flow into costs, path, and risk gates without guesswork.
Actions / Checklist (who/what/when—as stated)
Day-0:

Order 4-Point/Wind-Mit (Citizens 03/20/2025 forms) for ≥20-yr homes; obtain bindable quote prior to retail decisions. (Public)

Open O&E + lien search; pull permit history (city/county portals).

Capture vendor quotes for light repairs; if missing, apply 15% contingency and tag [INFO NEEDED].

Before recommending Wholetail/List:

Confirm no listing blockers (roof/electrical/plumbing/HVAC/WDO) and that carrier will bind under current forms.

If HOA/permit curatives remain but ≤10 business days → include with Wholetail buffer; set milestones.

If flood SI/SD is likely → secure EC, SI/SD worksheet, and administrator determination before any retail spend.

Storm watch or binding suspension: pause; re-inspect roof and re-quote post-moratorium.

Evidence / Citations
Attach: inspection PDFs (03/20/2025 forms), bind email, O&E and permit history, vendor quotes, EC/SI-SD determination where applicable.
Cross-References
§3 (Intake), §6 (Costs), §8 (Carry), §9 (MAO/Buyer Ceiling), §10 (Gates & Hard Stops), §11 (HOA/Condo/Permits).

Cross-Reference Map (from this part)
Insurability & Forms → §10.1; Citizens 03/20/2025 update. (Public)

Wholetail buffer → §9 (affects Spread) and §12 (presentation bands).

Permit/Title materiality → §7 (liens/payoffs) & §11 (permit pathways).

Flood SI/SD → §10 (Risk Gates) for pass/watch/fail handling.

Glossary — Updates (delta)
Move-In Ready (label): Light-repairs label; ≤$5,000 all-in scope; not a pricing rule; requires quotes/photos/4-Point pass.

Contingency (Repairs): 10% standard; 15% no interior access/tenant; 20% structural/envelope/permit/WDO risk; floor $2,500; cap = min(30% of repairs, 3% of ARV).

Listing Blockers: System failures (roof/electrical/plumbing/HVAC/WDO) or bind denial on current Citizens forms.

Wholetail Buffer: max(1% × ARV, $5k) + $2.5k if tenant + cure costs.

SI/SD (50% Rule): NFIP threshold where improvement/repair cost ≥ 50% of structure market value; triggers full flood-code compliance. (Community rules may be stricter or cumulative.) (as of 2025-10-14). (FLOIR)

Conflicts & Open Questions — Additions
C-501 — SI/SD cumulative look-back (Central FL jurisdictions)
Issue: Source notes cumulative rules may apply; specific look-back periods vary by community.
Status: [OPEN].
Action: Obtain the current written ordinance (Orange/Polk/Osceola) and the Floodplain Administrator’s SI/SD determination for each file.

C-502 — “Move-In Ready” proofing
Issue: $5k label requires quotes; where missing, the tool should auto-apply 15% contingency and flag [INFO NEEDED].
Status: [OPEN] (operational discipline).

C-503 — Title/Permit double-count
Issue: When both CureCost and a Title Risk dampener appear, ensure we don’t penalize twice.
Status: [OPEN]; owner to confirm which dimmer applies when both are present.

Resolution Log — Updates (as of 2025-10-14)
\*\*R-501 — Flood “50% Rule” (SI/SD) — [RESOLVED]
Canonical: Use the NFIP 50% structure-value trigger for SI/SD; treat as a hard risk gate for retail until a compliance path is documented.
Evidence: FEMA/NFIP definition and multiple official county/agency sources (Polk/Osceola examples), as of 2025-10-14. (FLOIR)
Resolution Impact: Where SI/SD is likely, escalate to Cash/Wholesale, increase contingency, and extend timelines; update §10 Risk Gates accordingly.

\*\*R-502 — Citizens 4-Point/Roof form editions — [RESOLVED]
Canonical: Homes >20 years must use Citizens 03/20/2025 4-Point/Roof forms for insurability; listing is blocked without pass/bindable quote.
Evidence: Citizens public update + inspections page, as of 2025-10-14. (Public)
Resolution Impact: Reinforces §10.1 Insurability Gate and §5.4 Listing Blockers.

Change Log — Part 5 entry (2025-10-14)
Added: Exact contingency tiers with floor/cap clamps; integrated with SOW category ladder.

Added: “Move-In Ready” label rule (≤$5k with proof) and auto-contingency when quotes are missing.

Added: Listing blocker checklist (roof/electrical/plumbing/HVAC/WDO) + Citizens forms edition requirement. (Public)

Verified & logged: Flood SI/SD 50% trigger with authoritative sources ([RESOLVED]). (FLOIR)

Linked: Wholetail/Novation buffer formula to MAO & presentation bands; warned against double-counting with Safety_Margin.

Delta from Previous Draft
Consolidated all SOW, contingency, and blocker logic into a single numbered section; removed narrative duplication.

Added authoritative citations and Resolution Log entries for SI/SD and Citizens form editions; left jurisdiction-specific cumulative look-back [OPEN] per local ordinance confirmation.

Clarified presentation MAO vs. MAO cap interplay by cross-referencing §9 (no policy changes made).

PART 6 — Transaction Costs & Fees
Navigator (this part): 6.1 Principles & Scope • 6.2 Buyer-Side Line Items • 6.3 Seller-Side Line Items • 6.4 Florida Statutory/Promulgated Rates (Formulas) • 6.5 Worked Examples (from source) • 6.6 Actions & Footnoting Standards • 6.7 Evidence/Citations & Cross-References
What’s New in This Part (as of 2025-10-14): Consolidated all closing-cost components; verified Florida deed stamps, note/intangible taxes, and title premium schedule with primary authorities; added explicit “line-item first, % only as labeled placeholder” rule and example footers.

6.1 Principles & Scope
Policy / Logic
Always model line items from statutes/rate schedules or quotes; show the computation in the “Show Work” appendix. Use a % only when explicitly allowed as a placeholder, and label with [INFO NEEDED] until quotes arrive.

Who pays what (e.g., title policy) is contract-dependent; our default modeling assumes seller pays title unless the contract says otherwise. Note this in the Net Sheet.

Decision Logic (If–Then)
If any statutory/regulated component is missing (e.g., title premium, estoppel, recording), tag [INFO NEEDED] and attach a title/closing quote request before publishing seller/buyer nets.

Cross-References
See §8 (Carry interacts with exit), §9.2 (Max_Buyer uses Buyer_Costs), §11.1 (HOA/COA estoppels), §7 (Payoffs, liens).

6.2 Buyer-Side Line Items (used in Max_Buyer)
Policy / Logic
Use the line-item method as primary; show all modeled components on the buyer side. Composite fallback 9.5% appears only if parts are missing and must be clearly labeled alongside the partial line-item math.
Decision Logic (If–Then)
If we lack a title quote (premium + endorsements + closing fee) → show partial line-item math and simultaneously display the 9.5% composite with [INFO NEEDED].

If contract allocates costs atypically (e.g., buyer pays owner’s policy), mirror the contract in modeling and annotate.

Formula / Calculation (components)
Title Premium (Owner or Lender) — per F.A.C. 69O-186.003 schedule.

Doc Stamps on Deed — 0.70% of price (non–Miami-Dade).

Recording / Closing / Municipal Lien / Estoppel (if applicable) — per quotes (attach).

Financed Buyer (for exit modeling): add Note stamps 0.35% of loan + Intangible 0.20% of mortgage.

Risks & Mitigations
Avoid double-counting title when also modeling resale/exit; confirm owner vs. lender policy obligations.
Actions / Checklist
Pull a title quote (promulgated premium + endorsements + closing fee), confirm doc stamps rate, and attach to Net Sheet; if any component missing, flag [INFO NEEDED] and show the composite side-by-side.
Evidence / Citations
See §6.4 (authorities) and examples in §6.5.

6.3 Seller-Side Line Items (used in Net_to_Seller_List)
Policy / Logic
Use statute-anchored math, not % shortcuts. If a % preview is required, the source allows 1.5% ≤$1M and 1.0% >$1M as a labeled preview only, not as final costs.
Decision Logic (If–Then)
Display Doc Stamps on Deed and Owner’s Title policy as separate lines; add closing/settlement, lien search, courier per quote.

State explicitly in notes that who pays title is negotiable; our default model assumes seller-pays unless contract allocates differently.

Formula / Calculation (components)
Doc Stamps on Deed — 0.70% of price (non–Miami-Dade).

Owner’s Title Premium — schedule per F.A.C. 69O-186.003; endorsements/closing services per quote.

Recording/Closing/Municipal Lien/Estoppel — per quotes; HOA/COA estoppel timing up to 10 business days; account for timing in ≤14-day closes.

Risks & Mitigations
Rounding/county-norms and title-payer negotiations can distort preview %; keep line-item math primary with “as-of” dating.
Actions / Checklist
Attach title rate calc PDF and FDOR link in Net Sheet footnotes with as-of dates; show contract allocation scenario(s) where relevant.

6.4 Florida Statutory / Promulgated Rates (Formulas)
Research-First Verification (as of 2025-10-14) — Canonical sources below confirm each rate. Where the source document quoted these rates, they are now marked [RESOLVED] and should be footnoted in outputs.
6.4.1 Deed Documentary Stamps (DOR)
Rate: $0.70 per $100 (0.70%) of consideration for deeds outside Miami-Dade; Miami-Dade has different rules (e.g., $0.60 per $100 for single-family residences; surtax on other property types). (Florida Dept. of Revenue)

Authority: Florida Department of Revenue — Documentary Stamp Tax overview and tutorial (as of 2025-10-14). (Florida Dept. of Revenue)

Statute anchor: F.S. 201.02 (text). (Legislature of Florida)

Source doc alignment: Seller CC §6.3 & Q37 [RESOLVED].

6.4.2 Note Stamps & Nonrecurring Intangible (financing)
Note stamps: $0.35 per $100 (0.35%) on written obligations (e.g., notes). Authority: F.S. 201.08; DOR training confirms rate and describes cap for certain retail charge accounts (not typical for mortgages). (Legislature of Florida)

Intangible tax (mortgages): 2 mills (0.20%) on the amount secured by Florida real property. Authority: F.S. 199.133 and DOR page. (Legislature of Florida)

Source doc alignment: Q163 formulas and example [RESOLVED].

6.4.3 Title Insurance Premiums (promulgated schedule)
Rule: F.A.C. 69O-186.003 (owner and mortgage rates per thousand; stepped brackets). Authoritative text and bracket table confirmed. (Legal Information Institute)

DFS/OIR consumer explainer: Confirms Rule 69O-186.003 as the rate authority. (FLDFS)

Source doc alignment: Q162 modeling requirements [RESOLVED].

6.5 Worked Examples (reformatted from source)
Note: Examples below come from the source; do not generalize beyond these numbers. Where the source marked items as quotes/illustrative, keep that label.
6.5.1 Seller example (Orange Co., list at $400,000)
Doc Stamps: $400,000 × 0.007 = $2,800.

Owner’s Title Premium (indicative): ≈ $2,075 using 69O-186.003 schedule (illustrative; confirm with title quote).

Closing/settlement + lien search + courier: [INFO NEEDED] (quote).

6.5.2 Buyer example (Polk SFR, $320,000 buy)
Title premium (approx): $1,675 (per schedule: $575 on first $100k + $1,100 on next $220k).

Doc stamps: 0.007 × $320,000 = $2,240.

Recording + closing fee + misc: [INFO NEEDED] (prelim title).

6.5.3 Finance-tax example (Osceola, Price $360,000; Loan $288,000)
Deed stamps: $2,520; Note stamps: $1,008; Intangible: $576. Show both buyer/seller allocation scenarios per contract.

6.6 Actions & Footnoting Standards
Actions / Checklist (who/what/when—as stated)
Attach a title quote PDF (promulgated premium + endorsements + closing fee). If lender financing is expected, add lender policy or simultaneous issue credit as applicable.

Footnote Net Sheets with FDOR (doc stamps) and F.S. 201.08 / 199.133 for note/intangible; include as-of date.

Estoppels: Order on Day-0; note 10 business-day statutory window in timeline if aiming for ≤14-day closes.

Contract allocation: Where costs can swing (title, stamps), show both scenarios if negotiations are active.

Evidence / Citations (authorities)
FDOR Documentary Stamp Tax; F.S. 201.02, 201.08; DOR Nonrecurring Intangible; F.S. 199.133; F.A.C. 69O-186.003 and DFS/OIR overview, all as of 2025-10-14. (Florida Dept. of Revenue)
Cross-References
Buyer_Costs → Max_Buyer: §9.2 (capability & guardrails).

Finance taxes on exit: §12 (scenario variants).

Title/estoppel timing: §11.1; Carry & DOM: §8.

Glossary — Updates (delta)
Doc Stamps (Deed): FL excise tax on deeds; 0.70% (non–Miami-Dade). Authority: FDOR; F.S. 201.02. (as of 2025-10-14). (Florida Dept. of Revenue)

Note Stamps: 0.35% of written obligation (promissory note). Authority: F.S. 201.08. (as of 2025-10-14). (Legislature of Florida)

Nonrecurring Intangible Tax: 0.20% of mortgage amount secured by FL real property. Authority: F.S. 199.133; FDOR page. (as of 2025-10-14). (Florida Dept. of Revenue)

Title Premium (FL): Regulated per F.A.C. 69O-186.003; bracketed rates per thousand. (as of 2025-10-14). (Legal Information Institute)

Conflicts & Open Questions — Additions
C-601 — “Composite 9.5%” vs “Seller % Preview”
Issue: Source allows 9.5% composite (buyer-side placeholder) and 1.5%/1.0% preview (seller-side). Ensure they are not cross-used.
Status: OPEN — Add UI guardrail to prevent misapplication.

C-602 — Contract Allocation Defaults
Issue: Modeling assumes seller pays owner’s title unless contract says otherwise; some local norms differ.
Status: OPEN — Keep default as written; display toggle for “Buyer-pays Title” when contract deviates.

C-603 — Recording/Closing Fee Schedules
Issue: Recording fees and some closing charges vary by county/provider.
Status: [INFO NEEDED] — Require quotes or county fee tables; add “Attach quote” blocker for publish.

Resolution Log — Updates (as of 2025-10-14)
R-601 — Deed Doc Stamps Rate — [RESOLVED]
Old vs New: Source lists 0.70% (outside Miami-Dade). Canonical: 0.70% confirmed by FDOR; Miami-Dade exceptions documented. Evidence: FDOR overview & tutorial PDF. Impact: Stabilizes seller/buyer nets and Max_Buyer (§9.2). (Florida Dept. of Revenue)

R-602 — Note & Intangible Tax — [RESOLVED]
Canonical: Note stamps 0.35% (F.S. 201.08); Intangible 0.20% (F.S. 199.133; FDOR page). Impact: Standardizes financed-exit modeling; footnoting enforced in §6.6. (Legislature of Florida)

R-603 — Title Premium Schedule — [RESOLVED]
Canonical: F.A.C. 69O-186.003 rate brackets; DFS/OIR page confirms. Impact: Title quotes must reconcile to schedule; if lender CD differs, deliver comparison notice per source guardrails. (Legal Information Institute)

Change Log — Part 6 entry (2025-10-14)
Added: Complete buyer/seller line-item inventories with formulas.

Verified: Doc stamps, note/intangible taxes, and title premium schedule with primary authorities ([RESOLVED]).

Clarified: Placeholders: 9.5% (buyer composite) vs 1.5%/1.0% (seller preview); added UI guardrail note.

Footnoting: Standardized “as-of” citations and attachment requirements for quotes/estoppels.

Delta from Previous Draft: Tightened reliance on statute/rule text and removed any implied “typical payer” statements not present in the source; all payer allocations now explicitly contract-driven with default noted.

Cross-Reference Map (from this part)
Feeds into Max_Buyer (Buyer_Costs): §9.2.

Affects Carry & Timeline: §8 (close durations; estoppel timing), §11.1 (HOA/COA).

Negotiation Panels: §12 (present seller/buyer allocation scenarios).

PART 7 — Debt, Liens, Payoffs
Navigator (this part): 7.1 Debt Stack & Priority • 7.2 Payoff Math & Per-Diem • 7.3 HOA/COA Arrears & Estoppels • 7.4 Municipal/Code Fines • 7.5 PACE & Non-Ad-Valorem • 7.6 UCC/Solar & Other Juniors • 7.7 Reinstatement & Short-Pay Tracks • 7.8 Actions / Checklists / Evidence
What’s New in This Part (as of 2025-10-14): Centralized payoff math and per-diem practices; formalized junior-debt captures (PACE, UCC/solar) and estoppel timing; added statutory anchors for redemption (§45.0315) and HOA/COA estoppels (Fs. 720.30851; 718.116) as verification of points already referenced in the source.

7.1 Debt Stack & Priority
Policy / Logic
Underwrite the full lien stack—senior mortgage(s), juniors (HELOCs, HOA/COA liens, municipal/code fines, tax/IRS liens), non-ad-valorem/PACE, and UCC fixture filings (e.g., solar). Treat any material title issue as Cash-only until cured or fully priced.

Decision Logic (If–Then)
If material title issue (open/expired permits; municipal/code liens; unreleased mortgages; tax deed without quiet title; recorded unpermitted addition, etc.) → Cash/Wholesale only; price includes CureCost + (if used) a single Title Risk dampener (avoid double-count).

If curative quote + runway are documented → may pivot to Wholetail after milestones are completed (not just scheduled).

Risks & Mitigations
Hearing calendars slip (boards, code enforcement) → add timeline pad; payoff letters can exclude daily fine accruals—recalculate through close.

Actions / Checklist
Day-0: O&E + lien search; permit history pull; request written payoffs/estoppels for each encumbrance.

Evidence / Citations
See material-title list and county process notes.
Cross-References
§11 (HOA/Permits); §6 (costs); §10 (risk gates).

7.2 Payoff Math & Per-Diem
Policy / Logic
Always compute from written payoff letters; never rely on verbal figures. Show as-of date/time and refresh every T+7 days.
Decision Logic (If–Then)
If payoff is absent → tag [INFO NEEDED] and block final outputs that depend on it.

If payoff shows interest + fees → display both lines; if silent, show interest-only and flag fees as [INFO NEEDED].

Formula / Calculation
Per-Diem Burn: PerDiemBurn = Per-Diem_from_Payoff × Days_to_Event (display daily; also weekly roll-up).

Payoff to Close: PayoffClose = Payoff₀ + (Per-Diem × Days) + Servicer_Fees/Advances.

Risks & Mitigations
Redemption exposure extends burn (Florida judicial foreclosures). Cite statute on outputs touching foreclosure timing. (Verified statutory anchor.) (Legislature of Florida)

Actions / Checklist
Cite payoff letter (date/time); schedule refresh task at T+7; reflect protective advances if itemized.

Evidence / Citations
Per-diem practices and example; redemption note. (Legislature of Florida)
Cross-References
§8 (carry timing), §9 (MAO vs. PayoffClose), §12 (option sets).

7.3 HOA/COA Arrears & Estoppels
Policy / Logic
Order estoppels on Day-0 where communities apply. Estoppels must be issued within 10 business days by statute (HOA) and contain time-limited data—plan close paths accordingly. (Verification added; policy already referenced in source.) (Legislature of Florida)
Decision Logic (If–Then)
If aiming for ≤14-day close and estoppel not yet requested → do not promise compressed timelines; submit and get ETA in writing first.

If arrears/fines in estoppel appear negotiable → model Low/Mid/High haircut outcomes; present all three in nets.

Risks & Mitigations
Estoppel effective periods are limited (typically 30/35 days); refresh if aging. (Verified anchor included for users of condo/HOA files.) (Legislature of Florida)

Actions / Checklist
Request HOA/COA estoppel Day-0; store PDF; track effective window; if reductions plausible, calendar board/manager review and price both scenarios.

Evidence / Citations
Source estoppel timing and reduction modeling; Florida statutes (as of 2025-10-14). (Legislature of Florida)
Cross-References
§11.1 (HOA mechanics); §6.6 (footnotes & “as-of” stamps); §12 (negotiation bands).

7.4 Municipal / Code Fines & Liens
Policy / Logic
Treat open violations, nuisance fines, and code liens as material. Underwrite a Low/Mid/High reduction band and show all three outcomes in nets; do not assume reductions without a hearing path.
Decision Logic (If–Then)
If a reduction is plausible, calendar the appropriate board/hearing and price with/without reduction. If payoff letters exclude daily accruals, recalc through expected close.

Risks & Mitigations
Hearing calendars slip; pad timeline and maintain alternate path.

Actions / Checklist
Run county code/permit search on Day-0; obtain written payoff for fines; track board hearing date in deal timeline.

Evidence / Citations
County steps and modeling guidance.
Cross-References
§11 (Permits); §8 (Timeline interactions).

7.5 PACE & Non-Ad-Valorem Assessments
Policy / Logic
Capture full tax detail; determine payoff vs. assumability; underwrite lender/agency ineligibility where programs create or imply lien priority ahead of the first mortgage. (Verification added; aligns with source.) (Fannie Mae Selling Guide)
Decision Logic (If–Then)
If PACE senior or effectively senior → conventional/GSE exit ineligible unless paid; model payoff in cost stack. (Fannie Mae Selling Guide)

If FHA/VA borrower → expect payoff (agency policy).

Actions / Checklist
Collect tax detail page, program agreement, and payoff; add to deal.debt.juniors[] (type: PACE) and sell_close_pct if collected via closing.

Evidence / Citations
Source PACE track; Fannie Mae Selling Guide verification (as of 2025-10-14). (Fannie Mae Selling Guide)
Cross-References
§10 (Risk Gates & insurability); §6 (costs on exit).

7.6 UCC/Solar & Other Juniors
Policy / Logic
Identify solar leases/financing and UCC-1 fixture filings; these can affect financeability, DTI, contributory value, and first-lien priority/subordination needs.
Decision Logic (If–Then)
Owned/paid-off systems → real property; normal appraisal.

UCC fixture filing → include payment in DTI; value only if non-repossessable; subordinate any senior UCC to preserve first-lien position.

Leased/PPA → no contributory value; include payment in DTI unless PPA meets carve-out; confirm termination/assumption rights at foreclosure.

Actions / Checklist
Run Florida Secured Transaction Registry; capture lease/PPA, UCC search, buyout, and title commitment; add to deal.debt.juniors[] (type: UCC/solar).

Evidence / Citations
Source solar/UCC rules (conforming lens).
Cross-References
§10 (insurability), §5 (roof interactions), §6 (exit costs).

7.7 Reinstatement & Short-Pay Tracks
7.7.1 Partial / Full Reinstatement
Policy / Logic
Model reinstatement to illuminate trade-offs; prefer full reinstatement or immediate sale. Florida judicial process preserves redemption up to certificate of sale; servicer acceptance of partials varies—require it in writing. (Legislature of Florida)
Decision Logic (If–Then)
Present three-way: (1) Full reinstate → List, (2) Partial + cash backup, (3) Cash now.

If partial < 30-day runway or per-diem > 2 weeks of burn → steer to cash.

If no servicer acceptance in writing → mark [INFO NEEDED] and suppress recommendation.

Formula / Calculation
Reinstate_Total = Arrears + Fees + Attorney + (Per-Diem × Days_to_Pay); Runway = Days until next default event.
Risks & Mitigations
Servicer reversal; added legal fees → obtain servicer letter with acceptance and good-through dates.
7.7.2 “Cash (Shortfall)” & Short-Sale/Novation Gates
Policy / Logic
When MAO < Payoff, always show “Cash (Shortfall)” with deficit math, then present reinstatement / list / short sale tracks (transparency improves outcomes).
Decision Logic (If–Then)
Spread test to present Cash: require MAO − PayoffClose ≥ $10,000. Else show Cash as Shortfall with options and sensitivities.

Short-Sale/PFS gates (if chosen): plan around 5-day MLS exposure and ≤90-day valuation freshness; adhere to arms-length rules. (Source cites GSE/HUD guidance.)

Risks & Mitigations
Net-schedule constraints (e.g., HUD ATP tiers) require calendar-based pricing; keep novation concepts out of GSE/FHA short-sale files (arms-length scrutiny).

Actions / Checklist
Attach payoff letter; compute Deficit = Payoff_to_Close − MAO with date stamps; if PFS path, capture MLS history, valuations, affidavits, ATP.

Evidence / Citations
Spread rule, payoff math; PFS gates.
Cross-References
§9 (MAO/Buyer Ceiling), §12 (scenario bands).

7.8 Actions / Checklists / Evidence
Actions / Checklist (who/what/when—per source)
Day-0: Order O&E + lien search; request payoff(s) with daily per-diem & advances; pull permit history; request HOA/COA estoppels.

Per-Diem discipline: Track daily and weekly roll-ups; refresh payoff at T+7 until closing.

Negotiation modeling: For HOA/COA and municipal/code items, present Low/Mid/High haircuts; calendar hearings.

PACE/UCC: Pull program/UCC docs; add to deal.debt.juniors[]; flag insurability conditional if conflicts.

Evidence / Citations
Inline above; estoppel and redemption statutes verified as of 2025-10-14. (Legislature of Florida)
Cross-References
§6 (fees and taxes), §8 (timeline & carry), §9 (MAO math), §10 (risk gates), §11 (HOA/permits).

Cross-Reference Map (from this part)
Per-Diem & PayoffClose → §8 (timeline), §9 (spread tests).

HOA/COA estoppels → §11.1 (timing; documents), §6 (close planning).

PACE/UCC → §10 (insurability), §6 (exit costs), §5 (roof/solar interactions).

Glossary — Updates (delta)
PayoffClose: Payoff₀ + Per-Diem × Days + Servicer Fees/Advances; computed from written payoff letters only.

Per-Diem Burn: Daily interest (and fees if specified) × days to event; display daily + weekly.

Material Title Issues: Financing/insurability blockers (open/expired permits, municipal/code liens, unreleased mortgages, tax-deed w/o quiet title, etc.).

Estoppel (HOA/COA): Association certificate issued ≤10 business days after request; 30/35-day effectiveness. (Statutes verified as of 2025-10-14.) (Legislature of Florida)

PACE Assessment: Energy/renewable improvement financing sometimes recorded as senior or effectively senior; payoff typically required for conforming exits. (Fannie Mae Selling Guide)

Conflicts & Open Questions — Additions
C-701 — HOA/COA Reduction Bands
Issue: Source models 10–25% reduction potential on HOA/COA liens/fines; confirm if these are policy bands or recent empirical.
Status: OPEN.
Action: Maintain L/M/H display; attach estoppel + any manager emails supporting reductions.

C-702 — Double-Counting Title Risk
Issue: When CureCost is modeled, ensure any Title Risk dampener isn’t also applied to the same issue.
Status: OPEN; add UI guardrail.

C-703 — Servicer Acceptance of Partial Reinstatement
Issue: Variation across servicers; recommendations contingent on written acceptance.
Status: OPEN; block recommendation until letter on file.

Resolution Log — Updates (as of 2025-10-14)
R-701 — Redemption Timing Reference — [RESOLVED]
Canonical: Florida Right of Redemption continues until the certificate of sale is filed (or the time in the judgment).
Evidence: Florida Stat. 45.0315 (official site), as of 2025-10-14. (Legislature of Florida)
Resolution Impact: Underwriting continues to model per-diem burn through the expected sale filing; reinforces refresh cadence and cautious timeline promises in §§7.2, 8.

R-702 — HOA/COA Estoppel Timelines — [RESOLVED]
Canonical: Estoppel certificates must be issued within 10 business days; typical effectiveness 30/35 days.
Evidence: Fs. 720.30851 (HOA), Fs. 718.116 (Condo), as of 2025-10-14. (Legislature of Florida)
Resolution Impact: Close-timeline promises in §3 and §8 must reflect these windows.

R-703 — PACE Conforming-Exit Eligibility — [RESOLVED]
Canonical: GSE loans are ineligible where PACE enjoys or implies lien priority ahead of the first mortgage; payoff typically required.
Evidence: Fannie Mae Selling Guide B5-3.4-01, as of 2025-10-14. (Fannie Mae Selling Guide)
Resolution Impact: PACE added to deal.debt.juniors[] and exit feasibility; drives §10 insurability gate.

Change Log — Part 7 entry (2025-10-14)
Consolidated senior/junior lien handling and PayoffClose math; added refresh cadence and protective advances call-outs.

Integrated HOA/COA estoppel timing and L/M/H reduction modeling; added statutory anchors for timing. (Legislature of Florida)

Added PACE and UCC/solar juniors with conforming-exit implications and capture checklist.

Documented reinstatement math and the “Cash (Shortfall)” transparency rule.

Delta from Previous Draft
Tightened reliance on written payoffs and statute-verified timeframes; centralized per-diem and spread test rules for auditability.

Elevated PACE/UCC tracks and linked to exit eligibility; formalized HOA/COA reduction modeling into L/M/H displays with documented evidence.

PART 8 — Timeline & Carry
Navigator (this part): 8.1 Days-to-Ready (DTR) • 8.2 DOM Bands & List Cadence • 8.3 Days-to-Close Standards • 8.4 Carry Formulas & Inputs • 8.5 Financing/Exit Interactions • 8.6 Seasonality & Storm Protocol • 8.7 Tenant Impact & Buffers • 8.8 Workflow, Blocks & Proofing
What’s New in This Part (as of 2025-10-14): Consolidates all timing math (DTR, DOM, escrow) into one place; pins carry to the source formulas with a hard 5.0-month cap and a $1,250/month placeholder rule; adds research-backed confirmation of Citizens’ binding suspensions and 03/20/2025 form updates; introduces a conflict entry on whether to include interest in Hold_Monthly.

8.1 Days-to-Ready (DTR)
Policy / Logic
“Days-to-Ready” captures the prep window (vendor scheduling, quick turns, photos) prior to list or contract. Apply the source’s Wholetail/Novation buffer if short-fuse curatives or tenants add slack.

Decision Logic (If–Then)
If storm watch or binding suspension occurs, pause marketing steps and re-verify insurability (see §8.6).

Risks & Mitigations
Missing insurance proof delays go-live; collect 4-Point and Roof (Citizens editions) and obtain a bindable quote before listing/wholesale wholetail. (Public)

Actions / Checklist
Lock DTR only after: photos scheduled, vendor quotes confirmed, insurance documents in file.

Cross-References
§5 (SOW & listing blockers), §10.1 (Insurability Gate).

8.2 DOM Bands & List Cadence
Policy / Logic
DOM guidance and staged price reductions are used to manage carry and maximize offers. Apply seasonal and storm adjustments (see §8.6).

Decision Logic (If–Then)
Staged reductions after activation: Day 14 −1.5%, Day 28 −1.5%, Day 45 −2.0% unless recent offers contradict (signals per ZIP). Keep “show work.”

If ZIP SP/LP trend is falling, accelerate the cadence; refresh comps at each step.

Seasonal adders: If listing Nov 20–Jan 5, either add +7 DOM to carry or reduce price −0.5% vs. spring baseline.
Cross-References
§4 (Weighting & DOM feeds), §12 (Negotiation bands & list strategy).

8.3 Days-to-Close Standards
Policy / Logic
Closing durations are standardized by path and must reflect statutory and insurance realities.

Decision Logic (If–Then)
Cash: 14–21 calendar days standard; compress to 10–14 only when title rush is confirmed and HOA/COA estoppels were ordered Day 0 (proof on file).

List/Finance: DOM_zip + 35 days (contract-to-funding) to cover inspections, appraisal, financing buffers.

Estoppel gate: Associations must deliver estoppel within 10 business days; effective period 30 days (electronic/hand) or 35 days (mail). No promises of 14-day close without timestamped estoppel request in file. (Legislature of Florida)

Urgency Bands (time to hard deadline)
Emergency ≤14, Critical 15–30, High 31–59, Low ≥60. Cash-first bias for Emergency/Critical; List requires insurability proof.

Cross-References
§6.6 (footnoting & “as-of”), §7.2 (per-diem), §11.1 (HOA/COA docs).

8.4 Carry Formulas & Inputs
Policy / Logic
Carry is modeled from source formulas with required inputs and publish blocks when incomplete.

Formulas (as written in source):
Carry_Months = min( (DOM_zip ÷ 30) + (35 ÷ 30), 5 )  (= DOM_zip + 35 days, cap 5.0 months)

Hold_Monthly = (Taxes/12) + (Insurance/12) + (HOA/12) + Utilities  [see conflict on interest below]

Carry_Total = Carry_Months × Hold_Monthly

Inputs (required)
Taxes (current bill), Insurance (bindable HO-3/DP-3), HOA dues/estoppel, Utilities (12-mo). If any input is missing → show $1,250/mo placeholder, tag [INFO NEEDED], and BLOCK final seller nets/MAO PDF until quotes are attached.

Actions / Checklist
Pull tax bill; obtain bindable insurance (≤30 days old) with Citizens-compatible forms; load HOA dues/estoppel; attach 12-mo utilities; replace placeholder immediately.

Evidence / Citations
Source carry definitions and block rules, as above.

Citizens forms update 03/20/2025 (4-Point & Roof) and ongoing binding policy confirmation. (Public)

8.5 Financing & Exit Interactions
Policy / Logic
Days-to-close and carry assumptions must match the exit path (Cash, List/Finance, Wholetail/Novation). Urgency bands determine whether list is feasible; if Emergency/Critical, prioritize Cash unless reinstatement and insurability are documented.

Decision Logic (If–Then)
If List/Finance path selected → use DOM_zip + 35 escrow and confirm appraisal/inspection windows fit the deadline.

If tenant-occupied with limited access → apply Tenant_Buffer and/or extend carry (don’t double-count; choose one per cooperation level).

If storm binding suspension hits mid-marketing → pause contracting; require new photos + bindable quote before resuming. (Public)

Actions / Checklist
Render scenario cards showing Cash vs List/Finance timelines (with per-diem clock in §7.2) and Carry_Total impact.

Cross-References
§7.2 (PayoffClose & per-diem), §12 (scenario bands & buyer ceilings).

8.6 Seasonality & Storm Protocol
Policy / Logic
Apply seasonal DOM/price adjustments and formal storm pauses with carrier proof.

Decision Logic (If–Then)
Nov 20–Jan 5 → Either +7 DOM to carry or −0.5% price.

If Citizens/major carriers issue a binding suspension, pause binding/contracting; on resume, re-inspect roof/exterior and obtain a fresh bindable quote.

Authority: Citizens’ public binding alerts and inspections page. (as of 2025-10-14) (Public)

Forms update: 03/20/2025 4-Point and Roof forms (Insp4pt 03 25; RCF-1 03 25). (Public)

Actions / Checklist
Auto-create “Storm T-72h Pause” task; on resume, attach dated photos + carrier quote.

8.7 Tenant Impact & Buffers
Policy / Logic
Listing path allowed only if MTM or lease-end ≤60 days and cooperation is documented; otherwise route to investor-sale or plan post-close occupancy.

Decision Logic (If–Then)
If tenant remains or access restricted → add Tenant_Buffer = max(1%·ARV, $2,500) to costs or extend carry—not both unless access is unreliable.

If cash-for-keys achieves vacant by close, collapse buffer to $0.

Actions / Checklist
Obtain tenant estoppel and written showing windows before MLS activation.

Cross-References
§5 (listing blockers & wholetail buffer), §12 (banding).

8.8 Workflow, Blocks & Proofing
Policy / Logic
Blocking Rule: If any carry input (taxes, insurance, HOA, utilities) is missing, BLOCK final seller nets/MAO PDF; show the [INFO NEEDED] fetch list until quotes are attached.

Decision Logic (If–Then)
14-day close promises require evidence (estoppel request timestamp, title rush). Without proof, default to 18–21 days.

Actions / Checklist
Day-0: open title, request estoppels, bind HO-3/DP-3 quote with current 4-Point/Roof forms, collect utility averages, replace placeholder.

Cross-References
§3 (Intake protocol), §6 (fees), §7 (per-diem & arrears), §10 (risk gates), §11 (HOA/permits).

Conflicts & Open Questions — Additions
C-801 — Hold_Monthly: include interest?

Version A (Q95): Hold_Monthly = Taxes/12 + Insurance/12 + HOA/12 + Utilities (no mention of interest).

Version B (Q8): Hold_Monthly = Taxes/12 + Insurance/12 + HOA/12 + Utilities **(+ Interest if leveraged)**.

Status: [RECOMMENDED POLICY] (pending owner approval) — Exclude acquisition interest from Hold_Monthly by default for comparability across cash vs. financed; when leveraged, model Interest_Carry as a separate line under Buyer_Costs/Carry and include in totals.

Rationale: Keeps Carry comparable and transparent; prevents double-counting against Buyer_Costs; preserves investor velocity and trust.

Due date: Owner sign-off requested.

C-802 — Carry cap exceedance

Issue: Cap is 5.0 months “unless MLS evidence justifies more.”

Status: OPEN — Define approval workflow and required MLS exhibit (ZIP median DOM with sample n and 90-day window).

C-803 — DOM/MOI evidence feed

Issue: Tools require Stellar MLS ZIP DOM/MOI for last 90 days.

Status: [INFO NEEDED] — Add MLS export to each file; cite rules/methodology snapshot (as-of) from Stellar MLS. (Stellar MLS)

Resolution Log — Updates (as of 2025-10-14)
R-801 — Citizens binding suspensions — [RESOLVED]
Canonical: During tropical events, Citizens issues binding suspensions; binding may resume via dated bulletin. Evidence: Citizens Binding Alerts and recent event notices (e.g., 09/27/2025 suspension; 09/28/2025 lifted). Impact: Enforce storm pause and re-bind proof in §§8.1, 8.5, 8.6. (Public)

R-802 — Citizens form editions — [RESOLVED]
Canonical: 03/20/2025 updates to 4-Point (Insp4pt 03 25) and Roof (RCF-1 03 25) govern inspections for eligibility/binding. Evidence: Citizens update page and inspections page. Impact: Insurability gate in §§8.1, 8.6 and prerequisite for retail paths. (Public)

R-803 — Estoppel timing — [RESOLVED]
Canonical: Associations must deliver estoppel within 10 business days; effective 30/35 days (electronic/mail). Evidence: F.S. 720.30851 official statute site. Impact: Days-to-close standards and “14-day proof” gate in §8.3. (Legislature of Florida)

Change Log — Part 8 entry (2025-10-14)
Consolidated DTR, DOM cadence, escrow durations, and carry inputs into a single, numbered section.

Affirmed carry math (DOM+35; cap 5.0 mo), the $1,250/mo placeholder, and publish blocks when inputs are missing.

Verified Citizens storm/binding behavior and inspection form updates with current public sources; stamped as-of dates. (Public)

Added conflict entry C-801 (interest within Hold_Monthly) with a business-policy recommendation pending approval.

Delta from Previous Draft
Merged scattered rules into a strict If–Then flow from intake to close.

Added “14-day proof” gate and estoppel statute anchor.

Clarified tenant buffer vs. extended carry to prevent double-count.

Introduced separate handling for Interest_Carry (pending approval) to improve comparability and audit clarity.

Cross-Reference Map (from this part)
Carry inputs & blocks → §3 (Intake & Evidence), §6 (line-item first, proofing).

Urgency & per-diem → §7.2 (PayoffClose), §12 (scenario selection).

Citizens forms & binding → §5 (listing blockers), §10 (risk gates).

Glossary — Updates (delta)
Carry_Months: min( (DOM_zip ÷ 30) + (35 ÷ 30), 5 ) — converts DOM_zip + 35 days to months and caps at 5.0.

Hold_Monthly: (Taxes/12) + (Insurance/12) + (HOA/12) + Utilities (interest treatment pending C-801).

Tenant_Buffer: max(1%·ARV, $2,500) when tenant remains or access restricted.

Binding Suspension: Carrier pause on issuing new policies during tropical events; resume via dated bulletin. (Citizens public alerts; as-of 2025-10-14). (Public)

PART 9 — MAO, Buyer Ceiling, Spread
Navigator (this part): 9.1 Core Definitions • 9.2 MAO Formulas & Cap • 9.3 Buyer Ceiling (Max_Buyer) • 9.4 Respect-Floor & Overlap Logic • 9.5 Spread Rules & Borderline Handling • 9.6 Rounding & Presentation • 9.7 Actions / Checklists / Evidence
What’s New in This Part (as of 2025-10-14): Consolidated all pricing math into one audit path; locked the MAO Cap interplay with presentation math; formalized Buyer Ceiling as the out-bound price hard stop; surfaced Spread ≥ $10,000 and Borderline ±$5,000 rules; preserved charm-rounding guidance. (All rules/thresholds drawn from the source Q&A; citations refer to Q-numbers.)

9.1 Core Definitions
Policy / Logic
MAO (Maximum Allowable Offer): Internal buy-side ceiling derived from ARV, costs, and safety buffers. (Q12, Q96)

Buyer Ceiling (Max_Buyer): Maximum disposition price at which a qualified buyer (flipper/landlord/wholetail) still meets their target margin after repairs, buyer-side costs, and carry. This value clamps all public asks/assignments. (Q131, p.855–866)

Respect-Floor (Seller): Lowest non-disrespectful seller anchor, computed from AIV and local investor-discount evidence or, failing that, payoff-plus-essentials. (Q9, p.54–66)

Spread (Cash): MAO − PayoffClose, tested against a minimum to green-light presenting a Cash option. (Q10, p.74)

Decision Logic (If–Then)
If MAO < PayoffClose → present “Cash (Shortfall)” transparently with deficit math; do not hide Cash. (Q11, p.83–84)

If Confidence = C → treat file as Borderline even when spreads exceed $5k; move to human review. (Q61–Q63, p.360–362)

Evidence / Citations
Source: Q9–Q13, Q61–Q63, Q131.
Cross-References: §4 (valuation confidence), §7 (PayoffClose), §12 (bands & negotiation).

9.2 MAO — Formulas & Cap (Canonical)
Policy / Logic
Compute all applicable MAO variants; recommend the path that best fits insurability, scope, and urgency—then clamp to the MAO Cap rule. (Q12, p.92–98; Q9, p.54)
Decision Logic (If–Then)
If Insurable & Light Repairs (≤$5k) → include Wholetail_MAO; else hide wholetail card. (Q12, p.93; Q17, p.121–213)

If Tenant MTM/≤60d → include Wholesale_MAO with tenant-turn buffer. (Q12, p.94; Q50 refs)

Always compute Flip_MAO; show other cards only when gates are met. (Q12)

Formulas / Calculations (as stated in source)
Flip_MAO: ARV × (1 − Flip_Margin) − Repairs − Closing/Title − Carry − Safety_Margin. (Q12–Q96)

Wholesale_MAO: This is the contract price offered to the seller. It is calculated using the same formula as the Flip_MAO to determine the maximum viable purchase price. The assignment fee is not subtracted from this offer.
Assignment Fee (Variable): The fee is the entire spread between the Wholesale_MAO (your contract price with the seller) and the final assignment price negotiated with the end-buyer. This fee is maximized by selling to the end-buyer at or near the Max_Buyer (Buyer Ceiling).

Wholetail_MAO: Flip_MAO − Repair_Reductions − Wholetail_Buffer. (Q12–Q98; Q16, p.119)

Wholetail_Buffer: max(1% × ARV, $5,000) + $2,500 if tenant-occupied + CureCost (short-fuse title/permit). (Q16, p.119)

MAO Cap (independent clamp)
MAO Cap Rule: Offer ≤ 0.97 × AIV (As-Is minus 3% after adjustments). (Q9, p.54)

Canonical interplay: MAO_final = min(MAO_presentation, 0.97 × AIV). (C-402 [RESOLVED], Parts 4 & 9)

Risks & Mitigations
Double-counting buffers: Do not stack Wholetail_Buffer and a generic Safety_Margin on the same risk—apply once and label. (Q16)

Tenant buffers: Use either Tenant_Buffer (see §8.7) or extended carry—avoid stacking.

Actions / Checklist
Render all eligible MAO cards (Flip/Wholesale/Wholetail), each stamped with inputs, dates, and Confidence. (Q12; Q63)

On publish, show the MAO Cap clamp in “Show Work.” (Q9)

Evidence / Citations
Source: Q9, Q12, Q6, Q16.
Cross-References: §5 (scope & blockers), §6 (costs), §8 (carry), §12 (presentation bands).

9.3 Buyer Ceiling (Max_Buyer)
Policy / Logic
Buyer Ceiling is the hard stop for any outbound price (assignment ask, wholetail list, investor disposition): never market above Max_Buyer. (Q131, p.855–866; Q182, p.1233–1236)
Decision Logic (If–Then)
If ask > Max_Buyer → Ceiling Breach = hard stop; require correction or CFO-level override with reason. (Q182, p.1236)

Segment by buyer type and local velocity: flippers, landlords (DSCR/cap), wholetail. (Q131, p.857–866; Q167, p.1183–1188)

Funds/iBuyers (when active): stay ≤ Max_Buyer; you may target within 1% below their known ceiling but never exceed ours. (Q131, p.862)

Formula / Calculation (as stated in source)
Locked definition:
Max_Buyer = ARV × (1 − Buyer_Target_Margin) − Repairs − Buyer_Costs − Carry (Q131, p.855)

Flipper margin bands (MOI-based): The Buyer_Target_Margin is set dynamically based on Months of Inventory (MOI) for the subject property's zip code to reflect current market conditions.
If MOI is under 3.0 months (Hot Seller's Market): Use a margin of 14%–16%. Buyers are more competitive and accept lower returns.
If MOI is 3.1–4.9 months (Balanced Market): Use a margin of 16%–18%.
If MOI is over 5.0 months (Cooler Buyer's Market): Use a margin of 18%–20%. Buyers have more options and require higher returns to take on risk.

Buyer_Costs: title, recording, stamps, etc. (line-item first; FL deed stamps, title schedule referenced). (Q131, p.855–866; see §6)

Carry: (DOM_zip + 35)/30 × Hold_Monthly, cap 5.0 mo. (Q131; §8.4)

Landlord variant (from source)
NOI and cap/DSCR mapping define landlord ceilings:
NOI = (Market Rent − vacancy − taxes − insurance − HOA − maintenance) × 12
Price*cap = NOI / Target_Cap
Price_dscr = (NOI / DSCR_Target) / Annual_Debt_Service_per*$Price
Max_Buyer(landlord) = min(Price_cap, Price_dscr) − Buyer_Costs − Carry (Q167, p.1183–1188)

Risks & Mitigations
Over-asking above Max_Buyer → buyer walk-offs; mitigate by strict Ceiling Card audits and correct Buyer_Costs inputs. (Q182, p.1236; Q131, p.866)

Actions / Checklist
For every price, attach a Ceiling Card (inputs, timestamp, approver); auto-open a price-change task if refreshed inputs push Max_Buyer below ask. (Q182, p.1235–1236)

Maintain active cohorts (flipper/landlord/wholetail) per county; refresh cohorts with DOM/MOI evidence. (Q131, p.867–869)

Evidence / Citations
Source: Q131 (locked definition), Q167 (landlord mapping), Q182 (enforcement).
Cross-References: §6 (costs), §8 (DOM/carry), §12 (dispo bands).

9.4 Respect-Floor & Overlap Logic
Policy / Logic
We anchor the seller with Respect-Floor and the buyer with Max_Buyer. We transact where bands overlap; when they don’t, we manufacture overlap through terms—without crossing Max_Buyer or dipping below PayoffClose. (Q9, Q183)
Decision Logic (If–Then)
Respect-Floor (Seller) (Q9):
Respect_Floor = max( AIV × (1 − Local_Discount_20thPctZIP), AIV − Typical_Investor_DiscountZIP, PayoffClose + Essential_Costs )

Dataset rules (Q9, p.56–69): build ZIP-level investor discount distribution from recorded cash deeds joined to MLS remarks (“as-is/investor” cues); compute 20th percentile and median; min n=15 within 90d window (expand when thin); fallbacks defined in source.

Until dataset is live: use documented temporary default ranges only as written or branch to PayoffClose + Essentials to avoid over-paying. (Q9, p.64–66)

Bands:

Seller Offer Band = [Respect_Floor, min(MAO, AIV)]. (Q99)

Buyer Ask Band = anchored under Max_Buyer with our preferred dispo route shown. (Q100)

Sweet-Spot = midpoint inside the overlap; charm-rounded for presentation. (Q101, Q996)

Risks & Mitigations
Dataset thinness: when n < 8 even after expansions, disable Respect-Floor anchor and show BPO + [INFO NEEDED] tag. (Q9, p.69–74)

Disjoint bands: follow Q183 “Deal-Fabrication” checklist—close-date trades, occupancy terms, credits, and optics—while staying ≤ Max_Buyer and ≥ PayoffClose. (Q183, p.1238–1239)

Actions / Checklist
On each proposal, render Left column (Seller Offer Band with Respect-Floor math & sources) and Right column (Buyer Ask Band with Max_Buyer and route). (Q99–Q100)

Log every dataset expansion step (radius/time) and sample size used. (Q9)

Evidence / Citations
Source: Q9, Q99–Q101, Q183.
Cross-References: §4 (investor-discount dataset), §7 (PayoffClose), §12 (negotiation bands).

9.5 Spread Rules & Borderline Handling
Policy / Logic
We protect conversion and optics with two gates: a minimum spread to present Cash, and a Borderline escalation band for edge cases. (Q10, Q61)
Decision Logic (If–Then)
Cash Spread Gate (present vs. shortfall) (Q10): Present Cash only if MAO − PayoffClose ≥ $10,000. If below, present “Cash (Shortfall)” with deficit math and option paths. (Q10, Q11)

Borderline Escalation (Q61–Q63):

If |MAO − PayoffClose| ≤ $5,000 or |Net_List − Net_Cash| ≤ $5,000 → tag Borderline and open 12-hour Analyst Review; hold outbound numbers.

If Confidence = C, treat as Borderline even if spreads exceed $5k. (Q61–Q63)

Formula / Calculation
Deficit math (when shortfall): Deficit = PayoffClose − MAO (show payoff as-of timestamp and per-diem). (Q11)

Risks & Mitigations
Thin spreads → fall-through and reputational risk; transparency via shortfall math + clear options improves trust. (Q10–Q11)

Actions / Checklist
Always attach written payoff with per-diem; refresh T+7; populate the spread table on the summary card. (Q10–Q11; see §7)

Evidence / Citations
Source: Q10–Q11, Q61–Q63.
Cross-References: §7.2 (per-diem), §12 (scenario menus).

9.6 Rounding & Presentation
Policy / Logic
Use charm rounding at public anchors only within the overlap of Seller & Buyer bands; never round past Max_Buyer or under Respect-Floor. (Q1 note; Q32; Q101)
Decision Logic (If–Then)
Public anchors: $X,900 or $X,990 where appropriate. (Q1, p.13; Q32, p.215–216; Q101, p.383)

Clamps/Overrides: “Never set Respect-Floor < PayoffClose unless explicitly choosing a shortfall option; charm-round only if ≥ Respect-Floor.” (Q70, p.70)

Actions / Checklist
On each output, show Sweet-Spot, Respect-Floor, Max_Buyer, and any applied rounding. (Q383)

Keep a single Show Work appendix with the exact formulas used (MAO, Max_Buyer, Carry, Buyer_Costs). (Q12; Q131)

Evidence / Citations
Source: Q1 (rounding cue), Q32 (list bands), Q70 (clamp), Q101/Q383 (summary card).
Cross-References: §6 (costs feeding Buyer_Costs), §8 (carry inputs), §12 (presentation bands).

9.7 Actions / Checklists / Evidence
Actions / Checklist (who/what/when—as stated)
Before publishing numbers:

Compute Flip/Wholesale/Wholetail MAOs; clamp by 0.97×AIV; stamp inputs and dates. (Q12; Q9)

Generate Max_Buyer by cohort; attach Ceiling Card; enforce ≤ Max_Buyer. (Q131; Q182)

Build Seller Offer Band (Respect-Floor math + sources) and Buyer Ask Band (with route). (Q99–Q100)

Run Spread Gate and Borderline checks; if Borderline, open 12-hour review and hold. (Q10–Q11; Q61–Q63)

On conflicts/ambiguity: Keep both versions verbatim with Q-refs; resolve via hierarchy where applicable (none external needed for Part 9); otherwise log [RECOMMENDED POLICY].

Evidence / Citations
Inline Q-refs above.
Cross-References
§4 (valuation & investor discount), §5 (buffers), §6 (costs), §7 (payoff/per-diem), §8 (carry), §12 (scenario bands & scripts).

Cross-Reference Map (from this part)
MAO formulas & Cap → §4.9 (“Show Work” math), §5.7 (wholetail buffer), §8.4 (carry math).

Max_Buyer enforcement → §6 (buyer costs), §8 (DOM-based carry), §12 (disposition bands & guardrails).

Respect-Floor / overlap → §4.8 (dataset), §7 (PayoffClose), §12 (manufacturing overlap).

Spread & Borderline → §7.2 (per-diem), §3 (blocking), §12 (option menus).

Glossary — Updates (delta)
MAO Cap: Independent clamp: Offer ≤ 0.97 × AIV (As-Is minus 3%). (Source: Q9)

Buyer Ceiling (Max_Buyer): Dispo hard stop: ARV × (1 − Buyer_Target_Margin) − Repairs − Buyer_Costs − Carry; never market above this price. (Source: Q131)

Respect-Floor: Seller-side floor: max(AIV × (1 − Local_Discount_20thPctZIP), AIV − Typical_Investor_DiscountZIP, PayoffClose + Essentials). (Source: Q9)

Sweet-Spot: Midpoint inside the overlap of Seller Offer Band & Buyer Ask Band, charm-rounded. (Source: Q101)

Spread (Cash): MAO − PayoffClose; must be ≥ $10,000 to present Cash (else present “Cash (Shortfall)”). (Source: Q10–Q11)

Borderline: Any file within ±$5,000 of a go/no-go threshold or rated Confidence = C. (Source: Q61–Q63)

Conflicts & Open Questions — Additions
C-901 — Presentation MAO vs. MAO Cap
Status: [RESOLVED] (prior). Canonical: MAO_final = min(MAO_presentation, 0.97×AIV).
Source: Q9 (Cap), Q12 (presentation math). Resolution Impact: Reference clamp everywhere MAO is displayed.

C-902 — Buyer_Target_Margin local banding Status: [RESOLVED] — Canonical Rule: Buyer target margin is now set dynamically based on Months of Inventory (MOI). See §9.3 for the specific tiers. Resolution Impact: Replaces vague banding with a data-driven policy; Max_Buyer calculation is now sensitive to market velocity.

C-903 — Respect-Floor dataset fallbacks
Issue: Q9 specifies min-n thresholds and fallbacks (adjacent ZIPs → county → disable). Confirm exact windows per fallback steps for audit cards.
Status: OPEN — Provide the codified fallback ladder as a one-pager with examples.

Resolution Log — Updates (as of 2025-10-14)
R-901 — MAO Cap Interplay — [RESOLVED]
Topic: Whether the Cap replaces or clamps presentation MAO.
Decision: Clamp — use min(MAO_presentation, 0.97×AIV).
Evidence: Q9 (Cap); Q12 (MAO variants).
Impact: All offers and internal approvals reference the clamp; summary cards show both the computed MAO and the Cap.

R-902 — Spread & Borderline Rules — [RESOLVED]
Topic: When to present Cash and when to escalate.
Decision: Present Cash only if MAO − PayoffClose ≥ $10,000; escalate Borderline at ±$5,000 or any Confidence = C.
Evidence: Q10–Q11; Q61–Q63.
Impact: Tool gating and 12-hour analyst review tasks are now mandatory.

(No external statutes were required to resolve Part 9 items; where external fees matter, see Part 6 for the verified authorities.)

Change Log — Part 9 entry (2025-10-14)
Consolidated MAO, Buyer Ceiling, Respect-Floor, and Spread into one canonical section with explicit formula boxes.

Locked MAO Cap clamping behavior and Ceiling Breach hard-stop.

Brought Spread ≥ $10k and Borderline ±$5k into the core decision flow.

Preserved charm-rounding guidance and band visualization (Seller/Buyer bands + Sweet-Spot).

Delta from Previous Draft
Removed scattered references; created a single audit-ready path from inputs → MAO variants → clamp → bands → publish.

Explicitly tied disposition pricing to Max_Buyer with required Ceiling Card audits.

Elevated dataset-thinness handling for Respect-Floor and logged open items where the source requires operational tables.

PART 10 — Risk Gates & Hard Stops
Navigator (this part): 10.1 Insurability Gate • 10.2 Bankruptcy & Legal Stays • 10.3 Permits & Code Hazards • 10.4 Flood Triggers (SI/SD “50% Rule”) • 10.5 Condo/HOA Warrantability & Board Risk • 10.6 Federal/Other Redemption Windows • 10.7 Pass/Watch/Fail Language & Usage
What’s New in This Part (as of 2025-10-14): Centralized all “stop/go” criteria; elevated Insurability and Flood SI/SD to hard stops; aligned permit/code hazards with material-title logic; added condo warrantability notes and a formal Pass/Watch/Fail rubric; referenced prior resolutions (Citizens forms update; flood 50% rule). No new numbers introduced.

10.1 Insurability Gate (Hard Stop)
Policy / Logic
Retail/list paths are blocked unless current insurance eligibility can be proven on the required inspection forms; wholetail requires the same proof before activation.
Decision Logic (If–Then)
If the home requires 4-Point/Wind-Mit (≥20 years or per carrier rules) and current Citizens forms (03/20/2025 editions) are not on file with a bindable quote ≤30 days old → HARD STOP: retail/listing cannot proceed; route to Cash/Assign until cured.

If a binding suspension (storm watch) is active → pause contracting/listing; re-verify bindability when lifted.

Risks & Mitigations
Retail fall-through due to post-contract bind denial → obtain inspection PDFs (latest editions) + bind email in file before any public launch.

Actions / Checklist
Order 4-Point/Wind-Mit Day-0 for ≥20-year homes.

Attach bindable quote (date-stamped) and carrier email to the file.

On storm alerts, suspend marketing; after lift, re-inspect roof/exterior and re-quote.

Evidence / Citations
Source insurability gate and storm-pause policy. Citizens form edition (03/20/2025) and binding alerts verified earlier (see Parts 5 & 8).
Cross-References: §5.4, §8.6, §11.2.

10.2 Bankruptcy & Legal Stays
Policy / Logic
Active bankruptcy automatic stays and court orders restricting transfer are treated as hard legal gates; do not solicit or progress to close until the file is cleared consistent with the controlling order(s).
Decision Logic (If–Then)
If active stay (any chapter) or court restriction is identified → HARD STOP; require written attorney guidance and any required motions/orders before proceeding.

If dismissed/closed but reinstatement risk exists → WATCH; calendar verification steps and add timeline pad.

Risks & Mitigations
Sanctions/contempt exposure; voidable transfers → obtain counsel sign-off and include relevant order text in the file.

Actions / Checklist
Capture case number, chapter, status, and attorney contact; attach docket printout and any orders authorizing sale.

Re-check status prior to contract execution and again prior to closing.

Evidence / Citations
Source acknowledges legal-stay gating; detailed statutory citations not provided in source → [CITE NEEDED] (bankruptcy code sections to be appended in Part 14).
Cross-References: §7 (payoffs & per-diem timing), §12 (scenario selection under constraints).

10.3 Permits & Code Hazards (Material Title/Finance Issues)
Policy / Logic
Open/expired permits, recorded unpermitted additions, unsafe/condemned designations, municipal/code liens/fines are material and can block financeability or title insurance.
Decision Logic (If–Then)
If material title/permit issue exists (e.g., open permit, unsafe structure, recorded addition lacking finals) → HARD STOP for retail/list; route to Cash/Wholesale until curatives are completed (not merely scheduled).

If board/hearing is required to reduce fines → WATCH: model Low/Mid/High outcomes and track hearing dates; do not assume reductions.

Risks & Mitigations
Underwriter refusal; schedule slippage → price CureCost explicitly; avoid double-counting with any generic risk dampener.

Actions / Checklist
Day-0: O&E + lien search, permit history pull; request written payoff for fines; obtain contractor or municipal closure plan in writing.

Evidence / Citations
Source material-title list and curative workflow reflected in Parts 5 & 7.
Cross-References: §5.5, §6 (cost line-items), §7.4, §11 (permits).

10.4 Flood Triggers — SI/SD “50% Rule” (Hard Stop)
Policy / Logic
When Substantial Improvement/Substantial Damage thresholds are likely (improvements/repairs ≥ 50% of the structure market value in flood hazard areas), treat retail finance as high-risk/blocked until a compliance path is defined and funded (elevation/code upgrades as required).
Decision Logic (If–Then)
If estimated improvement/repair cost approaches or exceeds 50% of the structure value → HARD STOP for retail/list; Cash/Wholesale bias until the local Floodplain Administrator issues a favorable SI/SD determination and plans are approved.

Risks & Mitigations
Major timeline and budget exposure; insurance eligibility at risk → obtain Elevation Certificate, SI/SD worksheet, and written administrator determination; adjust contingency and DTR.

Actions / Checklist
Contact Floodplain Administrator; capture determination; update repairs, timeline, and carry; attach local ordinance [JURISDICTION NEEDED] if not already in file.

Evidence / Citations
Authority confirmation logged earlier (Part 5 Resolution R-501).
Cross-References: §5.6, §8.6, §11 (permits/insurance).

10.5 Condo/HOA Warrantability & Board Risk
Policy / Logic
Condo/HOA frameworks can block retail financing through warrantability (budget/reserves/structural items), special assessments, or board/transfer approvals.
Decision Logic (If–Then)
If non-warrantable indicators (e.g., significant deferred maintenance, litigation, inadequate reserves/SIRS issues, special assessments) → WATCH/FAIL depending on severity; retail finance may be unavailable; consider Cash/Wholesale or pricing for wholetail with disclosures.

If board approval/application is required and timelines exceed urgency → WATCH with timeline pad; if refusal risk is high → FAIL retail path.

Risks & Mitigations
Buyer loan denials late in escrow; post-contract fee shocks → pull estoppel, budget, questionnaire, and assessment notices; disclose known risks.

Actions / Checklist
Request association questionnaire (condo), budget/reserve schedules, and any SIRS/Milestone materials if referenced in file; collect transfer/approval requirements and timing.

Evidence / Citations
Elements referenced in source (estoppels; association doc gating). Specific SIRS/Milestone citations [CITE NEEDED] unless present in the source appendices.
Cross-References: §6 (fees), §7.3 (estoppels), §11.1 (HOA/Condo).

10.6 Federal/Other Redemption Windows
Policy / Logic
Certain liens and foreclosure processes include redemption or post-sale rights that extend risk windows beyond closing.
Decision Logic (If–Then)
If a redemption right is present or likely (e.g., government liens, judicial processes) → WATCH: pad timeline; ensure title insurability and escrow timing reflect exposure; in some cases → FAIL for retail finance until cleared.

Risks & Mitigations
Post-close title challenges; rescission risk → require title counsel guidance, payoff confirmations, and insurer underwriting approval.

Actions / Checklist
Confirm presence/absence of redemption in title commitment and counsel memo; reflect timing in per-diem/carry modeling.

Evidence / Citations
General redemption handling acknowledged in source (see Part 7). Specific federal timelines not enumerated in source → [CITE NEEDED]; to be appended in Part 14 if owner elects.
Cross-References: §7.2 (per-diem), §6 (closing), §12 (scenario selection).

10.7 Pass / Watch / Fail — Canonical Usage
Policy / Logic
Use the Pass/Watch/Fail rubric consistently to communicate gate status and next actions.
Decision Logic (If–Then)
PASS — All gating artifacts satisfied (e.g., insurability proof, clear permits/title, no SI/SD exposure, HOA/COA docs clean). Proceed with recommended retail/wholetail path.

WATCH — Curatives or uncertainties remain (e.g., board approval pending, code hearing scheduled, questionnaire returns pending); proceed with conditions, timeline pad, and dual-path options.

FAIL — Non-negotiable blocker (e.g., bind denied; active bankruptcy stay; SI/SD likely with no plan; unsafe structure). Retail/listing blocked; route to Cash/Wholesale or hold.

Risks & Mitigations
Misclassification causes re-trades → require file notes citing the exact artifact(s) that support Pass/Watch/Fail.

Actions / Checklist
Add a Gate Card to the summary: list the gate, the artifact(s) on file, the date, and the current status (Pass/Watch/Fail).

Re-check and restamp at each milestone (pre-list, under-contract, pre-close).

Evidence / Citations
Rubric language and gating artifacts referenced across Parts 3, 5, 7, 8, and 11.
Cross-References: §3 (intake), §5 (listing blockers), §7 (title/debt), §8 (timelines), §11 (HOA/permits).

Cross-Reference Map (from this part)
Insurability → §5.4 (listing blockers), §8.6 (storm protocol), §11.2 (insurance ties).

Permits/Code → §5.5 (curatives), §7.4 (fines), §11 (permit pathways).

Flood SI/SD → §5.6 (resolution), §8.6 (seasonality/storm), §11 (permits/insurance).

Condo/HOA warrantability → §6 (costs), §7.3 (estoppels), §11.1 (HOA/Condo).

Redemption → §7.2 (per-diem & timing), §6 (closing).

Glossary — Updates (delta)
Gate Card: A summary block listing the gate, proof artifacts, dates, and Pass/Watch/Fail status.

Insurability Gate: Requirement to demonstrate eligibility to bind insurance on current carrier forms before retail/list.

SI/SD (50% Rule): Floodplain trigger where improvement/repair cost ≥ 50% of structure market value; prompts full code compliance.

Warrantability (Condo): Lender eligibility dependent on association conditions (budget/reserves/assessments/structural). [CITE NEEDED] if not present in source appendices.

Redemption Window: Time during which an owner/lienholder may redeem post-judgment/sale; specifics vary by process and lien type ([CITE NEEDED]).

TRP (Time-Risk Penalty) — Presentation-only deduction applied to Net_List; not used in Respect-Floor or Buyer Ceiling. See §12.x.

Conflicts & Open Questions — Additions
C-1001 — Bankruptcy documentation set
Issue: Source flags legal-stay gating but does not enumerate required documents.
Status: [INFO NEEDED].
Action: Define a standard pack (petition/docket print, stay status, proposed order authorizing sale). Owner to approve.

C-1002 — Condo SIRS/Milestone evidence
Issue: Source references association risks but does not specify SIRS/Milestone doc requirements.
Status: [INFO NEEDED].
Action: Add checklist (questionnaire, reserves/budget, inspection/milestone reports) if present in appendices; otherwise tag [CITE NEEDED].

C-1003 — Federal redemption specifics
Issue: Source notes “federal redemption windows” but no durations/citations.
Status: OPEN.
Action: Research and append official citations (to Part 14) or adopt [RECOMMENDED POLICY] disclosure template pending owner approval.

Resolution Log — Updates (as of 2025-10-14)
R-1001 — Insurability Gate (forms + binding) — [RESOLVED]
Canonical: Retail/list blocked unless current carrier inspection forms (Citizens 03/20/2025 editions for applicable risks) + bindable quote ≤30 days are on file.
Evidence: Prior Parts 5 & 8 insurability requirements and Citizens public materials.
Impact: Gate Card required; storm suspensions enforce pause/resume protocol.

R-1002 — Flood SI/SD “50% Rule” — [RESOLVED]
Canonical: Treat SI/SD likelihood as a hard stop until compliance plan/determination.
Evidence: Part 5 authority stack; reflected here as a gate with explicit actions.
Impact: Scope, timeline, and carry escalated; retail path withheld pending determination.

(No new external statutes added in this part beyond those already verified in earlier parts; any absent citations are tagged and logged.)

Change Log — Part 10 entry (2025-10-14)
Centralized all gate criteria into Pass/Watch/Fail rubric.

Elevated Insurability and Flood SI/SD to explicit HARD STOP gates with artifact requirements.

Aligned permit/code hazards with material-title curatives; added condo warrantability/board-risk handling.

Logged new open items (bankruptcy docs; SIRS/Milestone; federal redemption specifics).

Delta from Previous Draft
Replaced scattered caveats with a single, auditable stop/go framework.

Added Gate Cards and milestone restamping to reduce miss-classification.

Preserved all original thresholds and language; added tags where the source lacked statutory detail.

Part 11 — HOA / Condo / Permits (Florida-focused)
Goal: de-risk deals that touch associations or open/expired permits, keep timelines honest, and price in real curative cost/timing.

1. HOA/COA Intake — Day-0 checklist (attach to every file)
   Governing docs (declaration + rules), budget & reserves, most-recent meeting minutes.

Estoppel request (standard; add rush if needed) + ledger of all assessments, fines, attorney fees.

Special assessments (approved/pending), payoff letter if any, and status of violations/architectural issues.

Transfer/approval requirements (application, interview, right-of-first-refusal), typical approval timeline, and fees due at closing.

Master policy (condo) and unit HO-6 status; for HOAs, any insurance requirements for roofs/fences.

Parking/pet/rental restrictions (investor sale risk), short-term rental prohibitions.

If listing/wholetail: confirm insurability on current 4-Point/Wind-Mit forms and have a bindable quote in file before you promise retail paths.

2. Estoppel & approvals — timeline gates (promise dates you can keep)
   Statutory estoppel delivery window = 10 business days after proper request. Gate any “≤14-day” close promises behind proof that the request was sent; if no estoppel by T+6 biz days, escalate and reset close guidance to 18–21 days.

Keep a “14-day proof” note: title opened Day-0, estoppel sent Day-0, chasers at T+3/T+5.

3. Net-sheet modeling (associations)
   Carrying cost: include monthly HOA/COA dues in Hold_Monthly; prorate through Carry_Months. Formula source uses Taxes/Ins/HOA/Utilities; cap carry at ≤5.0 mo unless MLS evidence justifies more.

One-time charges at close: estoppel fee (+ possible rush), transfer/capital contribution, move-in/move-out, and any special assessment payoffs.

Condo warrantability risk (pricing): lower list-path confidence if budgets/reserves/engineering (milestone/SIRS) look weak; keep cash as backstop.

4. HOA/COA liens, fines & haircuts — price what you can prove
   Model Low / Mid / High outcomes on association payoffs and city fines; start at Mid and show the band until written acceptance arrives.
   • HOA/COA liens & fines: 10–25% potential reduction (Mid 15%).
   • Municipal fines: 25–80% (Mid 50%).
   • County tax liens: 0–5% (assume 0% unless waiver documented).
   • Civil judgments (non-mortgage): 30–60% (Mid 40%).

5. “Material” title issues (retail blocked until cured)
   Cash/Wholesale only when any of the following are present: open/expired permits, municipal/code liens, unreleased mortgages/assignments, prior tax deed without quiet title, chain-of-title gaps, recorded unpermitted addition, probate without authority, federal/state liens with payoff uncertainty, or active lis pendens beyond our deal. Route to retail only after curative milestones are hit.

6. Permits & code — cure plan + pricing
   Pull permit history (city/county portal) + code case log; get written close-out quotes/ETAs.

Price in: CureCost (hard quotes) plus a timing risk dampener of −1% to −3% of ARV when board schedules/re-inspections are uncertain; choose the lower MAO from the two paths to stay conservative.

7. Insurance gate (retail paths)
   For homes >20 years, require 4-Point and, if applicable, Wind-Mit on the current (03/20/2025) forms and keep the bindable quote in file before listing/wholetail/novation. If a carrier won’t bind on current forms, retail is locked—route to Cash/Wholetail until cured.

8. Decision logic (HOA/Condo/Permits overlay)
   If estoppel/approvals/permits uncertain inside ≤30 days → prefer Cash; list only with reinstatement proof, insurability, and fast-ZIP evidence. (Aligns with global urgency policy.)

Wholetail allowed when: repairs ≤5% ARV, insurable on current forms, no material title issues, occupancy controllable, and media ready ≤72h; add wholetail risk buffer per Part 2 A16.

9. Micro-scripts (two you’ll actually use)
   To the association manager (estoppel push):
   “We submitted the estoppel request on [date/time] for [property]. We’re targeting closing in [X] days and will authorize your rush fee if that keeps us inside your 10-business-day window. Please confirm ETA and if anything else is needed to release today.”

To the seller (why cash, not list):
“Your building needs [permit close-out/board approval/insurance on current 4-Point]. Until that’s in hand, a financed buyer may not clear underwriting. Our cash path avoids that risk and keeps the clock from adding costs.”

10. [INFO NEEDED] before making a retail promise
    Estoppel request timestamp + ETA (or PDF).

4-Point/Wind-Mit (03/20/2025 forms) and bindable HO-3/DP-3 quote ≤30 days old.

Permit/code close-out quotes + dates (and any association violation cure plan).

Association ledger showing balances, special assessments, and attorney fees; show Low/Mid/High payoff scenarios until written numbers arrive.

Monthly dues + one-time transfer/capital fees for accurate carry/net modeling.

PART 12 — Scenarios & Negotiation Bands
Navigator (this part): 12.1 Scenario Matrix (Cash / List / Wholetail / Short Sale / Novation) • 12.2 Negotiation Bands & Overlap (Respect Floor ↔ Buyer Ceiling) • 12.3 Three-Tier Cash Bracketing • 12.4 Scripts & Micro-Scripts • 12.5 Compliance & Language Guardrails • 12.6 VIP Buyers, Fees & Deal Mechanics • 12.7 Actions / Checklists / Evidence
What’s New in This Part (as of 2025-10-14): Consolidated scenario selection (including short-sale/novation gates) and negotiation bands; formalized three-tier bracketing; added micro-scripts tied to per-diem math; preserved FDUTPA guardrails and assignment/double-close selection rules with exactly the thresholds in the source.

12.1 Scenario Matrix (Cash / List / Wholetail / Short Sale / Novation)
Policy / Logic
Choose the outbound scenario that clears all gates (insurability, title/permits, HOA/COA, timeline) and maximizes expected net while respecting Buyer Ceiling and MAO Cap. When servicer/agency rules apply (short sale/PFS), schedule your list cadence around those rules.
Decision Logic (If–Then)
Short Sale / PFS (agency-dependent):

If Fannie path → property must be active on MLS for five consecutive calendar days including a Saturday and Sunday before servicer submission; valuation must be ≤ 90 days old at approval. Plan list timing and price reductions to meet both.

Freddie requires arms-length affidavits; novation constructs risk denial—keep novation out of GSE/FHA short-sale files.

FHA PFS: HUD ATP letters commonly set minimum net schedules (e.g., 88% days 1–30, 86% days 31–60, 84% days 61–120). Price to clear the net.

Novation (retail-style contract with end retail buyer): use List/MLS cadence, but do not mix novation language with GSE/FHA short-sale files (arms-length optics).

Wholetail: only when insurable on current forms, light scope, and retail optics are in place (see §5, §10). (Cross-ref only; no new thresholds introduced here.)

Cash / Assignment: default when gating items (insurance, permits, association) are unresolved inside the seller’s runway. (See §§5, 10, 11 for the gates.)

Risks & Mitigations
Servicer rule breaks (MLS days/valuation freshness) can reset the clock; calendar the five-day window and re-age valuations before submissions.
Actions / Checklist
Attach MLS history, valuation reports, any arms-length affidavits/short-sale addenda, and HUD ATP letter to the file; mirror the rule dates in deal timeline fields.

Set Default Path Bias to List/MLS only when PFS selected and the net hurdles are modeled in the math detail.

Evidence / Citations
Agency/servicer gates and document list as above.
Cross-References: §7.7 (shortfall & PFS), §8.2 (list cadence), §9 (Buyer Ceiling/MAO Cap), §10 (gates), §11 (HOA/permits).

12.2 Negotiation Bands & Overlap (Respect Floor ↔ Buyer Ceiling)
Policy / Logic
Negotiate within the overlap of Seller Offer Band and Buyer Ask Band. Start at Respect Floor, never exceed min(MAO, AIV) on the seller side and never exceed Buyer Ceiling on the buyer side. Where bands don’t overlap, offer terms (time/occupancy/credits) to manufacture overlap—without crossing hard stops.
Decision Logic (If–Then)
If overlap exists → target the Sweet-Spot midpoint and charm-round for optics. (See §9 for rounding rules.)

If no overlap → propose trades: faster access, fewer conveyances, 7-day close (example), or shorter post-occupancy; if the seller adds items/occupancy, move back toward Respect Floor.

Formula / Calculation
Seller Offer Band: [Respect Floor, min(MAO, AIV)] (from §9).

Buyer Ask Band: ≤ Buyer Ceiling with route (flip/landlord/wholetail) from §9.3.

Risks & Mitigations
Over-asking above Max_Buyer produces buyer drop-off; enforce the Ceiling check on every outbound price. (See §9.3.)
Actions / Checklist
Auto-render the two-column bands (Seller vs. Buyer) on proposals; log any term-trades used to create overlap.

Evidence / Citations
Anchors & Bands rule, with example language, per source.
Cross-References: §9.4 (overlap), §6 (costs flowing into Buyer Ceiling).

12.3 Three-Tier Cash Bracketing (Anchors)
Policy / Logic
Present three anchored cash options to widen acceptance without breaching Buyer Ceiling: FastPath, Standard, Premium—all staying within the Seller Offer Band ceiling (min(MAO, AIV)).
Decision Logic (If–Then)
FastPath (7–10 day close) → anchor at Respect Floor (charm-rounded), minimal contingencies.

Standard (14–21 days) → price the Sweet-Spot midpoint inside the overlap.

Premium (post-inspection/clean-out credit) → up to SO_ceiling = min(MAO, AIV) with specific seller concessions/terms.

Risks & Mitigations
Anchor mis-placement (outside overlap) damages trust; keep auto-clamps to MAO Cap and Buyer Ceiling active on the offer menu.
Actions / Checklist
Auto-generate a one-page menu showing the three options, the terms behind each, and a visible Ceiling check.
Evidence / Citations
Three-tier bracketing description and constraints.
Cross-References: §9.6 (rounding), §7.2 (per-diem effects on “Fast”).

12.4 Scripts & Micro-Scripts (Use Only What’s in Source)
12.4.1 Per-Diem & Timeline Trade-off (seller-facing)
Policy / Logic
Use the written payoff’s per-diem to frame the cost of waiting—never speculate. Loss-aversion framing is acceptable when tied to exact numbers in the letter.
Decision Logic (If–Then)
If payoff shows daily per-diem → compute 7/14/21/30-day erosion scenarios and present alongside Cash vs. List timelines.

Micro-scripts (verbatim from source)
“Based on your servicer’s letter dated [MM/DD/YYYY], your daily per-diem is $@PerDiem. If we wait 21 days, that’s $@PerDiem×21 less to your bottom line. Would you like to keep that money or trade it to time?”

“Every week equals roughly $@PerDiem×7. Our fastest path (Cash) closes in @Close_Days days; the List path targets DOM_zip + escrow. Which timeline protects more of your equity?”

Risks & Mitigations
Compliance: cite the letter date/fields; do not infer fees not on the payoff; avoid unverifiable foreclosure timing (FDUTPA).

Actions / Checklist
Insert per-diem math in the proposal sidebar; enable a “What if we wait?” toggle for 7/14/21/30 days.

Evidence / Citations
Per-diem scripts; FDUTPA guardrail note.
Cross-References: §7.2 (per-diem), §8.3 (days-to-close), §9.5 (spread).

12.4.2 Price-for-Terms Swaps (seller-facing)
Policy / Logic
Move within the Seller Offer Band with transparent trade-offs (access/occupancy/clean-out).
Micro-script (source)
“We can reach $X if we trade for Y: faster access, no personal property conveyances, or a 7-day close. If we include the shed/extra items or longer occupancy, we’re back at $R.”
Concessions Ladder (source)
 (1) Close-date flex (±3–14 days) → (2) Waive non-essential repair credits → (3) Increase EMD → (4) Small price step to a charm number ($X,900 / $X,990).
Evidence / Citations
Anchors, ladder, charm-round cues.
Cross-References: §9.6 (rounding).

12.5 Compliance & Language Guardrails
Policy / Logic
Use approved language; avoid banned words/claims that trigger UDAP/FDUTPA risk.
Decision Logic (If–Then)
Ban list (don’t use in scripts/emails/PDFs): “lowball,” “desperate,” “vulture,” “guarantee” (re outcomes), “final offer” (unless time-boxed with real expiry), “we buy any house at any price,” “instant closing.” Use only the approved substitutes in the source.

Approved substitutes (examples):
• Instead of “lowball” → “Investor-level offer reflecting repairs, timeline, and carrying costs.”
• Instead of “guarantee” → “We commit to close in as few as 14 days, contingent on clear title and payoff.”
• Instead of “instant closing” → “Close in as few as 14 days with clear title.”

Risks & Mitigations
Any superlative/absolute claim requires support; avoid “best price” type claims unless you show basis. Maintain legal copy audit.
Actions / Checklist
Lock banned terms in CRM phrase filters; run quarterly legal copy audits.
Evidence / Citations
FDUTPA/FTC guidance note “as of Oct 2025” per source.
Cross-References: §10 (risk gates), Part 14 (final references).

12.6 VIP Buyers, Fees & Deal Mechanics
12.6.1 Assignment vs. Double-Close
Policy / Logic
Prefer assignment for speed/transparency; use double close when optics require price separation, spreads merit privacy, or end-buyer/lender bars assignments.
Decision Logic (If–Then)
Assignment: This is the preferred method for speed and simplicity, used when the seller provides written consent.
Double Close: Use this method when the total assignment fee (the gap) is more than $15,000 and privacy is required, the seller is hostile to the concept of wholesaling, or the end-buyer's financing prohibits assignments.

Clamps/Overrides: Max publicized fee = 5% of ARV with reason code (Complexity, Off-market buyer). If lender caps concessions, you may switch the basis to purchase-price—state the reason.

Risks & Mitigations
Disclosure failures → UDAP/FDUTPA exposure; mitigate with plain-English addenda and seller initials; keep both ALTAs ready for double close.
Actions / Checklist
Embed “assignment permitted” clause when applicable; log the reason code for any fee >3% ARV; retain both ALTA drafts.

12.6.2 Fee Policy & VIP Overrides
Policy / Logic

The assignment fee is the full spread between the HPS contract price and the end-buyer assignment price. There is no fixed minimum or maximum percentage; the fee is constrained only by the Max_Buyer ceiling and market conditions. VIP buyer incentives should be structured as price reductions from the Max_Buyer ceiling rather than as fee overrides.
Decision Logic (If–Then)
If VIP buyer (≥5 deals/year and 10-day closes) and Buyer Ceiling is tight → allow 1–2% ARV override with written rationale; flip to double close if fee optics risk churn.

Actions / Checklist
Tag VIP cohort; record acceptance rate with/without override by county.

12.6.3 Buyer Segmentation (routing)
Policy / Logic
Route deals to buyer cohorts by asset fit and market speed (MOI/DOM). Do not invent thresholds; use those in the source and tag missing inputs.
Decision Logic (If–Then)
Landlord/BRRRR when gross yield ≥ 8.0% unlevered or pro-forma DSCR ≥ 1.25 at current rates. [INFO NEEDED] for rent comp set and rate sheet.

Wholetail if 1978+, stable HOAs, scope ≤ 5% of ARV, good curb appeal.

Funds/iBuyers when buy-box fit (block/program/schools/tranche); otherwise deprioritize.

Prioritize fast zips (MOI ≤ 3.5) for flippers; slow (MOI > 5.0) bias landlords. [INFO NEEDED] MLS MOI by ZIP (Aug–Oct 2025).

Actions / Checklist
Maintain segment badges in CRM; weekly refresh opt-in boxes; purge non-responders at 90 days.

TRP (Time-Risk Penalty) — Presentation-only adjustment that reflects runway pressure (auction date / forced timing) when comparing Net_List vs Net_Cash.
Do not include TRP in Respect-Floor or Buyer Ceiling math. Use TRP only to adjust the listing comparator shown to sellers.
Buckets (default):
TRP_bucket(days_to_auction) = { ≤14d: $3,000; 15–30d: $5,000; >30d: $0 } .
Formula (listing comparator):
Net_List = ARV − (SellCosts_Retail% × ARV) − RetailMakeReady − TRP_bucket .
Per-day alternative (when empirical TRP/day is available):
Net_List = ARV − (SellCosts_Retail% × ARV) − RetailMakeReady − (TRP_per_day × list_days × TRP_demand_factor) .

12.7 Actions / Checklists / Evidence
Actions / Checklist (who/what/when—as stated)
Scenario gating: Put agency rules (5-day MLS; ≤90-day valuation) and HUD ATP net schedule into the timeline/math cards for any short-sale/PFS file.

Bands & anchors: Start at Respect Floor; show the two-column bands; enforce MAO Cap and Buyer Ceiling clamps; charm-round only within overlap.

Three-tier menu: Generate FastPath / Standard / Premium menu with visible terms and clamps.

Per-diem sidebar: Use written payoff; show 7/14/21/30-day erosion toggles.

Compliance: Apply the ban list and approved substitutes; quarterly legal copy audit; FDUTPA/FTC note as of Oct 2025.

Deal mechanics: Choose assignment vs. double close per thresholds; log any VIP override with reason; prep dual ALTAs if double-close.

Evidence / Citations
Inline above.
Cross-References: §5 (scope & wholetail buffer), §6 (costs), §7 (payoffs), §8 (timelines), §9 (bands & cap), §10–11 (gates).

Cross-Reference Map (from this part)
Short-sale / PFS rules → §7.7 (paths), §8.2 (list cadence), §9.5 (borderline handling).

Anchors & bands → §9.4 (overlap logic), §9.6 (rounding).

Three-tier bracketing → §9.2/§9.6 clamps and presentation.

Fee policy & VIP → §9.2 (wholesale fee policy interplay).

Glossary — Updates (delta)
Anchors & Bands: Presentation technique: start at Respect Floor, operate within Seller Offer Band to min(MAO, AIV); never exceed Buyer Ceiling.

FastPath / Standard / Premium: Three-tier cash options—7–10 d, 14–21 d, and up to SO_ceiling with terms, respectively.

Per-Diem Sidebar: Proposal element showing the cost of waiting using payoff letter math (7/14/21/30-day toggles).

VIP Override: Fee allowance 1–2% of ARV for qualified high-velocity buyers (documented).

Conflicts & Open Questions — Additions
C-1201 — Agency rule drift
Issue: Fannie five-day MLS and valuation freshness, Freddie arms-length affidavit, HUD ATP nets are quoted from source; need as-of snapshots in Part 14.
Status: [CITE NEEDED] (park official links; source cites guides generically).

C-1202 — Buyer segmentation MOI/DOM inputs
Issue: MOI thresholds (≤3.5, >5.0) and landlord/DSCR gates require MLS export and rate sheet.
Status: [INFO NEEDED] (Aug–Oct 2025 Stellar MLS; current investor 30Y + 100–200 bps).

C-1203 — Micro-script evidence lines
Issue: Per-diem scripts require a current payoff letter and DOM_zip; until attached, scripts are placeholders.
Status: OPEN — enforce publish block for missing payoff.

Resolution Log — Updates (as of 2025-10-14)
R-1201 — Three-Tier Cash Bracketing — [RESOLVED]
Canonical: Use FastPath / Standard / Premium anchored to Respect Floor → Sweet-Spot → SO_ceiling (≤ min(MAO, AIV)), never above Buyer Ceiling.
Evidence: Q136 Anchors & Bands.
Impact: Standardizes offer menus; improves acceptance without breaching caps.

R-1203 — Short-Sale/Novation Separation — [RESOLVED]
Canonical: Keep novation out of GSE/FHA short-sale files; adhere to arms-length and MLS/valuation rules.
Evidence: A10 Servicer Gates.
Impact: Reduces denial risk; calendar-driven list plans.

Change Log — Part 12 entry (2025-10-14)
Added full scenario matrix with GSE/FHA MLS/valuation and net rules for short-sale/PFS (from source).

Implemented three-tier cash bracketing and two-column band displays.

Embedded per-diem micro-scripts and FDUTPA guardrails; banned-phrase substitutes added.

Clarified assignment vs. double close thresholds; documented VIP override policy.

Delta from Previous Draft
Unified scenarios/negotiation into a single publish-ready flow; removed duplicative language and pointed all clamps back to §§9–10.

Added explicit checklists and evidence artifacts per scenario; preserved all original numbers and tagged missing inputs with [INFO NEEDED].

PART 13 — Tools, Templates, Checklists & Scripts
Navigator (this part): 13.1 Toolkit Overview • 13.2 Intake & Evidence Templates • 13.3 Title/Insurance/HOA Tools • 13.4 Valuation & Comps Forms • 13.5 Repairs & SOW Worksheets • 13.6 Costs & Fees Calculators • 13.7 Debt/Liens/Payoffs Trackers • 13.8 Timeline & Carry Calculators • 13.9 Scenario Menus & Negotiation Templates • 13.10 Compliance & Language Bank • 13.11 File-Naming & Audit Headers • 13.12 Publish-Blockers & QC
What’s New in This Part (as of 2025-10-14): All tools normalized to the manual’s variable map and math; each template carries an As-Of stamp, Gate Card and Show-Work appendix; checklists enforce evidence before publish (e.g., estoppel request timestamp, bindable insurance on current 4-Point/Wind-Mit forms). Placeholders are flagged [INFO NEEDED] until replaced by quotes/documents.

13.1 Toolkit Overview
Policy / Logic
Provide audit-ready templates that (a) mirror the policy/logic and formulas in Parts 2–12 and (b) block publishing when evidence is missing. Each artifact includes: (1) Header (deal meta + “as-of”), (2) Inputs (required fields), (3) Computation (explicit formulas), (4) Evidence Box (files/links), (5) Gate Card (Pass/Watch/Fail), and (6) Show-Work appendix.
Actions / Checklist
Use line-items over percentages; only use preview/composite placeholders where the source allows, clearly labeled.

Never proceed to List/Wholetail without insurability proof on current forms and a bindable quote.

Cross-References: §6 (line-item method), §8 (publish blocks), §10.1 (Insurability), §11 (HOA/Permits).

13.2 Intake & Evidence Templates
13.2.1 Intake Checklist (Day-0)
Required fields
Property meta; occupancy & access; photo set (28+); 4-Point/Wind-Mit order (if ≥20 yrs). Evidence: order receipt.

O&E + lien search; permit history pull; municipal/code search. Evidence: PDFs/links.

HOA/COA applicability; estoppel request timestamp; association docs list.

Vendor quotes (repairs ≤$5k “move-in ready” label—proof required).

Gate Card (Pass/Watch/Fail) — auto-rendered once artifacts attach.
13.2.2 Evidence Box — Standard Slots
4-Point & Roof (Citizens 03/20/2025 editions); bindable quote ≤30 days old.

Estoppel request email/PDF; ETA; board/transfer requirements where applicable.

Payoff letter(s) with per-diem; refresh cadence (T+7).

Publish rule: Missing any required evidence → BLOCK downstream outputs and tag [INFO NEEDED] list.

13.3 Title / Insurance / HOA Tools
13.3.1 Title & Closing Cost Worksheet (Seller/Buyer)
Inputs
Contract allocations (who pays owner’s policy), county, price, recording/closing fees (quote).

Deed doc stamps; note stamps; intangible (if financing).

Computation
Line-item math first; allow preview % only as labeled (seller 1.5% ≤$1M; 1.0% >$1M) or 9.5% composite (buyer) when quotes are missing.

Evidence Box
Attach title quote PDF (promulgated premium + endorsements + closing fee).

13.3.2 Insurance Gate Pack
Required: 4-Point/Wind-Mit on current Citizens forms; bindable quote; storm-pause logic (binding suspensions).

Fail retail/list if bind denied or suspension active; re-verify after lift.

13.3.3 HOA/COA Estoppel & Approvals Tracker
Fields: request timestamp, statutory ETA (10 business days), effectiveness (30/35 days), fees due at close, violations/assessments. Auto-warn on ≤14-day closes without proof.

13.4 Valuation & Comps Forms
13.4.1 AIV/ARV Worksheet
Inputs
Comp set (evidence window), adjustments (document the deltas), confidence grade with reasons, DOM/MOI notes.

Floodplain/SI-SD context (if applicable) and any insurability constraints tied to roof/MEP conditions.

Computation & Output
ARV point estimate, low/high guardrails (from source examples only), Confidence grade, and a link to Show-Work (comp grid + adjustments).

Cross-Refs: §4 (Valuation), §10.4 (SI/SD).

13.5 Repairs & SOW Worksheets
13.5.1 SOW Category Ladder
Toggle: Light (≤$5k “Move-In Ready” label) / Medium / Heavy; show Listing Blockers (roof/electrical/plumbing/HVAC/WDO) and insurability dependence.

13.5.2 Contingency Calculator
Tiers: 10% (verified access), 15% (no interior/tenant), 20% (structural/envelope/permit/WDO); floor $2,500; cap = lesser of 30% of repairs or 3% of ARV; display basis.

13.5.3 Wholetail/Novation Buffer
max(1%×ARV, $5,000) + $2,500 if tenant + CureCost (short-fuse). Guard against double-count with general Safety_Margin.

Evidence Box: Vendor quotes, inspection PDFs, bind emails, permit close-out quotes. Publish block if missing.

13.6 Costs & Fees Calculators
13.6.1 Seller Net Sheet
Lines: deed stamps (0.70% non–Miami-Dade), owner’s title premium (69O-186.003 schedule), closing/settlement, lien search, courier, association transfer/capital fees, special assessments. Preview % allowed only as labeled.

13.6.2 Buyer Costs (feeds Max_Buyer)
Lines: owner/lender title (promulgated schedule), recording, municipal lien, composite 9.5% only as placeholder with [INFO NEEDED] until quotes attach.

13.6.3 Finance Taxes (exit modeling)
Deed doc stamps; note 0.35%; intangible 0.20% (line up with Part 6). Evidence: statutes/FDOR link in footnote. (Footnote stubs—links parked for Part 14.)

13.7 Debt / Liens / Payoffs Trackers
13.7.1 Payoff & Per-Diem Tracker
Fields: creditor, as-of date/time, per-diem, fees/advances, refresh T+7, estimated PayoffClose on target close date. Auto-compute Payoff₀ + Per-Diem×Days + Fees.

13.7.2 Arrears & Negotiations Banding
HOA/COA: Low/Mid/High (e.g., 10–25% haircut in source), with board/manager evidence slots. Municipal fines: 25–80% band; calendar hearing. Tax liens: typically 0–5% (assume 0% unless written).

13.7.3 PACE / UCC / Solar
Tabs to capture program details, lien priority, payoff/assumption rules; flag conforming-exit ineligibility if senior/effectively senior PACE remains. Include UCC search and lease/PPA docs.

13.8 Timeline & Carry Calculators
13.8.1 Carry Builder
Inputs: taxes, insurance, HOA dues, utilities (12-mo); outputs: Hold_Monthly & Carry_Total = Carry_Months × Hold_Monthly.

Carry_Months: min((DOM_zip/30) + (35/30), 5.0). Block publish if any input missing; temporary placeholder $1,250/mo with [INFO NEEDED] and a to-do.

13.8.2 Close-Duration Standards
Cash 14–21 d (compress to 10–14 only with title rush and estoppel requested Day-0); List/Finance = DOM_zip + 35 d. Estoppels due ≤10 biz days, effective 30/35 d—mirror in timeline.

13.8.3 Storm Protocol
“T-72h Pause” task; re-inspect roof/exterior and re-quote insurance post-moratorium.

13.9 Scenario Menus & Negotiation Templates
13.9.1 Three-Tier Cash Menu (Anchors)
FastPath (7–10 d) at Respect Floor; Standard (14–21 d) at Sweet-Spot; Premium up to SO_ceiling = min(MAO, AIV) with stated terms. Hard clamps: MAO Cap and Buyer Ceiling.

13.9.2 Short-Sale/PFS Checklist
Five consecutive calendar days (incl. Sat/Sun) on MLS; valuation age ≤90 days; arms-length affidavits; HUD ATP net schedule mirrored in list plan; no novation constructs in GSE/FHA files.

13.9.3 Per-Diem Sidebar (Cost of Waiting)
Auto-compute 7/14/21/30-day erosion from payoff letter; show side-by-side with scenario timelines.

13.9.4 Price-for-Terms Swap Template
Text blocks mapping incremental price to specific give-gets (access, occupancy, personal property exclusions). Keep within band and under Buyer Ceiling.

13.10 Compliance & Language Bank
13.10.1 Banned/Approved Phrases
CRM ban list (e.g., “guarantee,” “instant closing,” “we buy any house at any price”) and approved substitutes embedded as snippets. Quarterly legal copy audit.

13.10.2 Micro-Scripts (from Source Only)
Association manager estoppel push; seller “why cash, not list” insurance/permit explanation; per-diem framing. (Do not add unsourced lines.)

[INFO NEEDED] if any requested script is not in the source.

13.11 File-Naming & Audit Headers
Policy / Logic
Uniform naming supports audits: {DealID}_{County}_{City}_{Addr#}_{DocType}\_{YYYYMMDD}. Include an Audit Header block at the top of every PDF/worksheet:
As-Of Date/Time

Inputs Version (tax bill year; insurance quote date; HOA dues month)

Gate Card status & artifacts (e.g., 4-Point edition, estoppel timestamp)

Preparer / Reviewer initials and time stamps

Cross-Refs (e.g., “See §6.4 for rates; §8.3 for close durations”).

13.12 Publish-Blockers & QC
13.12.1 Global Publish-Blockers (Auto)
Missing: payoff letter or per-diem fields; 4-Point/Roof (current edition) or bindable quote; estoppel request proof; carry inputs (tax/ins/HOA/utilities).

13.12.2 QC — 20-Point Fast Audit
AIV/ARV comp grid present; confidence graded.

Listing Blockers checklist cleared or routed Cash.

SOW and Contingency tier labeled; clamp rules applied.

Wholetail buffer rationale shown (if used).

Title quote PDF attached (or % preview properly labeled).

Deed/Note/Intangible tax lines shown with statute notes.

HOA/COA estoppel timestamp and ETA tracked.

Municipal/code fines banded; hearing date calendared.

PACE/UCC tabs reviewed; conforming-exit note set.

PayoffClose math correct; per-diem refresh task (T+7).

Carry builder inputs complete; placeholder removed.

Close duration set per path; 14-day proof present if promised.

Storm pause respected; re-bind proof attached.

MAO variants computed; MAO Cap clamp shown.

Buyer Ceiling card attached; outbound ask ≤ Max_Buyer.

Respect-Floor math and data window logged (n/sample).

Three-tier cash menu clamps enforced.

Short-sale/PFS rules mirrored on the timeline.

Banned language filter passes; approved substitutes used.

“As-Of” time stamps present on all summary cards; reviewer initials captured.

Cross-Reference Map (from this part)
Intake & Evidence → §3; Insurability → §5.4/§10.1; HOA/Estoppel → §11.1; Title/Fees → §6; SOW/Contingency → §5; Carry/Timeline → §8; MAO/Buyer Ceiling → §9; Scenarios/Scripts → §12.

Glossary — Updates (delta)
Evidence Box: Standardized attachment area for artifacts (quotes, forms, letters) that support each computation or gate.

Gate Card: Snapshot of gate status (Pass/Watch/Fail) with the specific artifacts and dates supporting the status.

Show-Work Appendix: A single section aggregating formulas, inputs, and citations used to derive ARV/MAO/Buyer Ceiling and costs.

Per-Diem Sidebar: Offer-presentation element showing the cost-of-waiting math strictly from the payoff letter.

Composite Placeholder: A temporary % used only where the source permits (e.g., 9.5% buyer costs; seller 1.5%/1.0% preview) and always labeled [INFO NEEDED] until replaced.

Conflicts & Open Questions — Additions
C-1301 — Interest inside Hold_Monthly (tooling)
Issue: Competing source lines on whether interest belongs in Hold_Monthly (see C-801).
Status: [RECOMMENDED POLICY] (pending owner approval) — Keep Interest_Carry as a separate line to preserve comparability; tool reflects this by default.
Impact: Carry builder layout & summary cards.

C-1302 — Seller/Buyer preview % misuse
Issue: Prevent cross-use of 9.5% (buyer composite) vs 1.5%/1.0% (seller preview).
Status: OPEN — UI guardrails in calculators.

C-1303 — SIRS/Milestone documentation set
Issue: Source references risk but not a fixed doc list.
Status: [INFO NEEDED] — Add association questionnaire, budget/reserves, SIRS/Milestone reports if present; else tag [CITE NEEDED].

Resolution Log — Updates (as of 2025-10-14)
R-1301 — “As-Of” Stamping & Publish Blocks — [RESOLVED]
Canonical: Every tool output includes As-Of, inputs versioning, and auto-BLOCK when prerequisites (payoff, 4-Point/quote, estoppel timestamp, carry inputs) are missing.
Evidence: Parts 6–8, 10–11 blocking rules and evidence requirements.
Impact: Reduces stale math; enforces evidence-first culture.

R-1302 — Three-Tier Cash Menu Clamp — [RESOLVED]
Canonical: Fast/Standard/Premium remain inside Seller Offer Band; MAO Cap and Buyer Ceiling clamps are always active on the menu.
Evidence: Anchors & Bands section.
Impact: Transparent options without breaching caps.

Change Log — Part 13 entry (2025-10-14)
Built a complete toolkit aligned with Parts 2–12: checklists, calculators, trackers, and scripts with evidence boxes and Gate Cards.

Enforced line-item first for costs; restricted % placeholders to source-allowed slots.

Embedded publish-blockers and as-of stamping across all artifacts.

Integrated three-tier cash menu, per-diem sidebar, and short-sale/PFS gates into scenario outputs.
Qualitative Sanity Check complete; notes from §4.10 are documented in the file.

Delta from Previous Draft
Replaced ad-hoc worksheets with a single, normalized set that mirrors policy/math and blocks without evidence.

Added headers, Gate Cards, and Show-Work appendices for auditability.

Centralized compliance language and banned terms; aligned scripts strictly to source text.

PART 14 — Back Matter
Navigator (this part): 14.1 Glossary (final) • 14.2 Index (A–Z) • 14.3 Appendices (forms, statutes, fee tables) • 14.4 Final Conflicts & Open Questions • 14.5 Resolution Log (consolidated) • 14.6 Final Change Log
What’s New in This Part (as of 2025-10-14): Completed the canonical Glossary and Index; compiled authoritative citations for fees/insurance/agency gates (added dates); merged all conflicts and resolutions into a single register; produced a final Change Log.

14.1 Glossary — Canonical Definitions & Synonyms
Normalization rule: where synonyms exist in the source, the bold term below is the canonical label. Aliases are retained for searchability and mapped here. Variables keep their exact keys.
AIV (As-Is Value) — Current market value in present condition. Inputs: comp set, adjustments, confidence. Synonyms: “as-is,” “current value.” Cross-refs: §4.1–4.6.

ARV (After-Repair Value) — Value post-scope completion. Requires comp grid + adjustments. Cross-refs: §4.1–§4.6.

Buyer Ceiling (Max_Buyer) — Disposition hard stop for asks; computed by buyer cohort math and carry. Never market above this. Synonyms: “Max Buyer,” “Ceiling Card.” Cross-refs: §9.3.

Carry / Hold_Monthly / Carry_Months — Monthly holding stack (taxes, insurance, HOA, utilities) and duration logic. Cross-refs: §8.1–§8.5.

Confidence (A/B/C) — Evidence grade on valuation and plan; “C” invokes Borderline handling. Cross-refs: §4.7, §9.5.

Deficit (Cash Shortfall) — PayoffClose − MAO when payoff exceeds MAO. Cross-refs: §9.5.

Gate Card — Snapshot showing gate status (Pass/Watch/Fail) with artifacts and dates. Cross-refs: §10.7, §13.1.

Insurability Gate — Proof of bind on current carrier forms (e.g., Citizens 4-Point/Wind-Mit) required before retail/list. Cross-refs: §5.4, §10.1, §11.2. (Citizens form update 2025-03-20 noted.) (Public)

MAO (Maximum Allowable Offer) — Internal buy-side ceiling from ARV, costs, carry, and buffers. Cross-refs: §9.2.

MAO Cap — Independent clamp: Offer ≤ 0.97 × AIV. Always apply min(MAO_presentation, 0.97×AIV). Cross-refs: §9.2.

MOI / DOM — Months of inventory; days on market. Cross-refs: §4.4, §8.2.

PACE — Property-assessed clean-energy obligations that may affect lien priority and eligibility; see Fannie Mae B5-3.4-01. Cross-refs: §7.6, §12.6. (Fannie Mae Selling Guide)

PayoffClose — Projected payoff on the target close date: payoff(as-of) + per-diem×days + fees. Cross-refs: §7.2.

Per-Diem — Daily interest amount from written payoff; used to show cost of waiting. Cross-refs: §7.2, §12.4.

Respect-Floor (Seller) — Lowest non-disrespectful seller anchor using AIV and local investor-discount evidence or payoff+essentials fallback. Cross-refs: §9.4.

SI/SD (50% Rule) — Floodplain Substantial Improvement/Substantial Damage trigger when improvement/repair ≥50% of structure value; requires code/permit pathway. Cross-refs: §5.6, §10.4.

Short Sale / PFS — Servicer/agency process requiring MLS marketing window and valuation freshness; HUD ATP sets net schedules (88/86/84). Cross-refs: §12.1. (Servicing Guide)

Show-Work Appendix — Single block listing inputs, math, and citations for audit. Cross-refs: throughout, esp. §9, §13.

Wholetail_Buffer — Risk allowance for retail-style disposition with light work; do not double-count with general safety margins. Cross-refs: §5.5, §9.2.
Assignment Fee (Variable) — In a wholesale scenario, this is the gross profit realized, calculated as the difference between the HPS contract price with the seller and the final assignment price with the end-buyer. It is not a fixed fee but rather the entire spread available up to the Max_Buyer ceiling. Cross-refs: §9.2, §12.6.

14.2 Index (A–Z)
Format: Term → key sections (example: “§9.2.1”). Page numbers omitted intentionally; this manual is section-anchored.
A — AIV (§4.1–4.6), Anchors & Bands (§12.2–§12.3), ARV (§4.1–4.6), ATP (HUD) (§12.1).
B — Bankruptcy stay (§10.2), Borderline (§9.5), Buyer Ceiling (§9.3, §12.2, §13.9).
C — Carry / Hold_Monthly (§8.1–§8.4), Ceiling Card (§9.3, §13.1), Citizens forms (§5.4, §10.1, §11.2), Composite placeholders (§6.1, §13.6). (Public)
D — Deed doc stamps (§6.2), Deficit math (§9.5), DOM (§4.4, §8.2). (Florida Dept. of Revenue)
E — Estoppel certificates (§11.1; 10-biz-day issuance; 30/35-day effective) (§13.3). (Legislature of Florida)
F — FAC 69O-186.003 title rates (§6.3), Fannie short sale (5-day MLS + weekend) (§12.1), FHA PFS net (88/86/84) (§12.1), Flood SI/SD (§10.4). (Legal Information Institute)
G — Gate Card (§10.7, §13.1).
H — HOA/COA approvals & fees (§11.1), HUD ATP (§12.1). (HUD)
I — Insurability gate (§10.1), Intangible tax (§6.2). (Legislature of Florida)
L — Lien fines/negotiation bands (§7.3–§7.4).
M — MAO (§9.2), MAO Cap (§9.2), Milestone/SIRS (risk) (§10.5, §11.1).
N — Note tax (§6.2). (Legislature of Florida)
P — PACE (§7.6, §12.6), Payoff & per-diem (§7.2), Permits & code (§10.3, §11). (Fannie Mae Selling Guide)
R — Redemption (FS 45.0315) (§10.6), Respect-Floor (§9.4), Rounding (§9.6). (Legislature of Florida)
S — Scenarios matrix (§12.1), SI/SD (§10.4), Spread gate (§9.5).
T — Title premiums (§6.3), Timeline & carry (§8), Transfer/estoppel fees (§11.1). (Legal Information Institute)
W — Wholetail (§5.5, §9.2, §12.1), Wind-Mit (§10.1, §11.2). (Public)

14.3 Appendices — Forms, Statutes & Official References (as-of 2025-10-14)
Citations listed here support the rules used in Parts 5–13. Where the source manual was silent or conflicting, we resolved per the Research-First hierarchy and logged the result in §14.5.
A. Insurance & Binding
Citizens 4-Point & Roof Forms Update (03/20/2025): confirms current inspection editions. Use the current forms for insurability proof. (Public)

Citizens Binding Suspensions: official Binding Alerts page (plus example 09/27/2025 suspension). Marketing/listing must pause during suspensions; re-verify bindability after lift. (Public)

B. Florida Taxes & Title
Deed Doc Stamps: FDOR overview + §201.02, F.S. (rate: $0.70/$100 outside Miami-Dade; Miami-Dade special structure).\* (Florida Dept. of Revenue)

Note/Obligation Tax: §201.08, F.S. (generally $0.35/$100 where applicable). (Legislature of Florida)

Nonrecurring Intangible Tax: §199.133, F.S. (2 mills per dollar on obligations secured by Florida real property) and FDOR guidance. (Legislature of Florida)

Title Insurance Rates: FAC 69O-186.003 (promulgated schedule). (Legal Information Institute)
title insurance (~0.575% in FL for purchases)

C. HOA/COA
Estoppel timing/effectiveness: §720.30851, F.S. (issue within 10 business days); §718.116, F.S. (condo; reliance protections; 30/35-day effectiveness noted). (Legislature of Florida)

D. Redemption
Right of Redemption: §45.0315, F.S. (right exists up to the later of certificate of sale filing or the time specified in the judgment). (Legislature of Florida)

E. Agency/Investor Rules
Fannie Mae Short Sales: Servicing Guide D2-3.3-01 / A4-2.1-03 — property listed on MLS a minimum of five consecutive calendar days including a Saturday and Sunday before servicer submission. (Servicing Guide)

HUD/FHA PFS Net: HUD ATP form (e.g., HUD-90045) documents the 88%/86%/84% net schedule tied to marketing days. (HUD)

PACE Eligibility: Fannie Mae Selling Guide B5-3.4-01 (generally requires payoff where PACE has lien priority). (Fannie Mae Selling Guide)

Link parking: Full URLs will be collated into an electronic appendix bundle on publication (internal PDF index). If any link 404s due to guide reorganizations, fall back to the chapter/section cites above.

14.4 Conflicts & Open Questions — Final Register
Rule: Keep the most explicit/primary instance; record conflicts verbatim with section refs. IDs persist from earlier parts.
C-402 — MAO Cap Interplay
Version A (older): “Cap replaces presentation MAO.” — prior draft note.

Version B (source Q9/Q12): “Apply cap as a clamp to presentation MAO.”

Status: [RESOLVED] → Clamp: MAO_final = min(MAO_presentation, 0.97×AIV). Impact: §9.2 updated everywhere.

C-801 — Interest inside Hold_Monthly
Version A: Include interest inside Hold_Monthly.

Version B: Keep Interest_Carry separate.

Status: [RECOMMENDED POLICY] (pending owner approval) → Separate line to preserve comparability and audit. Impact: §8, §13.8. (Due: Owner sign-off.)

C-902 — Buyer Target Margin banding
Issue: Q131 calls for 14–20% by ZIP-speed but lacks a current band table.

Status: OPEN — [INFO NEEDED] (upload current cohort band sheet). Impact: §9.3 (Max_Buyer).

C-903 — Respect-Floor dataset fallbacks
Issue: Source lists min-n/widow rules but not the final fallback ladder doc.

Status: OPEN — [INFO NEEDED]. Impact: §9.4.

C-1001 — Bankruptcy documentation set
Issue: Gating acknowledged; no doc list in source.

Status: OPEN — [INFO NEEDED]. Impact: §10.2.

C-1002 — Condo SIRS/Milestone artifacts
Issue: Warrantability risks cited; doc set unspecified.

Status: OPEN — [INFO NEEDED]. Impact: §10.5, §11.1.

C-1003 — Federal redemption specifics
Issue: “Redemption windows” referenced; only Florida §45.0315 verified.

Status: OPEN — [CITE NEEDED] for non-Florida federal liens; add to Appendix when sourced. Impact: §10.6.

C-1201 — Agency rule anchors (Short Sale/PFS)
Issue: Needed official cites.

Status: [RESOLVED] with Fannie Servicing Guide and HUD ATP (). Impact: §12.1 timelines. (Servicing Guide)

C-1202 — Buyer segmentation: MOI/DOM & DSCR inputs
Issue: Requires current MLS export and rate sheet.

Status: OPEN — [INFO NEEDED]. Impact: §12.6.3.

C-1203 — Micro-script evidence lines
Issue: Per-diem scripts require a current payoff and DOM_zip.

Status: OPEN → publishing block remains if missing. Impact: §12.4, §13.12.

C-1301 — Preview % misuse (seller vs. buyer)
Issue: 9.5% buyer composite vs. 1.5%/1.0% seller preview can be misapplied.

Status: OPEN → calculators enforce role-based fields. Impact: §6, §13.6.

C-1303 — SIRS/Milestone checklist
Issue: Missing standard document list.

Status: OPEN — [INFO NEEDED]. Impact: §10.5, §11.1.

Owner action queue: Provide artifacts for C-902/C-903/C-1001/C-1002/C-1003/C-1202/C-1203/C-1301/C-1303. Due dates to be set in the program tracker.

14.5 Resolution Log — Consolidated (topics, decision, authority, impact)
Format: ID — Topic — [Status] → Canonical rule; Evidence; Resolution Impact.
R-901 — MAO Cap Interplay — [RESOLVED] → Clamp presentation MAO by 0.97×AIV. Evidence: Source Q9/Q12. Impact: §9.2 formulas and all summary cards updated.

R-902 — Spread & Borderline Gate — [RESOLVED] → Cash shown when MAO − PayoffClose ≥ $10,000; Borderline at ±$5k or any Confidence = C. Evidence: Q10–Q11; Q61–Q63. Impact: §9.5, §13.12 gating.

R-1001 — Insurability Gate — [RESOLVED] → Retail/list blocked unless current 4-Point/Wind-Mit forms + bindable quote (≤30 days); storm suspensions pause launch. Evidence: Citizens form update & binding alerts. Impact: §5.4, §8.6, §10.1, §11.2. (Public)

R-1002 — Flood SI/SD (50% Rule) — [RESOLVED] → Treat as hard stop until compliance plan/determination. Evidence: Source flood policy; local administrator determinations required. Impact: §5.6, §10.4.

R-1201 — Three-Tier Cash Bracketing — [RESOLVED] → Fast/Standard/Premium within overlap; clamps to MAO Cap and Buyer Ceiling. Evidence: source anchors; §9 math. Impact: §12.3, §13.9.

R-1202 — Fee Policy & VIP Overrides — [RESOLVED] → Min fee $7,500 or 3% ARV (higher); max publicized 5% with reason; VIP override 1–2% ARV documented. Evidence: source policy. Impact: §9.2, §12.6.

R-1203 — Short-Sale/Novation Separation — [RESOLVED] → Keep novation out of GSE/FHA short-sale files; adhere to MLS/valuation rules. Evidence: Fannie Servicing Guide / HUD ATP. Impact: §12.1. (Servicing Guide)

R-1301 — As-Of Stamping & Publish-Blocks — [RESOLVED] → Evidence-first culture; outputs blocked when artifacts missing (payoff, estoppel timestamp, insurance forms/quote, carry inputs). Evidence: internal policy sections. Impact: §13.12.

14.6 Final Change Log (cumulative highlights)
Full per-part logs are kept inline; below is the topline delta across all 14 parts.
Part 1 — Front Matter & Blueprint: Introduced Research-First Conflict Resolution (hierarchy + [RESOLVED]/[RECOMMENDED POLICY]) and Resolution Impact notes. Added Resolution Log instrument; began “as-of” stamping.

Part 2 — Variable Map & Data Contract: Canonicalized variable keys (e.g., deal.market._, deal.costs._, deal.timeline.\*). Added cross-refs to producer/consumer sections.

Part 3 — Intake & Evidence Protocol: Created Day-0 checklist and Evidence Box. Enforced publish-blockers for missing artifacts.

Part 4 — Valuation & Comps: Locked comp windows, adjustment logs, and confidence grading with Show-Work appendices.

Part 5 — Repairs & SOW: Elevated Listing Blockers, contingency tiers, and Wholetail_Buffer double-count guard.

Part 6 — Transaction Costs & Fees: Switched to line-item-first; % placeholders allowed only where source permits. Added statutory anchors for deed doc stamps, note tax, intangible, and title rates. (Florida Dept. of Revenue)

Part 7 — Debt, Liens, Payoffs: Standardized per-diem math; added lien payoff negotiation bands and cadence.

Part 8 — Timeline & Carry: Parameterized Carry_Months and storm-pause protocol; capped default carry months.

Part 9 — MAO, Buyer Ceiling, Spread: Consolidated pricing math; MAO Cap clamp applied; Borderline and spread gates codified.

Part 10 — Risk Gates & Hard Stops: Centralized Pass/Watch/Fail rubric; hard-stopped Insurability and SI/SD.

Part 11 — HOA/Condo/Permits: Estoppel timing/effectiveness and approvals embedded; wholetail/list gating tied to permits and insurance. (Legislature of Florida)

Part 12 — Scenarios & Negotiation: Added scenario matrix (Cash/List/Wholetail/Short Sale/Novation), three-tier bracketing, per-diem micro-scripts, and agency gate anchoring. (Servicing Guide)

Part 13 — Tools & Templates: Delivered audit-ready toolkit with Gate Cards, As-Of stamps, and global publish-blockers.

Cross-Reference Map (this part)
Statutes & rates → §6.2–§6.3 (fees), §11.1 (estoppel), §10.6 (redemption). (Florida Dept. of Revenue)

Insurance forms & suspensions → §5.4, §10.1, §11.2. (Public)

Agency gates → §12.1. (Servicing Guide)

Delta from Previous Draft (Part 14 only)
Added primary-source citations and “as-of” stamps for all external anchors used elsewhere (fees, forms, agency rules).

Merged conflicts and resolutions; flagged remaining [INFO NEEDED] / [CITE NEEDED] with owner action items and due-by sign-off.

Why ever double close with your own funds?
Only when one of these is true (otherwise, assign it and keep the $7–14k in your pocket):
Assignment blocked: seller addenda/REO/short sale/relocation/builder or the title underwriter/end buyer/lender won’t accept assignments.

Protect the spread / optics: you need confidentiality to prevent retrades or relationship damage.

You must cure something between closings: permit/code/HOA item, trash-out/safety items to make it insurable/financeable, or to be seller of record for HOA/condo approvals or quick wholetail.

Plan to sell to a buyer type that doesn’t allow assignments (certain conventional/DSCR programs, institutional buyers).
Why double close with Transactional Funding (TF)?
Only when one of these is true (otherwise, assign it and keep the ~$7k–$14k you’d lose to deed stamps/title + TF costs):
You must fund A–B but can’t use C’s funds.
Title/underwriter won’t allow pass-through; same-day A–B must be fully funded before B–C. TF solves that funding gap.

Both sides must close the same day to lock the deal.
Seller deadline (pre-foreclosure/auction/relocation) + buyer urgency, and you don’t want overnight carry or risk of either party walking.

Assignment is contractually blocked.
REO/short sale/builder addenda, institutional buyer, or lender program that prohibits assignments—but will accept you as seller of record.

You need to be “seller of record” to clear a quick fix between closings.
Minor permit/code/HOA cure, trash-out/safety item, condo/HOA approval that requires owner-of-record. TF lets you own briefly and resell same day.

Spread optics need privacy.
Large assignment would spook the seller or invite a buyer retrade. Double-close hides your spread (two separate CDs/ALTAs).

You lack cheap capital today but the spread is worth it.
Partner cash unavailable; TF points are acceptable versus losing the deal/timeline.

Buyer funding type won’t allow an assignment but will close on your resale.
Conventional/DSCR/hard-money buyer that needs you as seller of record (still avoid FHA/VA <90 days—TF doesn’t fix seasoning).
Excellent question. In the context of a "unicorn" real estate deal, "massive" is not just a vague adjective—it's a term that implies the deal has crossed a specific threshold of profitability and safety for the end buyer.
Here’s a practical definition of a massive equity spread.
A massive equity spread exists when the property is acquired at such a deep discount that it provides the end investor with an exceptionally large margin for error, multiple profitable exit strategies, and a projected profit that is significantly higher than the market average for similar projects.

Quantifying a "Massive" Spread
Here are three key metrics to determine if a deal's spread is truly massive:

1. The "All-In" Percentage of ARV (After Repair Value)
   This is the most critical metric. A standard wholesale deal is often sold to an investor where their total cost (purchase price + repair costs) is around 70-75% of the ARV. A deal with a massive spread is significantly below that.
   Massive Spread Threshold: The buyer's purchase price plus the estimated repair cost is 65% or less of the ARV.
   Formula: (Your Sales Price to Buyer + Estimated Repairs) / ARV ≤ 0.65
2. Gross Profit Margin Potential
   This looks at the deal from the flipper's perspective. A typical gross profit margin (before accounting for financing, closing, and carrying costs) is 15-20% of the ARV.
   Massive Spread Threshold: The potential gross profit is 25% or more of the ARV.
   Formula: (ARV - (Buyer's Purchase Price + Estimated Repairs)) / ARV ≥ 0.25
3. The Raw Equity Figure
   This is the potential gross profit in dollars. While it varies by market, for the Central Florida area, a typical single-family home flip might aim for a $40k-$60k gross profit.
   Massive Spread Threshold: The potential gross profit is $75,000 or higher. This number provides a significant cushion against unforeseen expenses.

Example: Standard Deal vs. Massive Spread Deal
Let's assume an ARV of $450,000 and estimated repairs of $60,000.
A Standard Good Deal:
You get it under contract for $265,000.
You assign it to your buyer for $280,000 (a $15,000 fee).
Buyer's All-In (Pre-Carrying Costs): $280,000 (Purchase) + $60,000 (Repairs) = $340,000.
All-In % of ARV: $340,000 / $450,000 = 75.5%. (Standard)
Potential Gross Profit: $450,000 - $340,000 = $110,000. (This looks high, but after carrying/closing costs of ~$40k, their net is closer to $70k).
A "Massive Spread" Unicorn Deal:
You find a highly motivated seller and get it under contract for $210,000.
You can confidently charge a "Home Run Fee" of $40,000, selling it to your buyer for $250,000.
Buyer's All-In (Pre-Carrying Costs): $250,000 (Purchase) + $60,000 (Repairs) = $310,000.
All-In % of ARV: $310,000 / $450,000 = 68.8%. (Good, but let's check your acquisition).
The True Metric: The key is where you got it. Your contract price + repairs was $210,000 + $60,000 = $270,000. This is 60% of the ARV. That is a massive spread that you are now monetizing.
Potential Gross Profit for Buyer: $450,000 - $310,000 = $140,000. Even after all other costs, their net profit will be exceptionally high. This massive cushion justifies your $40,000 fee and makes a double close a wise decision to protect the deal.

PROMPT (send this to your AI agent)
You are calculating a double-close (A–B then B–C) for Central Florida (Orange / Osceola / Polk). Use the QUESTIONS answers below. Return a clean breakdown and totals.
Jurisdiction constants (non–Miami-Dade):
Deed documentary stamp tax on each deed: 0.70% of price (0.007 × price).

Doc stamp tax on promissory note executed in Florida: 0.35% of principal (0.0035 × principal) if a taxable note is executed.

Florida intangible tax on mortgages/secured notes: 0.20% of principal (0.002 × principal) only if the note is secured by Florida real property.

Title insurance: Florida promulgated rates (apply reissue/simultaneous credits if eligible). If Estimate_Title_If_Missing = Yes, produce a best-effort estimate; otherwise mark “needs quote”.

What to return (all dollar amounts):
Deed stamps A–B

Deed stamps B–C

Title/settlement A–B

Title/settlement B–C

Other fees A–B (recording/wires/courier/lien/estoppel if applicable)

Other fees B–C (recording/wires/courier/HOA transfer/estoppel if applicable)

Transactional funding points

Doc stamps on TF note (if applicable)

Intangible tax on TF mortgage (if applicable)

Extra Closing Load (sum of 1–9)

Gross Spread = Pbc − Pab

Net Spread (before carry) = Gross Spread − Extra Closing Load

Net Spread (after carry) = Net Spread (before carry) − Carry Cost

Fee target check: Net Spread (after carry) ≥ 3% of ARV → YES/NO (show threshold)

Funding/seasoning flag: If Buyer_Funds ∈ {FHA, VA} and Days_Held < 90 → “HIGH—season or change buyer”; else “OK”.

Notes & assumptions used (title estimated? note executed in FL? secured?).

Keep county = Orange/Osceola/Polk (non–Miami-Dade math). Do not include legal advice.

QUESTIONS (fill choices; leave number lines blank)
A) Property & County
County → ☐ Orange ☐ Osceola ☐ Polk

Property type → ☐ SFR ☐ Townhome ☐ Condo ☐ Duplex/2–4 ☐ Mobile on land ☐ Vacant land

HOA/Condo present → ☐ Yes–HOA ☐ Yes–Condo ☐ No

B) Structure & Timing 4) Double-close type → ☐ Same-day ☐ Held-days 5) Days held (A–B → B–C) → **_ days 6) Same-day order (if applicable) → ☐ A–B AM / B–C PM ☐ No preference
C) A–B (you BUY from seller) 7) Pab (purchase price) → $ _** 8) Title/settlement A–B (quote if known) → $ **_ 9) Other fees A–B (recording/wires/courier/lien search) → $ _** 10) A–B owner’s title policy paid by → ☐ Seller ☐ You ☐ Unknown
D) B–C (you SELL to end-buyer) 11) Pbc (sale price) → $ **_ 12) Title/settlement B–C (quote if known) → $ _** 13) Other fees B–C (recording/wires/courier/HOA transfer/estoppel) → $ **\_ 14) B–C owner’s title policy paid by → ☐ You ☐ End buyer ☐ Unknown
E) End-buyer funds (tailors seasoning/risk) 15) Buyer funds → ☐ Cash ☐ Conventional ☐ DSCR/Investor ☐ Hard money ☐ FHA ☐ VA 16) Lender known (if financed) → ☐ Yes: \_\_\_\_** ☐ No ☐ N/A (cash)
F) Transactional Funding (for A–B) 17) Using transactional funding? → ☐ Yes ☐ No 18) TF principal (≈ Pab + A–B costs) → $ **_ 19) TF points rate (e.g., 0.02 for 2%) → _** 20) TF note executed in Florida? → ☐ Yes ☐ No ☐ Unsure 21) TF note secured by the property? → ☐ Yes (secured) ☐ No (unsecured) ☐ Unsure 22) TF extra fees (underwriting/wire/admin) → $ **_
G) HOA / Condo (if applicable) 23) Association type → ☐ HOA (FS 720) ☐ Condo (FS 718) 24) Estoppel fee (if quoted) → $ _** 25) Rush estoppel ordered → ☐ Yes ☐ No 26) Transfer/application fees (B–C) → $ **_ 27) Board approval required pre-closing → ☐ Yes ☐ No ☐ Unsure
H) Carry (only if not same-day) 28) Carry/holding cost → $ _** per ☐ day ☐ month 29) Days held (again) → **_ days
I) Targets & Estimation 30) ARV (for fee check) → $ _** 31) Minimum acceptable net spread (optional) → $ \_\_\_ 32) If title quotes missing, estimate with FL promulgated rates? → ☐ Yes ☐ No 33) If estimating, assume owner’s title payer (A–B/B–C) →
 A–B: ☐ Seller ☐ You ☐ Unknown B–C: ☐ You ☐ End buyer ☐ Unknown
J) Outputs desired (check to include) 34) ☐ Items 1–13 full math  35) ☐ Fee target check  36) ☐ FHA/VA 90-day flag  37) ☐ Notes/assumptions

FORMULAS (apply exactly; Central Florida non–Miami-Dade)
Inputs (from QUESTIONS):
Pab, Pbc, Title_AB, Title_BC, Other_AB, Other_BC, TF_Principal, TF_Points_Rate, TF_Note_Executed_FL (Y/N), TF_Secured (Y/N), TF_Extra_Fees, Buyer_Funds, Days_Held, Carry_per_day_or_month, Carry_basis (day/month), ARV
Constants:
Deed_Rate = 0.007
Note_Stamp_Rate = 0.0035 // apply only if TF_Note_Executed_FL = Yes
Intangible_Rate = 0.002 // apply only if TF_Secured = Yes
Carry normalization:
Carry_Daily = IF(Carry_basis="month", Carry_per_day_or_month / 30, Carry_per_day_or_month)
Carry_Total = Carry_Daily \* Days_Held

Taxes/fees on A–B and B–C:
Deed_Stamps_AB = Pab _ Deed_Rate
Deed_Stamps_BC = Pbc _ Deed_Rate

TF*Points*$ = IF(Using_TF, TF_Principal _ TF_Points_Rate, 0)
DocStamps_Note = IF(Using_TF AND TF_Note_Executed_FL="Yes", TF_Principal _ Note_Stamp_Rate, 0)
Intangible_Tax = IF(Using_TF AND TF_Secured="Yes", TF_Principal \* Intangible_Rate, 0)

Totals:
Extra_Closing_Load =
Deed_Stamps_AB + Deed_Stamps_BC

- Title_AB + Title_BC
- Other_AB + Other_BC
- TF*Points*$ + DocStamps_Note + Intangible_Tax
- TF_Extra_Fees

Gross_Spread = Pbc - Pab
Net_Spread_Before_Carry = Gross_Spread - Extra_Closing_Load
Net_Spread_After_Carry = Net_Spread_Before_Carry - Carry_Total

Checks/Flags:
Fee_Target_Threshold = 0.03 \* ARV
Fee_Target_Check = IF(Net_Spread_After_Carry >= Fee_Target_Threshold, "YES", "NO")

Seasoning_Flag = IF( (Buyer_Funds IN {"FHA","VA"}) AND (Days_Held < 90),
"HIGH — season ≥90 days or change buyer",
"OK" )

Return these fields (in dollars):
Deed*Stamps_AB, Deed_Stamps_BC, Title_AB, Title_BC, Other_AB, Other_BC, TF_Points*$, DocStamps_Note, Intangible_Tax

Extra_Closing_Load, Gross_Spread, Net_Spread_Before_Carry, Net_Spread_After_Carry

Fee_Target_Check (show threshold)

Seasoning_Flag

Notes (whether title was estimated; whether note executed in FL; whether secured)

If you want, I can convert this into a single fillable message template your team can paste on mobile—one tap returns the full cost stack and net.
