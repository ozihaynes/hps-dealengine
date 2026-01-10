/**
 * Section Components Barrel Export
 * @module components/underwrite/sections
 * @slice 12 of 22
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
