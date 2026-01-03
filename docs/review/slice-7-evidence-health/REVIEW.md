# SLICE 7: Evidence Health Calculator — Review

## Summary

Implements `computeEvidenceHealth()` function for the V2.5 Wholesaler Dashboard. This slice tracks freshness status for 5 PRD-defined evidence types and produces a health score, band classification, and recommended actions to guide underwriting decisions.

---

## File Manifest

> **Note:** All source files are included in this review folder for byte-for-byte verification.
> Verify integrity using: `sha256sum -c CHECKSUMS.txt`

| File | Lines | SHA-256 Checksum |
|------|-------|------------------|
| `evidenceHealth.ts` | 738 | `513eb28be531e8bce695f5e7dc51030b0ee13b235c57ffd3cbe3269b9a2bc898` |
| `evidenceHealth.spec.ts` | 1,016 | `b2e4706f1fc1c75dee346dcf8c0d1b00f7fe82b45ed30c4f4c0877abc89207f8` |

**Source Location:** `packages/engine/src/slices/` and `packages/engine/src/__tests__/`

---

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/evidenceHealth.ts` | Created — 97 lines |
| `packages/engine/src/slices/evidenceHealth.ts` | Created — 738 lines |
| `packages/engine/src/__tests__/evidenceHealth.spec.ts` | Created — 62 tests |
| `packages/contracts/src/index.ts` | Updated exports |
| `packages/engine/src/index.ts` | Updated exports |

## Implementation Details

### Core Function: `computeEvidenceHealth()`

**Input Parameters:**
- `payoffLetter` — EvidenceInput with obtainedDate (ISO string or null)
- `titleCommitment` — EvidenceInput with obtainedDate
- `insuranceQuote` — EvidenceInput with obtainedDate
- `fourPointInspection` — EvidenceInput with obtainedDate
- `repairEstimate` — EvidenceInput with obtainedDate
- `referenceDate` — Optional reference date for age calculation (defaults to now)

**Output:**
- `evidenceHealth` — EvidenceHealth schema object with all 5 items evaluated
- `traceEntry` — Full audit trail for debugging

### Evidence Types and Freshness Thresholds

| Evidence Type | Freshness Threshold | Critical |
|---------------|---------------------|----------|
| Payoff Letter | 30 days | Yes |
| Title Commitment | 60 days | Yes |
| Insurance Quote | 30 days | Yes |
| Four-Point Inspection | 90 days | No |
| Repair Estimate | 60 days | No |

### Freshness Status Logic

Using `>` (strictly greater) for stale, so exactly at threshold is still fresh:
- `null` age → "missing"
- `age <= threshold` → "fresh"
- `age > threshold` → "stale"

### Health Score Calculation

Starting from 0:
- Add `pointsPerFreshItem` (default 20) for each fresh item
- Subtract `penaltyPerStaleItem` (default 10) for each stale item
- Subtract `penaltyPerMissingItem` (default 20) for each missing item
- Subtract additional `penaltyPerMissingCritical` (default 10) for missing critical items
- Clamp result to 0-100

### Health Band Classification

| Band | Threshold |
|------|-----------|
| excellent | ≥ 80 |
| good | ≥ 60 |
| fair | ≥ 40 |
| poor | < 40 |

### Recommended Action Priority

1. Missing critical evidence (highest priority)
2. Stale critical evidence
3. Missing non-critical evidence (with count)
4. Stale non-critical evidence (with count)
5. "All evidence current — ready for underwriting" (when all fresh)

### Helper Functions Exported

1. `validateEvidenceHealthInput()` — Returns array of validation errors for date formats
2. `validateEvidenceHealthPolicy()` — Returns array of validation warnings for policy
3. `isEvidenceSufficient(health, minScore)` — True when no critical missing AND score >= threshold
4. `getEvidenceNeedingAttention(health)` — Returns items sorted by priority (critical first, missing before stale)
5. `getDaysUntilSoonestExpiration(health)` — Days until earliest fresh item becomes stale

## Policy Tokens (DEFAULT_EVIDENCE_HEALTH_POLICY)

```typescript
{
  // Freshness thresholds (days)
  payoffLetterFreshnessDays: 30,
  titleCommitmentFreshnessDays: 60,
  insuranceQuoteFreshnessDays: 30,
  fourPointInspectionFreshnessDays: 90,
  repairEstimateFreshnessDays: 60,

  // Criticality flags
  payoffLetterCritical: true,
  titleCommitmentCritical: true,
  insuranceQuoteCritical: true,
  fourPointInspectionCritical: false,
  repairEstimateCritical: false,

  // Score weights
  pointsPerFreshItem: 20,
  penaltyPerStaleItem: 10,
  penaltyPerMissingItem: 20,
  penaltyPerMissingCritical: 10,

  // Band thresholds
  excellentThreshold: 80,
  goodThreshold: 60,
  fairThreshold: 40,
}
```

## Test Coverage

**62 tests** covering:

1. **All Evidence Fresh** (3 tests)
   - Score 100 with all fresh items
   - Correct item details returned
   - Ready for underwriting recommendation

2. **All Evidence Missing** (4 tests)
   - Score 0 with all missing items
   - Critical items flagged correctly
   - Recommended action for missing critical
   - Null values for missing items

3. **Stale Evidence** (6 tests)
   - Stale status for each evidence type exceeding threshold
   - Stale penalty applied to health score
   - Stale critical evidence tracking
   - Recommended action for stale critical

4. **Boundary Conditions** (3 tests)
   - Exactly at threshold = fresh
   - 1 day over threshold = stale
   - Future dates treated as 0 days old

5. **Health Score Calculation** (4 tests)
   - Mixed fresh/stale/missing calculation
   - Additional penalty for missing critical
   - Score clamped to 0 minimum
   - Score clamped to 100 maximum

6. **Health Bands** (5 tests)
   - Excellent, good, fair, poor assignment
   - Custom band thresholds respected

7. **Recommended Actions** (4 tests)
   - Priority: missing critical > stale critical > missing non-critical > stale non-critical
   - Count-based recommendations for non-critical

8. **Trace Entry** (4 tests)
   - Rule name verification
   - Used fields verification
   - Per-item evaluation details
   - Score calculation breakdown

9. **Custom Policy Overrides** (3 tests)
   - Custom freshness thresholds
   - Custom criticality flags
   - Custom scoring weights

10. **Reference Date Handling** (1 test)
    - Defaults to current date when not specified

11. **Input Validation** (5 tests)
    - Valid input returns no errors
    - Invalid date format detection
    - Multiple invalid dates
    - Invalid reference date
    - Null dates accepted

12. **Policy Validation** (5 tests)
    - Default policy returns no warnings
    - Non-positive thresholds detected
    - Negative score weights detected
    - Band threshold ordering check
    - Max possible score check

13. **Helper Functions** (15 tests)
    - isEvidenceSufficient() behavior
    - getEvidenceNeedingAttention() sorting
    - getDaysUntilSoonestExpiration() calculation

14. **Item Details** (4 tests)
    - All 5 items in PRD order
    - Human-readable labels
    - Critical flags per default policy
    - Freshness thresholds per type

## Example Usage

```typescript
import {
  computeEvidenceHealth,
  isEvidenceSufficient,
  getEvidenceNeedingAttention,
} from "@hps-internal/engine";

const result = computeEvidenceHealth({
  payoffLetter: { obtainedDate: "2026-01-01" },
  titleCommitment: { obtainedDate: "2025-12-15" },
  insuranceQuote: { obtainedDate: null }, // missing
  fourPointInspection: { obtainedDate: "2025-10-01" }, // stale
  repairEstimate: { obtainedDate: "2025-12-20" },
});

// result.evidenceHealth.health_score = ~40
// result.evidenceHealth.health_band = 'fair'
// result.evidenceHealth.any_critical_missing = true
// result.evidenceHealth.recommended_action = "Obtain missing critical evidence: Insurance Quote"

const sufficient = isEvidenceSufficient(result.evidenceHealth); // false (critical missing)
const needsAttention = getEvidenceNeedingAttention(result.evidenceHealth);
// [ insuranceQuote (missing critical), fourPointInspection (stale non-critical) ]
```

## Integration Notes

- Consumes contracts from `@hps-internal/contracts` (EvidenceHealth, EvidenceItemHealth, EvidenceType)
- Returns pure computation result with trace entry
- No side effects or external dependencies
- All thresholds configurable via policy tokens

---

## Contract Schema

Created `packages/contracts/src/evidenceHealth.ts` with:

- `EvidenceFreshnessStatusSchema` — Enum: "fresh" | "stale" | "missing"
- `EvidenceTypeSchema` — Enum of 5 evidence types
- `EvidenceItemHealthSchema` — Per-item evaluation result
- `EvidenceHealthSchema` — Aggregate health with counts, score, band, and recommendations
