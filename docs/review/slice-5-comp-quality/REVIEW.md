# SLICE 5: Comp Quality Scorer — Review

## Summary

Implements `computeCompQuality()` function for the V2.5 Wholesaler Dashboard. This slice performs Fannie Mae-style quality assessment of comparable sales based on proximity, recency, and similarity. Produces a quality score (0-100) and band (excellent/good/fair/poor).

---

## File Manifest

> **Note:** All source files are included in this review folder for byte-for-byte verification.
> Verify integrity using: `sha256sum -c CHECKSUMS.txt`

| File | Size (bytes) | SHA-256 Checksum |
|------|-------------|------------------|
| `compQuality.ts` | 26,472 | `a54d1b6ccf0ff5e8e0807d8aed707a389114a00bcafef269a027548ca32c2a72` |
| `compQuality.spec.ts` | 44,195 | `91053bc3a0f0db6c89a8dcd83474cf118816336e78cfcfa4d779cd22146a26e2` |

**Source Location:** `packages/engine/src/slices/` and `packages/engine/src/__tests__/`

---

## Files Changed

| File | Change |
|------|--------|
| `packages/engine/src/slices/compQuality.ts` | Created — 660 lines |
| `packages/engine/src/__tests__/compQuality.spec.ts` | Created — 73 tests |
| `packages/engine/src/index.ts` | Updated exports |

## Implementation Details

### Core Function: `computeCompQuality()`

**Input Parameters:**
- `comps` — Array of comparable sales to evaluate
- `subjectSqft` — Subject property square footage

**Each Comp Contains:**
- `distance_miles` — Distance from subject in miles
- `age_days` — Age of sale in days
- `sqft` — Square footage of comp
- `sale_price` — Optional: sale price for weighting

**Output:**
- `compQuality` — CompQuality schema object
- `traceEntry` — Full audit trail with per-comp scoring details

### Scoring Algorithm

1. Start each comp at 100 points
2. Apply distance penalty: -5pts per 0.5mi over 0.5mi (max -30)
3. Apply age penalty: -5pts per 30 days over 90 days (max -30)
4. Apply sqft penalty: -10pts per 10% variance over 10% (max -20)
5. Average all comp scores
6. Apply comp count adjustment:
   - <3 comps: -20pts
   - ≥5 comps: +10pts
7. Clamp final score to 0-100
8. Assign quality band

### Quality Bands

| Band | Score Range |
|------|-------------|
| excellent | ≥ 80 |
| good | 60 - 79 |
| fair | 40 - 59 |
| poor | < 40 |

### Score Breakdown Components

- **Proximity Score**: 100 - average distance penalty
- **Recency Score**: 100 - average age penalty
- **Similarity Score**: 100 - average sqft penalty

## Policy Tokens (DEFAULT_COMP_QUALITY_POLICY)

```typescript
{
  // Distance: Ideal ≤0.5mi, -5pts per 0.5mi over, max -30pts
  distanceIdealMiles: 0.5,
  distancePenaltyPer05Mi: 5,
  distanceMaxPenalty: 30,

  // Age: Ideal ≤90 days, -5pts per 30 days over, max -30pts
  ageIdealDays: 90,
  agePenaltyPer30Days: 5,
  ageMaxPenalty: 30,

  // Sqft: Ideal ≤10% variance, -10pts per 10% over, max -20pts
  sqftVarianceIdealPct: 10,
  sqftPenaltyPer10Pct: 10,
  sqftMaxPenalty: 20,

  // Comp count: Need 3+, bonus for 5+
  minCompsRequired: 3,
  lowCompCountPenalty: 20,
  highCompCountBonus: 10,
  highCompCountThreshold: 5,

  // Quality bands
  excellentThreshold: 80,
  goodThreshold: 60,
  fairThreshold: 40,

  // Confidence threshold
  confidenceAThreshold: 70,
}
```

## Test Coverage

**73 tests** covering:

1. **Individual Comp Scoring** — Distance, age, sqft penalties
2. **Aggregate Calculations** — Averages, max values
3. **Comp Count Adjustments** — Penalty for low count, bonus for high count
4. **Quality Band Assignment** — All four bands
5. **Score Breakdown** — Proximity, recency, similarity scores
6. **Edge Cases** — No comps, zero sqft, identical comps
7. **Custom Policy** — Override thresholds and penalties
8. **Helper Functions** — `calculateIdealCompCharacteristics()`, `areCompsSufficient()`
9. **Input Validation** — Negative value detection
10. **Trace Entry** — Rule name, used fields, per-comp details

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

## Example Usage

```typescript
import { computeCompQuality, areCompsSufficient } from "@hps-internal/engine";

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
// result.compQuality.meets_confidence_threshold = true

const sufficient = areCompsSufficient(result.compQuality);
// sufficient = true (3+ comps, score >= 70)
```

## Helper Functions

### `calculateIdealCompCharacteristics(targetScore, policy)`

Calculates what comp characteristics would achieve a target score. Useful for understanding quality requirements.

```typescript
const ideal = calculateIdealCompCharacteristics(80);
// { maxDistanceMiles: 1.0, maxAgeDays: 120, maxSqftVariancePct: 10 }
```

### `areCompsSufficient(compQuality, minScore, minCount, usePrecomputed)`

Determines if comps are sufficient for high-confidence valuation.

**Parameters:**
- `minScore` — Minimum quality score (default: 70)
- `minCount` — Minimum comp count (default: 3)
- `usePrecomputed` — If true, use `meets_confidence_threshold` field instead of re-comparing score (default: false)

## Integration Notes

- Consumes contracts from `@hps-internal/contracts` (CompQuality, CompQualityBand, CompQualityScoringMethod)
- Returns pure computation result with trace entry
- Per-comp scoring details included in trace for audit
- No side effects or external dependencies
- All thresholds configurable via policy tokens

---

## P2 Enhancement: Score Breakdown Semantics + usePrecomputed Option (Commit 731ede2)

### Issue 1: Score Breakdown Semantics

The `score_breakdown` fields (`proximity_score`, `recency_score`, `similarity_score`) had unclear semantics. They are NOT per-dimension scores but rather "100 minus penalty" values that show how much each dimension contributed to the total penalty.

### Solution

Added clarifying comment explaining the semantics:

```typescript
// NOTE: The score_breakdown fields (proximity_score, recency_score, similarity_score)
// represent "100 minus the average penalty for that dimension", NOT independent
// dimension-specific scores. The final quality_score is computed as:
// avgCompScore + countAdjustment, where avgCompScore already incorporates all
// dimension penalties. The breakdown is for debugging/explanation purposes only.
```

### Issue 2: areCompsSufficient Consistency

The `areCompsSufficient()` helper re-computed score comparison against threshold, but the `computeCompQuality()` function already computed `meets_confidence_threshold`. This could lead to inconsistency if different thresholds were used.

### Solution

Added `usePrecomputed` parameter to allow using the pre-computed `meets_confidence_threshold` field:

```typescript
export function areCompsSufficient(
  compQuality: CompQuality,
  minScore: number = 70,
  minCount: number = 3,
  usePrecomputed: boolean = false
): boolean {
  const countOk = compQuality.comp_count >= minCount;

  if (usePrecomputed) {
    // Use the pre-computed meets_confidence_threshold field
    return countOk && (compQuality.meets_confidence_threshold ?? false);
  }

  // Default: compare score against provided threshold
  return countOk && compQuality.quality_score >= minScore;
}
```

### Tests Added

4 new tests covering:
- Score breakdown semantics verification
- `usePrecomputed=true` uses `meets_confidence_threshold`
- `usePrecomputed=true` with undefined `meets_confidence_threshold` returns false
- `usePrecomputed=true` with `meets_confidence_threshold=false` returns false
