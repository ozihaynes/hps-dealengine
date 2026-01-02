/**
 * Evidence type labels - SINGLE SOURCE OF TRUTH
 * Used by: IntakeForm, FileUploadZone, IntakeSubmissionDetail, EvidenceChecklist
 */
export const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  payoff_letter: "Mortgage Payoff Letter",
  mortgage_statement: "Recent Mortgage Statement",
  hoa_estoppel: "HOA Estoppel Letter",
  foreclosure_docs: "Foreclosure Documents",
  lease_agreement: "Lease Agreement",
  insurance_docs: "Insurance Documents",
  inspection_report: "Inspection Reports",
  property_photos: "Property Photos",
  title_docs: "Title Documents",
  other_docs: "Other Documents",
  // Legacy types
  intake_document: "Intake Document",
  payoff_statement: "Payoff Statement",
  title_quote: "Title Quote",
  insurance_quote: "Insurance Quote",
  repair_bid: "Repair Bid",
};

/**
 * Get a human-readable label for an evidence type key.
 * Falls back to title-casing the key if not found in the map.
 */
export function getEvidenceTypeLabel(key: string | null | undefined): string {
  if (!key) return "Document";
  return (
    EVIDENCE_TYPE_LABELS[key] ||
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}
