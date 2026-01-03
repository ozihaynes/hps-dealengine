# SLICE 2: Price Geometry Engine — Review Document

**Date:** 2026-01-03
**Status:** Complete
**Author:** Claude Code

## Overview

This slice implements the `computePriceGeometry()` function for the V2.5 Wholesaler Dashboard. It calculates the Zone of Possible Agreement (ZOPA), entry point positioning, and dominant floor determination for negotiation leverage visualization.

## Files Created/Modified

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/engine/src/slices/priceGeometry.ts` | 329 | Core computation function |
| `packages/engine/src/__tests__/priceGeometry.spec.ts` | 420 | Unit tests (44 test cases) |

### Modified Files

| File | Change |
|------|--------|
| `packages/engine/src/index.ts` | Added exports for priceGeometry slice |

## API Surface

### computePriceGeometry(input, policy?)

Main computation function that produces a `PriceGeometry` output with trace entry.

```typescript
import { computePriceGeometry, DEFAULT_PRICE_GEOMETRY_POLICY } from '@hps-internal/engine';

const result = computePriceGeometry({
  respectFloor: 150000,
  dominantFloor: 'investor',
  floorInvestor: 150000,
  floorPayoff: 140000,
  buyerCeiling: 200000,
  sellerStrike: 175000,
  arv: 250000,
  posture: 'base'
});

// result.priceGeometry contains the computed PriceGeometry object
// result.traceEntry contains audit trail data
```

### Policy Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `entryPointPctConservative` | 0.25 | Entry point % into ZOPA (conservative) |
| `entryPointPctBase` | 0.50 | Entry point % into ZOPA (base) |
| `entryPointPctAggressive` | 0.75 | Entry point % into ZOPA (aggressive) |
| `minZopaThreshold` | 5000 | Minimum ZOPA in dollars |
| `minZopaPctOfArv` | 2.0 | Minimum ZOPA as % of ARV |

### Input Interface

```typescript
interface PriceGeometryInput {
  respectFloor: number;       // Max of investor/payoff floors
  dominantFloor: DominantFloorType;  // 'investor' | 'payoff' | 'operational'
  floorInvestor: number | null;      // Investor floor component
  floorPayoff: number | null;        // Payoff floor component
  buyerCeiling: number;              // Maximum buyer can pay
  sellerStrike: number | null;       // Seller's asking price (null if unknown)
  arv: number;                       // After Repair Value
  posture: Posture;                  // 'conservative' | 'base' | 'aggressive'
}
```

### Output Interface

Returns a `PriceGeometryResult` containing:
- `priceGeometry`: Full `PriceGeometry` object matching contract schema
- `traceEntry`: `TraceEntry` for audit trail

## ZOPA Calculation Logic

1. **Effective Floor Determination:**
   - If seller strike is known: `max(sellerStrike, respectFloor)`
   - If seller strike unknown: `respectFloor`

2. **ZOPA Calculation:**
   - `ZOPA = buyerCeiling - effectiveFloor`
   - Returns `null` if ZOPA <= 0

3. **ZOPA Existence:**
   - `zopa_exists = true` only if ZOPA >= `minZopaThreshold` ($5k default)

4. **ZOPA Band Classification:**
   - `wide`: >= 10% of ARV
   - `moderate`: 5-10% of ARV
   - `narrow`: < 5% of ARV
   - `none`: No ZOPA

## Entry Point Calculation Logic

1. **Get Posture Percentage:**
   - Conservative: 25% into ZOPA from floor
   - Base: 50% into ZOPA (midpoint)
   - Aggressive: 75% into ZOPA (closer to ceiling)

2. **Calculate Entry Point:**
   - If ZOPA exists: `floor + (ZOPA * posturePct)`
   - If no ZOPA: Falls back to `respectFloor`

3. **Posture Mapping:**
   - Engine uses `base` internally
   - Output maps to `balanced` for UI consistency

## Test Coverage

| Category | Tests | Pass |
|----------|-------|------|
| ZOPA calculation | 7 | ✓ |
| ZOPA band classification | 4 | ✓ |
| Entry point calculation | 5 | ✓ |
| Custom policy handling | 4 | ✓ |
| Trace entry emission | 5 | ✓ |
| Floor/ceiling pass-through | 4 | ✓ |
| Edge cases | 6 | ✓ |
| Input validation | 9 | ✓ |
| **Total** | **44** | ✓ |

## Integration Notes

### Wiring in Engine

To integrate with `computeUnderwriting()`:

```typescript
import { computePriceGeometry } from './slices/priceGeometry';

// In compute_underwriting.ts, after computing floor/ceiling:
const priceGeometryResult = computePriceGeometry({
  respectFloor: outputs.respect_floor,
  dominantFloor: determineDominantFloor(...),
  floorInvestor: outputs.floor_investor ?? null,
  floorPayoff: outputs.payoff_plus_essentials ?? null,
  buyerCeiling: outputs.buyer_ceiling,
  sellerStrike: deal.seller_strike ?? null,
  arv: outputs.arv,
  posture: policy.posture,
});

outputs.price_geometry = priceGeometryResult.priceGeometry;
trace.push(priceGeometryResult.traceEntry);
```

### Trace Frame

The function emits a `PRICE_GEOMETRY` trace entry with:
- All input values
- Computation details (effective floor, entry point %)
- Output values
- Policy tokens used

## Breaking Changes

None. This is an additive change only.

## Dependencies

- `@hps-internal/contracts` for type definitions
- Uses existing `Posture` type from contracts
- Uses existing `TraceEntry` type from engine/types

## Next Steps

1. Wire `computePriceGeometry()` into `compute_underwriting.ts`
2. Create UI component `PriceGeometryBar` to visualize output
3. Add feature flag for gradual rollout
