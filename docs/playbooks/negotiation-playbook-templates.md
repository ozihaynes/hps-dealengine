---
doc_id: "playbooks.negotiation-playbook-templates"
category: "playbooks"
audience: ["ai-assistant", "underwriter", "product"]
trust_tier: 2
summary: "Reusable negotiation templates grounded in DealEngine guardrails, KPIs, risk gates, and evidence expectations."
---

# Negotiation Playbook Templates — HPS DealEngine

## Purpose & Scope
- Reusable negotiation templates grounded in DealEngine outputs (Respect Floor, Buyer Ceiling, spread ladder, payoff, DTM, risk gates, evidence, confidence).
- Ensure consistent, compliant seller conversations for humans and AI; no hype, no math outside the engine.
- Aligns with product vision (engine-first, deterministic), underwriting/risk policies, and Dashboard/Underwrite flows.

## How to Use (Humans & AI)
- **Humans:** Pick the template that matches the deal pattern (spread/risk/timeline/payoff) and fill in the live KPIs from `/dashboard` and `/underwrite` (Respect Floor, Buyer Ceiling, spread, DTM, risk gates, evidence status).
- **AI:** Select template by KPIs and risk gates; populate numbers from AnalyzeOutput and trace; do not alter guardrail language or override hard fails.
- **Canon:** Definitions in `docs/glossary/terms.md` and `apps/hps-dealengine/lib/glossary.ts`; formulas/logic in domain + engine docs (`docs/dashboard/kpi-inventory.md`, `docs/domain/wholesale-underwriting-handbook.md`, `docs/domain/risk-gates-and-compliance.md`, `docs/domain/timeline-and-carry-policy.md`).

## Shared Template Structure (per playbook)
- **When to Use:** Pattern description (spread, payoff, risk, timeline, evidence).
- **Inputs Required:** Respect Floor, Payoff Floor, Buyer Ceiling, Spread vs min spread ladder, MAO, Assignment Fee target, DTM/urgency, key risk gates, Evidence Freshness, Confidence Grade.
- **Script Outline:**
  - Opening frame (empathy + context, why we’re here).
  - Numbers explanation (tie to KPIs/trace, no invented math).
  - Options & tradeoffs (offer ladder, concessions, timelines, occupancy, cash-for-keys where applicable).
  - Close & next steps (what we need, when we reconnect).
- **Guardrails:** What not to promise; when to stop/escalate.
- **Related Docs/KPIs:** Links to glossary terms, KPI inventory/stories, underwriting, risk, timeline, repairs, market temp.

## Template Catalog

### 1) First Offer — Starting from Respect Floor
- **When to Use:** Spread meets/clears minimum; gates Pass; Confidence A/B; Market Temp warm/neutral; standard wholesale/assignment.
- **Inputs Required:** Respect Floor, Buyer Ceiling, MAO, Spread vs min, Assignment Fee target, DTM (Normal), Confidence Grade, Market Temp.
- **Script (example text):**
  - **Opening:** “Thanks for your time. We reviewed the property, the current payoff, and what it will take to get it market-ready.”
  - **Numbers:** “Based on the repairs and today’s payoff, our safe range is between [Respect Floor] and [Buyer Ceiling]. To stay responsible, our recommended offer is [MAO or offer] which respects your payoff and keeps us inside our required spread.”
  - **Options/Tradeoffs:** “We can keep closing on your timeline — current estimate is about [DTM] days. If you need a specific date, we can explore that as long as we stay inside that range.”
  - **Close:** “If this range works, we can send paperwork today. If you need something different, let’s discuss timing or small credits, but we can’t go below [Respect Floor].”
- **Guardrails:** Do not promise appraisal/inspection waivers beyond policy; no guarantees beyond engine outputs; no offers below Respect Floor.
- **Related Docs:** Glossary (Respect Floor, Buyer Ceiling, MAO), `docs/dashboard/kpi-inventory.md`, `docs/domain/wholesale-underwriting-handbook.md`, `docs/app/underwrite-flow.md`.

### 2) Tight Spread — Counter-Offer with Concessions
- **When to Use:** Spread near min ladder; CASH_GATE Pass/close; gates Pass/Watch; Confidence B; seller pushes for higher price.
- **Inputs Required:** Spread vs min spread ladder, Respect Floor, Buyer Ceiling, MAO, Assignment Fee target (may compress), DTM, any Watch gates.
- **Script:**
  - **Opening:** “We’re close, but the numbers are tight on our end.”
  - **Numbers:** “Our required spread for this price range is [min spread]; right now we’re at about [current spread], so we don’t have a lot of room above [Respect Floor].”
  - **Options/Tradeoffs:** “We can explore concessions instead of price: quicker close, flexible occupancy, smaller EMD up front, or a modest repairs credit instead of raising price. The top of our safe band is [Buyer Ceiling], and pushing above that breaks our guardrails.”
  - **Close:** “If we keep price near [target offer] and adjust terms, we can move forward. If price must go higher, it likely becomes a pass.”
- **Guardrails:** Do not exceed Buyer Ceiling; do not erode min spread; note any Watch gates that could become Fail with surprises.
- **Related Docs:** Glossary (Spread, Respect Floor, Buyer Ceiling), `docs/dashboard/kpi-stories.md` (guardrails narratives), `docs/domain/wholesale-underwriting-handbook.md`.

### 3) Payoff Shortfall / Limited Equity — Cash-for-Keys Options
- **When to Use:** Payoff + essentials near/above Respect Floor; seller net is tight; spread borderline.
- **Inputs Required:** Payoff Floor, Respect Floor, Buyer Ceiling, payoff letter status, Spread vs min, DTM, Confidence Grade, any payoff-related risk gates.
- **Script:**
  - **Opening:** “I see the payoff is about [payoff amount], and we want to make sure you’re clear of the debt respectfully.”
  - **Numbers:** “Our lowest responsible offer is [Respect Floor] because of repairs and required margin. At that number, there’s limited room for additional proceeds.”
  - **Options/Tradeoffs:** “We can structure small cash-for-keys at close, or brief post-occupancy to help the move, but price can’t rise above [Buyer Ceiling] without breaking the deal. If lender quotes change, we’ll adjust quickly.”
  - **Close:** “If you’re open to a clean, fast close at [offer near Respect Floor] with some move-out help, we can proceed. If you need meaningfully more cash, it may not be feasible.”
- **Guardrails:** Don’t promise net cash beyond what Respect Floor allows; no offers without verified payoff; avoid implying debt forgiveness.
- **Related Docs:** Glossary (Payoff Floor, Respect Floor), `docs/domain/risk-gates-and-compliance.md` (payoff evidence), `docs/dashboard/kpi-inventory.md`.

### 4) Risk / Insurance / Title Problems — “Risk Wall” Conversation
- **When to Use:** Hard/Watch gates: FEMA 50% Rule, uninsurable, PACE/UCC, condo SIRS/milestone, FIRPTA complications, severe title issues.
- **Inputs Required:** Specific risk gate statuses (Pass/Watch/Fail), Evidence Freshness, Confidence Grade, Respect Floor/Band, DTM impact if remediation needed.
- **Script:**
  - **Opening:** “We found some risk items that we’re required to handle before we can commit.”
  - **Numbers:** “Because of [gate: e.g., Flood 50% Rule / uninsurable / PACE], we cannot proceed at a normal number. Our safe range would be [reduced band if any], but it may still be a no-go without remediation.”
  - **Options/Tradeoffs:** “If you can provide [missing docs: engineer report, payoff of PACE, insurance quote], we’ll re-run quickly. Otherwise, the only path would be a significantly lower price or we may need to step back.”
  - **Close:** “These are compliance/safety rules, not preferences. If we can’t clear them, we’ll politely pass to avoid failing you later.”
- **Guardrails:** Never minimize or bypass Fail gates; no promises to “figure it out later”; involve title/insurance pros as needed; not legal/tax advice.
- **Related Docs:** Glossary (risk_gate, uninsurable, fema_50_percent_rule, pace_assessment, condo_sirs_milestone, firpta), `docs/domain/risk-gates-and-compliance.md`, `docs/engine/trace-anatomy.md`.

### 5) Walk-Away / No-Go — Professional Decline
- **When to Use:** One or more Fail gates with no mitigation; spread/timeline hopeless; auction impossibility.
- **Inputs Required:** Fail gate list, Spread vs min (red), Respect Floor vs Buyer Ceiling (inverted), DTM/urgency red, Confidence Grade low.
- **Script:**
  - **Opening:** “I appreciate the opportunity and want to be transparent.”
  - **Numbers:** “Given [fail reasons: e.g., structural + Flood 50%, or zero spread between Respect Floor and Buyer Ceiling], we can’t make a responsible offer.”
  - **Options/Tradeoffs:** “If circumstances change (documents arrive, liens cleared, timeline extended), we’ll gladly re-evaluate. For now, proceeding would risk failing you later.”
  - **Close:** “I don’t want to tie you up. If new info comes in, reach back out and we’ll re-run the numbers.”
- **Guardrails:** Be respectful; no speculative offers; avoid blaming the seller; no commitments to future pricing.
- **Related Docs:** Glossary (Respect Floor, Buyer Ceiling, risk_gate), `docs/domain/risk-gates-and-compliance.md`, `docs/dashboard/kpi-stories.md`.

## Guardrails & Compliance Notes
- Do **not** promise guaranteed close dates beyond what title/insurance allow; align with DTM/timeline outputs.
- Do **not** override hard Fail risk gates (flood 50%, uninsurable, PACE/UCC unresolved, condo SIRS without docs, FIRPTA obligations) in scripts.
- Do **not** guarantee valuations; cite engine-derived ranges (Respect Floor, Buyer Ceiling, MAO) and evidence.
- This is not legal/tax advice; escalate to attorney/CPA for FIRPTA, SCRA, complex title/estate situations.
- If risk gates = Fail or Confidence Grade low, stop and escalate; do not “talk past” policy.

## Usage & Surfacing
- **UI expectations:** Playbooks panel on `/dashboard` (Negotiation/Strategy), sidebars in `/underwrite`, future `/playbooks` route; links from trace/strategy frames.
- **AI usage:** Select template by KPIs + risk gates; fill numbers from AnalyzeOutput/trace; never change guardrail language; flag humans if a template doesn’t fit.
- **Cross-links:** glossary (`docs/glossary/terms.md`), KPI docs (`docs/dashboard/kpi-inventory.md`, `docs/dashboard/kpi-stories.md`), domain handbooks (wholesale, risk gates, timeline, repairs, market temp), engine docs (`docs/engine/analyze-contracts.md`, `docs/engine/trace-anatomy.md`).
