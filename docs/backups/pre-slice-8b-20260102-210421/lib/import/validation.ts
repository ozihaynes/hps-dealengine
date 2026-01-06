import type {
  ValidationError,
  CanonicalField,
} from "@hps-internal/contracts";

// =============================================================================
// VALIDATION RULES
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/; // After normalization, should be 10 digits
const ZIP_REGEX = /^\d{5}$/;
const STATE_REGEX = /^[A-Z]{2}$/;

export const REQUIRED_FIELDS: CanonicalField[] = [
  "street",
  "city",
  "state",
  "zip",
  "client_name",
  "client_phone",
  "client_email",
];

// =============================================================================
// FIELD VALIDATORS
// =============================================================================

function validateRequired(
  value: string | undefined,
  field: string
): ValidationError | null {
  if (!value || value.trim() === "") {
    return {
      field,
      message: `${formatFieldName(field)} is required`,
      rule_id: "required",
    };
  }
  return null;
}

function validateEmail(
  value: string | undefined,
  field: string
): ValidationError | null {
  if (!value) return null; // Required check handles empty
  if (!EMAIL_REGEX.test(value)) {
    return {
      field,
      message: `Invalid email format`,
      rule_id: "invalid_email",
    };
  }
  return null;
}

function validatePhone(
  value: string | undefined,
  field: string
): ValidationError | null {
  if (!value) return null; // Required check handles empty
  if (!PHONE_REGEX.test(value)) {
    return {
      field,
      message: `Phone must be 10 digits`,
      rule_id: "invalid_phone",
    };
  }
  return null;
}

function validateZip(
  value: string | undefined,
  field: string
): ValidationError | null {
  if (!value) return null;
  if (!ZIP_REGEX.test(value)) {
    return {
      field,
      message: `ZIP must be 5 digits`,
      rule_id: "invalid_zip",
    };
  }
  return null;
}

function validateState(
  value: string | undefined,
  field: string
): ValidationError | null {
  if (!value) return null;
  if (!STATE_REGEX.test(value)) {
    return {
      field,
      message: `State must be 2-letter code`,
      rule_id: "invalid_state",
    };
  }
  return null;
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// ROW VALIDATION
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a normalized row
 */
export function validateRow(
  normalizedRow: Record<string, string>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const error = validateRequired(normalizedRow[field], field);
    if (error) errors.push(error);
  }

  // Field-specific validation (only if field has value)
  const emailError = validateEmail(normalizedRow.client_email, "client_email");
  if (emailError) errors.push(emailError);

  const sellerEmailError = validateEmail(
    normalizedRow.seller_email,
    "seller_email"
  );
  if (sellerEmailError) errors.push(sellerEmailError);

  const phoneError = validatePhone(normalizedRow.client_phone, "client_phone");
  if (phoneError) errors.push(phoneError);

  const sellerPhoneError = validatePhone(
    normalizedRow.seller_phone,
    "seller_phone"
  );
  if (sellerPhoneError) errors.push(sellerPhoneError);

  const zipError = validateZip(normalizedRow.zip, "zip");
  if (zipError) errors.push(zipError);

  const stateError = validateState(normalizedRow.state, "state");
  if (stateError) errors.push(stateError);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple rows and return summary
 */
export interface BatchValidationResult {
  validCount: number;
  invalidCount: number;
  results: Array<{
    rowNumber: number;
    isValid: boolean;
    errors: ValidationError[];
  }>;
  errorsByField: Record<string, number>;
}

export function validateRows(
  rows: Array<{ rowNumber: number; normalized: Record<string, string> }>
): BatchValidationResult {
  const results: BatchValidationResult["results"] = [];
  const errorsByField: Record<string, number> = {};
  let validCount = 0;
  let invalidCount = 0;

  for (const row of rows) {
    const validation = validateRow(row.normalized);

    if (validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
      for (const error of validation.errors) {
        errorsByField[error.field] = (errorsByField[error.field] || 0) + 1;
      }
    }

    results.push({
      rowNumber: row.rowNumber,
      isValid: validation.isValid,
      errors: validation.errors,
    });
  }

  return {
    validCount,
    invalidCount,
    results,
    errorsByField,
  };
}
