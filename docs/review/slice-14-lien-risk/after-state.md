# AFTER STATE - Slice 14: Lien Risk Section
Generated: 2026-01-10

## Files in sections/:
```
ForeclosureDetailsSection.tsx
ForeclosureFields.tsx
index.ts
LienRiskFields.tsx         (NEW - Slice 14)
LienRiskSection.tsx        (NEW - Slice 14)
SellerSituationFields.tsx
SellerSituationSection.tsx
useForeclosureForm.ts
useLienRiskForm.ts         (NEW - Slice 14)
useSellerSituationForm.ts
```

## New exports from sections/index.ts:
- LienRiskSection
- LienRiskSectionProps
- LienRiskFields
- LienRiskFieldsProps
- useLienRiskForm
- LIEN_STATUS_OPTIONS
- LienAccountStatus (re-export from engine)
- LienRiskLevel (re-export from engine)
- LienRiskFormData
- LienPreview
- LienRiskFormState
- UseLienRiskFormReturn

## Accessibility checks:
- htmlFor labels: 7 (status selects, checkboxes, textarea)
- aria-describedby: Present in CurrencyInput component (reused 5 times)
- aria-invalid: Present in CurrencyInput component
- role="alert": Present in CurrencyInput component
- fieldsets: 5 (HOA, CDD, Property Tax, Municipal, Title)
- legends: 5 (matching fieldsets)

## FL Statute references:
- FL 720.3085 referenced in:
  - useLienRiskForm.ts (JSDoc)
  - LienRiskFields.tsx (JSDoc + UI labels)
  - LienRiskSection.tsx (JSDoc + warning message)

## Features Implemented:
1. Running total with risk level indicator (low/medium/high/critical)
2. Breakdown by category (HOA, CDD, Property Tax, Municipal)
3. FL 720.3085 joint liability warning
4. Blocking threshold indicator ($10,000)
5. Currency input formatting with $ prefix
6. Non-negative amount validation
7. Evidence needed display
8. Conditional municipal lien amount field

## Typecheck result: PASS
