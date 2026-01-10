# BEFORE STATE - Slice 09: Compute Lien Risk
Generated: 2026-01-10

## Existing engine files:
- computeForeclosureTimeline.ts
- computeForeclosureTimeline.test.ts
- computeMotivationScore.ts
- computeMotivationScore.test.ts
- portfolio-utils.ts
- index.ts

## Current engine barrel exports:
- computeMotivationScore (Slice 07)
- computeForeclosureTimeline (Slice 08)
- portfolio-utils functions

## Contracts lien types check:
Found in packages/contracts/src/underwrite/enums.ts:
- LienStatus: 'none' | 'current' | 'delinquent' | 'in_arrears' | 'unknown'
- RiskLevel: 'low' | 'medium' | 'high' | 'critical'

Note: Will define LienAccountStatus locally as spec requires different values:
'current' | 'delinquent' | 'unknown' | 'not_applicable'
