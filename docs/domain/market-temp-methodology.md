---
doc_id: "domain.market-temp-methodology"
category: "domain"
audience: ["ai-assistant", "underwriter", "engineer", "exec"]
trust_tier: 0
summary: "Defines Market Temp from DOM/MOI inputs, speed bands, and how market speed influences carry, margins, and exit strategy."
---

# Market Temp Methodology — HPS DealEngine

## Purpose
- Define Market Temp as the policy-driven view of local market speed that informs carry, margins, and exit strategy.
- Specify inputs, speed-band mapping, and how Market Temp impacts engine outputs, sandbox knobs, and UI cards.
- Provide a reference for engineers, underwriters, and AI agents; ReadyForOffer and strategy must respect Market Temp alongside risk gates and evidence.

> CEO fallback: When code/policies lack explicit thresholds, use conservative defaults noted as “CEO-default” so they can be tuned via sandbox/policy.

## Core Definitions
- **Market Temp**: A ZIP-level speed signal derived from DOM/MOI (and future indicators) mapped into bands that drive carry, margins, and recommendations.
- **DOM_zip**: Days on market for similar assets in the ZIP; primary speed input.
- **MOI_zip**: Months of inventory; supply/demand balance; complementary to DOM.
- **Speed Band / Market Temp Label**: The band selected from DOM/MOI; represented in outputs/UI (e.g., Fast/Balanced/Slow → Hot/Warm/Neutral/Cool).
- **DTM & Carry**: Days-to-Money and carry months rely on speed bands (see `docs/domain/timeline-and-carry-policy.md`).

## V1 Market Temp (Current Implementation)

### Inputs
- DOM_zip (primary).
- MOI_zip (secondary where available).
- Optional (present/future via policy toggles): SP:LP%, local investor discount, price-cut frequency.

### Speed Bands & Mapping Logic
- Use the most conservative of DOM and MOI signals (slower wins). If only DOM is present, use DOM. If both missing, default to Balanced and downgrade confidence.
- CEO-default thresholds (policy-tunable):
  - **Fast**: DOM < 30 or MOI < 2
  - **Balanced**: DOM 30–60 or MOI 2–4
  - **Slow**: DOM > 60 or MOI > 4
- Sandbox knobs should host these thresholds; engine/UI should surface the resulting band only, not recompute.

### Market Temp Labels & States
| Speed Band | Market Temp Label | Typical feel | Example DOM/MOI (CEO-default) |
| --- | --- | --- | --- |
| Fast | Hot | Multiple offers, quick absorption | DOM < 30, MOI < 2 |
| Balanced | Warm/Neutral | Steady showings, normal pricing | DOM 30–60, MOI 2–4 |
| Slow | Cool | Longer sits, buyer leverage | DOM > 60, MOI > 4 |

### Influence on Strategy, Margins & Timelines
- **Carry**: Faster bands reduce carry months; slower bands increase carry (per `(DOM + 35)/30` capped, see timeline/carry doc).
- **Margins/Spreads**: Slower bands require stronger spreads/discounts; sandbox can tighten min spreads in slow markets.
- **Disposition**:
  - Fast/Hot: can support wholetail/list if risk gates pass; cash/wholesale still valid.
  - Balanced: all exits allowed; rely on policy targets.
  - Slow/Cool: favor cash/wholesale or landlord; list wholetail only with caution and higher spread.
- **DTM/Urgency**: Fast → lower DTM/urgency; Slow → higher DTM and more conservative offers.

## Market Inputs & Toggles
- Indicators:
  - **Enabled in V1**: DOM_zip, MOI_zip (where available).
  - **Optional/Future**: SP:LP%, price-cut frequency, local investor discount metrics, absorption rate.
- Sandbox/policy toggles:
  - Enable/disable MOI consideration; choose conservative combine rule (default: slower wins).
  - Thresholds per band.
  - Sensitivity per posture (Conservative/Base/Aggressive).
- Effect of toggles: Changing thresholds or inputs shifts speed bands, which flows to carry months, margin expectations, and exit recommendations.

## V2/V3 Roadmap (Future)
- Additional indicators: price cuts, sale-to-list ratios, investor share, absorption, DOM distributions (not just averages).
- External data: MLS connectors, portals (Realtor/Zillow), tax/AVM providers; cached in property snapshots.
- Granularity: price-tier or property-type-specific bands; per-market configurable methodologies.
- Method controls: selectable combine methods (e.g., weighted DOM/MOI, percentile-based DOM).

## Interpretation Guide (Acquisitions & Dispo)
| Market Temp | What it feels like | Offer posture | Exit bias | Likely urgency |
| --- | --- | --- | --- | --- |
| Hot (Fast) | Under 30 DOM; multiple offers | Can lean closer to ceiling but within policy | Wholetail/List if gates pass; cash/wholesale still fine | Balanced/Critical depending on auction/timeline |
| Warm/Neutral (Balanced) | 30–60 DOM; steady activity | Use policy targets | All exits; match to risk posture | Balanced |
| Cool (Slow) | 60+ DOM; buyer leverage | Demand wider spreads; lower offers | Cash/Wholesale or landlord; retail only with margin | Slow/Extended |
- Guidance:
  - Hot does not waive risk gates—insurance/title/condo still hard requirements.
  - Cool requires pricing for carry risk and thinner buyer pools; consider faster exits with tighter offers.

## Impact on Policy, Engine & UI
- **Engine outputs**: speed band appears in `timeline_summary`/`speed_band` (naming aligned to engine); flows into carry and urgency.
- **Trace**: speed band selection in `SPEED_BAND_POLICY`/`TIMELINE_SUMMARY` frames.
- **UI**:
  - `/overview` Market Temp/Timeline & Carry cards show band/label and carry impact.
  - `/underwrite` shows Market Temp context near timeline inputs.
  - Strategy/recommendation sections reference Market Temp when suggesting exits.
- **Policy knobs**: band thresholds, combine rule (DOM vs MOI), per-posture adjustments, and margin adders for slow markets.

## Alignment & Cross-References
- Glossary: Market Temp, DOM, MOI, Speed Band, Carry Months.
- `docs/domain/timeline-and-carry-policy.md` (DTM/urgency and carry formula).
- `docs/domain/wholesale-underwriting-handbook.md` (spreads/exits).
- `docs/dashboard/kpi-inventory.md` & KPI stories (Market Temp card).
- `docs/domain/risk-gates-and-compliance.md` (risk gates still gate exits regardless of Market Temp).
