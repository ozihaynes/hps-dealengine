import type { ColumnMapping } from "@hps-internal/contracts";

// =============================================================================
// TYPES
// =============================================================================

export interface NormalizedRow {
  /** Normalized payload with canonical field names */
  normalized: Record<string, string>;
  /** Original raw row data */
  raw: Record<string, unknown>;
  /** Row number (1-indexed) */
  rowNumber: number;
}

// =============================================================================
// STRING NORMALIZATION
// =============================================================================

/** Normalize a string value: trim whitespace, convert to string */
export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Normalize phone number: digits only, handle common formats */
export function normalizePhone(value: unknown): string {
  const str = normalizeString(value);
  // Remove all non-digit characters except leading +
  const digits = str.replace(/[^\d+]/g, "");
  // If starts with +1, remove it (US country code)
  if (digits.startsWith("+1")) return digits.slice(2);
  if (digits.startsWith("1") && digits.length === 11) return digits.slice(1);
  return digits;
}

/** Normalize email: lowercase, trim */
export function normalizeEmail(value: unknown): string {
  return normalizeString(value).toLowerCase();
}

/** Normalize state: uppercase, 2-letter code */
export function normalizeState(value: unknown): string {
  const str = normalizeString(value).toUpperCase();
  // Common state name to code mappings
  const stateMap: Record<string, string> = {
    FLORIDA: "FL",
    CALIFORNIA: "CA",
    TEXAS: "TX",
    "NEW YORK": "NY",
    GEORGIA: "GA",
    "NORTH CAROLINA": "NC",
    "SOUTH CAROLINA": "SC",
    ARIZONA: "AZ",
    NEVADA: "NV",
    OHIO: "OH",
    MICHIGAN: "MI",
    ILLINOIS: "IL",
    PENNSYLVANIA: "PA",
    TENNESSEE: "TN",
    ALABAMA: "AL",
    LOUISIANA: "LA",
    MISSISSIPPI: "MS",
    COLORADO: "CO",
    VIRGINIA: "VA",
    MARYLAND: "MD",
    INDIANA: "IN",
    MISSOURI: "MO",
    OREGON: "OR",
    WASHINGTON: "WA",
    KENTUCKY: "KY",
    WISCONSIN: "WI",
    MINNESOTA: "MN",
    IOWA: "IA",
    KANSAS: "KS",
    ARKANSAS: "AR",
    OKLAHOMA: "OK",
    UTAH: "UT",
    "NEW MEXICO": "NM",
    NEBRASKA: "NE",
    "WEST VIRGINIA": "WV",
    IDAHO: "ID",
    MAINE: "ME",
    "NEW HAMPSHIRE": "NH",
    "RHODE ISLAND": "RI",
    MONTANA: "MT",
    DELAWARE: "DE",
    "SOUTH DAKOTA": "SD",
    "NORTH DAKOTA": "ND",
    ALASKA: "AK",
    VERMONT: "VT",
    WYOMING: "WY",
    HAWAII: "HI",
    CONNECTICUT: "CT",
    MASSACHUSETTS: "MA",
    "NEW JERSEY": "NJ",
  };
  return stateMap[str] || str.slice(0, 2);
}

/** Normalize ZIP code: first 5 digits only */
export function normalizeZip(value: unknown): string {
  const str = normalizeString(value);
  // Extract digits, take first 5
  const digits = str.replace(/[^\d]/g, "");
  return digits.slice(0, 5);
}

/** Normalize street address: uppercase, trim extra spaces */
export function normalizeStreet(value: unknown): string {
  return normalizeString(value).toUpperCase().replace(/\s+/g, " ");
}

/** Normalize city: uppercase, trim */
export function normalizeCity(value: unknown): string {
  return normalizeString(value).toUpperCase();
}

// =============================================================================
// ROW NORMALIZATION
// =============================================================================

/**
 * Apply column mapping to convert raw row to normalized row
 */
export function normalizeRow(
  rawRow: Record<string, unknown>,
  columnMapping: ColumnMapping,
  rowNumber: number
): NormalizedRow {
  const normalized: Record<string, string> = {};

  // Apply mapping
  for (const [sourceColumn, canonicalField] of Object.entries(columnMapping)) {
    if (!canonicalField) continue; // Unmapped column

    const rawValue = rawRow[sourceColumn];

    // Apply field-specific normalization
    switch (canonicalField) {
      case "street":
        normalized.street = normalizeStreet(rawValue);
        break;
      case "city":
        normalized.city = normalizeCity(rawValue);
        break;
      case "state":
        normalized.state = normalizeState(rawValue);
        break;
      case "zip":
        normalized.zip = normalizeZip(rawValue);
        break;
      case "client_phone":
      case "seller_phone":
        normalized[canonicalField] = normalizePhone(rawValue);
        break;
      case "client_email":
      case "seller_email":
        normalized[canonicalField] = normalizeEmail(rawValue);
        break;
      default:
        normalized[canonicalField] = normalizeString(rawValue);
    }
  }

  return {
    normalized,
    raw: rawRow,
    rowNumber,
  };
}

/**
 * Normalize all rows in a batch
 */
export function normalizeRows(
  rows: Record<string, unknown>[],
  columnMapping: ColumnMapping,
  startRowNumber = 1
): NormalizedRow[] {
  return rows.map((row, index) =>
    normalizeRow(row, columnMapping, startRowNumber + index)
  );
}
