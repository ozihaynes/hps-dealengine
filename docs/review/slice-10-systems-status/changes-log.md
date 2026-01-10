# Changes Log - Slice 10: Compute Systems Status

## Generated
2026-01-10

## Summary
Created the fourth and final Phase 2 engine function for calculating
remaining useful life (RUL) for major property systems with condition
derivation and replacement cost estimation.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| computeSystemsStatus.ts | lib/engine/ | Main engine function |
| computeSystemsStatus.test.ts | lib/engine/ | Unit tests (52 tests) |

## Files Modified

| File | Change |
|------|--------|
| lib/engine/index.ts | Added systems status exports |

## System Expected Life (Central FL)

| System | Expected Life | Replacement Cost |
|--------|---------------|------------------|
| Roof (shingle) | 25 years | $15,000 |
| HVAC | 15 years | $8,000 |
| Water Heater | 12 years | $1,500 |

## Condition Thresholds

| Condition | RUL % Range |
|-----------|-------------|
| good | > 40% |
| fair | 20-40% |
| poor | 1-20% |
| critical | 0% |

## RUL Formula
```
age = max(0, referenceYear - yearInstalled)
RUL = max(0, expectedLife - age)
```

## Key Features

- Pure function with injectable referenceYear
- Calculates RUL for roof, HVAC, water heater
- Derives condition from RUL percentage
- Identifies urgent replacements (RUL = 0)
- Calculates total replacement cost
- Handles null years gracefully (no false urgency flags)
- Handles future install years (age = 0)
- Handles NaN/Infinity as null
- Full breakdown in system_scores
- Imports types from @hps-internal/contracts
- Uses constants from @hps-internal/contracts

## Types Imported from Contracts

- SystemsStatusInput
- SystemsStatusOutput
- SystemScore
- SystemCondition

## Constants Imported from Contracts

- ROOF_EXPECTED_LIFE (25)
- HVAC_EXPECTED_LIFE (15)
- WATER_HEATER_EXPECTED_LIFE (12)
- ROOF_REPLACEMENT_COST (15000)
- HVAC_REPLACEMENT_COST (8000)
- WATER_HEATER_REPLACEMENT_COST (1500)

## Types Defined Locally

- SystemType ('roof' | 'hvac' | 'water_heater')

## Constants Defined Locally

- SYSTEM_EXPECTED_LIFE (Record<SystemType, number>)
- SYSTEM_REPLACEMENT_COST (Record<SystemType, number>)
- CONDITION_THRESHOLDS ({ GOOD: 40, FAIR: 20 })
