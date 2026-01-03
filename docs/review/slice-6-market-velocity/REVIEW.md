# SLICE 6: Market Velocity Metrics — Review

## Summary

Implements `computeMarketVelocity()` function for the V2.5 Wholesaler Dashboard. This slice calculates local market speed indicators (DOM, MOI, Absorption Rate, Sale-to-List ratio) and produces a velocity band classification and liquidity score that drive carry assumptions and urgency signals in the UI.

## Files Changed

| File | Change |
|------|--------|
| `packages/engine/src/slices/marketVelocity.ts` | Created — 657 lines |
| `packages/engine/src/__tests__/marketVelocity.spec.ts` | Created — 77 tests |
| `packages/engine/src/index.ts` | Updated exports |

## Implementation Details

### Core Function: `computeMarketVelocity()`

**Input Parameters:**
- `domZipDays` — Days on Market for ZIP code
- `moiZipMonths` — Months of Inventory for ZIP code
- `absorptionRate` — Sales per month (nullable)
- `saleToListPct` — Sale-to-list price ratio as percentage (nullable)
- `cashBuyerSharePct` — Cash buyer share in ZIP as percentage (nullable)

**Output:**
- `marketVelocity` — MarketVelocity schema object
- `traceEntry` — Full audit trail
- `marketCondition` — sellers_market | balanced_market | buyers_market | unknown
- `holdTimeMultiplier` — Carry cost adjustment factor
- `urgencySignal` — high | medium | low for UI display

### Velocity Band Classification

Uses both DOM and MOI to determine band, taking the MORE CONSERVATIVE (slower) assessment:

| Band | DOM Threshold | MOI Threshold |
|------|--------------|---------------|
| hot | ≤ 14 days | ≤ 2 months |
| warm | ≤ 30 days | ≤ 4 months |
| balanced | ≤ 60 days | ≤ 6 months |
| cool | ≤ 90 days | ≤ 9 months |
| cold | > 90 days | > 9 months |

### Liquidity Score Calculation (0-100)

Weighted components:
- **DOM component (40%)**: Score of 100 at ideal (14 days), -1 point per day over
- **MOI component (40%)**: Score of 100 at ideal (2 months), -10 points per month over
- **Cash buyer component (20%)**: Linear scale from 0% to ideal (30% = 100)

### Hold Time Multipliers

| Band | Multiplier | Impact |
|------|-----------|--------|
| hot | 0.75 | 25% faster than baseline |
| warm | 1.0 | Baseline |
| balanced | 1.25 | 25% slower |
| cool | 1.5 | 50% slower |
| cold | 2.0 | Double hold time |

### Market Condition Classification

Based on sale-to-list ratio:
- **sellers_market**: ≥ 100%
- **balanced_market**: 95% - 100%
- **buyers_market**: < 95%
- **unknown**: when saleToListPct is null

### Helper Functions Exported

1. `validateMarketVelocityInput()` — Returns array of validation errors
2. `estimateDaysToSell(band, baselineDays)` — Estimates expected days to sell
3. `shouldFavorQuickExit(result)` — True for hot/warm markets with liquidity ≥ 60
4. `suggestCarryMonths(band, baselineMonths)` — Suggested carry months
5. `recommendDispositionStrategy(result)` — Returns assignment | double_close | hold_for_appreciation

## Policy Tokens (DEFAULT_MARKET_VELOCITY_POLICY)

```typescript
{
  // DOM thresholds
  hotMaxDom: 14,
  warmMaxDom: 30,
  balancedMaxDom: 60,
  coolMaxDom: 90,

  // MOI thresholds
  hotMaxMoi: 2,
  warmMaxMoi: 4,
  balancedMaxMoi: 6,
  coolMaxMoi: 9,

  // Liquidity score weights (sum to 1.0)
  liquidityDomWeight: 0.4,
  liquidityMoiWeight: 0.4,
  liquidityCashBuyerWeight: 0.2,
  liquidityIdealDom: 14,
  liquidityIdealMoi: 2,
  liquidityIdealCashBuyerPct: 30,

  // Sale-to-list thresholds
  sellerMarketSaleToListPct: 100,
  buyerMarketSaleToListPct: 95,
}
```

## Test Coverage

**77 tests** covering:

1. **Velocity Band Classification** (10 tests)
   - Hot, warm, balanced, cool, cold markets
   - DOM-MOI combination logic (conservative band selection)

2. **Liquidity Score** (12 tests)
   - DOM component calculation
   - MOI component calculation
   - Cash buyer component calculation
   - Weighted combination
   - Edge cases (zero, null values)

3. **Market Condition** (6 tests)
   - Seller's market, balanced, buyer's market
   - Unknown when saleToListPct is null

4. **Hold Time Multiplier** (5 tests)
   - All five velocity bands

5. **Urgency Signal** (6 tests)
   - High, medium, low signals
   - Based on band and liquidity score

6. **Input Validation** (8 tests)
   - Negative value detection
   - Range validation

7. **Helper Functions** (18 tests)
   - estimateDaysToSell()
   - shouldFavorQuickExit()
   - suggestCarryMonths()
   - recommendDispositionStrategy()

8. **Trace Entry** (4 tests)
   - Rule name verification
   - Used fields verification
   - Details structure

9. **Edge Cases** (8 tests)
   - Very large values (capped at cold/0)
   - Very small values (floored at hot/100)
   - All null optional fields
   - Custom policy overrides

## Example Usage

```typescript
import {
  computeMarketVelocity,
  estimateDaysToSell,
  shouldFavorQuickExit,
} from "@hps-internal/engine";

const result = computeMarketVelocity({
  domZipDays: 21,
  moiZipMonths: 3.5,
  absorptionRate: 45,
  saleToListPct: 98.5,
  cashBuyerSharePct: 25,
});

// result.marketVelocity.velocity_band = 'warm'
// result.marketVelocity.liquidity_score = 72
// result.holdTimeMultiplier = 1.0
// result.urgencySignal = 'high'
// result.marketCondition = 'balanced_market'

const daysToSell = estimateDaysToSell('warm'); // 30
const quickExit = shouldFavorQuickExit(result); // true (warm + liquidity 72)
```

## Integration Notes

- Consumes contracts from `@hps-internal/contracts` (MarketVelocity, VelocityBand)
- Returns pure computation result with trace entry
- No side effects or external dependencies
- All thresholds configurable via policy tokens
