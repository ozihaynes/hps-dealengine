---
doc_id: "app.underwrite-flow"
category: "app"
audience: ["ai-assistant", "underwriter", "engineer", "product"]
trust_tier: 1
summary: "Step-by-step recipe for using /underwrite, running analyze, interpreting outputs, and reaching ReadyForOffer."
---

# Underwrite Flow — HPS DealEngine (/underwrite)

## Purpose
- Step-by-step recipe for using the Underwrite tab from triage to “ReadyForOffer.”
- Clarifies when to run Analyze, how to trust results, and what gates/evidence must be satisfied.
- Anchors to engine contracts (`v1-analyze`, `v1-runs-save`), trace frames, and domain policies (spreads, risk, timeline, repairs).

## Preconditions
- DealSession active (deal selected via `/startup` or `/deals`); org resolved via JWT/memberships (RLS-first).
- Minimal facts:
  - Triage run: address, sqft/beds/baths, basic condition notes; quick repairs class; rough ARV/AIV estimate.
  - Deep run: adds payoff/debt indicators, photos/repair notes, comps summary, insurance/title signals if available.
- Evidence expectations (stage-dependent):
  - Triage: basic property info + rough repairs allowed; missing payoff/title/insurance is acceptable but will keep confidence lower.
  - Deep: payoff letter or indicators, comp summaries, repair evidence; insurance/title flags if known.
- Guardrails: Hard risk-gate fails block ReadyForOffer unless governed override; UI must not bypass RLS or engine outputs.

## Input Ordering & Sections
Recommended sequence (aligns with Underwrite UI sections):

| Step | Section | What user does | Key fields | Related docs |
| --- | --- | --- | --- | --- |
| 1 | Market & Context | Confirm marketCode/posture; note Market Temp context (from Dashboard) | marketCode, posture, market temp band | `../domain/market-temp-methodology.md` |
| 2 | Valuation | Enter ARV/AIV estimates + comp counts/age; note evidence presence | arv/aiv estimates, compCount, compAge | `../domain/wholesale-underwriting-handbook.md` |
| 3 | Repairs | Quick Estimate PSF + Repair Class; Big 5; sync/verify line items from `/repairs` | repair_class, quick PSF, big5, line items, repairProfile meta | `../domain/repairs-and-contingency-model.md` |
| 4 | Costs & Fees | Buyer/seller costs, assignment/fee targets, hold inputs (tax/ins/HOA/utilities) | closingCosts, resale/assignmentFeeTarget, carry inputs | `../domain/wholesale-underwriting-handbook.md`, `../domain/timeline-and-carry-policy.md` |
| 5 | Debt & Payoff | Senior principal/per-diem, juniors, HOA/municipal/tax delinquencies; payoff letter flag | seniorPrincipal, perDiem, goodThruDate, juniors, arrears | `../domain/risk-gates-and-compliance.md` |
| 6 | Timeline & Urgency | Desired close/target DTM, auction/foreclosure dates, board approval timing | targetDtm, desiredClose, auctionDate, boardApproval | `../domain/timeline-and-carry-policy.md` |
| 7 | Risk/Compliance Flags | Flood zone, condo/SIRS/warrantability, FIRPTA, SCRA, bankruptcy, PACE/UCC/solar | risk flags | `../domain/risk-gates-and-compliance.md` |
| 8 | Sandbox/Policy Overrides (governed) | Adjust posture/knobs only if allowed (governed) | sandboxOverrides/posture override | `../engine/knobs-and-sandbox-mapping.md` |

## Running Analyze (Engine Invocation)
- Mechanism: Underwrite builds `AnalyzeInput` → calls `v1-analyze` → engine (`packages/engine`) returns `AnalyzeOutput` + trace → user reviews → `v1-runs-save` persists with policy snapshot/hashes.
- When to run:
  - After completing the ordered inputs above for current stage (triage/deep).
  - Auto-run may occur on certain changes; manual run for material edits (ARV/AIV, repairs, payoff, timeline, knobs).
- Valid run criteria:
  - Required fields present for stage (triage minimal; deep adds payoff/timeline/repair detail).
  - No hard risk gate fails without explicit (governed) override.
  - Evidence not “critical missing” for the intended stage (e.g., deep run should have payoff signal).
- Handling “info needed”:
  - Engine returns `evidence_summary`/`infoNeeded`; trace frames (`EVIDENCE_FRESHNESS`, `RISK_GATES`) show missing/stale items.
  - Address missing items before trusting ReadyForOffer.

## Interpreting Results
Look in this order (and verify against `/dashboard` cards):
1) **Guardrails & Profit**: Respect Floor, Buyer Ceiling, MAO clamps, spread ladder/cash gate (trace: `RESPECT_FLOOR`, `BUYER_CEILING`, `MAO_CLAMP`, `SPREAD_LADDER`, `CASH_GATE`, `BORDERLINE`).
2) **Strategy & Timeline**: Primary track, workflow state, confidence; DTM/urgency, carry months/hold $ (trace: `STRATEGY_RECOMMENDATION`, `WORKFLOW_DECISION`, `TIMELINE_SUMMARY`, `DTM_URGENCY`, `CARRY_MONTHS_POLICY`).
3) **Risk & Evidence**: Gate statuses and evidence freshness (trace: `RISK_GATES`, `EVIDENCE_FRESHNESS`; `infoNeeded`).
4) **Market Temp context** (if shown) to sanity-check timeline/carry expectations (trace: `SPEED_BAND_POLICY`/Market Temp output).
- Cross-check: `/dashboard` KPIs (see `docs/dashboard/kpi-inventory.md` and `kpi-stories.md`) should mirror the same outputs/trace; `/trace` shows full frame details.

## Re-run & Change Management
- Re-run when: ARV/AIV changes, repairs change materially, new payoff/evidence arrives, timeline/auction updates, sandbox/policy knobs change.
- Runs history: Saved runs keep input/output/trace/policy snapshot/hashes (see `docs/engine/analyze-contracts.md`); use run history/trace comparison to see what changed between runs.
- Do not rely on stale runs if inputs/policy differ; re-run to keep determinism and trace alignment.

## Decision Readiness: “ReadyForOffer”
Checklist (must all be true unless governed override):
- Confidence grade meets policy (CEO default: B or better) and evidence gaps for critical items are addressed.
- Risk gates: no Fail; Watch items mitigated/documented.
- Evidence: payoff/title/insurance/repairs/comps reasonably current for stage; no critical missing blockers.
- Timeline: DTM within allowed bands; auction/board buffers considered (see timeline/carry policy).
- Economics: Spread ≥ min band; Respect Floor satisfied; MAO ≤ Buyer Ceiling/AIV cap; cash gate not failing.
- Save run: ensure `v1-runs-save` completed; add notes; trace accessible for IC/AI; workflow_state set appropriately.

## Cross-links & Where to Look Next
- KPIs/narratives: `docs/dashboard/kpi-inventory.md`, `docs/dashboard/kpi-stories.md`, `docs/app/overview-layout-map.md`
- Engine/Trace: `docs/engine/analyze-contracts.md`, `docs/engine/trace-anatomy.md`
- Domain: `docs/domain/wholesale-underwriting-handbook.md`, `docs/domain/risk-gates-and-compliance.md`, `docs/domain/timeline-and-carry-policy.md`, `docs/domain/repairs-and-contingency-model.md`, `docs/domain/market-temp-methodology.md`
- Glossary: `docs/glossary/terms.md`
