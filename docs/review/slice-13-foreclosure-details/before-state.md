# BEFORE STATE - Slice 13: Foreclosure Details Section
Generated: 2026-01-10

## Existing sections folder:
- SellerSituationSection.tsx
- SellerSituationFields.tsx
- useSellerSituationForm.ts
- index.ts

## Current exports from sections/index.ts:
- SellerSituationSection
- SellerSituationFields
- useSellerSituationForm
- Types: SellerSituationFormData, SellerSituationFormState, etc.

## Dependencies (from Slice 08):
- computeForeclosureTimeline exported from @/lib/engine
- ForeclosureTimelineInput, ForeclosureTimelineOutput types
- FL_FORECLOSURE_STAGES constant
- URGENCY_THRESHOLDS, URGENCY_MOTIVATION_BOOST

## ForeclosureStatus enum values:
- none
- pre_foreclosure
- lis_pendens_filed
- judgment_entered
- sale_scheduled
- post_sale_redemption
- reo_bank_owned

## FL Statute References:
- FL 702.10 - Foreclosure timeline procedures
- FL 45.031 - Judicial sale requirements
- FL 45.0315 - Right of redemption (10 days post-sale)
