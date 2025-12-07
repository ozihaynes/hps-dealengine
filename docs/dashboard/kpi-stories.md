---
doc_id: "dashboard.kpi-stories"
category: "dashboard"
audience: ["ai-assistant", "product", "underwriter", "engineer"]
trust_tier: 1
summary: "Narrative guide to what each Dashboard KPI means, how to act on it, and how to explain states with trace references."
---

# Dashboard KPI Stories — HPS DealEngine

## Purpose & Audience
- Narrative companion to `docs/dashboard/kpi-inventory.md`: explains what each Dashboard KPI/card is “trying to tell you” and how to act on it.
- Audience: Product/UX (copy, tooltips, layout), Engine/Frontend (behavioral intent), AI assistants (responses grounded in outputs/trace), power users (team leads, underwriters, acquisitions/dispo).
- Not formulas: formulas live in KPI inventory, engine contracts, and trace. This doc is about interpretation, actions, and messaging.

## How to Use This Document
- PM/UX: Drive card copy, tooltips, and banners from these stories; keep aligned with `kpi-inventory` and trace frames.
- Engineers: Treat this as the narrative map; use inventory + analyze contracts for fields; no UI-side recompute.
- AI: Use these narratives; cite KPIs and trace; never invent numbers or ignore gates.

## Wholesale KPIs — Story & Actions
- **Primary question:** Can we make enough on this deal under policy spreads/fees?

### Key KPIs (Wholesale)
| KPI | Plain meaning | Fields / Frames | Glossary |
| --- | --- | --- | --- |
| Spread | Headroom over payoff/floor | AnalyzeOutput spreads; `SPREAD_LADDER`, `CASH_GATE` | spread, spread_ladder |
| Wholesale Fee / Fee vs Target | Expected assignment/DC-adjusted fee vs policy target | MAO/spread + DC costs; ladder frames | wholesale_fee |
| MAO (track) | Offer caps per exit | MAO bundle; `MAO_CLAMP`, `RESPECT_FLOOR`, `BUYER_CEILING` | mao |

### State Interpretation (G/Y/R)
| State | Typical condition (illustrative) | Meaning | Actions |
| --- | --- | --- | --- |
| Green | Spread ≥ required band (e.g., req $20k, have $26k) | Meets/ exceeds policy margin | Advance; verify risk/evidence; lock offer. |
| Yellow | Within ~10–20% of min band (e.g., req $20k, have $18k) | Borderline; sensitive to risk/DTM | Tighten price; reduce scope; consider faster exit; collect more evidence. |
| Red | Below min band or cash gate deficit | Fails policy | Reprice or pass; do not proceed without approved override. |

### Interactions
- Strong spread + bad timeline → consider faster exit/price drop.
- Good fee + Risk/Evidence red → do not greenlight; fix gates/evidence first.
- Spread green + Market Temp cool → still price for slower dispo; keep spread buffer.

## Guardrails & Floors — Story & Actions
- **Primary question:** Are we inside hard bounds (floors/ceilings/clamps)?

### Key KPIs (Guardrails)
| KPI | Plain meaning | Fields / Frames | Glossary |
| --- | --- | --- | --- |
| Respect Floor | Hard lower bound (investor/payoff) | `respect_floor`; `RESPECT_FLOOR` | respect_floor |
| Buyer Ceiling | Max safe price by track | buyer_ceiling*; `BUYER_CEILING`, `MAO_CLAMP` | buyer_ceiling |
| Borderline/Tightness | Proximity to thresholds | `BORDERLINE`, ladder | spread_ladder, cash_gate |

### State Interpretation
| State | Condition | Meaning | Actions |
| --- | --- | --- | --- |
| Green | Offer/MAO within floor/ceiling | In bounds | Proceed with guardrail messaging. |
| Yellow | Near clamp/borderline | Tight; small shocks break it | Add buffer; adjust exit; clarify evidence. |
| Red | Below floor or above ceiling | Hard fail | Reprice; change exit; or pass unless override. |

### Interactions
- Guardrails red overrides other greens: fix price/exit before proceeding.
- Borderline + Evidence thin → gather evidence before committing.

## Strategy & Profit — Story & Actions
- **Primary question:** Which exit is recommended and how confident are we?

### Key KPIs (Strategy)
| KPI | Plain meaning | Fields / Frames | Glossary |
| --- | --- | --- | --- |
| Strategy Recommendation | Track to pursue | `strategy_recommendation`, `primary_track`; `STRATEGY_RECOMMENDATION` | strategy_track |
| Workflow State | Ready/Review/Info | `workflow_state`; `WORKFLOW_DECISION` | workflow_state |
| Confidence Grade | Evidence-backed confidence | `confidence_grade`; confidence frame | confidence_grade |

### State Interpretation
| State | Condition | Meaning | Actions |
| --- | --- | --- | --- |
| Green | Ready + A/B | Viable to offer | Proceed; prepare IC/seller/buyer messaging. |
| Yellow | NeedsReview or B | Conditional | Clear blockers; tighten price/exit; gather missing items. |
| Red | NeedsInfo/C or blocked strategy | Not ready | Do not offer; fix risk/evidence or exit constraints. |

### Interactions
- Strategy green requires Risk/Evidence not red.
- Confidence low + tight spreads → re-evidence or reprice.

## Timeline & Carry — Story & Actions
- **Primary question:** How fast do we need to move, and what does hold cost look like?

### Key KPIs (Timeline)
| KPI | Plain meaning | Fields / Frames | Glossary |
| --- | --- | --- | --- |
| DTM / Urgency | Days to money & urgency band | `timeline_summary.days_to_money`, `urgency_band`; `TIMELINE_SUMMARY`, `DTM_URGENCY` | dtm, urgency |
| Carry Months / Hold $ | Modeled hold duration & cost | `carry_months`, `hold_monthly_dollars`, `carry_total_dollars`; `CARRY_MONTHS_POLICY` | carry_months |

### State Interpretation
| State | Condition (illustrative) | Meaning | Actions |
| --- | --- | --- | --- |
| Green | Balanced band (e.g., 31–60d) | Normal speed | Standard exits/pricing. |
| Yellow | Critical (15–30d) or high carry | Time-sensitive or costly | Shift to cash/wholesale; tighten price; reduce scope. |
| Red | Emergency (≤14d) or extreme carry | Urgent; high risk | Cash-only pricing; reconsider deal; ensure gates cleared fast. |

### Interactions
- High urgency + slow Market Temp → deepen discount.
- High carry + thin spread → reprice or change exit.

## Risk & Compliance — Story & Actions
- **Primary question:** Are any hard/soft risk gates blocking us?

### Key KPIs (Risk)
| KPI | Plain meaning | Fields / Frames | Glossary |
| --- | --- | --- | --- |
| Risk Gates | Pass/Watch/Fail per gate and overall | `risk_summary`; `RISK_GATES` | risk_gate |

### State Interpretation
| State | Condition | Meaning | Actions |
| --- | --- | --- | --- |
| Green | All gates pass | No gate blockers | Proceed; keep evidence current. |
| Yellow | Watch gates (curable) | Conditional risk | Cure items (title/insurance/condo/flood/FIRPTA etc.); adjust price/exit. |
| Red | Fail gates (hard stops) | Blocked | Do not offer without approved override; fix gate or pass. |

### Interactions
- Risk red overrides other greens (spread, strategy); Evidence must support gate clearance.

## Evidence & Confidence — Story & Actions
- **Primary question:** Do we have fresh, sufficient evidence to trust the numbers?

### Key KPIs (Evidence)
| KPI | Plain meaning | Fields / Frames | Glossary |
| --- | --- | --- | --- |
| Evidence Freshness | Fresh/thin/missing by kind | `evidence_summary`; `EVIDENCE_FRESHNESS` | evidence |
| Confidence Grade | Quality of inputs | `confidence_grade`; confidence frame | confidence_grade |

### State Interpretation
| State | Condition | Meaning | Actions |
| --- | --- | --- | --- |
| Green | Fresh/complete; A/B | Trustworthy inputs | Proceed; document. |
| Yellow | Thin/stale; B | Caution | Gather missing docs; re-run. |
| Red | Missing critical; C | Untrusted | Block ReadyForOffer; collect evidence before pricing. |

### Interactions
- Thin evidence + borderline spread → re-evidence before offer.
- Missing evidence can block Risk gates and Strategy.

## Market Temp & Market Intelligence — Story & Actions
- **Primary question:** How fast is this market and how should that shape price/exit?

### Key KPIs (Market)
| KPI | Plain meaning | Fields / Frames | Glossary |
| --- | --- | --- | --- |
| Market Temp | Market speed band (DOM/MOI) | speed/market band; `SPEED_BAND_POLICY`/`MARKET_TEMP` if emitted | market_temp |

### State Interpretation
| State | Condition (illustrative) | Meaning | Actions |
| --- | --- | --- | --- |
| Hot | DOM <30 / MOI<2 | Fast absorption | More aggressive but within guardrails; wholetail/list viable if gates pass. |
| Warm/Neutral | DOM 30–60 / MOI 2–4 | Steady | Standard posture; normal exits. |
| Cool | DOM >60 / MOI>4 | Slow | Price for carry; favor cash/wholesale/landlord; widen spread. |

### Interactions
- Cool market + high urgency → deeper discount; faster exit.
- Hot market does not waive risk/evidence; guardrails still apply.

## Seller & Buyer Messaging Hooks
### For Sellers
- “Based on verified payoff and needed repairs, our safe range is $X–$Y; it keeps us above your payoff and within buyer ceilings.”
- “This market is moving [fast/slow], so timing matters; a cleaner file on title/insurance keeps us on the higher end.”
- “Because of the repairs scope (roof/HVAC/etc.), we’re pricing to cover those costs and still close quickly.”

### For Buyers / Capital Partners
- “Spread vs payoff is $X over the required band; primary track is [Wholesale/Cash]; guardrails respected.”
- “Risk gates are [green/yellow/red]; evidence is [fresh/thin]; confidence is [A/B/C]; here’s what’s missing.”
- “Timeline is [band], carry is ~$M/mo; Market Temp is [Hot/Warm/Cool]; recommended exit: [track] at $P.”

## AI Usage Patterns
- Use KPI stories + `kpi-inventory` + trace to explain; do not invent numbers.
- Short answer template: 1–2 sentence summary + 3–5 bullets (state, why, action) + 1–2 actions.
- Deep answer template: summary, then per-group (Wholesale, Guardrails, Strategy, Timeline, Risk, Evidence, Market) with state/implication/action; point to tabs (/overview, /trace, /underwrite, /repairs).
- Phrases to avoid: guarantees (“will definitely”), dismissing gates (“ignore flood/title”), invented comps/fees.
- Cite frames in plain language: “See SPREAD_LADDER for required band,” “RISK_GATES shows title/insurance pass/fail,” “TIMELINE_SUMMARY shows urgency/carry.”

## Cross-References & Maintenance
| KPI Group | Formulas | Policy | Trace Frames |
| --- | --- | --- | --- |
| Wholesale/Profit | `docs/dashboard/kpi-inventory.md` | `../domain/wholesale-underwriting-handbook.md` | SPREAD_LADDER, CASH_GATE, MAO_CLAMP |
| Guardrails | `docs/dashboard/kpi-inventory.md` | same as above | RESPECT_FLOOR, BUYER_CEILING, BORDERLINE |
| Strategy | `docs/dashboard/kpi-inventory.md` | policy posture | STRATEGY_RECOMMENDATION, WORKFLOW_DECISION |
| Timeline | `docs/dashboard/kpi-inventory.md` | `../domain/timeline-and-carry-policy.md` | TIMELINE_SUMMARY, DTM_URGENCY, CARRY_MONTHS_POLICY |
| Risk | `docs/dashboard/kpi-inventory.md` | `../domain/risk-gates-and-compliance.md` | RISK_GATES |
| Evidence | `docs/dashboard/kpi-inventory.md` | `../domain/risk-gates-and-compliance.md` | EVIDENCE_FRESHNESS |
| Market Temp | `docs/dashboard/kpi-inventory.md` | `../domain/market-temp-methodology.md` | SPEED_BAND_POLICY/MARKET_TEMP |
- Change rules:
  - Add/modify a Dashboard KPI → update `kpi-inventory`, this doc, and trace mapping; ensure UI uses engine outputs/trace.
  - If thresholds/colors move to knobs/policy, document the knobs and ensure UI/AI cite outputs, not hard-coded values.
  - Keep hero vs card placement consistent with `kpi-inventory` and routes overview.***
