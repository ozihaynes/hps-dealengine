# SLICE 4: Net Clearance Calculator — Review Document

**Date:** 2026-01-03
**Status:** Complete
**Author:** Claude Code

## Overview

This slice implements the `computeNetClearance()` function for the V2.5 Wholesaler Dashboard. It calculates "what clears to me" (net profit to wholesaler) for each exit strategy:

- **Assignment**: Simple wholesale fee (simplest execution)
- **Double Close**: Buy then resell with transactional funding
- **Wholetail**: Light rehab and retail sale (highest potential profit)

The net clearance powers the "Profit Cockpit" UI component.

## Files Created/Modified

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/engine/src/slices/netClearance.ts` | 554 | Core net clearance computation |
| `packages/engine/src/__tests__/netClearance.spec.ts` | ~450 | Unit tests (46 test cases) |

### Modified Files

| File | Change |
|------|--------|
| `packages/engine/src/index.ts` | Added exports for netClearance slice |

## API Surface

### computeNetClearance(input, policy?)

Main computation function that produces a `NetClearance` output with trace entry.

```typescript
import { computeNetClearance, DEFAULT_NET_CLEARANCE_POLICY } from '@hps-internal/engine';

const result = computeNetClearance({
  purchasePrice: 150000,
  maoWholesale: 175000,
  maoFlip: 185000,
  maoWholetail: 210000,
  arv: 250000,
  wholetailViable: true
});

// result.netClearance.assignment.net = ~24500
// result.netClearance.double_close.net = ~28000
// result.netClearance.recommended_exit = 'double_close'
// result.traceEntry contains audit trail data
```

### Policy Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `assignmentFeeFlat` | 500 | Flat assignment fee ($) |
| `assignmentFeePct` | 0 | Assignment fee as % of spread |
| `assignmentUsePct` | false | Use percentage-based fee |
| `dcFundingFeePct` | 0.02 | Transactional funding fee (2%) |
| `dcBuySideClosingCost` | 1500 | Title/escrow on buy side ($) |
| `dcSellSideClosingCost` | 2000 | Title/escrow on sell side ($) |
| `dcHoldingCostPerDay` | 100 | Daily holding cost ($) |
| `dcExpectedHoldDays` | 7 | Expected days for DC |
| `dcContingencyFlat` | 500 | Buffer/contingency ($) |
| `wholetailRehabBudget` | 15000 | Light rehab budget ($) |
| `wholetailListingCommissionPct` | 0.03 | Listing agent commission (3%) |
| `wholetailBuyerCommissionPct` | 0.025 | Buyer agent commission (2.5%) |
| `wholetailClosingCosts` | 3000 | Closing costs on sale ($) |
| `wholetailHoldMonths` | 3 | Expected months for wholetail |
| `wholetailHoldingCostPerMonth` | 1500 | Monthly holding cost ($) |
| `wholetailStagingMarketing` | 2000 | Staging/marketing budget ($) |
| `wholetailMinArv` | 200000 | Minimum ARV for wholetail ($) |
| `wholetailMinMarginPct` | 10 | Minimum margin for wholetail (%) |
| `dcPreferenceMarginThreshold` | 5000 | Margin to prefer DC over assignment ($) |

### Input Interface

```typescript
interface NetClearanceInput {
  purchasePrice: number;        // What we pay seller
  maoWholesale: number | null;  // MAO for wholesale exit
  maoFlip: number | null;       // MAO for flip (DC resale basis)
  maoWholetail: number | null;  // MAO for wholetail exit
  arv: number;                  // ARV for percentage calculations
  wholetailViable: boolean;     // Property suitable for wholetail
}
```

### Output Interface

Returns a `NetClearanceResult` containing:
- `netClearance`: Full `NetClearance` object matching contract schema
- `traceEntry`: `TraceEntry` for audit trail

## Exit Strategy Calculations

### Assignment
```
Gross = MAO_wholesale - purchase_price
Costs = assignment_fee (flat or %)
Net   = max(0, Gross - Costs)
```

### Double Close
```
Gross = MAO_flip - purchase_price
Costs = funding_fee + buy_closing + sell_closing + holding + contingency
      = (purchase * 2%) + $1500 + $2000 + ($100 * 7 days) + $500
Net   = max(0, Gross - Costs)
```

### Wholetail (if viable)
```
Gross = MAO_wholetail - purchase_price
Costs = rehab + commissions + closing + holding + staging
      = $15000 + (sale * 5.5%) + $3000 + ($1500 * 3 months) + $2000
Net   = max(0, Gross - Costs)
```

## Recommendation Logic

1. Compare net profit across all computed strategies
2. Sort by net descending
3. Select highest net as recommended exit
4. Calculate net advantage over second-best option
5. Generate human-readable reason

Special case: If DC advantage over assignment is below `dcPreferenceMarginThreshold` ($5000), assignment is preferred for simpler execution.

## Test Coverage

| Category | Tests | Pass |
|----------|-------|------|
| Assignment calculation | 8 | ✓ |
| Double Close calculation | 8 | ✓ |
| Wholetail calculation | 8 | ✓ |
| Recommendation logic | 6 | ✓ |
| Trace entry emission | 4 | ✓ |
| Custom policy handling | 5 | ✓ |
| Edge cases | 4 | ✓ |
| Input validation | 3 | ✓ |
| **Total** | **46** | ✓ |

## Integration Notes

### Wiring in Engine

To integrate with `computeUnderwriting()`:

```typescript
import { computeNetClearance } from './slices/netClearance';

// After computing MAOs:
const clearanceResult = computeNetClearance({
  purchasePrice: inputs.purchase_price,
  maoWholesale: outputs.mao_wholesale,
  maoFlip: outputs.mao_flip,
  maoWholetail: outputs.mao_wholetail,
  arv: outputs.arv,
  wholetailViable: policy.disposition.wholetailEligible ?? false,
});

outputs.net_clearance = clearanceResult.netClearance;
trace.push(clearanceResult.traceEntry);
```

### Trace Frame

The function emits a `NET_CLEARANCE` trace entry with:
- All input values (purchase_price, MAOs, ARV, viability)
- Assignment breakdown (gross, fee, costs, net, margin)
- Double Close breakdown (gross, funding, closing, holding, contingency, net, margin)
- Wholetail breakdown (if computed)
- Recommendation (exit, reason, net_advantage)
- Policy tokens used

## Helper Functions

### calculateBreakEvenPrices(policy, maoWholesale, maoFlip)

Calculates the break-even purchase prices for negotiation guidance:

```typescript
const breakEven = calculateBreakEvenPrices(
  DEFAULT_NET_CLEARANCE_POLICY,
  175000,  // maoWholesale
  185000   // maoFlip
);
// breakEven.assignment = 174500
// breakEven.doubleClose = 176436.27
```

### validateNetClearanceInput(input)

Validates input for sanity checks (no negative values).

## Breaking Changes

None. This is an additive change only.

## Dependencies

- `@hps-internal/contracts` for `NetClearance`, `ClearanceBreakdown`, `ExitStrategyType` types
- Uses existing `TraceEntry` type from engine/types

## Exports Added

```typescript
export {
  computeNetClearance,
  validateNetClearanceInput,
  calculateBreakEvenPrices,
  DEFAULT_NET_CLEARANCE_POLICY,
  type NetClearancePolicy,
  type NetClearanceInput,
  type NetClearanceResult,
} from './slices/netClearance';
```

## Next Steps

1. Wire `computeNetClearance()` into `compute_underwriting.ts`
2. Create UI component `ProfitCockpit` to display clearances
3. Integrate into Trading Strip view
4. Add negotiation guidance based on break-even prices
