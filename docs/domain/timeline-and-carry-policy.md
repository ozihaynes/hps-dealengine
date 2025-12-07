---
doc_id: "domain.timeline-and-carry-policy"
category: "domain"
audience: ["ai-assistant", "underwriter", "engineer", "exec"]
trust_tier: 0
summary: "Defines Days-to-Money, urgency bands, carry cost policy, and how timeline risks influence exits, strategy, and evidence."
---

# Timeline & Carry Policy — HPS DealEngine

## Purpose
- Define how DealEngine models speed, urgency, Days-to-Money (DTM), auction timing, DOM/MOI (Market Temp), and carry costs.
- Align engine outputs, sandbox knobs, and UI cards so “fast but safe” underwriting is consistent, deterministic, and auditable.
- Provide AI/UX copy anchors and guardrails for timeline-related guidance; ReadyForOffer is gated by timeline, risk, and evidence.

## Core Definitions
- **Days-to-Money (DTM)**: Calendar days from “today” (run time) to expected cash in bank for the selected exit track (cash/wholesale/wholetail/list). Includes buffers when risk/evidence is unresolved.
- **DOM (Days on Market)**: Market speed indicator from comps/MLS; feeds Market Temp and speed bands.
- **MOI (Months of Inventory)**: Supply indicator; complements DOM in Market Temp.
- **Carry Months**: Modeled holding duration (months) that multiplies monthly carry (taxes/insurance/HOA/utilities/interest/maintenance) per track.
- **Urgency Band / Speed Band**: Bucketed DTM (and auction days-out) driving recommendations, guardrails, and presentation.
- Relationship: DOM/MOI → Market Temp → speed/urgency band → DTM expectation → carry months and exit recommendations.

## Speed & Urgency Bands (policy defaults; adjust via sandbox/policy knobs)
| Band | DTM threshold | Auction days-out | Exit posture | Notes |
| --- | --- | --- | --- | --- |
| Emergency | ≤14 days | ≤14 | Cash/Wholesale only | Aggressive timelines; expect tighter spread, minimal contingencies. |
| Critical | 15–30 | 15–30 | Cash/Wholesale; Wholetail only if insurable/ready | Require bindable insurance/title; buffer carry. |
| Balanced | 31–60 | >30 (auction not imminent) | Cash/Wholesale/Wholetail; List if retail overlays pass | Normal policy targets; standard carry. |
| Slow / Extended | >60 | n/a | Wholetail/List; Cash if spread allows | Requires stronger spread; watch carry drag and Market Temp. |

- Bands influence urgency badges on `/overview`, copy in Timeline & Carry card, and strategy recommendations. If engine uses slightly different labels/thresholds in sandbox, the UI should render the actual band names from outputs.

## Carry & Holding Cost Policy
- **Carry months formula (default)**: `(DOM + 35) / 30`, capped at 5.0 months, then clamped by policy bands per exit track. (From engine trace: Carry Months Policy; sandbox knob controls cap and formula choice.)
- **Per-track defaults** (policy-driven):
  - Flip: hold cost per Market Temp band (fast/neutral/slow) from sandbox knobs.
  - Wholetail: lower scope; use wholetail-specific monthly defaults and caps.
  - Wholesale/Cash: minimal carry; still include per-diem/short buffer for close/assignment.
- **Holding cost components**: taxes, insurance, HOA, utilities; optional interest/maintenance/buffer if provided. Evidence (tax bill, insurance quote, HOA estoppel) supersedes defaults; otherwise sandbox defaults apply.
- **Evidence override rules**: When evidence is present and fresh, replace defaults; when missing, use defaults and downgrade confidence/keep Watch state on evidence freshness.
- **Extra buffers**: Title delays, board approvals, flood/structural issues, or auction proximity can add buffer days/months via policy knobs; reflected in timeline_summary and trace.

## Timeline Constraints & Recommendations
- Minimum/maximum DTM per track are policy-controlled; retail exits must respect FHA/VA flip windows and board approvals; auctions constrain DTM to auction date minus required buffers.
- “Urgent/Cash” recommendation when DTM falls in Emergency/Critical bands or auction is inside 30 days and risk gates are unresolved.
- If DTM exceeds max for a track, downgrade that exit and favor cash/assignment; increase required spread to compensate carry risk.
- UI: Timeline & Carry card shows DTM, urgency band, carry months, hold monthly/total; banners/warnings if DTM is inside Emergency/Critical and risk gates are not cleared.

## Interaction with Risk Gates & Evidence
- Unresolved gates (title, insurance, condo/SIRS, flood, bankruptcy/auction) add buffers or block ReadyForOffer:
  - Clear-to-Close buffer added when title/insurance/board approval unresolved.
  - Flood + structural → evaluate Flood 50% Rule; may increase timeline or block retail exits.
  - Condo approvals/board timing extend DTM and carry; constrain exits.
- Workflow impact: Failing/blocked gates keep workflow_state in NeedsReview/NeedsInfo; Watch gates may downgrade confidence and retain amber state even if DTM is acceptable.
- Strategy impact: Higher urgency → prefer cash/wholesale; lower urgency with clean risk → allow wholetail/list.

## Integration with Engine & UI
- **Engine outputs** (contracts): `timeline_summary` with DTM, urgency/speed band, carry_months (raw/capped), hold_monthly_dollars, carry_total_dollars; may include per-path DTM/source/buffer. Present in `AnalyzeOutputs`.
- **Trace frames**: `TIMELINE_SUMMARY`, `DTM_URGENCY_POLICY`, `CARRY_MONTHS_POLICY`, `SPEED_BAND_POLICY`; auction urgency may appear in timeline policy frame.
- **UI surfaces**:
  - `/overview` Timeline & Carry card (DTM, urgency band, carry months/total, hold monthly).
  - `/trace` timeline/carry section showing buffers, band selection, and policy thresholds.
  - `/underwrite` timeline inputs (auction date, desired close) and carry inputs (tax/ins/HOA/utilities).
  - Urgency badges and copy pulled directly from outputs; no UI-side recompute.

## Governance, Knobs & Sandbox (key levers)
- DTM thresholds per track/posture; auction urgency thresholds.
- Carry months formula selector and cap (`carryMonthsFormulaDefinition`, `carryMonthsMaximumCap`).
- Hold cost defaults per track/speed (`holdCostsFlip*`, `holdCostsWholetail*`, `holdingCostsMonthlyDefault*`).
- DTM/urgency buffers (clear-to-close, auction proximity).
- Enable/disable exits per posture/track when DTM exceeds limits.
- All knobs are governed in sandbox/policy; analysts view, managers/owners edit; overrides are audited.
- Cross-link: `docs/knobs-audit-v1.md`, `docs/engine/knobs-and-sandbox-mapping.md` (planned).

## Examples & Edge Cases
- **Example 1: Normal flip, clean title** — DOM 40, MOI 3 → Balanced band; carry months ≈ (40+35)/30 ≈ 2.5 capped; hold monthly from flip defaults; exits: cash/wholesale/wholetail/list allowed; ReadyForOffer if gates cleared.
- **Example 2: Auction in 10 days, title unresolved** — Auction days-out 10 → Emergency band; add buffer; recommend Cash; workflow_state stays NeedsReview until title evidence; carry small but urgency high; ReadyForOffer blocked until title passes.
- **Example 3: Condo with board approval + SIRS** — DOM 60, MOI 6 → Slow/Extended; carry months capped at 5.0; add board-approval buffer; exits constrained (cash/DSCR/limited wholetail); retail only if warrantable; ReadyForOffer gated by condo docs.

## AI & UX Guidance
- AI: Use `timeline_summary` and trace frames; never invent DTM/carry. If auction/title/insurance data missing, state what is needed to trust timeline. Do not suggest ignoring Emergency/Critical fails.
- UX: Timeline & Carry tooltips should reference urgency bands, buffer logic, and evidence needs; badges reflect Pass/Watch/Fail from risk + timeline outputs.
- Cross-references: `docs/domain/risk-gates-and-compliance.md`, `docs/domain/wholesale-underwriting-handbook.md`, `docs/domain/market-temp-methodology.md` (planned), `docs/dashboard/kpi-inventory.md` (for KPIs), glossary terms (DTM, DOM, MOI, Market Temp, Carry Months).

## CEO-Policy Defaults (adjustable via sandbox/policy)
- DTM/urgency bands: Emergency ≤14d; Critical 15–30d; Balanced 31–60d; Slow >60d.
- Auction urgency: ≤14d = Emergency; 15–30d = Critical; >30d normal.
- Carry months formula: `(DOM + 35) / 30`, cap 5.0 months; per-track hold monthly from sandbox defaults if evidence missing.
- Retail/list requires: bindable insurance, clear title, retail overlays satisfied (e.g., FHA/VA timing), board approvals (if condo); otherwise downgrade to cash/wholesale.
