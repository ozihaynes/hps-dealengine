# Valuation Provider Pause - v2 Archive

**Date:** 2026-01-06
**Status:** Paused (code preserved, not deleted)
**Reason:** Strategic pivot to free public data architecture

---

## Overview

The following valuation features were implemented in v2 but have been paused to enable a strategic pivot toward a free public data scraping architecture. All code remains in the codebase (not deleted) and can be re-enabled via feature flags when budget or business needs align.

---

## Paused Features

### 1. ATTOM Public Records Subject Normalizer

**Purpose:** Enriches subject property data from ATTOM's public records API (beds, baths, sqft, year_built, property_type, lat/long).

**File Locations:**
- `supabase/functions/_shared/publicRecordsSubject.ts` - ATTOM API calls and normalization logic
- `packages/contracts/src/publicRecordsSubject.ts` - TypeScript types for normalized data
- `supabase/functions/_shared/valuationSnapshot.ts` - Integration point (calls `fetchPublicRecordsSubject`)

**Policy Tokens:** `valuation.public_records_subject.enabled`, `valuation.public_records_subject.prefer_over_rentcast_subject`

**Re-enablement:** Set `FEATURE_ATTOM_ENABLED=true` environment variable

---

### 2. RentCast Adapter (Sale Listings + AVM)

**Purpose:** Fetches property valuations (AVM), sale listing comps, market data, and subject property details from RentCast API.

**File Locations:**
- `supabase/functions/_shared/valuationSnapshot.ts` - All RentCast API calls:
  - `fetchRentcastSubject()` - Subject property lookup
  - `fetchRentcastAvm()` - AVM estimate + listing comps
  - `fetchRentcastMarket()` - Market statistics (DOM, etc.)
  - `fetchRentcastClosedSales()` - Closed sales comps
  - `fetchClosedSalesLadder()` - Multi-stage comp fetching
- `supabase/functions/_shared/rentcastAddress.ts` - Address formatting utilities
- `supabase/functions/v1-connectors-proxy/index.ts` - Snapshot proxy endpoint

**Environment Variables:** `RENTCAST_API_KEY`

**Re-enablement:** Set `FEATURE_RENTCAST_ENABLED=true` environment variable

---

### 3. Ensemble + Uncertainty + Ceiling Guardrail

**Purpose:**
- **Ensemble:** Blends comp-based ARV with AVM estimate using configurable weights
- **Uncertainty:** Computes confidence ranges (p_low/p_high quantiles)
- **Ceiling:** Caps ensemble value at percentile of active listings

**File Locations:**
- `supabase/functions/v1-valuation-run/index.ts` - Main valuation run (lines ~590-915)
  - `computeEnsemble()` call and output merging
  - `computeUncertainty()` call and output merging
- `supabase/functions/_shared/valuationEnsemble.ts` - Ensemble computation logic
- `supabase/functions/_shared/valuationUncertainty.ts` - Uncertainty range computation

**Policy Tokens:**
- `valuation.ensemble.enabled`, `valuation.ensemble.weights`, `valuation.ensemble.version`
- `valuation.uncertainty.enabled`, `valuation.uncertainty.p_low`, `valuation.uncertainty.p_high`
- `valuation.ceiling.enabled`, `valuation.ceiling.method`, `valuation.ceiling.max_over_pct`

**Re-enablement:** Set `FEATURE_ENSEMBLE_ENABLED=true` environment variable

---

### 4. Calibration Loop MVP

**Purpose:** Auto-calibrates valuation weights based on ground truth data (actual sale prices). Includes:
- Auto-trigger on ground truth attachment
- Per-market/home-band weight publishing
- Freeze/fallback guardrails
- Parent market blending

**File Locations:**
- `supabase/functions/v1-valuation-continuous-calibrate/index.ts` - Main calibration endpoint
- `supabase/functions/_shared/continuousCalibration.ts` - Calibration algorithms
- `supabase/functions/_shared/calibrationFreeze.ts` - Freeze decision logic
- `supabase/functions/_shared/valuationCalibrationWeights.ts` - Weight loading/publishing
- `supabase/functions/_shared/valuationBuckets.ts` - Market/home bucketing

**Database Tables (preserved):**
- `valuation_calibration_buckets` - Per-strategy metrics by market/home band
- `valuation_weights` - Published versioned weights
- `valuation_calibration_freezes` - Market freeze switches

**Admin UI:**
- `apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx` - Calibration freeze toggle

**Re-enablement:** Set `FEATURE_CALIBRATION_ENABLED=true` environment variable

---

## Features Kept Active

### Comp Overrides (Concessions/Condition)

**Why Active:** Data-agnostic adjustment layer that works with any comp data source, including future free scraped data.

**File Locations:**
- `supabase/functions/v1-valuation-run/index.ts` - Override loading and application (lines ~274-388)
- Database table: `valuation_comp_overrides`
- Admin UI: Valuation QA overrides CRUD

**Policy Tokens:** `valuation.concessions.enabled`, `valuation.condition.enabled`

---

### Ground-Truth / Eval Harness

**Why Active:** Essential for validating accuracy of any data source, including the planned free public data solution.

**File Locations:**
- Database tables: `valuation_ground_truth`, `valuation_eval_runs`
- Admin UI: `apps/hps-dealengine/app/(app)/admin/valuation-qa/page.tsx`
- Scripts: `scripts/valuation/eval-harness.ps1`
- Edge Function: `supabase/functions/v1-valuation-eval-run/index.ts`

---

### Market Time Adjustment (FHFA/FRED HPI)

**Status:** Active, to be reviewed/refined separately

**File Locations:**
- `supabase/functions/_shared/marketIndex.ts` - HPI lookup and adjustment
- Database table: `market_index_hpi_cache`

---

## Re-enablement Instructions

### Prerequisites
1. Ensure API keys are configured in Supabase Edge environment:
   - `RENTCAST_API_KEY` for RentCast
   - `ATTOM_API_KEY` for ATTOM

2. Review and update policy tokens for the org if defaults need adjustment

### Steps

1. **Update Feature Flags:**
   In Supabase Edge Function environment variables, set:
   ```
   FEATURE_RENTCAST_ENABLED=true
   FEATURE_ATTOM_ENABLED=true
   FEATURE_ENSEMBLE_ENABLED=true
   FEATURE_CALIBRATION_ENABLED=true
   ```

2. **Redeploy Functions:**
   ```powershell
   supabase functions deploy v1-connectors-proxy
   supabase functions deploy v1-valuation-run
   supabase functions deploy v1-valuation-continuous-calibrate
   ```

3. **Verify Policy Tokens:**
   Ensure org policies have the feature tokens enabled:
   - `valuation.public_records_subject.enabled = true`
   - `valuation.ensemble.enabled = true`
   - `valuation.uncertainty.enabled = true`
   - `valuation.ceiling.enabled = true`

4. **Test:**
   ```powershell
   pnpm -w typecheck
   pnpm -w test
   scripts/valuation/coverage-smoke.ps1
   ```

---

## v3 Roadmap Consideration

When evaluating re-enablement for v3:

1. **Free Data Validation First:** Use the eval harness to validate accuracy of free scraped data (target MAE/MAPE thresholds TBD)

2. **Budget Review:** Assess if paid provider costs are justified by accuracy improvements over free data

3. **Incremental Re-enablement:** Consider enabling features one at a time:
   - Start with ATTOM for subject enrichment (typically lower cost)
   - Add RentCast AVM if ensemble proves valuable
   - Enable calibration only after sufficient ground truth volume

---

## Evidence

- Pause Date: 2026-01-06
- Feature Flag Implementation: `supabase/functions/_shared/valuationFeatureFlags.ts`
- Client Feature Flags: `apps/hps-dealengine/lib/featureFlags.ts`
- Devlog Entry: `docs/devlog-hps-dealengine.md` (2026-01-06)
- Roadmap Update: `docs/roadmap-v1-v2-v3.md` (Paused Features section)

---

**Last Updated:** 2026-01-06
**Maintainer:** HPS DealEngine Team
