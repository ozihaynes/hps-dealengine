# AFTER STATE - Slice 12: Seller Situation Section
Generated: 2026-01-10

## Files in sections/:
- useSellerSituationForm.ts (form state hook)
- SellerSituationFields.tsx (form fields component)
- SellerSituationSection.tsx (main section component)
- index.ts (barrel export)

## Exports from sections/index.ts:
- SellerSituationSection (component)
- SellerSituationSectionProps (type)
- SellerSituationFields (component)
- SellerSituationFieldsProps (type)
- useSellerSituationForm (hook)
- SellerSituationFormData (type)
- SellerSituationFormState (type)
- MotivationPreview (type)
- UseSellerSituationFormReturn (type)
- ReasonForSelling (type re-export)
- SellerTimeline (type re-export)
- DecisionMakerStatus (type re-export)

## Accessibility Checks:
- htmlFor labels: 7 (all fields have associated labels)
- aria-describedby: present (on price input for errors)
- aria-invalid: present (on price input when invalid)
- role="alert": present (on error messages)
- Touch targets (h-11 = 44px): present (on checkboxes and inputs)

## Form Fields (7 total):
1. reason_for_selling - select (14 options from contracts)
2. seller_timeline - select (5 options from contracts)
3. lowest_acceptable_price - number input with $ prefix
4. decision_maker_status - select (6 options from contracts)
5. mortgage_delinquent - checkbox
6. listed_with_agent - checkbox
7. seller_notes - textarea

## Integration:
- Uses SectionAccordion from @/components/underwrite/accordion
- Uses computeMotivationScore from @/lib/engine
- Uses design tokens from @/components/underwrite/utils
- Uses options from @hps-internal/contracts

## Typecheck Result:
PASS - No errors
