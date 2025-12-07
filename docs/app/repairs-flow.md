---
doc_id: "app.repairs-flow"
category: "app"
audience: ["ai-assistant", "underwriter", "engineer", "product"]
trust_tier: 1
summary: "Workflow for the Repairs tab from QuickEstimate through Big 5 and line items, including evidence expectations and integration with underwriting."
---

# Repairs Flow — HPS DealEngine (/repairs)

## Purpose & Audience
- Canonical recipe for using the Repairs tab end-to-end: capture rehab costs, apply contingency, and feed deterministic underwriting.
- Ties repairs to Underwrite (MAO/spread/floors/ceilings/risk) and Dashboard (/dashboard) KPIs.
- For acquisitions reps (triage), underwriters/analysts (deep scope), VAs (data entry/evidence), dispo/TC (validate economics), and AI agents (explain, not compute).
- Related docs: `../domain/repairs-and-contingency-model.md`, `../domain/wholesale-underwriting-handbook.md`, `./underwrite-flow.md`, `../dashboard/kpi-inventory.md`, `../dashboard/kpi-stories.md`.

## Preconditions & Preflight Checks
- DealSession selected (dealId/org/posture set via `/startup` or `/deals`).
- Sqft known for PSF Quick Estimate; if missing, Quick Estimate totals are unreliable (UI warns/blocks PSF-based calc).
- Active repair profile (org/market/posture) visible in Repairs: profile name/id, marketCode, posture, as-of, version, source; fetched via `v1-repair-rates`.
- If profile missing/invalid: UI shows fallback/defaults; user should select a valid profile or switch market/posture; governed via `/sandbox → Repairs` for edits/clones.

## Flow Overview: Quick Estimate → Big 5 → Line Items

### Quick Estimate (PSF)
- Use for first-pass/triage and cosmetic/light deals.
- Inputs: living area sqft, Repair Class (Light/Medium/Heavy/Structural).
- Rates: PSF tiers from `repair_rate_sets` (org/market/posture), active profile meta shown in UI.
- Behavior: PSF × sqft → quick total; class selection drives contingency (per policy) and PSF tier. Missing sqft → warn/disable PSF calc.

### Big 5 (Major Systems)
- Components: Roof, HVAC, Repipe/Plumbing, Electrical, Foundation (engine may allow additional majors).
- Use when majors are suspected/known failing; additive to Quick Estimate.
- Flags/status: mark replace/needs/unknown per item; high-cost items should not remain unknown for deep runs.

### Line-Item Estimator
- Sections: Kitchens/Baths; Systems & Major; Exterior/Structural; Interior/Finishes (as per estimator UI).
- Use for deep/IC/lender-ready scopes; rehab planning.
- Rollup: per-section totals → repairs_total; overrides PSF-only view; Big 5 included in totals.
- Recommended progression: start Quick Estimate → add Big 5 when known → move to line items as deal nears IC/offer.

## Repair Profile Management (Rates & Profiles)
- Source: `repair_rate_sets` (org/market/posture), fetched via `v1-repair-rates`; profiles managed via `v1-repair-profiles` and `/sandbox → Repairs`.
- User can view active profile meta in Repairs; can switch profile (deal/org/posture scoped). Cloning/editing is governed in Sandbox (role-based).
- Expected request fields: dealId (for org resolution), marketCode, posture, profileId (optional to force); returns PSF tiers, Big 5, lineItemRates, meta (as_of/version/source/isDefault).
- Missing/out-of-date profile: UI falls back to default profile for org/market/posture; warns if cross-org/invalid.
- Posture/market change triggers refetch of rates/profile.

## Evidence & Documentation
- Triage: photos/basic notes acceptable; bids not required but helpful.
- Deep/IC-ready: attach bids/scopes/photos/inspection reports; high-cost items (roof/HVAC/foundation) should have evidence.
- Evidence storage: evidence_* tables; upload via evidence flows (outside Repairs UI if not embedded). Freshness impacts confidence and evidence gates (`EVIDENCE_FRESHNESS` frames).
- Risk linkage: Large/structural repairs or flood/structural flags may trigger risk gates (Flood 50% rule, insurability); evidence supports passing gates and improving confidence.
- AI/UX note: Call out missing bids/photos when major systems are unknown; do not assume numbers.

## Integration With Underwrite & Dashboard
- Underwrite:
  - Repairs totals (quick + Big 5 + line items + contingency) flow into `AnalyzeInput.repairsTotal` and per-section data; affects MAO, spreads, floors/ceilings.
  - Underwrite shows current repairs totals and allows import/sync from Repairs; rerun Analyze after material repair changes.
- Dashboard (/dashboard):
  - KPIs impacted: Spread/Wholesale Fee/MAO (Guardrails & Profit), Timeline/Carry (if heavier repairs imply longer carry indirectly), Risk/Evidence badges (confidence/evidence freshness).
  - Sanity-check impact: After adding $X repairs (e.g., roof), expect MAO/spread to tighten; review Guardrails/Profit and Risk/Evidence cards on Dashboard.
- Trace: Repairs frames plus downstream clamps (MAO_CLAMP, SPREAD_LADDER, CASH_GATE) and evidence freshness reflect repairs changes.

## “Done” Criteria for Repairs by Workflow
- **First-pass / Triage**
  - Quick Estimate class set; PSF applied (if sqft known).
  - Big 5 optionally flagged; unknowns acceptable but noted.
  - Notes/evidence optional; prepare to refine.
- **Deep Underwriting**
  - Repair class aligned with evidence; PSF + Big 5 realistic (no high-cost unknowns).
  - Key line items filled for major scopes; contingency reasonable.
  - Photos + draft bids/scopes attached for major items.
- **IC-ready / Pre-offer**
  - Line items reflect intended rehab; Big 5 resolved (replace vs ok).
  - Evidence reasonably complete for deal size/risk; bids/scopes current enough to support offer.
  - Impact on MAO/spread/DTM reviewed on Underwrite/Dashboard; rerun Analyze and save run.

## AI & UX Notes
- AI: Use repair totals and trace, never invent numbers. If majors are unknown or bids missing, say so and request evidence. Recommend moving from Quick Estimate to Big 5 to line items as risk/price increases.
- UX pointers: Quick Estimate (PSF + class), Big 5 statuses, line-item estimator tabs; profile metadata shown in Repairs; evidence prompts in Risk/Evidence flows.
- Pitfalls to highlight: Missing sqft → PSF unreliable; not rerunning Analyze after repair edits; relying on Quick Estimate for structural/flood-sensitive deals.
