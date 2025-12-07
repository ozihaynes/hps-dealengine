# KPI ↔ Input Coverage Notes

**Inputs lacking dashboard exposure:** None in this mapping set (all mapped to at least one KPI).

**KPIs without obvious user-facing levers:**
- strategy_recommendation (comes from engine outputs and policy, no direct UI input).
- market_temp_score/market_temp_label (derived from market speed/DTM policy more than a single field; influenced indirectly by DOM/MOI inputs).
- assignment_policy_targets (policy-defined caps shown in hero strip, not editable on dashboard tabs).

These should be revisited if new inputs or policy toggles become user-visible.
