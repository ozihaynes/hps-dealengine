# Gap Analysis — 15 PRD Components
Date: 2026-01-03
Auditor: Claude Code

## Overview

This analysis compares existing HPS DealEngine V2 implementation against the 15 PRD components for the V2.5 Wholesaler Dashboard.

---

## PRD Components Assessment

### 1. Decision Bar

**PRD Requirement:** Central decision-making interface with quick actions and verdict display.

**Current State:**
- Component: `DecisionCanvas.tsx` exists in `components/command-center/`
- Displays workflow state badge
- Contains action buttons (Analyze, Generate Offer)

**Gap Assessment:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| Verdict display | EXISTS | Shows workflow_state |
| GO/HOLD/PASS recommendation | GAP | No explicit verdict.recommendation |
| Rationale text | GAP | No rationale string display |
| Quick actions | EXISTS | Analyze, Generate buttons |
| Confidence indicator | PARTIAL | Grade shown, not confidence_pct |

**Required Changes:**
- Add `outputs.verdict` schema with recommendation + rationale
- Display verdict recommendation prominently
- Show rationale text below verdict

---

### 2. Deal Verdict Chip

**PRD Requirement:** Compact verdict indicator showing GO/HOLD/PASS with color coding.

**Current State:**
- Component: `WorkflowStateBadge.tsx` exists
- Shows NeedsInfo / NeedsReview / ReadyForOffer

**Gap Assessment:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| Chip display | EXISTS | WorkflowStateBadge |
| Color coding | EXISTS | Green/Yellow/Red |
| GO/HOLD/PASS text | GAP | Shows workflow states instead |
| Hover tooltip | GAP | No detailed tooltip |

**Required Changes:**
- Create new `VerdictChip` component
- Map workflow states to verdict: ReadyForOffer→GO, NeedsReview→HOLD, NeedsInfo→PASS
- Add tooltip with blocking_factors

---

### 3. Price Geometry Module

**PRD Requirement:** Visual representation of floor, ceiling, ZOPA, and entry point.

**Current State:**
- Embedded visualization in UnderwriteTab
- Shows floor and ceiling values
- No explicit ZOPA calculation

**Gap Assessment:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| Floor display | EXISTS | respect_floor shown |
| Ceiling display | EXISTS | buyer_ceiling shown |
| ZOPA calculation | GAP | ceiling - floor not shown |
| ZOPA percentage | GAP | ZOPA/ARV not computed |
| Entry point | GAP | No posture-adjusted entry |
| Visual bar | PARTIAL | Basic bar exists |
| Dominant floor indicator | GAP | investor vs payoff not shown |

**Required Changes:**
- Add `outputs.price_geometry` schema:
  ```typescript
  price_geometry: {
    respect_floor: number;
    dominant_floor: 'investor' | 'payoff' | 'operational';
    buyer_ceiling: number;
    zopa: number;
    zopa_pct_of_arv: number;
    zopa_exists: boolean;
    entry_point: number;
    posture_adjustment_pct: number;
  }
  ```
- Create `PriceGeometryBar` component
- Add `PRICE_GEOMETRY_DERIVATION` trace frame

---

### 4. Profit Cockpit

**PRD Requirement:** Display profit potential across exit strategies.

**Current State:**
- `TopDealKpis` shows key metrics
- MAO values computed for wholesale/flip/wholetail
- Spread calculation exists

**Gap Assessment:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| MAO display | EXISTS | mao_wholesale, mao_flip, mao_wholetail |
| Spread display | EXISTS | spread_cash |
| Profit estimate | GAP | No profit_estimate field |
| Strategy comparison | GAP | No side-by-side comparison |
| Margin percentages | GAP | Margins not displayed |
| Recommended strategy | GAP | No explicit recommendation |

**Required Changes:**
- Add `outputs.strategy_comparison` schema:
  ```typescript
  strategy_comparison: {
    strategies: Array<{
      name: 'wholesale' | 'flip' | 'wholetail';
      mao: number;
      margin_pct: number;
      profit_estimate: number;
      risk_score: number;
      recommended: boolean;
    }>;
    primary_strategy: string;
    selection_reason: string;
  }
  ```
- Create `ProfitCockpit` component with strategy tabs
- Create `ProfitWaterfall` chart component

---

### 5. Risk Gates Panel

**PRD Requirement:** Visual display of all risk gates with status indicators.

**Current State:**
- Risk gates computed in engine
- `risk_summary` output exists with gates object
- Display embedded in UnderwriteTab

**Gap Assessment:** EXISTS (mostly complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Gate list display | EXISTS | In UnderwriteTab |
| GO/WATCH/STOP status | EXISTS | GateStatusSchema |
| Gate reasons | EXISTS | reason per gate |
| Blocking indicator | EXISTS | any_blocking flag |
| Severity levels | GAP | No critical/major/minor |
| Resolution actions | GAP | No resolution_action |

**Required Changes:**
- Enhance gate objects with severity and resolution_action
- Create standalone `RiskGatesStrip` component
- Add 8-gate taxonomy with consistent naming

---

### 6. ARV Band Widget

**PRD Requirement:** ARV confidence band visualization.

**Current State:**
- ARV displayed in TopDealKpis
- Valuation confidence computed

**Gap Assessment:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| ARV value | EXISTS | outputs.arv |
| Low/mid/high band | GAP | No band values |
| Confidence score | PARTIAL | Grade exists, not band |
| Comp-based range | GAP | Not displayed |

**Required Changes:**
- Add `outputs.arv_band` schema:
  ```typescript
  arv_band: {
    low: number;
    mid: number;
    high: number;
    confidence: number;
    source: 'comps' | 'avm' | 'manual';
  }
  ```
- Create `ArvBandWidget` component

---

### 7. Comps Evidence Pack

**PRD Requirement:** Display comparable sales used in valuation.

**Current State:**
- Comps fetched in valuation
- No dedicated comps display panel

**Gap Assessment:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| Comp list | GAP | No dedicated display |
| Comp details | GAP | Address, sale_price, sqft |
| Distance/age | GAP | Not shown |
| Adjustment display | GAP | No adjustment breakdown |

**Required Changes:**
- Add comps array to valuation output
- Create `CompsEvidencePack` component
- Display adjustments per comp

---

### 8. Comp Quality Score

**PRD Requirement:** Quality assessment of comparable sales.

**Current State:**
- No explicit comp quality scoring

**Gap Assessment:** GAP

| Feature | Status | Notes |
|---------|--------|-------|
| Quality score | GAP | Not computed |
| Quality band | GAP | excellent/good/fair/poor |
| Comp count | GAP | Not in outputs |
| Avg distance | GAP | Not computed |
| Avg age | GAP | Not computed |

**Required Changes:**
- Add `outputs.comp_quality` schema:
  ```typescript
  comp_quality: {
    comp_count: number;
    avg_distance_miles: number;
    avg_age_days: number;
    sqft_variance_pct: number;
    quality_score: number;
    quality_band: 'excellent' | 'good' | 'fair' | 'poor';
  }
  ```
- Create `CompQualityCard` component
- Add `COMP_QUALITY_SCORING` trace frame

---

### 9. Missing Evidence Checklist

**PRD Requirement:** Actionable list of missing/stale evidence.

**Current State:**
- `ConfidenceUnlock.tsx` displays HVI unlocks
- `evidence_summary` has missing_critical array

**Gap Assessment:** EXISTS

| Feature | Status | Notes |
|---------|--------|-------|
| Missing list | EXISTS | missing_critical array |
| Unlock actions | EXISTS | hvi_unlocks with actions |
| Penalty display | EXISTS | penalty_locked amount |
| Unlock value | EXISTS | unlocked_value amount |

**Required Changes:**
- Minor enhancement: consolidate evidence_summary.missing_critical with hvi_unlocks
- Ensure all evidence kinds have clear labels

---

### 10. Offer Waterfall

**PRD Requirement:** Tiered offer display with eligibility.

**Current State:**
- `OfferMenu.tsx` displays offer_menu_cash
- Base/Stretch/Premium tiers with eligibility

**Gap Assessment:** EXISTS

| Feature | Status | Notes |
|---------|--------|-------|
| Tier display | EXISTS | base/stretch/premium |
| Offer amounts | EXISTS | Per-tier offer values |
| Eligibility status | EXISTS | Per-tier eligibility |
| Blocking reasons | EXISTS | blocked_risk/blocked_evidence |

**Required Changes:**
- None required, feature complete

---

### 11. Market Velocity Card

**PRD Requirement:** Local market speed indicators.

**Current State:**
- DOM (Days on Market) used in carry calculations
- MOI (Months of Inventory) considered in margin selection
- No dedicated velocity display

**Gap Assessment:** GAP

| Feature | Status | Notes |
|---------|--------|-------|
| DOM display | GAP | Not in outputs |
| MOI display | GAP | Not in outputs |
| Velocity band | GAP | fast/balanced/slow |
| Trend indicator | GAP | Not computed |

**Required Changes:**
- Add `outputs.market_velocity` schema:
  ```typescript
  market_velocity: {
    dom_zip_days: number;
    moi_zip_months: number;
    velocity_band: 'fast' | 'balanced' | 'slow';
    liquidity_score: number;
  }
  ```
- Create `MarketVelocityCard` component
- Add `MARKET_VELOCITY_DERIVATION` trace frame

---

### 12. Liquidity Card

**PRD Requirement:** ZIP-level liquidity assessment.

**Current State:**
- ZIP tier used for investor discount
- No explicit liquidity display

**Gap Assessment:** GAP

| Feature | Status | Notes |
|---------|--------|-------|
| Liquidity score | GAP | Not computed |
| ZIP tier | PARTIAL | Used internally |
| Buyer pool indicator | GAP | Not displayed |

**Required Changes:**
- Add liquidity scoring to market_velocity output
- Create `LiquidityCard` component

---

### 13. Evidence Freshness Badges

**PRD Requirement:** Visual badges showing evidence age/status.

**Current State:**
- `evidence_summary.freshness_by_kind` computed
- Display embedded in evidence panels

**Gap Assessment:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| Freshness status | EXISTS | GO/WATCH/STOP |
| Age display | EXISTS | age_days per kind |
| Badge visual | PARTIAL | Not prominent badges |
| Expiration warning | EXISTS | expires_at field |

**Required Changes:**
- Create standalone `EvidenceFreshnessBadge` component
- Display more prominently in UI

---

### 14. Property Identity Snapshot

**PRD Requirement:** Property details card with key attributes.

**Current State:**
- Property info displayed in OverviewTab
- Shows address, beds, baths, sqft

**Gap Assessment:** EXISTS

| Feature | Status | Notes |
|---------|--------|-------|
| Address display | EXISTS | Full address |
| Property attributes | EXISTS | beds/baths/sqft |
| Photo thumbnail | PARTIAL | If photos uploaded |
| Map preview | GAP | No map integration |

**Required Changes:**
- Add map preview integration (optional)
- Enhance photo display

---

### 15. Field Mode View

**PRD Requirement:** Mobile-optimized view for field acquisitions.

**Current State:**
- No dedicated mobile/field view

**Gap Assessment:** GAP

| Feature | Status | Notes |
|---------|--------|-------|
| Mobile layout | GAP | Not implemented |
| Quick actions | GAP | No field actions |
| Offline support | GAP | Not implemented |
| Photo capture | GAP | Not implemented |

**Required Changes:**
- Create `FieldModeView` component
- Add mobile-responsive layouts
- Consider PWA capabilities

---

## Summary Table

| # | Component | Status | Priority |
|---|-----------|--------|----------|
| 1 | Decision Bar | PARTIAL | HIGH |
| 2 | Deal Verdict Chip | PARTIAL | HIGH |
| 3 | Price Geometry Module | PARTIAL | HIGH |
| 4 | Profit Cockpit | PARTIAL | MEDIUM |
| 5 | Risk Gates Panel | EXISTS | LOW |
| 6 | ARV Band Widget | PARTIAL | MEDIUM |
| 7 | Comps Evidence Pack | PARTIAL | MEDIUM |
| 8 | Comp Quality Score | GAP | MEDIUM |
| 9 | Missing Evidence Checklist | EXISTS | LOW |
| 10 | Offer Waterfall | EXISTS | LOW |
| 11 | Market Velocity Card | GAP | HIGH |
| 12 | Liquidity Card | GAP | MEDIUM |
| 13 | Evidence Freshness Badges | PARTIAL | LOW |
| 14 | Property Identity Snapshot | EXISTS | LOW |
| 15 | Field Mode View | GAP | LOW |

---

## Gap Summary by Category

### Output Schema Gaps (HIGH Priority)

| Gap | Schema Addition |
|-----|-----------------|
| Verdict | `outputs.verdict` with recommendation, rationale, blocking_factors |
| Price Geometry | `outputs.price_geometry` with zopa, entry_point, dominant_floor |
| Net Clearance | `outputs.net_clearance` with seller breakdown |
| Comp Quality | `outputs.comp_quality` with scoring |
| Market Velocity | `outputs.market_velocity` with bands |

### Trace Frame Gaps

| Gap | Frame Name |
|-----|------------|
| Price Geometry | `PRICE_GEOMETRY_DERIVATION` |
| ZOPA Calculation | `ZOPA_CALCULATION` |
| Entry Point | `ENTRY_POINT_DERIVATION` |
| Comp Quality | `COMP_QUALITY_SCORING` |
| Market Velocity | `MARKET_VELOCITY_DERIVATION` |
| Net Clearance | `NET_CLEARANCE_CALCULATION` |
| Verdict | `VERDICT_DERIVATION` |
| Strategy Comparison | `STRATEGY_COMPARISON` |

### UI Component Gaps

| Gap | Component Name |
|-----|----------------|
| Verdict Display | `VerdictCard` (enhanced) |
| Price Bar | `PriceGeometryBar` |
| Net Clearance | `NetClearanceSummary` |
| Comp Quality | `CompQualityCard` |
| Market Velocity | `MarketVelocityPanel` |
| Liquidity | `LiquidityCard` |
| Strategy Tabs | `ExitStrategyTabs` |
| Profit Chart | `ProfitWaterfall` |
| Risk Strip | `RiskGatesStrip` |
| Field View | `FieldModeView` |

---

## Recommended Implementation Order

### Phase 1: Schema Extensions (Week 1)
1. Add `outputs.verdict` schema
2. Add `outputs.price_geometry` schema
3. Add `outputs.market_velocity` schema
4. Add corresponding trace frames

### Phase 2: Engine Computation (Week 2)
1. Implement verdict derivation logic
2. Implement ZOPA and entry point calculations
3. Implement comp quality scoring
4. Implement market velocity computation

### Phase 3: UI Components (Week 3)
1. Create `VerdictCard` component
2. Create `PriceGeometryBar` component
3. Create `MarketVelocityCard` component
4. Create `CompQualityCard` component

### Phase 4: Integration (Week 4)
1. Wire new outputs to UI
2. Feature flag new components
3. Testing and refinement
4. Gradual rollout

---

## Risk Assessment

### Breaking Change Risk

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| Add new output fields | LOW | Optional/nullable fields |
| Add trace frames | LOW | Additive only |
| Modify existing outputs | HIGH | AVOID |
| New UI components | LOW | Feature flags |

### Test Coverage Impact

| Area | Current Tests | New Tests Needed |
|------|---------------|------------------|
| Engine | 32 files | +5 for new computations |
| Contracts | 5 files | +3 for new schemas |
| UI | 4 files | +8 for new components |
