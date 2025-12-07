---
doc_id: "dashboard.kpi-inventory"
category: "dashboard"
audience: ["ai-assistant", "engineer", "product", "underwriter"]
trust_tier: 1
summary: "Canonical list of Dashboard KPIs with formulas, sources, dependencies, and placement; aligns UI with engine outputs and trace."
---

# Dashboard KPI Inventory — HPS DealEngine

## Purpose
- Canonical, authoritative list of Dashboard KPIs and card metrics on `/overview`.
- Ties each KPI to engine outputs, trace frames, domain policies, and UI surfaces; no UI/AI re-derivation allowed.
- Any KPI changes (formula, thresholds, placement) must be reflected here before shipping.

## KPI Groups Overview
- **Wholesale/Profit** — spread, MAO, wholesale fee.
- **Guardrails** — Respect Floor, Buyer Ceiling, clamps/bands.
- **Strategy** — recommended track, workflow/confidence.
- **Timeline** — DTM/urgency, carry months/hold dollars.
- **Risk** — gate status.
- **Evidence** — freshness/completeness.
- **Market Temp** — DOM/MOI band context.

## Per-KPI Specifications

### Spread (Wholesale)
| Field | Value |
| --- | --- |
| UI Label | Spread |
| Category | Wholesale/Profit |
| Definition | Dollar gap between selected MAO/offer track and payoff (or floor) showing deal headroom. |
| Formula / Source | `AnalyzeOutput.spread_*` (e.g., `spread_cash` or track-specific); trace: `SPREAD_LADDER`, `CASH_GATE` for ladder band and deficits. |
| Units & States | USD; green: ≥ min spread band; yellow: within borderline band; red: below min band. |
| Dependencies | AnalyzeOutput spreads, payoff, ladder thresholds; policy ladder knobs; trace frames. |
| UI Placement | Hero/Top KPIs; Guardrails/Profit card; tooltip uses Glossary `spread`. |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`, `../engine/analyze-contracts.md`, `../engine/trace-anatomy.md`, Glossary: spread, spread_ladder. |

### Respect Floor
| Field | Value |
| --- | --- |
| UI Label | Respect Floor |
| Category | Guardrails |
| Definition | Hard lower bound offer = max(investor floor, payoff floor + essentials). |
| Formula / Source | `AnalyzeOutput.respect_floor`; trace: `RESPECT_FLOOR` (components investor_floor, payoff_floor). |
| Units & States | USD; red if offer/MAO below; info otherwise. |
| Dependencies | Floors from engine; payoff inputs; policy tokens. |
| UI Placement | Guardrails card, hero context; tooltip Glossary `respect_floor`. |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`, `../engine/trace-anatomy.md`. |

### Buyer Ceiling
| Field | Value |
| --- | --- |
| UI Label | Buyer Ceiling |
| Category | Guardrails |
| Definition | Max price a qualified buyer can pay given margin, repairs, costs, carry. |
| Formula / Source | `AnalyzeOutput.buyer_ceiling*` (per track) clamped by AIV cap; trace: `BUYER_CEILING`, `MAO_CLAMP`. |
| Units & States | USD; warn if clamp triggered; red if MAO exceeds ceiling. |
| Dependencies | ARV/AIV, repairs, buyer costs, carry, margin knobs, AIV cap. |
| UI Placement | Guardrails card; tooltip Glossary `buyer_ceiling`. |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`, `../domain/repairs-and-contingency-model.md`, `../domain/timeline-and-carry-policy.md`. |

### MAO (per track)
| Field | Value |
| --- | --- |
| UI Label | MAO (Wholesale/Flip/Wholetail/List) |
| Category | Guardrails/Strategy |
| Definition | Engine-selected Max Allowable Offer per exit track; primary track highlighted. |
| Formula / Source | `AnalyzeOutput.mao.{wholesale,flip,wholetail,as_is_cap}`; clamps via Respect Floor, Buyer Ceiling, AIV cap; trace: `MAO_CLAMP`, floors/ceilings frames. |
| Units & States | USD; color follows clamp/deficit: green if within guardrails, yellow if clamped, red if below floor or above ceiling. |
| Dependencies | MAO bundle, floors/ceilings, clamp trace; policy posture. |
| UI Placement | Guardrails/Strategy card; hero MAO primary. |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`, `../engine/analyze-contracts.md`. |

### Wholesale Fee / Wholesale Fee w/ Double Close
| Field | Value |
| --- | --- |
| UI Label | Wholesale Fee; Wholesale Fee w/ DC |
| Category | Wholesale/Profit |
| Definition | Expected fee/spread relative to Buyer Ceiling/Respect Floor; DC version subtracts double-close friction. |
| Formula / Source | Derived from `AnalyzeOutput` MAO/spread plus DC costs (from double-close model); trace references: spread/clamp frames; DC costs from strategy (if present). |
| Units & States | USD; green meets target fee, red below policy min (CEO default if not explicit). |
| Dependencies | MAO, Respect Floor, Buyer Ceiling, DC cost model outputs. |
| UI Placement | Hero KPIs; Profit/Strategy cards. |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`, `../engine/analyze-contracts.md`, Glossary: wholesale_fee. |

### Guardrail Tightness / Borderline
| Field | Value |
| --- | --- |
| UI Label | Borderline / Guardrail Tightness |
| Category | Guardrails |
| Definition | Indicates spread proximity to min band or confidence downgrade. |
| Formula / Source | Trace `BORDERLINE` (or equivalent) using ladder band width and confidence; uses `cash_gate`/spread bands. |
| Units & States | Badge states: green clear, yellow borderline, red hard fail. |
| Dependencies | SPREAD_LADDER, CASH_GATE, confidence grade. |
| UI Placement | Guardrails card badges; possibly hero pill. |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`, `../engine/trace-anatomy.md`. |

### Strategy Recommendation
| Field | Value |
| --- | --- |
| UI Label | Strategy (Track) |
| Category | Strategy |
| Definition | Recommended exit track under current posture and gates. |
| Formula / Source | `AnalyzeOutput.strategy_recommendation`, `primary_offer/track`; trace: `STRATEGY_RECOMMENDATION`. |
| Units & States | Track label (Cash/Wholesale/Wholetail/List); badges: green viable, yellow constrained, red blocked. |
| Dependencies | MAO bundle, risk/timeline, policy track enablement. |
| UI Placement | Strategy card; hero track indicator. |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`, `../engine/analyze-contracts.md`. |

### Workflow & Confidence
| Field | Value |
| --- | --- |
| UI Label | Workflow (Ready/Review/Info) & Confidence (A/B/C) |
| Category | Strategy |
| Definition | Readiness to offer and evidence strength. |
| Formula / Source | `AnalyzeOutput.workflow_state`, `confidence_grade`; trace: `WORKFLOW_DECISION`, confidence frames. |
| Units & States | Discrete states; green = Ready/A-B, yellow = NeedsReview/B, red = NeedsInfo/C or fails. |
| Dependencies | Risk/evidence gates, spreads, timeline, confidence rubric. |
| UI Placement | Strategy/Risk/Evidence cards and hero badges. |
| Related Docs | `../domain/risk-gates-and-compliance.md`, `../engine/trace-anatomy.md`. |

### DTM (Days-to-Money) & Urgency
| Field | Value |
| --- | --- |
| UI Label | DTM; Urgency band |
| Category | Timeline |
| Definition | Days until expected cash; mapped to urgency band. |
| Formula / Source | `timeline_summary.days_to_money`, `timeline_summary.urgency_band`; trace: `TIMELINE_SUMMARY`, `DTM_URGENCY`, `CARRY_MONTHS_POLICY`. |
| Units & States | Days; bands: Emergency/Critical/Balanced/Slow (colors match urgency). |
| Dependencies | Timeline inputs, auction date, carry buffers, policy thresholds. |
| UI Placement | Timeline & Carry card; hero if featured. |
| Related Docs | `../domain/timeline-and-carry-policy.md`, `../engine/analyze-contracts.md`. |

### Carry Months & Hold Costs
| Field | Value |
| --- | --- |
| UI Label | Carry Months; Hold Monthly; Carry Total |
| Category | Timeline |
| Definition | Modeled hold duration and monthly/total carry. |
| Formula / Source | `timeline_summary.carry_months_raw/capped`, `hold_monthly_dollars`, `carry_total_dollars`; trace: `CARRY_MONTHS_POLICY`. |
| Units & States | Months, USD/mo, USD total; color warns if capped/high. |
| Dependencies | DOM/MOI, policy caps, taxes/insurance/HOA/utilities, buffers. |
| UI Placement | Timeline & Carry card. |
| Related Docs | `../domain/timeline-and-carry-policy.md`. |

### Risk Gates Status
| Field | Value |
| --- | --- |
| UI Label | Risk (Pass/Watch/Fail) |
| Category | Risk |
| Definition | Aggregated risk gate status across title/insurance/flood/condo/FHA/etc. |
| Formula / Source | `risk_summary` overall/per-gate; trace: `RISK_GATES`. |
| Units & States | Badge: green Pass, yellow Watch, red Fail. |
| Dependencies | Risk inputs/evidence; gate policies; trace frames. |
| UI Placement | Risk & Evidence card; hero badge. |
| Related Docs | `../domain/risk-gates-and-compliance.md`, `../engine/trace-anatomy.md`. |

### Evidence Freshness
| Field | Value |
| --- | --- |
| UI Label | Evidence (Fresh/Thin/Missing) |
| Category | Evidence |
| Definition | Freshness/completeness per evidence kind (payoff, title, insurance, repairs, comps). |
| Formula / Source | `evidence_summary` freshness_by_kind; `infoNeeded`; trace: `EVIDENCE_FRESHNESS`. |
| Units & States | Status per kind; badge colors; red blocks ReadyForOffer. |
| Dependencies | Evidence records/age; policy freshness windows. |
| UI Placement | Risk & Evidence card; hero badge; upload prompts in flows. |
| Related Docs | `../domain/risk-gates-and-compliance.md`, `../engine/trace-anatomy.md`. |

### Confidence Grade
| Field | Value |
| --- | --- |
| UI Label | Confidence (A/B/C) |
| Category | Evidence/Strategy |
| Definition | Confidence in valuations/inputs based on evidence completeness/quality. |
| Formula / Source | `confidence_grade` and reasons; trace: confidence policy frame. |
| Units & States | Grade A/B/C; colors (green A, yellow B, red C). |
| Dependencies | Evidence freshness, comp quality, placeholders used. |
| UI Placement | Strategy/Risk cards; hero badge. |
| Related Docs | `../domain/risk-gates-and-compliance.md`. |

### Market Temp
| Field | Value |
| --- | --- |
| UI Label | Market Temp |
| Category | Market Temp |
| Definition | Market speed band (DOM/MOI-based) for the subject ZIP. |
| Formula / Source | From speed/market band in `timeline_summary` or dedicated output; trace: `SPEED_BAND_POLICY`/`MARKET_TEMP` if emitted. |
| Units & States | Band label (Hot/Warm/Neutral/Cool); colors per band. |
| Dependencies | DOM/MOI inputs, policy thresholds. |
| UI Placement | Market Temp gauge on `/overview`; tooltip Glossary `market_temp`. |
| Related Docs | `../domain/market-temp-methodology.md`, `../domain/timeline-and-carry-policy.md`. |

### Wholesale Fee vs Target (if surfaced)
| Field | Value |
| --- | --- |
| UI Label | Fee vs Target |
| Category | Wholesale/Profit |
| Definition | Compares expected fee to policy target. |
| Formula / Source | Fee (as above) vs target knob; trace: spread/fee frames. |
| Units & States | USD; green ≥ target, red < min. |
| Dependencies | Fee calc, target knobs. |
| UI Placement | Profit/Guardrails card (if present). |
| Related Docs | `../domain/wholesale-underwriting-handbook.md`. |

### Deal Health / Hero Badges (meta)
| Field | Value |
| --- | --- |
| UI Label | Deal Health (composite badges) |
| Category | Meta |
| Definition | Aggregate badges (workflow, risk, evidence, confidence) shown in hero strip. |
| Formula / Source | Derived from workflow_state, risk_summary, evidence_summary, confidence_grade. |
| Units & States | Badges (Ready/Review/Info; Pass/Watch/Fail; Fresh/Thin/Missing; A/B/C). |
| Dependencies | Strategy, risk, evidence outputs. |
| UI Placement | Hero band badges. |
| Related Docs | `../engine/analyze-contracts.md`, `../engine/trace-anatomy.md`. |

## Maintenance & Change Rules
- This inventory is the gatekeeper for Dashboard KPIs. Any new KPI must be defined here (name/label, category, formula/source fields/trace frames, units/states, dependencies, UI placement, related docs) before UI ships.
- If engine contracts or trace frames change (rename/add/remove), update this file and UI to keep formulas aligned; preserve backward compatibility for existing runs.
- If thresholds/colors move to knobs/policies, document the knobs and ensure UI reads outputs/trace, not hard-coded values.
- Layout moves (hero → lower card) must be noted here.
- Ownership: Product + Engine + UX jointly maintain; AI agents treat this as source of truth when explaining KPIs.

## AI Usage Notes
- Use this inventory first when explaining Dashboard metrics; do not contradict formulas/thresholds here.
- Quote authoritative outputs/trace frames; avoid re-deriving math.
- If unclear/missing, point humans to this doc, trace frames, and domain policies (risk, timeline, repairs, market temp) rather than inventing logic.
