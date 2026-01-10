# Changes Log - Slice 09: Compute Lien Risk

## Generated
2026-01-10

## Summary
Created the third engine function for calculating lien risk exposure with
safe money math, FL 720.3085 joint liability warning, and blocking gate.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| computeLienRisk.ts | lib/engine/ | Main engine function |
| computeLienRisk.test.ts | lib/engine/ | Unit tests (44 total) |

## Files Modified

| File | Change |
|------|--------|
| lib/engine/index.ts | Added lien risk exports |

## Lien Risk Thresholds

| Level | Threshold | Description |
|-------|-----------|-------------|
| low | <= $2,500 | Normal closing |
| medium | $2,501 - $5,000 | Monitor |
| high | $5,001 - $10,000 | Review required |
| critical | > $10,000 | Blocking gate triggered |

## FL Statute Reference

- FL 720.3085: HOA/CDD joint and several liability
  Buyer becomes jointly liable for unpaid assessments at closing

## Key Features

- Pure function, deterministic output
- Safe money math (no NaN, handles null/negative/Infinity)
- Sums HOA, CDD, property tax, municipal liens
- FL 720.3085 joint liability warning when HOA/CDD arrears present
- Blocking gate at > $10,000
- Net clearance adjustment (negative of total)
- Evidence needed identification
- Breakdown by lien category
- Handles JavaScript -0 edge case (converts to +0)
