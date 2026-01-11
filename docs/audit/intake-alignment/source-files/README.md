# Source Files for Intake Alignment Fix

All files needed to understand and fix the intake → underwrite data flow.

## Files Included

| File | Original Location | Purpose |
|------|-------------------|---------|
| `intake_schema_seed.sql` | supabase/bootstrap/ | **THE SCHEMA** - Contains `schema_public_json` (form fields) and `mapping_private_json` (field mappings) |
| `v1-intake-populate.ts` | supabase/functions/v1-intake-populate/ | Edge function that applies mappings to deal |
| `populationEngine.ts` | supabase/functions/_shared/ | Core logic for mapping + transforms |
| `deal-types.ts` | apps/hps-dealengine/types.ts | TypeScript Deal interface |
| `UnderwriteTab.tsx` | apps/hps-dealengine/components/underwrite/ | Main underwrite UI (reads deal paths) |
| `IntakeForm.tsx` | apps/hps-dealengine/components/intake/ | Client-facing form renderer |
| `useSellerSituationForm.ts` | components/underwrite/sections/ | Seller section form hook (7 fields) |
| `useForeclosureForm.ts` | components/underwrite/sections/ | Foreclosure section form hook (6 fields) |
| `useLienRiskForm.ts` | components/underwrite/sections/ | Lien risk section form hook (11 fields) |
| `useSystemsStatusForm.ts` | components/underwrite/sections/systems-status/ | Systems section form hook (5 fields) |

## The Problem

**Current mapping (in intake_schema_seed.sql):**
```json
{"source_field_key": "reason_for_selling", "target_deal_path": "payload.motivation.reason"}
{"source_field_key": "roof_age", "target_deal_path": "payload.condition.roof_age_years"}
```

**What UnderwriteTab expects (in useSellerSituationForm.ts, etc.):**
```typescript
seller.reason_for_selling
systems.roof_year_installed  // Note: year, not age!
```

## The Fix

1. Update `mapping_private_json` in `intake_schema_seed.sql` to use correct paths
2. Add `ageToYear` transform in `populationEngine.ts`
3. Create migration to fix existing deals

## Key Sections in intake_schema_seed.sql

- Lines 36-112: `schema_public_json` (form field definitions)
- Lines 113-150: `mapping_private_json` (field mappings - **THIS NEEDS FIXING**)

## Key Sections in populationEngine.ts

- Lines 62-98: Transform functions (need to add `ageToYear`)
- Lines 219-305: `buildPopulationPlan()` (applies mappings)
