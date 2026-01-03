# SLICE 8: Risk Gates 8-Taxonomy — Review

## Summary

Implements `computeRiskGates()` function for the V2.5 Wholesaler Dashboard. This slice evaluates 8 PRD-defined risk gates, determines blocking status using severity ranking, and produces a risk score with recommended actions.

---

## File Manifest

> **Note:** All source files are included in this review folder for byte-for-byte verification.
> Verify integrity using: `sha256sum -c CHECKSUMS.txt`

| File | Lines | SHA-256 Checksum |
|------|-------|------------------|
| `riskGates.ts` | 818 | `01a4153e8c43fd6d8af3740b902b3e3f0fa0ef11b0dd571c3d9f704d97a37d20` |
| `riskGates.spec.ts` | 1,114 | `d4eac241da185a80c52f65416fdd04cc5c590cfe485daa726fc7e4cfa93fda80` |
| `riskGatesContract.ts` | 149 | `fa89044ce9ae63571f3aefc74a845100eb4e1fe793fd3929a42391c809cfa8d3` |

**Source Location:** `packages/engine/src/slices/` and `packages/engine/src/__tests__/`

---

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/riskGates.ts` | Created — 149 lines |
| `packages/engine/src/slices/riskGates.ts` | Created — 818 lines |
| `packages/engine/src/__tests__/riskGates.spec.ts` | Created — 112 tests |
| `packages/contracts/src/index.ts` | Updated exports |
| `packages/engine/src/index.ts` | Updated exports |

## Implementation Details

### Core Function: `computeRiskGates()`

**Input Parameters:**
- `insurability` — RiskGateInput with status, severity, reason
- `title` — RiskGateInput
- `flood` — RiskGateInput
- `bankruptcy` — RiskGateInput
- `liens` — RiskGateInput
- `condition` — RiskGateInput
- `market` — RiskGateInput
- `compliance` — RiskGateInput

**Output:**
- `riskGates` — RiskGatesResult with all 8 gates evaluated
- `traceEntry` — Full audit trail for debugging

### Severity Ranking System

```typescript
const SEVERITY_RANK = {
  critical: 1,  // Most severe (lowest rank)
  major: 2,
  minor: 3,     // Least severe (highest rank)
};
```

**Critical Design Decision:** Using numeric ranks prevents string comparison bugs:
- `"critical" < "major"` alphabetically is WRONG
- `SEVERITY_RANK["critical"] < SEVERITY_RANK["major"]` is CORRECT

### `isAtLeastAsSevere()` Function

```typescript
function isAtLeastAsSevere(severityA, severityB): boolean {
  return SEVERITY_RANK[severityA] <= SEVERITY_RANK[severityB];
}
```

Examples:
- `isAtLeastAsSevere("critical", "major")` → `true` (1 <= 2)
- `isAtLeastAsSevere("major", "critical")` → `false` (2 <= 1)
- `isAtLeastAsSevere("minor", "major")` → `false` (3 <= 2)

### Blocking Logic (3 Explicit Branches)

The `shouldGateBlock()` function uses 3 traced branches:

| Branch | Condition | Result |
|--------|-----------|--------|
| `pass_never_blocks` | status === "pass" | Never blocks |
| `unknown_blocks_per_policy` | status === "unknown" && unknownBlocks[gate] | Blocks if policy says so |
| `fail_severity_blocks` | status === "fail" && severity >= threshold | Blocks if severity meets threshold |

### Risk Gate Taxonomy

| Gate | Label | Unknown Blocks |
|------|-------|----------------|
| insurability | Insurability | Yes |
| title | Title | Yes |
| flood | Flood | No |
| bankruptcy | Bankruptcy | Yes |
| liens | Liens | Yes |
| condition | Condition | No |
| market | Market | No |
| compliance | Compliance | No |

### Score Calculation

Starting from base score (100):
- Subtract `penaltyPerCritical` (default 25) for each critical failure
- Subtract `penaltyPerMajor` (default 15) for each major failure
- Subtract `penaltyPerMinor` (default 5) for each minor failure
- Subtract `penaltyPerUnknown` (default 10) for each unknown status
- Clamp result to 0-100

### Risk Band Classification

| Band | Threshold |
|------|-----------|
| low | >= 80 |
| moderate | >= 60 |
| elevated | >= 40 |
| high | >= 20 |
| critical | < 20 |

### Helper Functions Exported

1. `createAllPassInput()` — Returns input with all 8 gates passing
2. `createAllUnknownInput()` — Returns input with all 8 gates unknown
3. `getGatesRequiringAttention(riskGates)` — Returns failed/unknown gates sorted by severity
4. `isGateBlocking(riskGates, gateKey)` — Checks if specific gate is blocking
5. `countGatesAtSeverity(riskGates, severity)` — Counts gates at severity level
6. `hasAnyCritical(riskGates)` — True if any gate has critical severity
7. `allGatesPass(riskGates)` — True if all gates pass (no failures/unknowns)
8. `isAtLeastAsSevere(severityA, severityB)` — Rank-based severity comparison
9. `SEVERITY_RANK` — Exported constant for external use

## Policy Tokens (DEFAULT_RISK_GATES_POLICY)

```typescript
{
  // Blocking configuration
  blockingSeverityThreshold: "major",
  unknownBlocks: {
    insurability: true,
    title: true,
    flood: false,
    bankruptcy: true,
    liens: true,
    condition: false,
    market: false,
    compliance: false,
  },

  // Score weights
  baseScore: 100,
  penaltyPerCritical: 25,
  penaltyPerMajor: 15,
  penaltyPerMinor: 5,
  penaltyPerUnknown: 10,

  // Band thresholds
  lowThreshold: 80,
  moderateThreshold: 60,
  elevatedThreshold: 40,
  highThreshold: 20,
}
```

## Test Coverage

**112 tests** covering:

1. **SEVERITY_RANK Constant** (4 tests)
   - Rank ordering verification
   - Individual rank values

2. **isAtLeastAsSevere()** (9 tests)
   - All combinations of severity comparisons
   - Verified using rank-based logic

3. **All Gates Pass** (8 tests)
   - Score 100, "low" band
   - No blocking gates
   - Correct counts and recommendations

4. **All Gates Unknown** (6 tests)
   - Score penalty applied
   - Correct gates block based on policy
   - Attention gates tracked

5. **Single Gate Failures** (12 tests)
   - Critical penalty (-25)
   - Major penalty (-15)
   - Minor penalty (-5)
   - Blocking behavior per severity

6. **Blocking Logic** (16 tests)
   - Pass never blocks
   - Unknown blocks per policy
   - Fail blocks based on severity threshold
   - Custom threshold behavior

7. **Score Calculation** (5 tests)
   - Mixed failures
   - Unknown penalties
   - Clamping to 0-100
   - Custom penalty values

8. **Risk Bands** (6 tests)
   - All 5 bands tested
   - Custom thresholds

9. **Trace Entry** (5 tests)
   - Rule name, used fields
   - Per-gate evaluation with branches
   - Score breakdown

10. **Input Validation** (5 tests)
    - Fail without severity
    - Non-fail with severity

11. **Policy Validation** (4 tests)
    - Negative penalties
    - Band ordering
    - Penalty ordering

12. **Helper Functions** (24 tests)
    - All 7 helper functions tested

13. **Recommended Actions** (5 tests)
    - Priority-based recommendations

14. **Gate Labels** (1 test)
    - Human-readable labels

15. **Max Severity Tracking** (4 tests)
    - Correct max severity calculation

16. **Reason Passthrough** (2 tests)
    - Reason preserved in results

## Example Usage

```typescript
import {
  computeRiskGates,
  createAllPassInput,
  getGatesRequiringAttention,
  isAtLeastAsSevere,
  SEVERITY_RANK,
} from "@hps-internal/engine";

// Basic computation
const input = createAllPassInput();
input.title = { status: "fail", severity: "major", reason: "Lien found" };
input.condition = { status: "fail", severity: "minor", reason: "Minor repairs" };

const { riskGates, traceEntry } = computeRiskGates(input);
// riskGates.risk_score = 80 (100 - 15 - 5)
// riskGates.risk_band = "low"
// riskGates.any_blocking = true (title is major, meets threshold)
// riskGates.blocking_gates = ["title"]

// Check if major is at least as severe as minor
isAtLeastAsSevere("major", "minor"); // true

// Get gates requiring attention (sorted by severity)
const attention = getGatesRequiringAttention(riskGates);
// [title (blocking, major), condition (non-blocking, minor)]
```

## Integration Notes

- Imports `RiskGateKeySchema` and `RiskGateSeveritySchema` from `riskGatesEnhanced.ts` to avoid duplication
- Returns pure computation result with trace entry
- No side effects or external dependencies
- All thresholds configurable via policy tokens

---

## Contract Schema

Created `packages/contracts/src/riskGates.ts` with:

- `RiskGateStatusSchema` — Enum: "pass" | "fail" | "unknown"
- `RiskBandSchema` — Enum: "low" | "moderate" | "elevated" | "high" | "critical"
- `RiskGateInputSchema` — Input for single gate
- `RiskGatesInputSchema` — Input for all 8 gates
- `RiskGateResultSchema` — Result for single gate
- `RiskGatesResultSchema` — Aggregate result with counts, score, band

---

## Bug Prevention Patterns Applied

1. **SEVERITY_RANK constant** — Prevents string comparison bugs
2. **isAtLeastAsSevere() with rank comparison** — Uses `<=` on numeric ranks
3. **Three explicit blocking branches** — Traced for debugging
4. **Defensive handling of null severity** — Treats as critical when blocking
5. **Input/policy validation** — Returns actionable error messages
