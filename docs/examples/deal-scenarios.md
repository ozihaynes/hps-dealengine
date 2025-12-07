---
doc_id: "examples.deal-scenarios"
category: "examples"
audience: ["ai-assistant", "underwriter", "product"]
trust_tier: 2
summary: "Six end-to-end deal scenarios illustrating how spreads, risk gates, timeline, evidence, and strategy interact across the app."
---

# Deal Scenarios — End-to-End Examples for HPS DealEngine

## Purpose
- Provide concrete, end-to-end scenarios that reflect how DealEngine behaves across Dashboard, Underwrite, Repairs, Trace, and Sandbox.
- Train humans (acquisitions, underwriters, dispo/IC) and AI agents to interpret KPIs, trace frames, and workflow states using realistic Central Florida-style deals.
- Highlight how spreads, risk gates, timeline, evidence, and repairs interact so decisions stay deterministic, policy-driven, and explainable.

## Scenario Catalog (At-a-Glance)
| ID | Nickname | Deal Type | Core Tension | Exit Track | Final Decision | Primary Pages |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Clean Wholesale in Warm ZIP | Wholesale | Strong spread, low risk | Wholesale/Assignment | Proceed — ReadyForOffer | /dashboard, /underwrite, /trace |
| S2 | Tight Spread, Needs Concessions | Wholesale | Near min spread, some Watch gates | Wholesale with concessions | Proceed w/ conditions | /dashboard, /underwrite, /repairs, /trace |
| S3 | Flood 50% + Structural | Wholetail/Flip | Hard risk gate (FEMA 50% Rule) | Pass | /dashboard, /underwrite, /trace |
| S4 | Auction in 10 Days | Cash Flip | Timeline/urgency kill | Cash-only possible, otherwise Pass | /dashboard, /underwrite, /trace |
| S5 | Evidence-Light, Low Confidence | Wholesale | Spread ok but stale/missing evidence | Hold — Not ReadyForOffer | /dashboard, /underwrite, /repairs |
| S6 | Condo SIRS / Non-Warrantable | Condo | Specialized condo/insurance risk | Pass or Deep Discount Only | /dashboard, /underwrite, /trace |

---

## Scenario S1 — Clean Wholesale in Warm ZIP
### Snapshot
- Market: Warm/neutral ZIP, Market Temp = Warm, DOM ~28, MOI ~2.5.
- Asset: SFR 3/2, 1,450 sqft, light cosmetic rehab.
- Track: Wholesale/Assignment.

### Inputs Snapshot (Engine / Deal Facts)
- **Deal & Property Facts:** Posture = Base; ZIP speed band = Warm; ARV $300k; AIV $210k; repair class = Light; sqft 1,450.
- **Repairs:** QuickEstimate (PSF) at $22/sqft → ~$32k; Big 5 all “good”; no line-item overrides; evidence = photos + light contractor walk.
- **Debt & Payoff:** Senior payoff $120k; no juniors; payoff letter present; HOA/tax current.
- **Timeline & Auction:** DTM modeled ~32 days; no auction; carry months 3.5.
- **Risk & Evidence:** All gates Pass; insurance bindable; no flood/condo/PACE/FIRPTA issues; evidence fresh <30 days; Confidence Grade A.

### Outputs Snapshot (Key KPIs & Decisions)
- **Valuation & Floors/Ceilings:** Investor Floor $150k; Payoff Floor $120k; Respect Floor $150k; Buyer Ceiling (cash/wholesale) ~$215k.
- **Profit & Spread:** Spread $28k vs min required $20k (green); Assignment Fee target $10k; CASH_GATE Pass.
- **Timeline & Carry:** DTM 32 days, urgency = Normal; carry months 3.5 (green).
- **Risk & Evidence:** Risk gates all Pass; Evidence Freshness green; Confidence Grade A.
- **Strategy & Workflow:** Strategy = Wholesale/Assignment; workflow_state = ReadyForOffer; Market Temp = Warm.

### Screens & References
- `/dashboard`: Guardrails & Profit (Respect Floor, Spread), Strategy card (Wholesale), Timeline & Carry, Risk & Evidence, Market Temp.
- `/underwrite`: Valuation, Repairs (QuickEstimate), Payoff; guardrails pane.
- `/trace`: SPREAD_LADDER, RESPECT_FLOOR, CASH_GATE, TIMELINE_SUMMARY, RISK_GATES, EVIDENCE_FRESHNESS.

### Human Decision Narrative
A clean wholesale: spread comfortably above the ladder, no gating risks, and timeline is normal. Respect Floor = $150k and Buyer Ceiling ≈ $215k set a clear band. With Confidence Grade A and fresh evidence, IC marked ReadyForOffer and pursued a $180k offer aiming for a $10k assignment fee. Negotiation can start near MAO but with room to protect spread.

### Teaching Points
- **Teams:** When Spread > min and all gates Pass, move quickly to offer; keep offer ≥ Respect Floor. Use Market Temp = Warm to justify modest urgency but standard concessions ladder.
- **AI:** Anchor explanations on SPREAD_LADDER (green), RESPECT_FLOOR, CASH_GATE Pass, Confidence A. Do not invent higher fees; cite Respect Floor/Buyer Ceiling band.

---

## Scenario S2 — Tight Spread, Needs Concessions
### Snapshot
- Market: Neutral, DOM ~40, MOI ~3.2.
- Asset: SFR 4/2, 1,650 sqft, medium cosmetic; minor HVAC concerns.
- Track: Wholesale with concessions.

### Inputs Snapshot
- **Deal & Property Facts:** Posture = Base; ARV $340k; AIV $230k; repair class = Medium; sqft 1,650.
- **Repairs:** QuickEstimate $28/sqft (~$46k); Big 5: HVAC = “suspect” (+$6k allowance), others good; no formal bids yet (photos only).
- **Debt & Payoff:** Senior $190k; payoff letter pending (broker verbal); no juniors; $1.5k HOA arrears.
- **Timeline & Auction:** DTM ~38 days; carry months 4.0.
- **Risk & Evidence:** Payoff letter missing → Evidence Watch; Confidence Grade B; all hard gates Pass.

### Outputs Snapshot
- **Valuation & Floors/Ceilings:** Investor Floor $205k; Payoff Floor est. $192k; Respect Floor $205k; Buyer Ceiling ~$235k.
- **Profit & Spread:** Spread $21k vs min $20k → barely green; Assignment Fee target $8–10k but negotiable; CASH_GATE Pass but close.
- **Timeline & Carry:** DTM 38 (Normal); carry months 4.0 (yellow if prolonged repairs).
- **Risk & Evidence:** Risk gates Pass; Evidence Freshness = Watch (payoff missing, HVAC unverified); Confidence Grade B.
- **Strategy & Workflow:** Strategy = Wholesale; workflow_state = Proceed w/ Conditions (not ReadyForOffer until payoff letter lands).

### Screens & References
- `/dashboard`: Guardrails (Spread just over min), Risk/Evidence (Watch), Timeline (Normal), Strategy (Wholesale).
- `/underwrite`: Repairs with HVAC allowance; Payoff pending; guardrails pane shows tight band.
- `/trace`: SPREAD_LADDER (edge of green), CASH_GATE, RESPECT_FLOOR, EVIDENCE_FRESHNESS (Watch).

### Human Decision Narrative
This deal clears spread but only barely; payoff letter is missing and HVAC risk is unresolved. IC allowed “Proceed with conditions”: secure payoff, confirm HVAC bid, and target offer $208–210k with a concessions ladder (repairs credit if HVAC fails). ReadyForOffer only after payoff evidence uploads (Evidence Freshness → green).

### Teaching Points
- **Teams:** Tight spreads demand fast evidence collection; negotiate concessions tied to HVAC and payoff clarity. Do not drop below Respect Floor.
- **AI:** Emphasize near-min spread (SPREAD_LADDER), Evidence Watch, and conditional ReadyForOffer. Recommend uploading payoff letter and HVAC bid before final offer.

---

## Scenario S3 — Flood 50% + Structural (Hard Fail)
### Snapshot
- Market: Neutral; property in FEMA flood zone AE; structural cracks noted.
- Asset: SFR 3/2, 1,300 sqft; heavy/structural repairs.
- Track: Wholetail/Flip considered but blocked.

### Inputs Snapshot
- **Deal & Property Facts:** Posture = Conservative; ARV $260k; AIV $140k; repair class = Heavy/Structural.
- **Repairs:** QuickEstimate heavy $40/sqft (~$52k) plus Big 5 foundation flagged; no bids; structural engineer not engaged.
- **Debt & Payoff:** Senior $95k; payoff letter present; no juniors.
- **Timeline & Auction:** DTM modeled 55 days; carry months 5.5 (elevated due to structural).
- **Risk & Evidence:** Flood 50% Rule likely breached (repairs >50% improvement value) → gate Fail; structural evidence missing → Confidence Grade C.

### Outputs Snapshot
- **Valuation & Floors/Ceilings:** Investor Floor $150k; Payoff Floor $95k; Respect Floor $150k; Buyer Ceiling flip ~$175k (tight band).
- **Profit & Spread:** Spread insufficient once structural premium applied; CASH_GATE Fail; spread ladder red.
- **Timeline & Carry:** DTM 55, urgency = Caution; carry months 5.5 (yellow/red).
- **Risk & Evidence:** RISK_GATES Fail (FEMA 50% + structural); Evidence Freshness Watch/Fail (no engineer report); Confidence Grade C.
- **Strategy & Workflow:** Strategy suggestion suppressed; workflow_state = Kill/Pass.

### Screens & References
- `/dashboard`: Risk & Compliance red; Guardrails/Profit red; Timeline & Carry yellow/red.
- `/trace`: RISK_GATES (FEMA_50_PERCENT_RULE fail), SPREAD_LADDER red, CASH_GATE fail, TIMELINE_SUMMARY (long).

### Human Decision Narrative
Structural + Flood 50% with no engineer report is a hard stop. Respect Floor $150k but Buyer Ceiling ~$175k leaves no safe spread after required elevation/mitigation risk. IC marked Pass; note to re-engage only if seller provides engineer plan and mitigation budget—otherwise no offer to avoid “winning the wrong deal.”

### Teaching Points
- **Teams:** Flood 50% + structural without stamped plan is a default Pass; do not “price around” unknown elevation costs.
- **AI:** State clearly that hard Fail gates block ReadyForOffer. Cite RISK_GATES (FEMA_50_PERCENT_RULE) and SPREAD_LADDER red; avoid suggesting renegotiation unless mitigation evidence appears.

---

## Scenario S4 — Auction in 10 Days (Timeline Kill)
### Snapshot
- Market: Balanced; DOM ~35, MOI ~3.0.
- Asset: SFR 3/2, 1,250 sqft; light repairs.
- Track: Cash flip considered; wholesale possible only with very fast buyer.

### Inputs Snapshot
- **Deal & Property Facts:** Posture = Base; ARV $240k; AIV $175k; repair class = Light.
- **Repairs:** QuickEstimate $20/sqft (~$25k); Big 5 good; photos fresh.
- **Debt & Payoff:** Senior $160k; payoff letter present; auction set in 10 days; $2k taxes due.
- **Timeline & Auction:** DTM modeled 14 days minimum; auction days-out = 10; urgency band = Emergency.
- **Risk & Evidence:** Gates Pass otherwise; Evidence fresh; Confidence Grade B+ (timeline risk only).

### Outputs Snapshot
- **Valuation & Floors/Ceilings:** Investor Floor $165k; Payoff Floor $162k; Respect Floor $165k; Buyer Ceiling ~$200k.
- **Profit & Spread:** Spread potential ~$23k vs min $18k (green on math); CASH_GATE Pass if close in ≤14 days.
- **Timeline & Carry:** DTM 14; carry months 1.5; urgency red (Emergency).
- **Risk & Evidence:** Risk gates Pass; timeline risk flagged; Confidence Grade B+.
- **Strategy & Workflow:** Strategy = Cash-only; workflow_state = Proceed w/ conditions (auction clearance, buyer lined up).

### Screens & References
- `/dashboard`: Timeline & Carry red (Emergency), Strategy card shows Cash, Guardrails green, Risk/Evidence yellow (timeline note).
- `/trace`: TIMELINE_SUMMARY (Emergency band), SPREAD_LADDER green, CASH_GATE Pass.

### Human Decision Narrative
Math works but runway is ultra-short. IC allows conditional pursuit only if a ready cash buyer is lined up and EMD is immediate. Offer ~ $180k (above Respect Floor) with hard timelines. If buyer not secured, Pass to avoid auction risk.

### Teaching Points
- **Teams:** Emergency band demands pre-wired buyer and immediate EMD; otherwise, pass despite green spread.
- **AI:** Emphasize TIMELINE_SUMMARY urgency and auction days; do not downplay risk. Suggest action: line up buyer or decline.

---

## Scenario S5 — Evidence-Light, Low Confidence
### Snapshot
- Market: Warm; DOM ~25; MOI ~2.0.
- Asset: Townhome 3/2, 1,300 sqft; light/medium repairs.
- Track: Wholesale.

### Inputs Snapshot
- **Deal & Property Facts:** Posture = Base; ARV $280k; AIV $190k; repair class = Medium.
- **Repairs:** QuickEstimate $26/sqft (~$34k); Big 5 unknown (no attic/HVAC photos); no bids.
- **Debt & Payoff:** Senior $150k; payoff letter missing; HOA dues current.
- **Timeline & Auction:** DTM 30; carry months 3.5.
- **Risk & Evidence:** Evidence stale/missing (no payoff, no Big 5 photos) → Evidence Freshness = Watch/Fail; Confidence Grade C+; gates otherwise Pass.

### Outputs Snapshot
- **Valuation & Floors/Ceilings:** Investor Floor $168k; Payoff Floor est. $150k; Respect Floor $168k; Buyer Ceiling ~$205k.
- **Profit & Spread:** Spread ~$20k vs min $19k (barely green/yellow); Assignment Fee target $8k but at risk if repairs rise.
- **Timeline & Carry:** Normal; DTM 30; carry 3.5.
- **Risk & Evidence:** Risk gates Pass; Evidence Freshness red/yellow; Confidence Grade C+; ReadyForOffer = No.
- **Strategy & Workflow:** Strategy withheld until evidence; workflow_state = NeedsInfo/Hold.

### Screens & References
- `/dashboard`: Evidence card red/yellow; Guardrails borderline; Strategy withheld; Timeline normal.
- `/underwrite`: Repairs with unknown Big 5; payoff missing; evidence prompts visible.
- `/trace`: EVIDENCE_FRESHNESS (Fail/Watch), SPREAD_LADDER borderline.

### Human Decision Narrative
Spread could work, but evidence gaps make the run low-confidence. Team parked the deal: requested payoff letter, roof/HVAC photos, and at least one quick bid. No offer until Evidence Freshness improves; expect MAO to move after Big 5 clarity.

### Teaching Points
- **Teams:** Do not send offers with missing payoff and unknown Big 5; collect minimal artifacts to upgrade Confidence Grade.
- **AI:** Point to Evidence Freshness and Confidence Grade C+; recommend specific evidence (payoff letter, roof/HVAC photos, quick bid) before ReadyForOffer.

---

## Scenario S6 — Condo SIRS / Non-Warrantable
### Snapshot
- Market: Neutral; DOM ~50 for condos; MOI ~5 (slower segment).
- Asset: 2/2 condo, 1,050 sqft; building flagged for SIRS/milestone; special assessment likely.
- Track: Wholetail/list considered; wholesale unlikely.

### Inputs Snapshot
- **Deal & Property Facts:** Posture = Conservative; ARV $260k; AIV $190k; repair class = Light; non-warrantable risk.
- **Repairs:** QuickEstimate $18/sqft (~$19k); Big 5 good; no line items.
- **Debt & Payoff:** Senior $170k; payoff letter present; assessment TBD (not disclosed).
- **Timeline & Auction:** DTM 60; carry months 6.0 (condo approvals). Market Temp = Cool for condos.
- **Risk & Evidence:** Condo SIRS/Milestone flag → Risk gate Watch/Fail depending on docs; insurance may be limited; Confidence Grade B- pending association docs.

### Outputs Snapshot
- **Valuation & Floors/Ceilings:** Investor Floor $185k; Payoff Floor $170k; Respect Floor $185k; Buyer Ceiling wholetail ~$205k (very tight).
- **Profit & Spread:** Spread <$15k vs min ~$18k → red; Assignment Fee not viable; CASH_GATE Fail.
- **Timeline & Carry:** DTM 60, urgency = Slow; carry months 6.0 (yellow/red).
- **Risk & Evidence:** RISK_GATES Watch/Fail (condo SIRS); Evidence incomplete (no HOA financials/engineer report); Confidence Grade B- at best.
- **Strategy & Workflow:** Strategy = Pass or Deep Discount only; workflow_state = Hold/Kill.

### Screens & References
- `/dashboard`: Guardrails red; Risk & Compliance Watch/Fail for Condo SIRS; Timeline long; Market Temp cool.
- `/underwrite`: Valuation, condo risk flags; repair light but irrelevant vs risk/timeline.
- `/trace`: RISK_GATES (CONDO_SIRS_MILESTONE), SPREAD_LADDER red, TIMELINE_SUMMARY long.

### Human Decision Narrative
Non-warrantable condo with pending SIRS/assessment and slow market leaves no safe spread. Respect Floor $185k vs Buyer Ceiling ~$205k fails profit guardrails and extends timeline. IC marked Pass unless seller accepts a deep discount (<$175k) with full doc disclosure—otherwise too risky to pursue.

### Teaching Points
- **Teams:** Condo SIRS/assessment risk can erase spreads; demand HOA financials/engineer reports before considering. Deep discounts are the only path, often still a Pass.
- **AI:** Cite RISK_GATES (Condo SIRS), SPREAD_LADDER red, TIMELINE_SUMMARY long, Market Temp Cool. Do not recommend proceeding without association docs and major price cut.
