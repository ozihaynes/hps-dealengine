---
doc_id: "playbooks.user-faq"
category: "playbooks"
audience: ["ai-assistant", "underwriter", "product", "ops"]
trust_tier: 2
summary: "Operational FAQ mapped to routes, KPIs, risk gates, and evidence so support and AI can answer consistently."
---

# User FAQ — HPS DealEngine

This FAQ is for power users, support/ops, and AI assistants. Answers are grounded in DealEngine outputs (Respect Floor, Buyer Ceiling, spread ladder, DTM, risk gates, evidence) and current routes (`/dashboard`, `/underwrite`, `/repairs`, `/trace`, `/sandbox`, `/deals`, `/runs`, `/sources`, `/settings`).

## Valuation & Spread

### Q: Why is my wholesale spread flagged as “Below Minimum”?
**Short answer:** The spread is under the required band from the spread ladder for your ARV range, so Guardrails shows yellow/red.
**Where to look in the app:** Dashboard → Guardrails & Profit card (Spread vs Min); Underwrite → Guardrails; Trace → SPREAD_LADDER frame.
**Likely causes:**
- ARV lowered or AIV capped; Market Temp adjusted ceilings.
- Repairs increased (Big 5/line items) or contingency raised.
- Payoff higher than expected, shrinking Respect Floor-to-Ceiling band.
- Posture = Conservative or sandbox knobs tighten spreads.
**When to escalate / override:** Only if policy allows governed override and you have justification (e.g., verified lower repairs). Otherwise, renegotiate price or pass.
**Related docs & terms:** ../dashboard/kpi-inventory.md, ../domain/wholesale-underwriting-handbook.md, ../engine/trace-anatomy.md (SPREAD_LADDER), ../glossary/terms.md (Spread, Respect Floor).

### Q: Why did DealEngine pick this MAO instead of my “70% rule” number?
**Short answer:** MAO is policy- and evidence-driven (floors, ceilings, spreads, timeline, risk), not a flat 70% rule.
**Where to look in the app:** Dashboard → Strategy/Guardrails; Underwrite → MAO bundle; Trace → MAO/ceiling/floor frames.
**Likely causes:**
- Required spread ladder differs from 70% rule; assignment fee and costs modeled explicitly.
- Market Temp / carry months adjust required margin.
- Respect Floor or Buyer Ceiling clamped the band.
**When to escalate / override:** If inputs are wrong (ARV, repairs, payoff), fix and re-run. Don’t override MAO to fit a heuristic.
**Related docs & terms:** ../domain/wholesale-underwriting-handbook.md, ../engine/analyze-contracts.md, ../glossary/terms.md (MAO, Buyer Ceiling, Respect Floor).

### Q: Why is Respect Floor higher than I expected?
**Short answer:** Respect Floor = max(Investor Floor, Payoff Floor + essentials). High payoff or higher required margin can push it up.
**Where to look:** Dashboard → Guardrails; Underwrite → Guardrails; Trace → RESPECT_FLOOR.
**Likely causes:**
- Payoff letter shows more debt/fees.
- Repairs/carry higher, raising investor floor.
- Posture or policy knobs tightening margins.
**When to escalate:** Verify payoff and essentials; if correct, price must respect the floor or the deal is a pass.
**Related docs:** ../glossary/terms.md (Respect Floor, Payoff Floor, Investor Floor), ../domain/wholesale-underwriting-handbook.md.

## Repairs & Contingency

### Q: Why did my repairs jump after adding Big 5 or line items?
**Short answer:** Big 5 add-ons and detailed line items stack on top of QuickEstimate; policy contingency may increase with heavier scope.
**Where to look:** Underwrite → Repairs; Repairs tab → QuickEstimate/Big 5/Line items; Dashboard → Guardrails/Profit impact.
**Likely causes:**
- Big 5 toggled to replace/repair major systems.
- Added line items in Systems/Structural.
- Higher repair class triggered higher contingency.
**When to escalate:** If rates look wrong, confirm active repair profile; otherwise accept the higher total or revise scope.
**Related docs:** ../domain/repairs-and-contingency-model.md, ../engine/knobs-and-sandbox-mapping.md, ../glossary/terms.md (Big 5, Repair Class, Repairs Contingency).

### Q: When is QuickEstimate enough vs needing full bids?
**Short answer:** QuickEstimate is fine for triage/light cosmetic; heavy/structural/flood/condo or high ARV requires bids/photos for confidence and risk gates.
**Where to look:** Repairs tab; Dashboard → Evidence; Underwrite → Evidence prompts.
**Likely causes for “need more”:**
- Structural, flood, condo SIRS, or high ARV band.
- Confidence Grade capped by missing bids/photos.
**When to escalate:** For IC/ReadyForOffer on heavy or special cases, collect at least one bid and Big 5 photos.
**Related docs:** ../domain/repairs-and-contingency-model.md, ../domain/risk-gates-and-compliance.md, ../glossary/terms.md (Evidence, Confidence Grade).

### Q: Why is contingency so high?
**Short answer:** Repair class, structural/flood risk, or missing evidence can raise contingency per policy knobs.
**Where to look:** Repairs tab → contingency note; Underwrite → Repairs summary; Dashboard → Guardrails.
**Likely causes:**
- Repair class = Heavy/Structural.
- Evidence gaps (no bids/photos) adding buffer.
- Sandbox/policy contingency knobs for risky scopes.
**When to escalate:** Provide bids/photos to reduce buffer; if still high, accept or pass—don’t remove contingency to fit price.
**Related docs:** ../domain/repairs-and-contingency-model.md, ../engine/knobs-and-sandbox-mapping.md.

## Profit & Disposition

### Q: How does DealEngine choose Cash vs Wholesale vs Wholetail vs List?
**Short answer:** Strategy is based on spreads, floors/ceilings, Market Temp, risk gates, and DTM. When retail upside is higher and risk allows, it may recommend wholetail/list; tight timelines or spreads favor cash/wholesale.
**Where to look:** Dashboard → Strategy card; Trace → strategy/MAO frames; Underwrite → strategy section.
**Likely causes of strategy shifts:**
- Market Temp hot → list/wholetail; cold/urgent → cash/wholesale.
- Risk gates (FHA/condo/flood) limiting retail exits.
- Spread and Buyer Ceiling for each track.
**When to escalate:** If strategy conflicts with business intent, check inputs; otherwise follow recommended track or document rationale.
**Related docs:** ../dashboard/kpi-stories.md, ../domain/wholesale-underwriting-handbook.md, ../domain/market-temp-methodology.md.

### Q: Why is my assignment fee capped or lower than expected?
**Short answer:** Policy caps, spread ladder, or local investor discounts limit fee to keep end-buyer economics viable.
**Where to look:** Dashboard → Guardrails/Profit; Underwrite → outputs; Trace → SPREAD_LADDER.
**Likely causes:**
- Spread only slightly above minimum.
- Market Temp slow or higher carry, reducing buyer room.
- Org-specific fee caps.
**When to escalate:** Only if input errors; otherwise adjust price/terms—don’t force higher fee beyond policy.
**Related docs:** ../domain/wholesale-underwriting-handbook.md, ../engine/knobs-and-sandbox-mapping.md, ../glossary/terms.md (Assignment Fee).

## Risk & Compliance

### Q: Why is the risk card still Watch/Fail when the deal seems fine?
**Short answer:** One or more risk gates remain Watch/Fail (e.g., flood 50%, uninsurable, payoff unknown, condo SIRS, PACE/UCC, FIRPTA, FHA 90-day) until evidence or mitigation is provided.
**Where to look:** Dashboard → Risk & Compliance; Trace → RISK_GATES; Underwrite → risk banners.
**Likely causes:**
- Missing docs (payoff, insurance quote, HOA/engineer reports).
- Structural/flood/condo flags.
- FIRPTA/SCRA status not cleared.
**When to escalate:** Hard Fail = do not proceed without governed override; Watch = gather evidence then re-run.
**Related docs:** ../domain/risk-gates-and-compliance.md, ../glossary/terms.md (Risk Gate, uninsurable, fema_50_percent_rule, pace_assessment, condo_sirs_milestone).

### Q: What do FHA 90-Day or Flood 50% warnings mean for my offer?
**Short answer:** They signal compliance/timing constraints that can block retail exits or require elevation/structural mitigation; they affect price, timeline, and feasibility.
**Where to look:** Dashboard → Risk; Trace → RISK_GATES; Underwrite → risk flags.
**Likely causes:**
- Resale within 90 days for FHA/VA retail.
- Rehab >50% of improvement value in flood zone.
**When to escalate:** Engage compliance/title/insurance; often a price cut or pass is required.
**Related docs:** ../domain/risk-gates-and-compliance.md, ../glossary/terms.md (fha_90_day_rule, fema_50_percent_rule).

### Q: Why can’t I mark this deal ReadyForOffer?
**Short answer:** Required gates/evidence aren’t cleared: Fail gates, missing payoff/title/insurance/repairs evidence, or spread/timeline below policy.
**Where to look:** Dashboard → Risk/Evidence & Guardrails; Underwrite → workflow state; Trace → RISK_GATES, EVIDENCE_FRESHNESS, SPREAD_LADDER, TIMELINE_SUMMARY.
**Likely causes:**
- Fail gates unresolved.
- Evidence Freshness red (payoff/title stale/missing).
- Spread below min or DTM too long/urgent without plan.
**When to escalate:** Resolve inputs or accept it’s a pass; governed override only if policy permits.
**Related docs:** ../app/underwrite-flow.md, ../domain/risk-gates-and-compliance.md.

## Timeline & Urgency

### Q: Where does DTM come from and why is it high/low?
**Short answer:** DTM (Days-to-Money) is from timeline_summary: close timeline + buffers (auction/board/inspection). Market Temp and risk can add buffers.
**Where to look:** Dashboard → Timeline & Carry; Trace → TIMELINE_SUMMARY; Underwrite → timeline section.
**Likely causes of high DTM:**
- Auction/board approvals; slow Market Temp; condo/insurance delays.
- Carry months capped up by policy.
**When to escalate:** If DTM makes spread unworkable, adjust track to cash/wholesale or pass.
**Related docs:** ../domain/timeline-and-carry-policy.md, ../glossary/terms.md (DTM, Carry Months).

### Q: What does “Emergency” or “Critical” urgency change?
**Short answer:** It indicates very short runway; strategy shifts to cash/fast close, concessions may tighten, and risk of failure rises.
**Where to look:** Dashboard → Timeline; Trace → TIMELINE_SUMMARY; Underwrite → timeline inputs.
**Likely causes:**
- Auction in ≤~14 days; severe title/condo delays conflicting with timeline.
- Cold market with long DOM/MOI plus near-term deadline.
**When to escalate:** Only proceed with pre-wired buyers; otherwise, likely pass.
**Related docs:** ../domain/timeline-and-carry-policy.md, ../dashboard/kpi-stories.md.

## Evidence & Freshness

### Q: Why is my confidence grade stuck at C?
**Short answer:** Evidence freshness/completeness and/or risk gates are dragging confidence down.
**Where to look:** Dashboard → Evidence/Confidence; Underwrite → evidence prompts; Trace → EVIDENCE_FRESHNESS, RISK_GATES.
**Likely causes:**
- Payoff/title/insurance stale or missing.
- No bids/photos for repairs; thin comps.
- Watch/Fails on risk gates.
**When to escalate:** Upload required docs; if risk remains, accept B/C or pass.
**Related docs:** ../glossary/terms.md (Confidence Grade, Evidence), ../domain/risk-gates-and-compliance.md.

### Q: What does “Evidence stale” mean and what do I need?
**Short answer:** Critical docs are older than policy thresholds (e.g., payoff/title >30–90 days, old photos/bids), so evidence freshness is yellow/red.
**Where to look:** Dashboard → Evidence; Underwrite → evidence prompts; Trace → EVIDENCE_FRESHNESS.
**Likely causes:**
- Old payoff, title search, insurance quote, or repair bids/photos.
**When to escalate:** Refresh the stale item; ReadyForOffer waits for green on critical evidence.
**Related docs:** ../domain/risk-gates-and-compliance.md, ../glossary/terms.md (Evidence Freshness).

## AI Behavior

### Q: Why won’t the AI give me a final MAO number?
**Short answer:** AI is an analyst/strategist, not a calculator; MAO comes from the engine. AI will point you to the MAO already in outputs and explain it.
**Where to look:** Dashboard → Strategy/Guardrails; Underwrite → MAO; Trace → MAO/floors/ceilings frames.
**Related docs:** ../engine/analyze-contracts.md, ../glossary/terms.md (MAO), any AI assistant guide.

### Q: Why does AI keep asking for more evidence?
**Short answer:** Evidence Freshness or Confidence Grade is low; AI is following policy to avoid decisions with stale/missing docs.
**Where to look:** Dashboard → Evidence/Confidence; Trace → EVIDENCE_FRESHNESS, RISK_GATES.
**Related docs:** ../domain/risk-gates-and-compliance.md, ../glossary/terms.md (Evidence, Confidence Grade).

### Q: Can AI override risk gates or policy knobs?
**Short answer:** No. AI cannot bypass Fail gates or change knobs; it can only explain and suggest next steps or evidence to collect.
**Where to look:** Risk card and Trace; policies in risk-gates doc.
**Related docs:** ../domain/risk-gates-and-compliance.md, any AI behavior guide.

## Operations & Errors

### Q: What do I do if v1-analyze fails or times out?
**Short answer:** Re-run after checking inputs; ensure required fields (deal, posture, market, repairs, payoff) exist. If persistent, capture error and notify ops.
**Where to look:** Underwrite → run status; logs if exposed.
**Likely causes:**
- Missing required fields or malformed payload.
- Network/service hiccup.
**Escalate:** Share deal ID/org, payload snapshot, and timestamp with support/engineering.
**Related docs:** ../engine/analyze-contracts.md.

### Q: Why am I seeing RLS/permission errors on deals/runs?
**Short answer:** Access is org-scoped; your JWT/membership doesn’t cover that deal/run.
**Where to look:** Deals/Runs list; auth context.
**Escalate:** Confirm you’re in the right org; contact admin to adjust membership.
**Related docs:** ../engine/architecture-overview.md (RLS expectations), ../app/routes-overview.md.

### Q: How do I report a suspected data bug or bad result?
**Short answer:** Note deal ID, run ID, org, inputs (ARV, repairs, payoff), outputs (MAO, spread), and trace frames that look wrong; file to support/engineering.
**Where to look:** Trace (frames), Dashboard/Underwrite outputs.
**Related docs:** ../engine/trace-anatomy.md, ../engine/analyze-contracts.md.
