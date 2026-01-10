# BEFORE STATE - Slice 18: Systems Status Integration
Generated: 2026-01-10

## Current sections folder:
total 144
drwxr-xr-x 1 oziha 197609     0 Jan 10 11:39 .
drwxr-xr-x 1 oziha 197609     0 Jan 10 11:42 ..
-rw-r--r-- 1 oziha 197609  9048 Jan 10 11:11 ForeclosureDetailsSection.tsx
-rw-r--r-- 1 oziha 197609 15989 Jan 10 11:22 ForeclosureFields.tsx
-rw-r--r-- 1 oziha 197609  3463 Jan 10 11:39 index.ts
-rw-r--r-- 1 oziha 197609 16651 Jan 10 11:38 LienRiskFields.tsx
-rw-r--r-- 1 oziha 197609 10076 Jan 10 11:30 LienRiskSection.tsx
-rw-r--r-- 1 oziha 197609 11912 Jan 10 10:56 SellerSituationFields.tsx
-rw-r--r-- 1 oziha 197609  6753 Jan 10 10:56 SellerSituationSection.tsx
-rw-r--r-- 1 oziha 197609 17951 Jan 10 11:08 useForeclosureForm.ts
-rw-r--r-- 1 oziha 197609 15958 Jan 10 11:29 useLienRiskForm.ts
-rw-r--r-- 1 oziha 197609 13135 Jan 10 10:56 useSellerSituationForm.ts

## Current sections exports:
/**
 * Section Components Barrel Export
 * @module components/underwrite/sections
 * @slice 12-14 of 22
 *
 * This module exports form section components for the underwriting page.
 * Each section wraps a form with SectionAccordion and provides state management.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER SITUATION (Slice 12)
// ═══════════════════════════════════════════════════════════════════════════════

export { SellerSituationSection } from './SellerSituationSection';
export type { SellerSituationSectionProps } from './SellerSituationSection';

export { SellerSituationFields } from './SellerSituationFields';
export type { SellerSituationFieldsProps } from './SellerSituationFields';

export { useSellerSituationForm } from './useSellerSituationForm';
export type {
  SellerSituationFormData,
  SellerSituationFormState,
  MotivationPreview,
  UseSellerSituationFormReturn,
} from './useSellerSituationForm';

// Re-export types from contracts for convenience
export type {
  ReasonForSelling,
  SellerTimeline,
  DecisionMakerStatus,
} from './useSellerSituationForm';

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE DETAILS (Slice 13)
// ═══════════════════════════════════════════════════════════════════════════════

export { ForeclosureDetailsSection } from './ForeclosureDetailsSection';
export type { ForeclosureDetailsSectionProps } from './ForeclosureDetailsSection';

export { ForeclosureFields } from './ForeclosureFields';
export type { ForeclosureFieldsProps } from './ForeclosureFields';

export { useForeclosureForm, getVisibleFields } from './useForeclosureForm';
export type {
  ForeclosureStatus,
  ForeclosureFormData,
  TimelinePreview,
  ForeclosureFormState,
  UseForeclosureFormReturn,
} from './useForeclosureForm';

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN RISK (Slice 14)
// ═══════════════════════════════════════════════════════════════════════════════

export { LienRiskSection } from './LienRiskSection';
export type { LienRiskSectionProps } from './LienRiskSection';

export { LienRiskFields } from './LienRiskFields';
export type { LienRiskFieldsProps } from './LienRiskFields';

export { useLienRiskForm, LIEN_STATUS_OPTIONS } from './useLienRiskForm';
export type {
  LienAccountStatus,
  LienRiskLevel,
  LienRiskFormData,
  LienPreview,
  LienRiskFormState,
  UseLienRiskFormReturn,
} from './useLienRiskForm';

## SystemsStatusCard already exists:
- visualizations/SystemsStatusCard.tsx ✅
- visualizations/SystemRULBar.tsx ✅

## Types to use:
- SystemsStatusInput from @hps-internal/contracts
- PropertyCondition from @hps-internal/contracts
- DeferredMaintenance from @hps-internal/contracts
- PROPERTY_CONDITION_OPTIONS from @hps-internal/contracts
- DEFERRED_MAINTENANCE_OPTIONS from @hps-internal/contracts
