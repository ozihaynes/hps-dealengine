---
doc_id: "app.overview-layout-map"
category: "app"
audience: ["ai-assistant", "engineer", "product", "underwriter"]
trust_tier: 1
summary: "Describes the current /dashboard layout, regions, and KPIs/cards with links to trace and domain sources."
---

# Dashboard Layout Map (/dashboard — formerly “Overview”)

## Purpose
- Map the current Dashboard (/dashboard) layout so devs, product, and AI can find the right KPIs/cards fast and understand decision priority.
- Aligns with `docs/dashboard/kpi-inventory.md` (formulas), `docs/dashboard/kpi-stories.md` (narratives), engine contracts/trace, and domain docs.
- Describes what exists now (Dashboard is the primary view; “Overview” is legacy naming only).

## Layout Regions (Desktop Order)
1) **Top Hero Band (Deal Health & Core KPIs)**
   - Badges: Workflow (Ready/Review/Info), Risk (Pass/Watch/Fail), Evidence (Fresh/Thin/Missing), Confidence (A/B/C).
   - Core KPIs: Spread/Fee, MAO/Primary Track, Respect Floor/Buyer Ceiling context, Market Temp gauge (if surfaced), selected exit track.
   - Components: `TopDealKpis`, hero badges (from `workflow_state`, `risk_summary`, `evidence_summary`, `confidence_grade`).
2) **Guardrails & Profit**
   - Cards: `GuardrailsCard` (Respect Floor, Buyer Ceiling, MAO clamps, spreads, cash gate), `DealStructureChart`/profit view if present.
   - Focus: floors/ceilings, spread ladder, cash gate, borderline tightness.
3) **Strategy & Posture**
   - Cards: Strategy/Track recommendation (primary offer), posture context, KnobFamilySummary (policy posture snippet).
   - Focus: primary exit track, workflow state, confidence, posture cues.
4) **Timeline & Carry**
   - Card: `TimelineCarryCard` (DTM, urgency band, carry months, hold monthly/total).
   - Focus: speed/urgency and carrying cost expectations.
5) **Risk & Compliance**
   - Card: `RiskComplianceCard` (risk gates status per gate + overall).
   - Focus: title/insurance/flood/condo/FHA/pace/ucc/firpta/scras/bankruptcy gates.
6) **Data & Evidence**
   - Card: `DataEvidenceCard` (freshness/completeness by kind, infoNeeded).
   - Focus: what evidence is missing/stale.
7) **Market Temp / Market Intelligence**
   - Card: `MarketTempGauge` (DOM/MOI band Hot/Warm/Neutral/Cool).
   - Focus: market speed context feeding carry/urgency.
8) **Extras / Context**
   - Cards: `KnobFamilySummary` (policy family hints), any playbook/AI strategist hooks if enabled.

## Per-Region Mapping
| Region | Key cards / KPIs | Trace frames / outputs | Primary question answered |
| --- | --- | --- | --- |
| Top Hero Band | Badges (workflow, risk, evidence, confidence); Spread/MAO/track; Market Temp gauge | `workflow_state`, `risk_summary`/`RISK_GATES`, `evidence_summary`/`EVIDENCE_FRESHNESS`, `confidence_grade`; MAO/spreads; `SPEED_BAND_POLICY` | “Overall health—are we ready to offer and what’s the headline spread/track?” |
| Guardrails & Profit | GuardrailsCard, DealStructure/Profit | `RESPECT_FLOOR`, `BUYER_CEILING`, `MAO_CLAMP`, `SPREAD_LADDER`, `CASH_GATE`, ladder bands | “Are we inside floors/ceilings and making enough spread/fee?” |
| Strategy & Posture | Strategy recommendation, posture/policy snippet | `STRATEGY_RECOMMENDATION`, `WORKFLOW_DECISION`, confidence frame | “Which exit track should we run now, under which posture?” |
| Timeline & Carry | TimelineCarryCard | `TIMELINE_SUMMARY`, `DTM_URGENCY`, `CARRY_MONTHS_POLICY` | “How fast and how expensive is the hold?” |
| Risk & Compliance | RiskComplianceCard | `RISK_GATES` (per-gate) | “Are any gates blocking us?” |
| Data & Evidence | DataEvidenceCard | `EVIDENCE_FRESHNESS`, `infoNeeded` | “What evidence is missing/stale?” |
| Market Temp | MarketTempGauge | `SPEED_BAND_POLICY`/Market Temp outputs | “How fast is this market?” |
| Extras | KnobFamilySummary, strategist/playbook (if enabled) | Policy posture metadata; AI outputs when enabled | “Policy context and advisory hooks.” |

## Responsive Behavior (Grounded in current grid patterns)
- Desktop (md/lg/xl): Grid layout with multiple columns; hero band spans full width/top; sections laid out in 2–3 columns depending on breakpoint (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3` patterns).
- Tablet: Cards stack into 1–2 columns; hero band remains top; Market Temp/Risk/Evidence typically drop below Guardrails/Strategy.
- Mobile: Single-column stacking in route order above; hero badges and core KPIs first; cards collapse/stack vertically; no cards are intentionally hidden—content is reordered by grid stacking.

## Navigation & Deep Linking
- Dashboard is the hub for decision readout; deep edits happen elsewhere:
  - `/underwrite` to change inputs/policy posture for the run.
  - `/repairs` to refine repair scope/profile.
  - `/trace` to inspect detailed “why” (frames).
  - `/sandbox` for policy/sandbox tuning (governed).
- Common question → where to look:
  | Question | Region/Card | Key fields/frames |
  | --- | --- | --- |
  | “Can we safely make a cash offer?” | Guardrails & Profit / GuardrailsCard | `RESPECT_FLOOR`, `BUYER_CEILING`, `SPREAD_LADDER`, `CASH_GATE` |
  | “Why is risk flagged Watch/Fail?” | Risk & Compliance | `RISK_GATES` (per gate) |
  | “What’s driving DTM/carry?” | Timeline & Carry | `TIMELINE_SUMMARY`, `DTM_URGENCY`, `CARRY_MONTHS_POLICY` |
  | “What evidence is missing?” | Data & Evidence | `EVIDENCE_FRESHNESS`, `infoNeeded` |
  | “How fast is this market?” | Market Temp | `SPEED_BAND_POLICY`/Market Temp output |

## Cross-References
- KPIs & narratives: `docs/dashboard/kpi-inventory.md`, `docs/dashboard/kpi-stories.md`
- Routes: `docs/app/routes-overview.md`
- Engine/Trace: `docs/engine/analyze-contracts.md`, `docs/engine/trace-anatomy.md`
- Domain: `docs/domain/wholesale-underwriting-handbook.md`, `docs/domain/risk-gates-and-compliance.md`, `docs/domain/timeline-and-carry-policy.md`, `docs/domain/repairs-and-contingency-model.md`, `docs/domain/market-temp-methodology.md`
- Glossary: `docs/glossary/terms.md`

## CEO Assumptions (if repo is silent)
- Market Temp gauge uses Hot/Warm/Neutral/Cool bands from domain doc; adjust if UI labels differ.
- Responsive behavior inferred from typical grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) used across pages; if custom layouts differ, update this doc to match implementation.
- “Overview” legacy path is considered historical; Dashboard (/dashboard) is the primary view.
