---
doc_id: "engine.analyze-contracts"
category: "engine"
audience: ["ai-assistant", "engineer", "underwriter"]
trust_tier: 1
summary: "Human-readable spec for AnalyzeInput/AnalyzeOutput and trace envelopes used by v1-analyze and runs-save."
---

# Engine Analyze Contracts — HPS DealEngine

## Purpose
- Authoritative, human-readable spec for the Analyze request/response envelope (input, output, trace metadata).
- UIs, Edge Functions, and AI agents must use this as the primary reference (aligned with `docs/engine/architecture-overview.md`, `docs/product/*`, and `docs/domain/*`).
- Eliminates guesswork: field meanings, origins, units, and nullability are defined; authoritative fields must not be re-derived in UI/AI.

## Contract Envelope
- End-to-end flow: UI assembles `AnalyzeInput` + policy/sandbox options + policy snapshot → calls `v1-analyze` → engine returns `AnalyzeOutput` + `trace` (+ summaries) → optional `v1-runs-save` persists run with hashes/policy snapshot.
- Identity & scope:
  - `orgId` (from JWT/memberships), `dealId` (required to save runs), `posture` (Conservative/Base/Aggressive), `marketCode` (e.g., ORL).
  - Optional: `runId` (when replaying), scenario labels/tags (if UI supplies), `sandboxPresetId`.
- Policy/snapshot metadata:
  - Active `policy_version` (id/version), policy JSON snapshot, `policy_hash`.
  - Sandbox options/overrides included in the call (knobs, posture selection).
- Hashing & determinism:
  - `input_hash`, `policy_hash`, `output_hash` (computed/used when saving runs).
- Optional workflow metadata:
  - `workflow_state` hint (ReadyForOffer/NeedsInfo/NeedsReview), `workflow_reason`, `infoNeeded` list (engine/trace-derived).

## AnalyzeInput (Input Contract)
Field groups, types, and sources. Required unless noted optional; units as stated.

### Deal Identity
- `dealId` (uuid, required to save runs; optional for pure analyze preview).
- `orgId` (uuid, from JWT/membership; required).
- `posture` (string enum: conservative/base/aggressive).
- `marketCode` (string; e.g., ORL).
- Optional: `scenarioTag`/`runLabel`, `sandboxPresetId`.

### Property & Deal Facts
- Location: `address`, `city`, `state`, `zip`, optional `county`.
- Asset type: `propertyType` (e.g., sfr, townhome, condo, manufactured); flags: `isCondo`, `isManufactured`, `isRural`, `isUnique`.
- Physical: `sqft`, `beds`, `baths`, `yearBuilt`, `lotSize` (optional), `occupancy` (owner/tenant/vacant/unknown).
- Context flags: `isAuction`/`auctionType`, `foreclosureStage`, `boardApprovalRequired` (condo/coop).

### Valuation Inputs
- ARV inputs: `arvEstimate`, `arvCompCount`, `arvCompAvg`, `arvCompAgeDays`, optional confidence flags.
- AIV inputs: `aivEstimate`, `aivCompCount`, `aivCompAvg`, `aivCompAgeDays`.
- Evidence flags: `arvEvidencePresent`, `aivEvidencePresent`, `bpoAppraisalPresent`.
- Optional bounds: `arvMin/max`, `aivMin/max` if provided by policy/UI.

### Repairs
- Totals:
  - `repairsTotal` (USD) computed from the active estimator.
  - `repairClass` (Light/Medium/Heavy/Structural).
- Quick Estimate (PSF):
  - `quickEstimatePsf` (USD/sqft), `quickEstimateSqft` (defaults to living sqft), `quickEstimateTotal`.
- Big 5:
  - Per-system amounts: `roof`, `hvac`, `repipe/plumbing`, `electrical`, `foundation` (USD).
  - Flags/quantities if UI captures them.
- Line-item estimate:
  - Section totals (Kitchens/Baths, Systems & Major, Exterior/Structural, Interior/Finishes) and/or per-line rates where provided.
- Repair profile metadata:
  - `repairProfileId`, `profileName`, `marketCode`, `posture`, `asOf`, `version`, `psfTiers`, `big5`, `lineItemRates`.
- Evidence flags: `repairsEvidencePresent`/missing bids.

### Debt & Payoff
- `seniorPrincipal`, `seniorPerDiem`, `goodThruDate`.
- Juniors/liens: `juniorLiensTotal`, `hoaArrears`, `municipalFines`, `taxDelinquencies`.
- Flags: `payoffLetterPresent`, `juniorLiensDisclosed`.

### Costs & Fees
- Buyer/seller cost buckets (USD): `closingCostsBuyer`, `closingCostsSeller`, `resaleCosts`, `assignmentFeeTarget`/`publicFeeTarget`.
- Carry inputs (monthly unless stated): `taxes`, `insurance`, `hoa`, `utilities`, optional `interest`, `maintenanceBuffer`.
- Cost split indicators if UI captures (buyer vs seller).

### Timeline & Auction
- `desiredCloseDate` or `targetDtm` (days to money); `auctionDate`/`foreclosureDate`.
- Optional: `listDateTarget`, `boardApprovalDays`, `clearToCloseBufferDays`.

### Risk & Compliance Inputs
- Flood: `floodZone`, `elevationCertPresent`.
- Condo/SIRS: `isSirsRequired`, `milestoneStatus`, `warrantabilityStatus`.
- FIRPTA: `sellerResidencyStatus`/`isForeignSeller`.
- SCRA: `isActiveDuty`.
- Bankruptcy: `bankruptcyStatus`.
- Property risk flags: `isManufactured`, `isUnique`, `nonWarrantable`.

### Evidence & Confidence
- Presence/freshness flags: `payoffEvidence`, `titleEvidence`, `insuranceEvidence`, `repairsEvidence`, `compsEvidence`, with `isPresent`/`ageDays` if available.
- `infoNeeded` (UI-assembled hints) can be sent but engine/trace will output authoritative needs.

### Sandbox / Policy Options
- `sandboxOverrides`: knob overrides (e.g., margins, gates, speed bands) as allowed.
- `postureOverride` (if UI allows switching posture explicitly).
- `strategyToggles` (enable/disable exits) where allowed by policy.
- Note: All overrides are governed; unauthorized fields are ignored or rejected by Edge.

## AnalyzeOutput (Output Contract)
Authoritative engine outputs; do not re-derive in UI/AI. Units noted.

### Valuation Summary
- `arv_final`, `aiv_final` (USD).
- Confidence/quality: `valuation_confidence`/notes if emitted.
- Caps/limits: `aiv_cap_used`, `arv_bounds_used` (booleans/values where provided).

### Floors & Ceilings
- Floors: `investor_floor`, `payoff_floor`, `respect_floor` (USD).
- Ceilings: `buyer_ceiling` per track (cash/wholesale/wholetail/list) (USD).
- Rules: MAO must satisfy `respect_floor <= MAO <= buyer_ceiling (and AIV cap)`.

### MAO Bundle
- `mao` object with tracks: `wholesale`, `flip`, `wholetail`, `as_is_cap/list` (USD).
- `primary_offer`/`primary_track` flags (which MAO the engine recommends under current posture).

### Spreads & Bands
- Spreads: `spread_cash`, `min_spread_required`, `spread_vs_payoff`, etc. (USD).
- Gates: `cash_gate_status`, `cash_deficit` (USD), `borderline_flag`, `spread_ladder_band`.

### Risk Summary
- `risk_summary`: per-gate statuses (Pass/Watch/Fail) and overall risk grade if present.
- Gates align to domain doc (title/insurance/flood/condo/FHA/PACE/UCC/FIRPTA/etc.).

### Timeline & Carry Summary
- `timeline_summary`: `days_to_money` (days), `urgency_band`, `carry_months_raw/capped`, `hold_monthly_dollars`, `carry_total_dollars`, optional per-path DTM/source/buffer.
- Warnings: auction proximity, long DTM, missing CTC evidence.

### Evidence Summary
- `evidence_summary`: freshness by kind, completeness flags, missing/placeholder notes.
- `infoNeeded`: list of needed artifacts/data to reach ReadyForOffer.

### Strategy & Workflow
- `strategy_recommendation`: recommended exit track.
- `workflow_state`: ReadyForOffer / NeedsReview / NeedsInfo.
- `confidence_grade` (A/B/C or similar) with reasons if emitted.
- Suggested next actions (short hints; not full playbook).

### Trace & Diagnostics
- Trace bundle (frames): valuation, floors/ceilings, spreads/gates, risk gates, evidence freshness, timeline/carry, strategy.
- Linkage: `trace_id` or run correlation is implicit when persisting; UI `/trace` renders frames; AI should cite frames, not recalc.

Units & nullability:
- Currency fields in USD; percentages as decimals where applicable; days/months as integers/floats.
- If a field is null/absent, consumers must not fabricate; display gracefully and prompt for missing inputs/evidence.

## Authoritative vs Derived Fields
- **Authoritative** (engine): MAO bundle, floors/ceilings, spreads/gates, risk_summary, evidence_summary, timeline_summary, strategy_recommendation, workflow_state, confidence_grade, infoNeeded, trace frames.
- **Derived/highlight** (UI): KPIs, cards, and badges computed from authoritative fields (no business rule changes).
- **Diagnostic-only**: verbose trace details, internal clamps; for `/trace` and debugging, not for overriding outputs.
- Rule: UIs/AI must present/quote authoritative fields and reference trace; do not re-derive MAO/spreads/timeline/risk.

## Versioning & Compatibility
- Contract evolution should be additive (new optional fields); avoid breaking renames/removals.
- If `contractVersion` is added, clients should branch logic on version and handle unknown fields gracefully.
- Backwards compatibility: historical runs/trace must remain interpretable; trace frame names/semantics must not be broken for old data.
- Consumer guidance: ignore unknown fields safely; prefer presence checks; rely on authoritative fields and trace for decisions.

## Cross-References
- Architecture: `docs/engine/architecture-overview.md`
- Domain: `../domain/wholesale-underwriting-handbook.md`, `../domain/risk-gates-and-compliance.md`, `../domain/timeline-and-carry-policy.md`, `../domain/repairs-and-contingency-model.md`, `../domain/market-temp-methodology.md`
- Product: `../product/vision-and-positioning.md`, `../product/end-to-end-deal-lifecycle.md`
- Planned: `docs/engine/trace-anatomy.md`, `docs/ai/data-sources-and-trust-tiers.md`, `docs/dashboard/kpi-inventory.md`
