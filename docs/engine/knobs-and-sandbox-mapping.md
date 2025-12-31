---
doc_id: "engine.knobs-and-sandbox-mapping"
category: "engine"
audience: ["ai-assistant", "engineer", "underwriter", "exec"]
trust_tier: 1
summary: "Intended map of sandbox/policy knobs to engine behaviors and UI surfaces; currently a placeholder pointing to knobs audit."
---

# Knobs & Sandbox Mapping — HPS DealEngine

This doc captures the current, wiring-accurate path from sandbox knobs to policy snapshot, engine trace, and UI surfaces. The canonical flow is code-defined (no UI-only logic):

Business Sandbox knobs
-> `apps/hps-dealengine/lib/sandboxPolicy.ts` (buildSandboxPolicyOptions)
-> `apps/hps-dealengine/lib/sandboxToAnalyzeOptions.ts`
-> `packages/engine/src/policy_builder.ts` (policy snapshot)
-> `packages/engine/src/compute_underwriting.ts` (outputs + trace frames)
-> UI: `/trace` (trace frames) and `/overview` (engine outputs)

Ghost knob mappings (runtime wired):

| Knob Key | Sandbox Source Path | Policy Token | Trace Frame | UI Surface |
| --- | --- | --- | --- | --- |
| allowAdvisorOverrideWorkflowState | SandboxConfig.allowAdvisorOverrideWorkflowState -> AnalyzeSandboxOptions.workflow_and_guardrails.allowAdvisorOverrideWorkflowState | policy.workflow_policy.allow_advisor_override_workflow_state | WORKFLOW_STATE_POLICY | Trace (/trace) |
| carryMonthsMaximumCap | SandboxConfig.carryMonthsMaximumCap -> AnalyzeSandboxOptions.carry.carryMonthsMaximumCap + AnalyzeSandboxOptions.carryTimeline.carryMonthsMaximumCap | policy.carry_months_cap | CARRY_MONTHS_POLICY | Trace (/trace) |
| offerValidityPeriodDaysPolicy | SandboxConfig.offerValidityPeriodDaysPolicy -> AnalyzeSandboxOptions.timeline.offerValidityPeriodDaysPolicy | policy.dtm.offer_validity_days | DTM_URGENCY_POLICY | Trace (/trace) |
| payoffAccrualBasisDayCountConvention | SandboxConfig.payoffAccrualBasisDayCountConvention -> AnalyzeSandboxOptions.debtPayoff.payoffAccrualBasisDayCountConvention | policy.payoff_policy.accrual_basis_day_count_convention | PAYOFF_POLICY | Trace (/trace) |
| payoffAccrualComponents | SandboxConfig.payoffAccrualComponents -> AnalyzeSandboxOptions.debtPayoff.payoffAccrualComponents | policy.payoff_policy.accrual_components | PAYOFF_POLICY | Trace (/trace) |
| payoffLetterEvidenceRequiredAttachment | SandboxConfig.payoffLetterEvidenceRequiredAttachment -> AnalyzeSandboxOptions.debtPayoff.payoffLetterEvidenceRequiredAttachment | policy.payoff_policy.payoff_letter_evidence_required_attachment | PAYOFF_POLICY | Trace (/trace) |
| repairsContingencyPercentageByClass | SandboxConfig.repairsContingencyPercentageByClass -> AnalyzeSandboxOptions.repairs.repairsContingencyPercentageByClass | policy.repairs_policy.contingency_percentage_by_class | REPAIRS_POLICY | Trace (/trace) |
| repairsHardMax | SandboxConfig.repairsHardMax -> AnalyzeSandboxOptions.repairs.repairsHardMax | policy.repairs_policy.hard_max | REPAIRS_POLICY | Trace (/trace) |
| repairsSoftMaxVsArvPercentage | SandboxConfig.repairsSoftMaxVsArvPercentage -> AnalyzeSandboxOptions.repairs.repairsSoftMaxVsArvPercentage | policy.repairs_policy.soft_max_vs_arv_pct | REPAIRS_POLICY | Trace (/trace) |
