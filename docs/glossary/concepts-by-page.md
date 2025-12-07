---
doc_id: "glossary.concepts-by-page"
category: "glossary"
audience: ["ai-assistant", "engineer", "product", "underwriter"]
trust_tier: 1
summary: "Maps UI labels/components to glossary keys and source docs to keep terminology consistent across routes."
---

# Glossary Concepts by Page — HPS DealEngine

## Purpose
- Map UI labels/components to canonical glossary keys and deeper docs so devs, PM/UX, and AI agents can resolve “what does this mean?” fast.
- Keep UI copy, tooltips (`helpKey`), engine contracts, and domain handbooks consistent.
- Serve as the update checklist when adding/renaming KPIs or labels on any primary route.

## How to Use This Doc
- **Devs/PM/UX:** When adding or renaming a label, ensure there is a glossary key in `apps/hps-dealengine/lib/glossary.ts`, an entry in `docs/glossary/terms.md`, and a row in the relevant page table below.
- **AI/Assistants:** Look up the UI label → glossary key → read the referenced docs (domain/engine/dashboard) before answering.
- **Canon:** Definitions live in `docs/glossary/terms.md` and `apps/hps-dealengine/lib/glossary.ts`; formulas/logic live in domain + engine docs.

---

## /dashboard (formerly /overview)
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| Spread / Required Spread | spread_ladder | Profit/Guardrails | Core profit KPI vs min spread | glossary:terms, dashboard:kpi-inventory, domain:wholesale-underwriting-handbook, engine:trace-anatomy (SPREAD_LADDER) |
| Respect Floor | respect_floor | Floors | Lowest acceptable offer | glossary:terms, domain:wholesale-underwriting-handbook, engine:analyze-contracts |
| Investor Floor | investor_floor | Floors | Investor-required minimum | glossary:terms, domain:wholesale-underwriting-handbook |
| Payoff Floor | payoff_floor | Floors | Debt + essentials minimum | glossary:terms, domain:risk-gates-and-compliance |
| Buyer Ceiling | buyer_ceiling | Ceilings | Buyer max price by track | glossary:terms, dashboard:kpi-inventory |
| MAO (Max Allowable Offer) | mao | Offer | Recommended offer cap | glossary:terms, dashboard:kpi-inventory, engine:analyze-contracts |
| Assignment Fee / Wholesale Fee | assignment_fee | Profit | Wholesale revenue component | glossary:terms, domain:wholesale-underwriting-handbook |
| DTM (Days-to-Money) | dtm | Timeline | Urgency/timeline KPI | glossary:terms, domain:timeline-and-carry-policy, engine:trace-anatomy (TIMELINE_SUMMARY) |
| Carry Months | carry_months | Timeline/Costs | Holding cost duration | glossary:terms, domain:timeline-and-carry-policy |
| Urgency Band | zip_speed_band / dtm | Timeline/Strategy | Speed band for strategy | glossary:terms, domain:timeline-and-carry-policy |
| Market Temp / ZIP Speed Band | zip_speed_band | Market Intelligence | Market speed state | glossary:terms, domain:market-temp-methodology |
| Confidence Grade | confidence_grade | Risk/Evidence | Overall quality signal | glossary:terms, dashboard:kpi-stories |
| Risk Gates | risk_gate | Risk/Compliance | Pass/Watch/Fail gates | glossary:terms, domain:risk-gates-and-compliance |
| Evidence Freshness | evidence_freshness | Evidence | Stale/missing evidence status | glossary:terms, domain:risk-gates-and-compliance |
| Uninsurable flag | uninsurable | Risk/Insurance | Insurance feasibility | glossary:terms, domain:risk-gates-and-compliance |
| FHA 90-Day Rule | fha_90_day_rule | Risk/Compliance | Flip timing constraint | glossary:terms, domain:risk-gates-and-compliance |
| FEMA 50% Rule | fema_50_percent_rule | Risk/Flood | Structural/flood cap | glossary:terms, domain:risk-gates-and-compliance |
| FIRPTA | firpta | Risk/Tax | Withholding impact | glossary:terms, domain:risk-gates-and-compliance |
| PACE Assessment | pace_assessment | Risk/Liens | Special lien handling | glossary:terms, domain:risk-gates-and-compliance |
| Condo SIRS/Milestone | condo_sirs_milestone | Risk/Condo | Structural review risk | glossary:terms, domain:risk-gates-and-compliance |
| SCRA Verification | scra_verification | Risk/Legal | Protected seller timing | glossary:terms, domain:risk-gates-and-compliance |
| Posture (Conservative/Base/Aggressive) | sandbox_posture | Strategy/Policy | Global risk dial | glossary:terms, engine:knobs-and-sandbox-mapping |
| Sandbox Preset | sandbox_preset | Sandbox | Saved knob bundle | glossary:terms, engine:knobs-and-sandbox-mapping |

## /underwrite
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| ARV | arv | Valuation | Primary valuation anchor | glossary:terms, domain:wholesale-underwriting-handbook |
| AIV | aiv | Valuation | Current condition value | glossary:terms, domain:wholesale-underwriting-handbook |
| AIV Safety Cap | aiv_safety_cap | Valuation/Policy | Clamp on optimistic as-is | glossary:terms, engine:knobs-and-sandbox-mapping |
| Repair Class | repair_class | Repairs | Drives contingency/PSF | glossary:terms, domain:repairs-and-contingency-model |
| QuickEstimate (PSF) | quick_estimate / psf | Repairs | Fast triage estimate | glossary:terms, domain:repairs-and-contingency-model |
| Big 5 Repairs | big5_repairs | Repairs | Major systems add-ons | glossary:terms, domain:repairs-and-contingency-model |
| Repairs Contingency | repairs_contingency | Repairs/Contingency | Buffer for unknowns | glossary:terms, domain:repairs-and-contingency-model |
| Spread / Min Spread | spread_ladder / min_spread_by_arv_band | Profit | Guardrail vs policy | glossary:terms, domain:wholesale-underwriting-handbook |
| Cash Gate | cash_gate | Strategy/Guardrail | Cash presentation eligibility | glossary:terms, engine:trace-anatomy (CASH_GATE) |
| Buyer Ceiling / MAO bundle | buyer_ceiling / mao | Offer/Guardrail | Offer band | glossary:terms, engine:analyze-contracts |
| DTM / Urgency | dtm | Timeline | Speed requirement | glossary:terms, domain:timeline-and-carry-policy |
| Carry Months | carry_months | Timeline/Costs | Holding cost model | glossary:terms |
| Confidence Grade | confidence_grade | Risk/Evidence | Quality of run | glossary:terms, dashboard:kpi-stories |
| Risk Gates & Evidence prompts | risk_gate / evidence_freshness | Risk/Evidence | Blocks/Watch before ReadyForOffer | glossary:terms, domain:risk-gates-and-compliance |
| Workflow State (ReadyForOffer, Hold, Kill) | workflow_state | Workflow | Run readiness | glossary:terms, app:underwrite-flow |
| Posture / Sandbox options | sandbox_posture / sandbox_preset | Sandbox | Scenario toggles | glossary:terms, engine:knobs-and-sandbox-mapping |

## /repairs
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| QuickEstimate (PSF) | quick_estimate / psf | Repairs | Triage repair estimate | glossary:terms, domain:repairs-and-contingency-model |
| Repair Class | repair_class | Repairs | Sets contingency and PSF tier | glossary:terms |
| Big 5 (roof, HVAC, repipe, electrical, foundation) | big5_repairs | Repairs | Major cost drivers | glossary:terms |
| Line-Item Estimator categories | psf / big5_repairs | Repairs | Detailed rehab scope | glossary:terms |
| Repairs Contingency | repairs_contingency | Repairs/Contingency | Unknowns buffer | glossary:terms |
| Active Repair Profile (market/posture/as-of) | sandbox_posture (context) | Sandbox/Repairs | Rate source metadata | glossary:terms, engine:knobs-and-sandbox-mapping |

## /trace
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| SPREAD_LADDER frame | spread_ladder | Profit | Shows band thresholds | glossary:terms, engine:trace-anatomy |
| CASH_GATE frame | cash_gate | Strategy/Guardrail | Cash eligibility | glossary:terms |
| RESPECT_FLOOR / floors frames | respect_floor / investor_floor / payoff_floor | Floors | Offer lower bounds | glossary:terms |
| BUYER_CEILING / ceilings frames | buyer_ceiling | Ceilings | Top of range | glossary:terms |
| TIMELINE_SUMMARY frame | dtm / carry_months / zip_speed_band | Timeline/Market | Speed and carry drivers | glossary:terms |
| RISK_GATES frame | risk_gate | Risk/Compliance | Pass/Watch/Fail rationale | glossary:terms |
| EVIDENCE_FRESHNESS frame | evidence_freshness | Evidence | Staleness/missing info | glossary:terms |
| MARKET_TEMP / ZIP speed frames | zip_speed_band | Market | Market speed inputs | glossary:terms, domain:market-temp-methodology |

## /sandbox
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| Posture selector | sandbox_posture | Policy/Sandbox | Global risk knob | glossary:terms, engine:knobs-and-sandbox-mapping |
| Sandbox Preset | sandbox_preset | Policy/Sandbox | Saved knob bundle | glossary:terms |
| Min Spread by ARV Band | min_spread_by_arv_band | Profit/Policy | Underlying spread ladder | glossary:terms, domain:wholesale-underwriting-handbook |
| AIV Safety Cap | aiv_safety_cap | Valuation/Policy | Clamp optimistic AIV | glossary:terms |
| Assignment Fee knobs | assignment_fee | Profit | Wholesale fee policy | glossary:terms |
| Risk/Compliance gates (FHA, FIRPTA, PACE, Flood 50, SCRA, Condo SIRS) | fha_90_day_rule / firpta / pace_assessment / fema_50_percent_rule / scra_verification / condo_sirs_milestone | Risk/Compliance | Gate settings | glossary:terms, domain:risk-gates-and-compliance |
| Repairs contingency knobs | repairs_contingency / repair_class | Repairs/Contingency | Buffer settings | glossary:terms, domain:repairs-and-contingency-model |

## /settings
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| Underwriting posture defaults | sandbox_posture | Policy | Default risk dial | glossary:terms |
| Presets management | sandbox_preset | Policy/Sandbox | Shareable configs | glossary:terms |
| Confidence rubric (A/B/C) | confidence_grade | Risk/Evidence | Quality criteria | glossary:terms, dashboard:kpi-stories |
| Evidence freshness thresholds | evidence_freshness | Evidence | Staleness rules | glossary:terms, domain:risk-gates-and-compliance |

## /deals
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| Deal Status / Workflow | workflow_state | Workflow | Where deal is in lifecycle | glossary:terms, product:end-to-end-deal-lifecycle |
| Posture badge | sandbox_posture | Strategy/Policy | Indicates risk posture | glossary:terms |
| Market Temp badge (if shown) | zip_speed_band | Market | Quick market speed cue | glossary:terms |

## /runs and /sources
| UI label / Component | Glossary key | Category | Why it matters | Primary docs |
| --- | --- | --- | --- | --- |
| Run status (ReadyForOffer/Hold/Kill) | workflow_state | Workflow | Run readiness | glossary:terms, app:underwrite-flow |
| Confidence Grade | confidence_grade | Risk/Evidence | Run quality | glossary:terms |
| Posture | sandbox_posture | Policy | Scenario context | glossary:terms |
| Source type (lead/source metadata) | evidence_freshness / risk_gate (context) | Evidence/Risk | Upstream data quality | glossary:terms |

## Conventions & Maintenance
- Every non-obvious KPI/label on `/dashboard`, `/underwrite`, `/repairs`, `/trace`, `/sandbox`, `/settings`, `/deals`, `/runs`, `/sources` must appear here with a glossary key.
- Tooltip/help icons should reference `GlossaryKey` values that exist both in `apps/hps-dealengine/lib/glossary.ts` and `docs/glossary/terms.md`.
- When adding a new UI metric:
  - Add/confirm a `GlossaryKey` in `glossary.ts`.
  - Add definition in `docs/glossary/terms.md`.
  - Add mapping row in this file and, if relevant, `docs/dashboard/kpi-inventory.md` and `docs/dashboard/kpi-stories.md`.
- Keep route names current: primary view is `/dashboard` (formerly `/overview`).
