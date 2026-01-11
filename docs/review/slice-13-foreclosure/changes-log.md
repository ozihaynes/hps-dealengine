# Changes Log - Slice 13: Foreclosure Details Section

## Generated
2026-01-10

## Summary
Created the second form section component for Phase 3 - the Foreclosure Details
section with 6 conditional fields, real-time timeline preview, FL statute
references, date sequence validation, and full accessibility compliance.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| useForeclosureForm.ts | sections/ | Form state hook with timeline calculation |
| ForeclosureFields.tsx | sections/ | Form fields with conditional display |
| ForeclosureDetailsSection.tsx | sections/ | Main section with SectionAccordion |
| index.ts | sections/ | Barrel export (updated) |

## Form Fields (6 total)

| Field | Type | Input Type | Condition |
|-------|------|------------|-----------|
| foreclosure_status | ForeclosureStatus | select | Always visible |
| days_delinquent | number | number input | pre_foreclosure+ |
| first_missed_payment_date | string | date input | pre_foreclosure+ |
| lis_pendens_date | string | date input | lis_pendens_filed+ |
| judgment_date | string | date input | judgment_entered+ |
| auction_date | string | date input | sale_scheduled+ |

## Foreclosure Status Options

| Value | Label | FL Reference |
|-------|-------|--------------|
| none | No Foreclosure | - |
| pre_foreclosure | Pre-Foreclosure | Notice of default |
| lis_pendens_filed | Lis Pendens Filed | FL 702.10 |
| judgment_entered | Judgment Entered | FL 45.031 |
| sale_scheduled | Sale Scheduled | FL 45.031 |
| post_sale_redemption | Post-Sale Redemption | FL 45.0315 |
| reo_bank_owned | REO (Bank Owned) | Complete |

## Accessibility Features (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| Label association | All 6 inputs have `<label>` with `htmlFor` |
| Error linking | `aria-describedby` links input to error message |
| Invalid state | `aria-invalid="true"` on invalid inputs |
| Screen reader | `role="alert"` on error messages |
| Touch targets | >= 44px (h-11 class) on all interactive elements |

## Features

### Conditional Field Display (Progressive Disclosure)
- `getVisibleFields()` determines visible fields based on status
- Fields hidden when status doesn't warrant them
- Hidden fields cleared when status changes
- Touched state cleared for hidden fields

### Date Sequence Validation
- Validates: first_missed < lis_pendens < judgment < auction
- Error message: "Must be after {previous date}"
- Only validates dates that have values

### Timeline Preview
- Real-time calculation (debounced 150ms)
- Days until estimated sale display
- Urgency level indicator (none/low/medium/high/critical)
- Auction date source display
- Seller motivation boost indicator
- FL statute reference display

### Integration Points
- Uses SectionAccordion from Slice 06
- Uses computeForeclosureTimeline from Slice 08
- Uses design tokens from Slice 03

### Completion Tracking
- Counts completed fields among visible fields only
- Integrates with CompletionBadge via SectionAccordion

## Dependencies Used

| Dependency | Source | Purpose |
|------------|--------|---------|
| SectionAccordion | @/components/underwrite/accordion | Accordion wrapper |
| computeForeclosureTimeline | @/lib/engine | Timeline calculation |
| Design tokens | @/components/underwrite/utils | Styling |
| lucide-react (Scale) | npm | Section icon |

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| days_delinquent | Must be number | "Please enter a valid number" |
| days_delinquent | >= 0 | "Days cannot be negative" |
| days_delinquent | <= 3650 | "Days exceeds maximum (3650)" |
| Date fields | Sequence order | "Must be after {previous}" |
