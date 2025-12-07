---
doc_id: "domain.wholesale-underwriting-handbook"
category: "domain"
audience: ["ai-assistant", "underwriter", "engineer", "exec"]
trust_tier: 0
summary: "Authoritative wholesale underwriting manual covering valuation standards, spreads, floors/ceilings, MAO selection, exits, and checklists."
---

# Wholesale Underwriting Handbook — HPS DealEngine

## 1. Purpose
- Opinionated, structured handbook that maps real-world wholesale underwriting into DealEngine formulas, thresholds, gates, and checklists.
- Optimized for automation and AI: every concept is traceable, deterministic, and aligned to engine outputs, policy tokens, and sandbox knobs.
- Ties domain practice to product surfaces (routes, tables, edge functions) so decisions are reproducible and auditable.

## 2. Core Objectives of Wholesale Underwriting
- Preserve investor margin and protect capital while solving the seller’s problem (speed, certainty, clean close).
- Standardize decisions across reps/markets; reduce “hero underwriting” via policy, runs, and gates.
- Align underwriters, acquisitions, dispo, and capital partners on:
  - What a “good deal” looks like: spreads at/above policy, gates passing, DTM within band, workflow_state = ReadyForOffer.
  - What a “bad deal” looks like: spreads below minimums, failing gates, stale/missing evidence, workflow_state = NeedsReview/NeedsInfo.
- KPIs and enforcement: spread/MAO ladders, risk grade, DTM/timeline, evidence freshness; enforced through runs hashes + trace frames (SPREAD_LADDER, CASH_GATE, EVIDENCE_FRESHNESS_POLICY, RISK_GATES_POLICY, WORKFLOW_STATE_POLICY).

## 3. Valuation Standards: ARV & AIV

### 3.1 ARV (After Repair Value)
- Definition: Expected resale value post-scope completion in target disposition path (flip/wholetail/list).
- Derivation:
  - Comps with adjustments for condition, GLA, bed/bath, pool/garage, lot, age; align to intended finish level.
  - Comp rules: ≥3 comps; age ≤90 days when available (expand with explicit justification); radius ~0.5–1.0 mi (expand if sparse); same property type (SFR/TH; condos only with HOA/SIRS caveats).
  - Repair scope alignment: ARV must reflect the modeled scope (no “perfect home” drift).
- Minimum data quality: enforce min comp count, max comp age, similarity; warn on over-broad adjustments.
- Rule-of-thumb context: MAO ≈ ARV × % – repairs – fee is insufficient; DealEngine replaces it with policy-driven spread ladders, gates, and trace-backed ceilings/floors.

### 3.2 AIV (As-Is Value)
- Definition: Value in current condition today.
- Use cases: wholetail/light rehab/landlord leaning; fast-cash decisions; respect floor and payoff math.
- Estimation:
  - Derived from as-is comps (≥3, ≤90 days when available), condition adjustments, and Market Temp signals (DOM/MOI).
  - Relationship: AIV should be ≤ ARV with justification if near/equal; policy knobs (AIV hard/soft max vs ARV) govern caps.
- Constraints & warnings:
  - Warn if AIV > ARV without explicit distress/functional rationale.
  - Sandbox/policy fields: `aivHardMax`, `aivSoftMaxVsArvMultiplier`, evidence requirements for cap overrides (bindable insurance, clear title, fast ZIP, VP approval).

### 3.3 Standards for ARV/AIV
- Minimum inputs: address, bed/bath/GLA, condition, Market Temp (DOM/MOI), comp set (count + age), repairs scope.
- Outliers/edge cases: rural/unique assets require wider windows with explicit reasons; confidence should degrade; workflow_state should remain NeedsReview until resolved.
- Feeds: ARV/AIV feed Buyer Ceiling, MAO bundle, Respect Floor, spread KPIs, and guardrails (SPREAD_LADDER, AIV_SAFETY_CAP trace).

## 4. Spread, Profit, and Assignment Fee Policy
- Terms (see Glossary): spread, buyer margin, wholesale fee, assignment fee.
- Minimum spread requirements (policy-driven):
  - By ARV band (e.g., ladder: ≤200k: 15k; 200–400k: 20k; 400–650k: 25k; >650k: max(30k, 4% ARV)) via `minSpreadByArvBand`.
  - Posture: Conservative/Base/Aggressive may tighten/loosen ladder via sandbox presets.
- Target vs minimum by exit:
  - Flip: target margin per policy (e.g., 18% baseline, MOI-tiered), minimum = ladder band.
  - Wholetail: lower margin (10–14%) but must pass AIV cap and Market Temp.
  - Landlord/DSCR: ensure DSCR target (≥1.25x) and cap-rate hurdles; treat spread in cash-equivalent terms.
- Assignment fee policy:
  - Internal guardrails stricter than public promises; VIP override bands allowed only with approval role and audit.
  - Fees must fit inside Buyer Ceiling and not violate min spreads; public ask must not exceed Buyer Ceiling or misrepresent net.
- Local adjustments:
  - ZIP investor discounts (P20/typical) inform Investor Floor and acceptable spreads.
  - Holding costs and carry must be accounted for by buyer type (flip vs wholetail vs landlord).
- If absent in policy data: default to conservative ladder above and require manager approval to go below.

## 5. Floor and Ceiling Concepts
- Investor Floor: AIV × (1 − local investor discount). Uses ZIP P20/typical discounts where available; adjusts for Market Temp.
- Payoff Floor: Payoff + retained equity % + move-out cash (default/min/max per policy) + essentials (taxes/HOA/arrears/fines).
- Respect Floor: max(Investor Floor, Payoff Floor). Hard floor for offers; exceptions require governed override (manager/owner) with audit.
- Buyer Ceiling: ARV × (1 − buyer target margin) − repairs − buyer costs − carry (hold costs per track/speed/zip). Clamped by AIV safety cap (0.97 default; up to 0.99 with bindable insurance + clear title + fast ZIP + VP approval).
- Interactions:
  - MAO must be ≥ Respect Floor and ≤ Buyer Ceiling (and ≤ AIV cap).
  - Spread ladders and cash gate overlay ceilings/floors in strategy/guardrails cards.
  - Hard vs soft: Respect Floor and AIV cap are hard; Buyer Ceiling is a hard cap; margin targets beyond minimum are soft guidance unless policy marks them as gates.

## 6. MAO (Max Allowable Offer) Selection Rules
- Calculation modes:
  - ARV-based MAO: ARV-driven ceiling minus costs/margins.
  - AIV-based MAO: when wholetail/light rehab or landlord bias; ensure AIV cap and respect floor are met.
  - Blended: engine presents bundle (wholesale/flip/wholetail/as_is_cap); primary_offer selected per policy posture/strategy.
- Posture logic:
  - Conservative/Base/Aggressive presets adjust margins, spreads, carry assumptions; pick the lower MAO when uncertainty or evidence gaps exist.
- Policy interactions:
  - MAO ≥ Respect Floor; MAO ≤ Buyer Ceiling; MAO ≤ AIV safety cap.
  - Cash presentation gate: require spread over payoff minimum for showing cash/wholesale.
- Exit variants:
  - Cash/Wholesale: primary in many fast/auction cases; uses cash gate and spread ladder.
  - Wholetail/List: allowed when insurable/retailable, Market Temp supports timeline; ensure FHA/VA timing overlays.
- KPIs: guardrail strip and strategy cards show primary MAO and alternates; trace shows clamp steps (BUYER_CEILING, AIV_SAFETY_CAP, MAO_CLAMP).

## 7. Red-line vs Soft-Guidance Rules

### 7.1 Red-line (Hard Fail)
- Below Respect Floor.
- Spread < minimum ladder for chosen exit.
- Critical risk gates fail: uninsurable (no bindable quote/current forms), title hard stop, FHA 90-day violation for retail exit, PACE/UCC unresolved when financing needed, bankruptcy stay active.
- Timeline/auction impossible (DTM beyond policy max for selected exit; auction date inside unacceptable window).
- UI: red badges/banners; workflow_state stays NeedsReview/NeedsInfo; ReadyForOffer blocked.
- Overrides: manager/owner (or VP where specified); reason + evidence required; logged in runs + audit_logs.

### 7.2 Soft Guidance
- Confidence grade below target but above minimum (e.g., B vs A).
- Margins below target but above minimum spread.
- Missing but obtainable evidence (payoff pending, second insurance quote).
- UI: amber/yellow badges; ReadyForOffer may be allowed with downgrade; AI should suggest actions, never change numbers.

## 8. Exit Strategy Selection
- Options: Cash close, Wholesale/assignment, Wholetail, List/MLS.
- Drivers:
  - Market Temp (DOM/MOI), repairs scope, price tier, buyer segment, DTM/urgency, risk gates (insurance/title/HOA/auction).
  - Policy enablement: dispositionTrackEnablement, DTM thresholds, carry and speed bands.
- Patterns:
  - Flip/Wholesale when spreads strong and speed/auction pressure is high.
  - Wholetail when insurable, light scope, Market Temp supportive; cap by AIV safety and carry.
  - List/MLS when insurable, timelines acceptable, and retail overlays (FHA/VA seasoning) are satisfied.
  - Shift logic: as Market Temp cools or repairs rise, shift Flip → Wholetail → Landlord/assignment; block retail if overlays fail.
- Trace/UI: Strategy card shows primary track; trace frames document DTM_URGENCY_POLICY, RISK_GATES_POLICY, CASH_GATE; guardrails display track/ask limits.

## 9. Underwriting Checklists

### Pre-run (triage) checklist
| Check item | Where to look |
| --- | --- |
| Address, bed/bath/GLA, condition notes | `/underwrite` inputs |
| ARV/AIV quick estimates (with comp count/age) | `/underwrite`; Trace after run |
| Market Temp (DOM/MOI) if available | `/underwrite`; later `/overview` Timeline |
| Repairs quick estimate (PSF/Big 5) | `/repairs` QuickEstimate |
| Evidence basics (photos, minimal comps) | `/underwrite` evidence prompts |

### Mid-run (deep) checklist
| Check item | Where to look |
| --- | --- |
| Full comps set (count, age, similarity) | `/underwrite`; Trace valuation frames |
| Repairs: PSF + Big 5 + line items | `/repairs` |
| Payoff letter, insurance/title evidence | `/underwrite` evidence; `/overview` Risk/Evidence |
| Carry/hold inputs (tax/ins/HOA/utilities) | `/underwrite`; Timeline & Carry card |
| Floors/ceilings: Respect Floor, Buyer Ceiling, AIV cap | `/overview` Guardrails/Strategy; `/trace` clamps |
| Workflow_state and gates | `/overview` Risk/Evidence; `/trace` policy frames |

### Pre-offer checklist
| Check item | Where to look |
| --- | --- |
| Respect Floor ≤ Offer ≤ Buyer Ceiling/AIV cap | `/overview` Guardrails/Strategy |
| Spread ≥ minimum for exit; cash gate satisfied | `/overview` Guardrails; `/trace` SPREAD_LADDER/CASH_GATE |
| DTM/timeline within policy; auction buffers | `/overview` Timeline & Carry; `/trace` DTM_URGENCY_POLICY |
| Risk gates: insurance/title/HOA/pace/FHA/VA | `/overview` Risk & Evidence; `/trace` RISK_GATES_POLICY/EVIDENCE_FRESHNESS_POLICY |
| Evidence completeness/freshness | `/overview` Evidence; `/trace` evidence frames |
| Notes/justification captured; workflow_state ReadyForOffer (or documented exception) | `/overview`; `/trace`; run metadata |

## Cross-References
- `docs/product/vision-and-positioning.md`
- `docs/product/personas-and-use-cases.md`
- `docs/product/end-to-end-deal-lifecycle.md`
- `docs/domain/risk-gates-and-compliance.md` (future)
- `docs/domain/market-temp-methodology.md` (future)
- `docs/engine/analyze-contracts.md` (future)
- `docs/knobs-audit-v1.md` (policy knobs)
