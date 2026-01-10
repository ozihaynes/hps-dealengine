# BEFORE STATE - Slice 14: Lien Risk Section
Generated: 2026-01-10

## Existing sections folder:
```
ForeclosureDetailsSection.tsx
ForeclosureFields.tsx
index.ts
SellerSituationFields.tsx
SellerSituationSection.tsx
useForeclosureForm.ts
useSellerSituationForm.ts
```

## Current exports from sections/index.ts:
- SellerSituationSection (Slice 12)
- SellerSituationFields
- useSellerSituationForm
- ForeclosureDetailsSection (Slice 13)
- ForeclosureFields
- useForeclosureForm

## computeLienRisk engine function (Slice 09):
- Located: lib/engine/computeLienRisk.ts
- Types exported: LienAccountStatus, LienRiskLevel, LienRiskInput, LienBreakdown, LienRiskOutput
- Constants: LIEN_THRESHOLDS, LIEN_BLOCKING_THRESHOLD (10000)

## LienAccountStatus type:
```typescript
type LienAccountStatus = 'current' | 'delinquent' | 'unknown' | 'not_applicable';
```

## LienRiskInput interface:
```typescript
interface LienRiskInput {
  hoa_status: LienAccountStatus;
  hoa_arrears_amount: number | null;
  hoa_monthly_assessment: number | null;
  cdd_status: LienAccountStatus;
  cdd_arrears_amount: number | null;
  property_tax_status: LienAccountStatus;
  property_tax_arrears: number | null;
  municipal_liens_present: boolean;
  municipal_lien_amount: number | null;
  title_search_completed: boolean;
  title_issues_notes: string | null;
}
```
