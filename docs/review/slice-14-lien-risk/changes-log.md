# Changes Log - Slice 14: Lien Risk Section

## Generated
2026-01-10

## Summary
Created the third form section component for Phase 3 - Lien Risk assessment
with 11 fields, running total with risk level, FL joint liability warning,
and blocking threshold indicator.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| useLienRiskForm.ts | sections/ | Form state hook with lien calculation |
| LienRiskFields.tsx | sections/ | Form fields with fieldset grouping |
| LienRiskSection.tsx | sections/ | Main section with lien preview |
| index.ts (updated) | sections/ | Barrel export |

## Form Fields (11 total)

| Field | Type | Category |
|-------|------|----------|
| hoa_status | LienAccountStatus | HOA |
| hoa_arrears_amount | number | HOA |
| hoa_monthly_assessment | number | HOA |
| cdd_status | LienAccountStatus | CDD |
| cdd_arrears_amount | number | CDD |
| property_tax_status | LienAccountStatus | Property Tax |
| property_tax_arrears | number | Property Tax |
| municipal_liens_present | boolean | Municipal |
| municipal_lien_amount | number | Municipal (conditional) |
| title_search_completed | boolean | Title |
| title_issues_notes | string | Title |

## Features

### Running Total with Risk Level
- Total surviving liens calculation
- Risk levels: low, medium, high, critical
- Color-coded display (green/blue/amber/red)
- Risk badge in preview

### Breakdown by Category
- HOA liens
- CDD liens
- Property tax arrears
- Municipal liens
- Only shows categories with values > 0

### FL Legal Warnings
- FL 720.3085: Joint liability warning for HOA/CDD arrears
- Blocking gate at $10,000 threshold (from engine LIEN_BLOCKING_THRESHOLD)

### Accessibility Features (WCAG AA)
- All inputs have labels with htmlFor
- aria-describedby for error messages
- aria-invalid for invalid inputs
- role="alert" for screen readers
- fieldset/legend for grouped sections (5 groups)
- Touch targets >= 44px (h-11 class on inputs)

### Currency Input Component
- Reusable CurrencyInput with $ prefix
- Non-negative validation
- Decimal step (100)
- Error display with accessibility

### Evidence Needed
- Displays list of evidence still required
- Based on computeLienRisk engine output

## Dependencies Used

| Dependency | Source | Purpose |
|------------|--------|---------|
| SectionAccordion | @/components/underwrite/accordion | Accordion wrapper |
| computeLienRisk | @/lib/engine | Lien calculation |
| LIEN_BLOCKING_THRESHOLD | @/lib/engine | Blocking threshold constant |
| Design tokens | @/components/underwrite/utils | Styling (colors, typography, card, focus) |
| lucide-react | npm | Icons (DollarSign, AlertTriangle) |

## Integration Notes

- Uses same patterns as ForeclosureDetailsSection (Slice 13)
- Debounced lien calculation (150ms) for performance
- Real-time preview updates as user types
- Stable onChange ref to prevent infinite loops
- Conditional field visibility (municipal amount only when liens present)
