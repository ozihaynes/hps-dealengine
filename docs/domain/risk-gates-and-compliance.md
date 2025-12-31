---
doc_id: "domain.risk-gates-and-compliance"
category: "domain"
audience: ["ai-assistant", "underwriter", "engineer", "exec"]
trust_tier: 0
summary: "Intended source of truth for risk/compliance gates (flood, insurance, title, condo/SIRS, FHA/VA, PACE/UCC, FIRPTA/SCRA) and how they map to trace and UI."
---

# Risk Gates & Compliance — HPS DealEngine

Risk gates are computed in `packages/engine/src/compute_underwriting.ts` by `computeRiskGates`. The engine emits results in `outputs.risk_summary.per_gate` and writes a `RISK_GATES_POLICY` trace frame for each run. The policy snapshot is the source of truth: base gates come from `policy.gates.<gate_key>`, compliance gates are derived from `policy.compliance_policy` (with legacy fallbacks to `policy.compliance`), and gate evaluation checks `deal.flags.<condition>` for each configured condition.

Gate taxonomy (current wiring):
- Base gates: entries in `policy.gates.<gate_key>` (RiskGatePolicy).
- Compliance gates: `policy.compliance_policy.*` booleans mapped into gates at runtime.
- Gate evaluation reads `deal.flags.<condition>` for each `hard_fail_conditions` and `watch_conditions` entry, plus evidence requirements defined in the gate policy.

| Gate Key | Policy Path | deal.flags Check | Trace Frame | KPI ID | Label Source |
| --- | --- | --- | --- | --- | --- |
| insurability | policy.gates.insurability | deal.flags.<cond> for each entry in policy.gates.insurability.hard_fail_conditions / watch_conditions | RISK_GATES_POLICY | risk_gate_insurability | RISK_GATE_LABELS.insurability |
| payoff | policy.gates.payoff | deal.flags.<cond> for each entry in policy.gates.payoff.hard_fail_conditions / watch_conditions | RISK_GATES_POLICY | risk_gate_payoff | RISK_GATE_LABELS.payoff |
| title | policy.gates.title | deal.flags.<cond> for each entry in policy.gates.title.hard_fail_conditions / watch_conditions | RISK_GATES_POLICY | risk_gate_title | RISK_GATE_LABELS.title |
| bankruptcy_stay | policy.compliance_policy.bankruptcy_stay_gate_enabled (fallback: policy.compliance.bankruptcyStayGateLegalBlock) | deal.flags.bankruptcy_stay | RISK_GATES_POLICY | risk_gate_bankruptcy_stay | RISK_GATE_LABELS.bankruptcy_stay |
| fha_90_day | policy.compliance_policy.fha_90_day_gate_enabled (fallback: policy.compliance.fha90DayResaleRuleGate) | deal.flags.fha_90_day_resale | RISK_GATES_POLICY | risk_gate_fha_90_day | RISK_GATE_LABELS.fha_90_day |
| fha_va_overlays | policy.compliance_policy.fha_va_overlays_gate_enabled (fallback: policy.compliance.stateProgramGateFhaVaOverlays) | deal.flags.fha_va_overlay_block | RISK_GATES_POLICY | risk_gate_fha_va_overlays | RISK_GATE_LABELS.fha_va_overlays |
| firpta_withholding | policy.compliance_policy.firpta_gate_enabled (fallback: policy.compliance.firptaWithholdingGate) | deal.flags.firpta_withholding | RISK_GATES_POLICY | risk_gate_firpta_withholding | RISK_GATE_LABELS.firpta_withholding |
| flood_50_rule | policy.compliance_policy.flood_50_gate_enabled (fallback: policy.compliance.flood50RuleGate); watch uses policy.compliance_policy.flood_zone_source (fallback: policy.compliance.floodZoneEvidenceSourceFemaMapSelector) | deal.flags.flood_50_rule; deal.flags["flood_zone_source:<policy.compliance_policy.flood_zone_source>"] | RISK_GATES_POLICY | risk_gate_flood_50_rule | RISK_GATE_LABELS.flood_50_rule |
| va_wdo_water | policy.compliance_policy.va_wdo_water_test_gate_enabled (fallback: policy.compliance.vaProgramRequirementsWdoWaterTestEvidence) | deal.flags.va_wdo_water_test_missing | RISK_GATES_POLICY | risk_gate_va_wdo_water | RISK_GATE_LABELS.va_wdo_water |
| warrantability_review | policy.compliance_policy.warrantability_review_gate_enabled (fallback: policy.compliance.warrantabilityReviewRequirementCondoEligibilityScreens) | deal.flags.warrantability_review_fail | RISK_GATES_POLICY | risk_gate_warrantability_review | RISK_GATE_LABELS.warrantability_review |
| pace_solar_ucc | policy.gates.pace_solar_ucc | deal.flags.<cond> for each entry in policy.gates.pace_solar_ucc.hard_fail_conditions / watch_conditions | RISK_GATES_POLICY | risk_gate_pace_solar_ucc | RISK_GATE_LABELS.pace_solar_ucc |
| condo_sirs | policy.gates.condo_sirs | deal.flags.<cond> for each entry in policy.gates.condo_sirs.hard_fail_conditions / watch_conditions | RISK_GATES_POLICY | risk_gate_condo_sirs | RISK_GATE_LABELS.condo_sirs |
| manufactured | policy.gates.manufactured | deal.flags.<cond> for each entry in policy.gates.manufactured.hard_fail_conditions / watch_conditions | RISK_GATES_POLICY | risk_gate_manufactured | RISK_GATE_LABELS.manufactured |
| scra | policy.compliance_policy.scra_gate_enabled (fallback: policy.compliance.scraVerificationGate) | deal.flags.scra_verification_missing | RISK_GATES_POLICY | risk_gate_scra | RISK_GATE_LABELS.scra |

UI wiring:
- `/overview` renders `buildRiskView` from `apps/hps-dealengine/lib/overviewRiskTimeline.ts`, which reads `outputs.risk_summary.per_gate` and applies labels from `RISK_GATE_LABELS`.
- `/trace` renders the `RISK_GATES_POLICY` frame from the run trace.
