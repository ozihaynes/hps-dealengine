# SLICE 5: Comp Quality Scorer — Review Document

**Date:** 2026-01-03
**Status:** Complete
**Author:** Claude Code

## Overview

This slice implements the `computeCompQuality()` function for the V2.5 Wholesaler Dashboard. It performs Fannie Mae-style quality assessment of comparable sales based on:

- **Proximity**: Distance from subject property
- **Recency**: Age of sale
- **Similarity**: Square footage variance

Produces a quality score (0-100) and band (excellent/good/fair/poor).

## Files Created/Modified

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/engine/src/slices/compQuality.ts` | 485 | Core comp quality scoring function |
| `packages/engine/src/__tests__/compQuality.spec.ts` | 1100 | Unit tests (69 test cases) |

### Modified Files

| File | Change |
|------|--------|
| `packages/engine/src/index.ts` | Added exports for compQuality slice |

## API Surface

### computeCompQuality(input, policy?)

Main computation function that produces a `CompQuality` output with trace entry.

```typescript
import { computeCompQuality, DEFAULT_COMP_QUALITY_POLICY } from '@hps-internal/engine';

const result = computeCompQuality({
  comps: [
    { distance_miles: 0.3, age_days: 45, sqft: 1800 },
    { distance_miles: 0.7, age_days: 60, sqft: 1750 },
    { distance_miles: 0.5, age_days: 30, sqft: 1850 }
  ],
  subjectSqft: 1800
});

// result.compQuality.quality_score = 95
// result.compQuality.quality_band = 'excellent'
// result.traceEntry contains audit trail data
```

### Policy Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `distanceIdealMiles` | 0.5 | No penalty threshold for distance |
| `distancePenaltyPer05Mi` | 5 | Penalty points per 0.5mi over ideal |
| `distanceMaxPenalty` | 30 | Maximum distance penalty |
| `ageIdealDays` | 90 | No penalty threshold for age |
| `agePenaltyPer30Days` | 5 | Penalty points per 30 days over ideal |
| `ageMaxPenalty` | 30 | Maximum age penalty |
| `sqftVarianceIdealPct` | 10 | No penalty threshold for sqft variance (%) |
| `sqftPenaltyPer10Pct` | 10 | Penalty points per 10% over ideal |
| `sqftMaxPenalty` | 20 | Maximum sqft penalty |
| `minCompsRequired` | 3 | Below this triggers penalty |
| `lowCompCountPenalty` | 20 | Penalty for < minCompsRequired |
| `highCompCountBonus` | 10 | Bonus for 5+ comps |
| `highCompCountThreshold` | 5 | Threshold for bonus |
| `excellentThreshold` | 80 | Minimum score for "excellent" |
| `goodThreshold` | 60 | Minimum score for "good" |
| `fairThreshold` | 40 | Minimum score for "fair" |
| `confidenceAThreshold` | 70 | Minimum for confidence grade A |

### Input Interface

```typescript
interface CompForScoring {
  distance_miles: number;  // Distance from subject
  age_days: number;        // Age of sale
  sqft: number;            // Square footage
  sale_price?: number;     // Optional for weighting
}

interface CompQualityInput {
  comps: CompForScoring[];  // Array of comparable sales
  subjectSqft: number;      // Subject property sqft
}
```

### Output Interface

Returns a `CompQualityResult` containing:
- `compQuality`: Full `CompQuality` object matching contract schema
- `traceEntry`: `TraceEntry` for audit trail

## Scoring Algorithm (Fannie Mae Style)

1. **Start each comp at 100 points**

2. **Apply distance penalty:**
   - Ideal: ≤ 0.5 miles (no penalty)
   - Penalty: -5 points per 0.5mi over ideal
   - Maximum: -30 points

3. **Apply age penalty:**
   - Ideal: ≤ 90 days (no penalty)
   - Penalty: -5 points per 30 days over ideal
   - Maximum: -30 points

4. **Apply sqft variance penalty:**
   - Ideal: ≤ 10% variance (no penalty)
   - Penalty: -10 points per 10% over ideal
   - Maximum: -20 points

5. **Average all comp scores**

6. **Apply comp count adjustment:**
   - < 3 comps: -20 points
   - ≥ 5 comps: +10 points

7. **Clamp final score to 0-100**

8. **Assign quality band**

## Quality Bands

| Band | Score Range |
|------|-------------|
| Excellent | ≥ 80 |
| Good | 60-79 |
| Fair | 40-59 |
| Poor | < 40 |

## Test Coverage

| Category | Tests | Pass |
|----------|-------|------|
| Perfect comps | 3 | ✓ |
| Distance penalties | 5 | ✓ |
| Age penalties | 5 | ✓ |
| Sqft variance penalties | 5 | ✓ |
| Comp count adjustments | 6 | ✓ |
| Quality bands | 5 | ✓ |
| Combined penalties | 2 | ✓ |
| Trace frame emission | 6 | ✓ |
| Score breakdown | 4 | ✓ |
| Confidence threshold | 3 | ✓ |
| Custom policy | 5 | ✓ |
| Edge cases | 6 | ✓ |
| Input validation | 6 | ✓ |
| Helper functions | 8 | ✓ |
| **Total** | **69** | ✓ |

## Integration Notes

### Wiring in Engine

To integrate with `computeUnderwriting()`:

```typescript
import { computeCompQuality } from './slices/compQuality';

// After getting comp data:
const qualityResult = computeCompQuality({
  comps: compData.map(c => ({
    distance_miles: c.distance,
    age_days: Math.floor((Date.now() - c.sale_date) / (1000 * 60 * 60 * 24)),
    sqft: c.sqft
  })),
  subjectSqft: inputs.sqft
});

outputs.comp_quality = qualityResult.compQuality;
trace.push(qualityResult.traceEntry);
```

### Trace Frame

The function emits a `COMP_QUALITY` trace entry with:
- Input values (comp_count, subject_sqft)
- Per-comp scoring (individual penalties and scores)
- Aggregates (avg_distance, avg_age, avg_variance, avg_score)
- Adjustments (comp_count_adjustment, reason)
- Result (raw_score, final_score, quality_band)
- Score breakdown (proximity, recency, similarity)
- Policy tokens used

## Helper Functions

### validateCompQualityInput(input)

Validates input for sanity checks (no negative values).

```typescript
const errors = validateCompQualityInput(input);
if (errors.length > 0) {
  throw new Error(errors.join(', '));
}
```

### calculateIdealCompCharacteristics(targetScore, policy?)

Calculates what comp characteristics would achieve a target score.

```typescript
const ideal = calculateIdealCompCharacteristics(90);
// ideal.maxDistanceMiles = 1.0
// ideal.maxAgeDays = 120
// ideal.maxSqftVariancePct = 10
```

### areCompsSufficient(compQuality, minScore?, minCount?)

Checks if comps meet sufficiency criteria for high-confidence valuation.

```typescript
if (areCompsSufficient(compQuality)) {
  confidenceGrade = 'A';
}
```

## Breaking Changes

None. This is an additive change only.

## Dependencies

- `@hps-internal/contracts` for `CompQuality`, `CompQualityBand`, `CompQualityScoringMethod` types
- Uses existing `TraceEntry` type from engine/types

## Exports Added

```typescript
export {
  computeCompQuality,
  validateCompQualityInput,
  calculateIdealCompCharacteristics,
  areCompsSufficient,
  DEFAULT_COMP_QUALITY_POLICY,
  type CompQualityPolicy,
  type CompQualityInput,
  type CompQualityResult,
  type CompForScoring,
} from './slices/compQuality';
```

## Next Steps

1. Wire `computeCompQuality()` into `compute_underwriting.ts`
2. Create UI component `CompQualityBadge` to display quality band
3. Integrate into ARV confidence calculation
4. Add comp quality to Trading Strip view
