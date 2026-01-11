# AFTER STATE - Slice 13: Foreclosure Details Section
Generated: 2026-01-10

## Files in sections/:
- useForeclosureForm.ts (form state hook)
- ForeclosureFields.tsx (form fields component)
- ForeclosureDetailsSection.tsx (main section component)
- index.ts (barrel export - updated)

## Exports from sections/index.ts (new additions):
- ForeclosureDetailsSection (component)
- ForeclosureDetailsSectionProps (type)
- ForeclosureFields (component)
- ForeclosureFieldsProps (type)
- useForeclosureForm (hook)
- getVisibleFields (function)
- ForeclosureStatus (type)
- ForeclosureFormData (type)
- TimelinePreview (type)
- ForeclosureFormState (type)
- UseForeclosureFormReturn (type)

## Accessibility Checks:
- htmlFor labels: 6 (all fields have associated labels)
- aria-describedby: present (on all inputs for errors)
- aria-invalid: present (on all inputs when invalid)
- role="alert": present (on error messages)
- Touch targets (h-11 = 44px): present (on all inputs)

## Form Fields (6 total, conditionally visible):
1. foreclosure_status - select (7 options) - ALWAYS VISIBLE
2. days_delinquent - number input - visible: pre_foreclosure+
3. first_missed_payment_date - date input - visible: pre_foreclosure+
4. lis_pendens_date - date input - visible: lis_pendens_filed+
5. judgment_date - date input - visible: judgment_entered+
6. auction_date - date input - visible: sale_scheduled+

## Progressive Disclosure (getVisibleFields):
| Status | Visible Fields |
|--------|----------------|
| none | foreclosure_status |
| pre_foreclosure | + days_delinquent, first_missed_payment_date |
| lis_pendens_filed | + lis_pendens_date |
| judgment_entered | + judgment_date |
| sale_scheduled | + auction_date |
| post_sale_redemption | all fields |
| reo_bank_owned | all fields |

## FL Statute References in Labels:
- Lis Pendens Date: "(FL 702.10)"
- Judgment Date: "(FL 45.031)"
- Auction Date: "(FL 45.031)"

## Integration:
- Uses SectionAccordion from @/components/underwrite/accordion
- Uses computeForeclosureTimeline from @/lib/engine
- Uses design tokens from @/components/underwrite/utils

## Typecheck Result:
PASS - No errors
