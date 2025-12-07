---
doc_id: "domain.repairs-and-contingency-model"
category: "domain"
audience: ["ai-assistant", "underwriter", "engineer", "exec"]
trust_tier: 0
summary: "Authoritative repairs policy covering Quick Estimate PSF, Big 5, line-item scopes, repair profiles, and contingency rules."
---

# Repairs & Contingency Model — HPS DealEngine

## Purpose
- Define how repairs are estimated (Quick Estimate PSF, Big 5, full line-item), how contingency is applied, and when each method is trusted.
- Keep engine math, UI flows, and sandbox/policy knobs aligned so runs, trace, and UI all reflect the same repair logic.
- Provide an authoritative reference for engineers, underwriters, and AI agents; ReadyForOffer depends on defensible, evidenced repair inputs.

## Repair Estimation Modes

### Quick Estimate (Per-Square-Foot)
- **Use cases**: First-pass underwriting, cosmetic/low-risk deals, quick triage.
- **Inputs**: Living area sqft, Repair Class (Light/Medium/Heavy/Structural).
- **Rates**: PSF tiers per market/posture via `repair_rate_sets` and active repair profile.
- **Behavior**: Multiplies PSF by sqft; Repair Class chosen in UI (/underwrite → /repairs QuickEstimate) or inferred defaults per profile/posture.

### Big 5 (Major Systems)
- **Components**: Roof, HVAC, plumbing/repipe, electrical, foundation (engine may allow additional majors as policy evolves).
- **Use cases**: Add on top of Quick Estimate for known system failures; override when majors dominate total repairs.
- **Behavior**: Per-item rates from active repair profile; quantities/flags entered in /repairs or fed from evidence.

### Full Line-Item Estimate
- **Sections**: Kitchens/Baths; Systems & Major; Exterior/Structural; Interior/Finishes.
- **Use cases**: Deep underwriting, rehab planning, lender/IC-facing scopes.
- **Behavior**: Line-item rates from active profile; totals roll into repairs; surfaced in `/repairs` estimator and reused in runs.

## Rate Tables & Repair Profiles
- **repair_rate_sets**: Org/market/posture-scoped PSF tiers, Big 5 rates, and line-item rates.
- **Active/default selection**: One active+default profile per org/market/posture; selected deal-first (org from deal); can switch profiles per deal.
- **Retrieval**: `v1-repair-rates` returns current profile (psfTiers, big5, lineItemRates, meta: market, posture, version, as_of).
- **UI**: Active profile metadata shown in `/repairs`; profiles can be cloned/edited in `/sandbox → Repairs` (governed).

## Contingency Policy
- **Base contingency by Repair Class** (CEO defaults; policy-tunable via sandbox knobs):
  - Light: 10%
  - Medium: 15%
  - Heavy: 20%
  - Structural: 25%+
- **Additional contingencies applied when**:
  - Bids missing/incomplete.
  - Heavy/structural scope, unusual/luxury materials.
  - Flood zones / 50% Rule risk, SIRS/milestone/condo risks, known unknowns.
- **Combining rules**:
  - Additive until a policy cap (CEO default cap: 30–35% total for structural); sandbox knobs should host precise caps.
  - Evidence reduces contingency; missing evidence increases it.
- **Impact**: Contingency inflates total repairs → reduces MAO, tightens spread, raises Respect Floor/Buyer Ceiling clamp pressure, and can trigger risk/evidence Watch states.

## Evidence Requirements & Standards
- **Quick Estimate acceptable when**: Cosmetic/small scope, low ARV, favorable Market Temp, early triage; evidence: photos/basic scope.
- **Full scope/bids required when**: High ARV, structural/foundation issues, Flood 50% risk, condo SIRS/milestone, luxury specs.
- **Artifacts**: Bids, scopes, photos, inspections, engineering reports; stored in evidence tables; freshness surfaced in Evidence/Risk cards.
- **Risk linkage**: Flood/50% Rule, insurability, condo/warrantability gates; unresolved risks keep workflow_state at NeedsReview/NeedsInfo.
- **Trace/KPIs**: Trace shows repair totals and placeholders; KPIs on `/overview` (Guardrails/Strategy/Repairs context) consume saved runs, not UI math.

## Impact on Valuation, Risk, and Strategy
- **Valuation**: Repairs feed AIV/ARV modeling and drive Buyer Ceiling and Respect Floor/MAO clamps.
- **Risk gates**: Large/structural repairs may trigger Flood 50% evaluation; uninsurable conditions surface in risk gates; missing evidence downgrades confidence.
- **Strategy**: Higher repairs + slower Market Temp → bias to cash/wholesale; wholetail/list only when insurable, carry acceptable, and spreads meet policy.
- **Propagation**: Changes in repairs update runs → `/overview` cards, `/underwrite` strategy, and scenario examples; runs/trace remain source of truth.

## Cross-References & Glossary
- Glossary: Big 5, Repair Class, Quick Estimate, Repairs Contingency, Respect Floor, Market Temp, Flood 50% Rule.
- Related docs:
  - `docs/domain/wholesale-underwriting-handbook.md` (spreads/exits).
  - `docs/domain/timeline-and-carry-policy.md` (carry/DTM impact from heavy repairs).
  - `docs/domain/risk-gates-and-compliance.md` (Flood 50%, condo, insurability links).
  - `docs/dashboard/kpi-inventory.md` (Repairs/MAO KPIs).
