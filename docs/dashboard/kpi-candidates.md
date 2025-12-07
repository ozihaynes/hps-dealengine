# Candidate Dashboard KPIs (not implemented yet)

- **assignment_fee_pct_of_arv_target_delta**
  - Label: Assignment Fee vs Target (% of ARV)
  - Question: Is the projected fee above/below the policy target band?
  - Underlying fields: outputs.spread_cash, deal.market.arv, trace.ASSIGNMENT_FEE_POLICY.details.assignment_fee_target
  - Primary inputs: ARV, assignment fee policy knobs (target/max), respect floor/ceiling inputs
  - Recommended placement: TopDealKpis Assignment tile subline or Guardrails & Profit secondary row
  - Why it matters: Makes policy alignment explicit for wholesalers and reduces back-of-envelope math in negotiation.

- **mao_vs_offer_gap_pct**
  - Label: Offer vs MAO Gap (% and $)
  - Question: How far is the current offer from the engine MAO?
  - Underlying fields: outputs.primary_offer, calculations.instantCashOffer, outputs.mao_wholesale
  - Primary inputs: Deal offer inputs in Underwrite/Scenario Modeler, ARV/repairs/carry inputs
  - Recommended placement: Guardrails & Profit deltas row
  - Why it matters: Highlights whether analyst-entered offer is conservative or over target relative to MAO.

- **carry_sensitivity_to_close_speed**
  - Label: Carry Sensitivity (per 15d delay)
  - Question: How much carry cost is added for each delay interval?
  - Underlying fields: outputs.timeline_summary.hold_monthly_dollars, outputs.timeline_summary.carry_months, timeline_summary.dtm_selected_days
  - Primary inputs: Close date / auction date, monthly hold defaults (sandbox), repairs/cost stack
  - Recommended placement: Timeline & Carry card secondary row
  - Why it matters: Quantifies timeline slippage in dollars for negotiation and ops.

- **repair_confidence_score**
  - Label: Repair Confidence (A/B/C)
  - Question: Are repairs evidence-backed or placeholder estimates?
  - Underlying fields: outputs.evidence_summary.freshness_by_kind (repair_bid), outputs.confidence_grade
  - Primary inputs: Repairs tab quantities/PSF, evidence uploads, sandbox placeholders toggle
  - Recommended placement: Data & Evidence card rows
  - Why it matters: Surfaces whether repair assumptions are defensible before presenting offers.

- **payoff_buffer_pct**
  - Label: Payoff Buffer %
  - Question: What percent cushion exists over projected payoff?
  - Underlying fields: outputs.payoff_projected, outputs.primary_offer, outputs.cushion_vs_payoff
  - Primary inputs: Debt/payoff inputs, timeline (per-diem), sandbox payoff essentials policy
  - Recommended placement: Guardrails & Profit deltas row or DealStructureChart callout
  - Why it matters: Helps acquisitions avoid thin payoffs that can flip to negative with per-diem or liens.

- **evidence_blockers_count**
  - Label: Blocking Evidence Count
  - Question: How many evidence items are blocking Ready state?
  - Underlying fields: outputs.evidence_summary.freshness_by_kind.blocking_for_ready
  - Primary inputs: Evidence uploads, sandbox placeholders toggle
  - Recommended placement: Data & Evidence badge/pill next to workflow
  - Why it matters: Gives a quantified “blocks remaining” indicator to speed clearance.

- **dc_load_pct_of_spread**
  - Label: DC Load as % of Spread
  - Question: How much of the spread is consumed by double-close friction?
  - Underlying fields: DoubleClose.computeDoubleClose results, outputs.spread_cash
  - Primary inputs: Double-close cost inputs, buyer ceiling/respect floor (for spread), sandbox DC defaults
  - Recommended placement: Wholesale Fees card subtext
  - Why it matters: Prevents over-reporting spreads when double-close is required.
