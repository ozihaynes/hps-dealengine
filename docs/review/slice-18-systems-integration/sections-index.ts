/**
 * Section Components Barrel Export
 * @module components/underwrite/sections
 * @slice 12-14, 18 of 22
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

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEMS STATUS (Slice 18)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SystemsStatusSection,
  SystemsStatusFields,
  useSystemsStatusForm,
} from './systems-status';

export type {
  SystemsStatusSectionProps,
  SystemsStatusFieldsProps,
  SystemsStatusFormData,
  UseSystemsStatusFormOptions,
  UseSystemsStatusFormReturn,
} from './systems-status';
