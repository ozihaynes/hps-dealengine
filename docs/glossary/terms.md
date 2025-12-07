---
doc_id: "glossary.terms"
category: "glossary"
audience: ["ai-assistant", "engineer", "underwriter", "product"]
trust_tier: 1
summary: "Canonical definitions for DealEngine terms (Respect Floor, Buyer Ceiling, DTM, Market Temp, Risk Gates, etc.) aligned with UI and engine."
---

# Glossary — Core Terms for HPS DealEngine

## Purpose
- Single, human-readable source of truth for the concepts that anchor policies, engine contracts, UI copy, and AI responses.
- Mirrors and expands the runtime glossary at `apps/hps-dealengine/lib/glossary.ts`; tooltip/helpKey strings must stay aligned.
- Cross-references domain handbooks (`docs/domain/*`), engine contracts (`docs/engine/*`), Dashboard KPIs (`docs/dashboard/*`), and app flows (`docs/app/*`).

## Quick Reference Table
| Term | Domain | Primary Use | App Locations (routes/cards/tooltips) |
| --- | --- | --- | --- |
| ARV (After-Repair Value) | Valuation | Anchor for spreads, ceilings, MAO | `/dashboard` Guardrails & Profit, `/underwrite` valuation, `/trace` valuation frames |
| AIV (As-Is Value) | Valuation | Current condition value, pairs with ARV | `/dashboard` Guardrails, `/underwrite` valuation, `/trace` valuation frames |
| Investor Floor | Floors | Investor-required minimum | `/dashboard` Guardrails, `/underwrite` guardrails, `/trace` floors frames |
| Payoff Floor | Floors | Debt + essentials minimum | `/dashboard` Guardrails, `/underwrite` guardrails, `/trace` floors frames |
| Respect Floor | Floors | Max of investor/payoff floors | `/dashboard` Guardrails, `/underwrite` guardrails, `/trace` RESPECT_FLOOR |
| Buyer Ceiling | Ceilings | Buyer max price by exit | `/dashboard` Guardrails/Strategy, `/underwrite` MAO bundle, `/trace` ceilings |
| MAO (Max Allowable Offer) | Offer | Recommended offer cap | `/dashboard` Strategy, `/underwrite` summary, `/trace` MAO bundle |
| Spread | Profit | Profit dollars vs floors/ceiling | `/dashboard` Guardrails/Profit, `/trace` SPREAD_LADDER |
| Assignment Fee | Profit | Wholesale fee component | `/dashboard` Wholesale/Profit, `/underwrite` outputs |
| DTM (Days-to-Money) | Timeline | Cash-in-hand timeline | `/dashboard` Timeline & Carry, `/underwrite` timeline, `/trace` TIMELINE_SUMMARY |
| DOM (Days on Market) | Market | Market speed input | `/dashboard` Market Temp, `/underwrite` market context |
| MOI (Months of Inventory) | Market | Supply/demand input | `/dashboard` Market Temp, `/underwrite` market context |
| Urgency Band | Timeline | Speed band (e.g., Emergency/Critical/Normal) | `/dashboard` Timeline & Carry, `/trace` TIMELINE_SUMMARY |
| Carry Months | Timeline | Modeled hold duration | `/dashboard` Timeline & Carry, `/underwrite` timeline |
| Market Temp | Market | Market speed state | `/dashboard` Market Temp card, `/trace` market frames |
| Risk Gates | Risk | Pass/Watch/Fail rules | `/dashboard` Risk & Compliance, `/underwrite` risk banners, `/trace` RISK_GATES |
| Evidence | Evidence | Completeness/freshness | `/dashboard` Data & Evidence, `/underwrite` evidence prompts, `/trace` EVIDENCE_FRESHNESS |
| Confidence Grade | Risk/Evidence | A/B/C confidence label | `/dashboard` Deal Health, `/underwrite` summary, `/trace` confidence summary |
| Workflow State | Workflow | Run/deal state (e.g., ReadyForOffer) | `/dashboard` status chips, `/underwrite` run state, `/runs` list |

## Valuation, Floors & Ceilings

### ARV (After-Repair Value)
**Domain / Category:** Valuation  
**Aliases:** ARV, After-Repair Value  
**Definition:** Estimated value after rehab completion; primary anchor for spreads, ceilings, and MAO.  
**Formal reference:** See `AnalyzeOutput.valuation.arv` in `docs/engine/analyze-contracts.md` and policy logic in `docs/domain/wholesale-underwriting-handbook.md`.  
**Inputs:** Comps, adjustments, repair scope, market context.  
**Outputs / Influences:** Buyer Ceiling, spread ladder band, MAO, strategy track.  
**UI locations:** `/underwrite` valuation section; `/dashboard` Guardrails & Profit and Strategy cards; `/trace` valuation frames.  
**Numeric example:** ARV $300k with solid comps → feeds a higher buyer ceiling and spread requirement.  
**Edge cases:** Thin comps or heavy condition issues → ARV lowered; if ARV is unreliable, Confidence Grade may drop.  
**Pitfalls:** Confusing ARV with list price or AIV; over-weighting a single high comp.  
**Related terms:** AIV, Spread Ladder, Buyer Ceiling, MAO.  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`, `docs/domain/market-temp-methodology.md`.

### AIV (As-Is Value)
**Domain / Category:** Valuation  
**Aliases:** AIV, As-Is Value  
**Definition:** Current value before rehab; pairs with ARV to bracket pricing and risk.  
**Formal reference:** `AnalyzeOutput.valuation.aiv` and AIV safety clamps in `docs/engine/analyze-contracts.md`; policy guardrails in `docs/domain/wholesale-underwriting-handbook.md`.  
**Inputs:** Current condition, market temp, repairs burden.  
**Outputs / Influences:** Floors, buyer ceiling (for wholetail/landlord), MAO selection when AIV-dominant.  
**UI locations:** `/underwrite` valuation; `/dashboard` Guardrails; `/trace` valuation frames.  
**Numeric example:** ARV $300k, AIV $180k → AIV may dominate wholetail scenarios.  
**Edge cases:** AIV Safety Cap may clamp optimistic values; in slow markets, AIV can fall sharply relative to ARV.  
**Pitfalls:** Treating AIV as “quick sale price” without accounting for carry/marketing time.  
**Related terms:** ARV, AIV Safety Cap, Respect Floor.  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`.

### Investor Floor
**Domain / Category:** Floors / Guardrails  
**Aliases:** Investor Minimum, Buyer Floor  
**Definition:** Minimum price needed for the investor to hit required margin after costs; core input to floors.  
**Formal reference:** `AnalyzeOutput.floors.investor_floor` in `docs/engine/analyze-contracts.md`; policy knobs in `docs/engine/knobs-and-sandbox-mapping.md`.  
**Inputs:** ARV/AIV, repairs, carry, required margin (spread ladder), costs.  
**Outputs / Influences:** Respect Floor, MAO lower bound.  
**UI locations:** `/dashboard` Guardrails card; `/underwrite` guardrails pane; `/trace` floors frame.  
**Numeric example:** Required net $25k → investor floor $155k given payoff/repairs context.  
**Edge cases:** If payoff exceeds investor floor, Respect Floor is driven by payoff.  
**Pitfalls:** Ignoring carry or disposition costs when interpreting the number.  
**Related terms:** Respect Floor, Buyer Ceiling, Spread Ladder.  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`.

### Payoff Floor
**Domain / Category:** Floors / Guardrails  
**Aliases:** Debt Floor  
**Definition:** Lowest offer that clears debt plus essential seller costs (e.g., move-out cash).  
**Formal reference:** `AnalyzeOutput.floors.payoff_floor`; debt/payoff inputs in `docs/engine/analyze-contracts.md`.  
**Inputs:** Senior/junior liens, HOA/municipal fines, payoff letters.  
**Outputs / Influences:** Respect Floor, negotiation range lower bound.  
**UI locations:** `/underwrite` guardrails; `/dashboard` Guardrails card; `/trace` floors frame.  
**Numeric example:** Debt + essentials = $142k → payoff floor $142k even if investor floor is lower.  
**Edge cases:** Hidden liens or payoff letter changes can move this late in the process.  
**Pitfalls:** Assuming payoff floor covers all seller proceeds—excludes your profit and repairs.  
**Related terms:** Respect Floor, Investor Floor, Workflow State (needs re-run when payoff updates).  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`, `docs/domain/risk-gates-and-compliance.md` (payoff evidence expectations).

### Respect Floor
**Domain / Category:** Floors / Guardrails  
**Aliases:** Minimum Acceptable Offer  
**Definition:** The lowest recommended offer: `max(investor_floor, payoff_floor + essentials)`. Enforces respectful, policy-safe offers.  
**Formal reference:** `AnalyzeOutput.floors.respect_floor`; RESPECT_FLOOR trace frame.  
**Inputs:** Investor Floor, Payoff Floor, essentials allowances.  
**Outputs / Influences:** Offer band lower bound, MAO cannot drop below this.  
**UI locations:** `/dashboard` Guardrails; `/underwrite` guardrails; `/trace` RESPECT_FLOOR.  
**Numeric example:** Investor floor $155k, payoff floor $142k → Respect Floor $155k.  
**Edge cases:** If payoff + essentials exceed investor floor, Respect Floor rises accordingly.  
**Pitfalls:** Treating Respect Floor as “first offer” instead of “do not go below.”  
**Related terms:** Investor Floor, Payoff Floor, MAO, Spread.  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`.

### Buyer Ceiling
**Domain / Category:** Ceilings / Guardrails  
**Aliases:** Investor Max, Buyer Max Price  
**Definition:** Highest price a target buyer should pay given repairs, costs, carry, and required margin.  
**Formal reference:** `AnalyzeOutput.ceilings.buyer_ceiling` and track-specific ceilings; ceiling trace frames.  
**Inputs:** ARV/AIV, repairs, track (Cash/Wholesale/Wholetail/List), required margin.  
**Outputs / Influences:** Negotiation top, MAO upper bound.  
**UI locations:** `/dashboard` Guardrails/Strategy; `/underwrite` MAO bundle; `/trace` ceilings frames.  
**Numeric example:** ARV $300k, repairs $40k, required margin $30k → buyer ceiling ~$215k (illustrative).  
**Edge cases:** In cold markets, ceiling may fall near Respect Floor; if ceiling < floor, deal is likely a pass without overrides.  
**Pitfalls:** Assuming buyer ceiling equals MAO—MAO is posture-adjusted and may be lower.  
**Related terms:** MAO, Respect Floor, Spread Ladder, Strategy Track.  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`.

### MAO (Maximum Allowable Offer)
**Domain / Category:** Offer / Guardrails  
**Aliases:** MAO, Max Offer  
**Definition:** Offer cap the engine recommends after applying repairs, costs, and required profit. Primary negotiation anchor.  
**Formal reference:** `AnalyzeOutput.mao_bundle` in `docs/engine/analyze-contracts.md`; MAO trace frames.  
**Inputs:** ARV/AIV, repairs, costs, spreads, floors/ceilings, posture/sandbox knobs.  
**Outputs / Influences:** Offer band, Strategy recommendation, Dashboard KPIs.  
**UI locations:** `/underwrite` summary; `/dashboard` Strategy/Guardrails; `/trace` MAO/strategy frames.  
**Numeric example:** Respect Floor $155k, Buyer Ceiling $215k → MAO (Base posture) $180k (illustrative).  
**Edge cases:** If Respect Floor > Buyer Ceiling, MAO clamps to the floor and flags risk.  
**Pitfalls:** Treating MAO as guaranteed buyer acceptance; it’s an internally safe cap, not an offer commitment.  
**Related terms:** Respect Floor, Buyer Ceiling, Spread, Assignment Fee.  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`, `docs/app/underwrite-flow.md`.

## Profit, Spread & Fees

### Spread (Profit Spread)
**Domain / Category:** Profit / Guardrails  
**Aliases:** Profit Spread, Required Spread  
**Definition:** Profit dollars between offer (or buyer price) and required costs/floors; must meet the spread ladder minimums.  
**Formal reference:** Spread ladder logic in `docs/domain/wholesale-underwriting-handbook.md`; SPREAD_LADDER trace frame.  
**Inputs:** ARV band, required min spread, repairs, payoff, costs, assignment fee assumptions.  
**Outputs / Influences:** Cash Gate, Strategy eligibility, Guardrails card state.  
**UI locations:** `/dashboard` Guardrails & Profit; `/trace` SPREAD_LADDER; `/underwrite` guardrails.  
**Numeric example:** Required min spread $20k, current spread $26k → green.  
**Edge cases:** Spread within ~10–20% of min may show yellow; below min triggers red/cash gate fail.  
**Pitfalls:** Confusing spread with assignment fee; spread includes all costs/repairs.  
**Related terms:** Spread Ladder, Cash Gate, Assignment Fee, Respect Floor.  
**See also:** `docs/dashboard/kpi-inventory.md`, `docs/dashboard/kpi-stories.md`.

### Assignment Fee
**Domain / Category:** Profit / Wholesale  
**Aliases:** Wholesale Fee  
**Definition:** Fee collected when assigning the contract to an end buyer; component of wholesale profit.  
**Formal reference:** Fee modeling in `docs/domain/wholesale-underwriting-handbook.md`; assignment knobs in `docs/engine/knobs-and-sandbox-mapping.md`.  
**Inputs:** Spread, local investor discounts, policy caps.  
**Outputs / Influences:** Wholesale margin, Strategy (wholesale vs wholetail).  
**UI locations:** `/underwrite` outputs; `/dashboard` Wholesale/Profit stats; `/trace` profit frames.  
**Numeric example:** Assignment fee target $10k on a $26k spread → leaves $16k margin.  
**Edge cases:** VIP/buyer-specific discounts may reduce achievable fee.  
**Pitfalls:** Treating assignment fee as guaranteed regardless of market temp or risk gates.  
**Related terms:** Spread, Buyer Ceiling, Strategy Track.  
**See also:** `docs/domain/wholesale-underwriting-handbook.md`.

## Timeline, Speed & Carry

### DTM (Days-to-Money)
**Domain / Category:** Timeline / Urgency  
**Aliases:** DTM  
**Definition:** Estimated days from today to cash receipt, including closing and buffers.  
**Formal reference:** `AnalyzeOutput.timeline_summary.dtm_days` and TIMELINE_SUMMARY trace; policy in `docs/domain/timeline-and-carry-policy.md`.  
**Inputs:** Close date assumptions, auction/foreclosure dates, board approvals, buffers, Market Temp.  
**Outputs / Influences:** Urgency band, Strategy recommendation, carry cost modeling.  
**UI locations:** `/dashboard` Timeline & Carry; `/underwrite` timeline inputs; `/trace` TIMELINE_SUMMARY.  
**Numeric example:** Auction in 10 days → DTM ~12–15 days with buffers (illustrative).  
**Edge cases:** Auction/emergency timelines trigger highest urgency; long retail timelines can push risk/evidence needs.  
**Pitfalls:** Confusing DTM with DOM; DTM is to cash, not to listing.  
**Related terms:** Urgency Band, Carry Months, Market Temp.  
**See also:** `docs/domain/timeline-and-carry-policy.md`, `docs/domain/market-temp-methodology.md`.

### DOM (Days on Market)
**Domain / Category:** Market / Speed  
**Aliases:** DOM  
**Definition:** Average days a listing takes to go under contract in the area; market speed indicator.  
**Formal reference:** Inputs to Market Temp in `docs/domain/market-temp-methodology.md`.  
**Inputs:** MLS/portal data by ZIP/segment.  
**Outputs / Influences:** Market Temp band, carry months, urgency band.  
**UI locations:** `/dashboard` Market Temp context; `/underwrite` market context.  
**Numeric example:** DOM 15 → hot market; DOM 90 → slow.  
**Edge cases:** Luxury or rural segments can skew DOM; use median over average when noisy.  
**Pitfalls:** Using DOM alone without MOI; short-term spikes may mislead.  
**Related terms:** MOI, Market Temp, Urgency Band.  
**See also:** `docs/domain/market-temp-methodology.md`.

### MOI (Months of Inventory)
**Domain / Category:** Market / Supply  
**Aliases:** MOI  
**Definition:** Months it would take to sell current inventory at the current absorption rate; supply/demand gauge.  
**Formal reference:** Market Temp inputs in `docs/domain/market-temp-methodology.md`.  
**Inputs:** Active inventory, monthly absorption.  
**Outputs / Influences:** Market Temp, urgency band, carry assumptions.  
**UI locations:** `/dashboard` Market Temp notes; `/underwrite` market context.  
**Numeric example:** MOI 1–2 → hot; MOI 6+ → soft market.  
**Edge cases:** Seasonal swings; small sample sizes in niche ZIPs.  
**Pitfalls:** Treating MOI as static; recompute for updated data.  
**Related terms:** DOM, Market Temp, Carry Months.  
**See also:** `docs/domain/market-temp-methodology.md`.

### Urgency Band
**Domain / Category:** Timeline / Strategy  
**Aliases:** Speed Band, Timeline Band  
**Definition:** Categorical speed label (e.g., Emergency/Critical/High/Normal) derived from DTM and auction/timeline constraints.  
**Formal reference:** `AnalyzeOutput.timeline_summary.urgency_band`; TIMELINE_SUMMARY trace.  
**Inputs:** DTM, auction date proximity, buffers, Market Temp.  
**Outputs / Influences:** Strategy (Cash vs list), carry months, risk posture.  
**UI locations:** `/dashboard` Timeline & Carry; `/trace` TIMELINE_SUMMARY; `/underwrite` timeline section.  
**Numeric example:** DTM <15 days → Emergency; 30–45 days → Normal (illustrative bands).  
**Edge cases:** Board approvals or condo SIRS can push band higher even without auctions.  
**Pitfalls:** Ignoring unresolved risk gates that can elongate DTM; urgency assumes gates are cleared.  
**Related terms:** DTM, Carry Months, Strategy Track.  
**See also:** `docs/domain/timeline-and-carry-policy.md`.

### Carry Months
**Domain / Category:** Timeline / Costs  
**Aliases:** Hold Months  
**Definition:** Modeled hold duration (in months) used for carrying cost calculations.  
**Formal reference:** `AnalyzeOutput.timeline_summary.carry_months` and sandbox knobs in `docs/engine/knobs-and-sandbox-mapping.md`; policy in `docs/domain/timeline-and-carry-policy.md`.  
**Inputs:** Market Temp, DOM/MOI, exit track, buffers, policy caps.  
**Outputs / Influences:** Carry costs, investor floor, spread requirements.  
**UI locations:** `/dashboard` Timeline & Carry card; `/underwrite` timeline; `/trace` TIMELINE_SUMMARY.  
**Numeric example:** Flip in balanced market → carry months 4; auction cash close → carry months near 1.  
**Edge cases:** Uninsurable or structural issues may add buffer months.  
**Pitfalls:** Assuming carry months shrink without clearing risk gates; they are policy-driven.  
**Related terms:** DTM, Market Temp, Investor Floor.  
**See also:** `docs/domain/timeline-and-carry-policy.md`.

### Market Temp (Market Temperature)
**Domain / Category:** Market / Speed  
**Aliases:** Market Speed, Speed Band, ZIP Speed Band  
**Definition:** Policy-derived market speed label (e.g., Hot/Warm/Neutral/Cool) based on DOM/MOI (and future indicators).  
**Formal reference:** Method in `docs/domain/market-temp-methodology.md`; outputs in market trace frames and `AnalyzeOutput.market_temp` (if present).  
**Inputs:** DOM, MOI, price tier/ZIP speed bands, policy thresholds.  
**Outputs / Influences:** Carry months, required spreads, strategy track, urgency band.  
**UI locations:** `/dashboard` Market Temp card; `/underwrite` market context; `/trace` market frames.  
**Numeric example:** DOM 20 & MOI 1.5 → Hot; DOM 90 & MOI 6 → Cool.  
**Edge cases:** Sparse data ZIPs default to conservative bands; CEO default: fall back to Neutral if data absent.  
**Pitfalls:** Overriding market temp without evidence; failing to adjust repairs/timeline for cold markets.  
**Related terms:** DOM, MOI, DTM, Carry Months.  
**See also:** `docs/domain/market-temp-methodology.md`, `docs/dashboard/kpi-inventory.md`.

## Risk, Evidence & Workflow

### Risk Gates
**Domain / Category:** Risk / Compliance  
**Aliases:** Gates, Policy Gates  
**Definition:** Pass/Watch/Fail rules that enforce compliance and risk tolerances (e.g., Flood 50% Rule, FIRPTA, FHA flip).  
**Formal reference:** `AnalyzeOutput.risk_summary` and RISK_GATES trace; policy details in `docs/domain/risk-gates-and-compliance.md`.  
**Inputs:** Property flags (flood, condo SIRS, PACE, FIRPTA, SCRA), structural/repairs signals, timeline constraints.  
**Outputs / Influences:** Confidence Grade, Strategy eligibility, ReadyForOffer status.  
**UI locations:** `/dashboard` Risk & Compliance card; `/underwrite` risk banners; `/trace` RISK_GATES frames.  
**Numeric example:** Flood 50% Rule triggered with structural repairs → gate Fail until mitigated.  
**Edge cases:** Some Watch gates allow progression with documented mitigations; Fail gates block ReadyForOffer without override.  
**Pitfalls:** Ignoring Watch items; assuming service-role bypass (not allowed).  
**Related terms:** Evidence, Confidence Grade, Workflow State.  
**See also:** `docs/domain/risk-gates-and-compliance.md`.

### Evidence
**Domain / Category:** Evidence / Confidence  
**Aliases:** Evidence Freshness, Evidence Completeness  
**Definition:** Presence and recency of critical artifacts (payoff/title/insurance/repairs/comps); stale or missing items degrade confidence.  
**Formal reference:** `AnalyzeOutput.evidence_summary` and EVIDENCE_FRESHNESS trace; standards in `docs/domain/risk-gates-and-compliance.md` and `docs/domain/repairs-and-contingency-model.md`.  
**Inputs:** Uploaded documents (payoff letters, title searches, insurance quotes, bids/photos), timestamps.  
**Outputs / Influences:** Confidence Grade, risk gating, ReadyForOffer eligibility.  
**UI locations:** `/dashboard` Data & Evidence card; `/underwrite` evidence prompts; `/trace` evidence frames.  
**Numeric example:** Payoff/title <30 days old, repairs photos this week → green; >90 days stale → yellow/red.  
**Edge cases:** Missing payoff allowed for triage but blocks deep runs; CEO default: structural/flood deals require current bids before green.  
**Pitfalls:** Treating “uploaded once” as evergreen; freshness matters.  
**Related terms:** Confidence Grade, Risk Gates, Repairs Contingency.  
**See also:** `docs/domain/risk-gates-and-compliance.md`, `docs/app/underwrite-flow.md`.

### Confidence Grade
**Domain / Category:** Risk / Evidence  
**Aliases:** Confidence Rating, A/B/C Grade  
**Definition:** Overall confidence label (A/B/C) summarizing evidence completeness, risk gates, and valuation quality.  
**Formal reference:** Confidence summary in `AnalyzeOutput.risk_summary` (if exposed) and trace frames; rubric in `docs/dashboard/kpi-stories.md`.  
**Inputs:** Evidence freshness/completeness, gate statuses, valuation robustness, repairs clarity.  
**Outputs / Influences:** ReadyForOffer checklist, strategy posture, AI messaging tone.  
**UI locations:** `/dashboard` Deal Health/hero; `/underwrite` summary; `/trace` confidence frames.  
**Numeric example:** All gates Pass, evidence fresh → Grade A; several Watch, stale comps → Grade B/C.  
**Edge cases:** CEO default: Grade cannot be A if any Fail gate exists; Watch-heavy runs cap at B.  
**Pitfalls:** Interpreting grade as guarantee; it is a quality signal, not approval.  
**Related terms:** Evidence, Risk Gates, Workflow State.  
**See also:** `docs/dashboard/kpi-stories.md`.

### Workflow State
**Domain / Category:** Workflow / Runs  
**Aliases:** Run State, Deal State (e.g., ReadyForOffer, NeedsInfo, Hold, Kill)  
**Definition:** State label indicating readiness and next action for the run/deal.  
**Formal reference:** Workflow state handling in `docs/app/underwrite-flow.md` and lifecycle in `docs/product/end-to-end-deal-lifecycle.md`.  
**Inputs:** Risk gates, evidence status, spreads/timeline, confidence grade.  
**Outputs / Influences:** Whether offers can be generated, IC review paths, Dashboard status chips.  
**UI locations:** `/underwrite` run status; `/dashboard` status chips; `/runs` history.  
**Numeric example:** Spread green, gates Pass, evidence adequate → ReadyForOffer; Fail gate → NeedsInfo/Hold until cleared.  
**Edge cases:** Auction/DTM emergency may force faster decisions but still require minimum evidence.  
**Pitfalls:** Skipping re-run after major input changes; marking ReadyForOffer without clearing Fail gates.  
**Related terms:** Risk Gates, Evidence, Confidence Grade, DTM.  
**See also:** `docs/product/end-to-end-deal-lifecycle.md`, `docs/app/underwrite-flow.md`.

## Maintenance & Alignment
- This glossary must stay aligned with `apps/hps-dealengine/lib/glossary.ts`. Add/rename terms in both places together.
- Formulas and algorithms live in domain and engine docs; this file provides narrative definitions. Use `docs/dashboard/kpi-inventory.md` for KPI math and `docs/engine/analyze-contracts.md` for field-level schemas.
- When adding a new term:
  - Create a stable key in `glossary.ts` and map it here with aliases, definition, inputs/outputs, and UI locations.
  - Cross-link to the relevant domain/engine docs and KPIs.
  - Update shortlist JSONs and any helpKey usage as needed.
- Legacy route note: Dashboard is `/dashboard` (formerly `/overview`); use current route names in UI references.
