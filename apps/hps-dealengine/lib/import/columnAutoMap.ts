import type { CanonicalField, ColumnMapping } from "@hps-internal/contracts";

// =============================================================================
// AUTO-MAPPING CONFIGURATION
// =============================================================================

/**
 * Mapping of canonical fields to possible source column names (lowercase)
 */
const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  // Address fields
  street: [
    "street",
    "address",
    "street_address",
    "streetaddress",
    "address1",
    "property_address",
    "propertyaddress",
    "street address",
    "property address",
  ],
  city: ["city", "town", "municipality"],
  state: ["state", "st", "province", "region"],
  zip: ["zip", "zipcode", "zip_code", "postal", "postal_code", "postalcode"],

  // Client/contact fields
  client_name: [
    "client_name",
    "clientname",
    "client",
    "contact_name",
    "contactname",
    "contact",
    "name",
    "full_name",
    "fullname",
    "customer",
    "customer_name",
  ],
  client_phone: [
    "client_phone",
    "clientphone",
    "phone",
    "telephone",
    "tel",
    "mobile",
    "cell",
    "contact_phone",
    "contactphone",
    "phone_number",
    "phonenumber",
  ],
  client_email: [
    "client_email",
    "clientemail",
    "email",
    "e-mail",
    "contact_email",
    "contactemail",
    "email_address",
    "emailaddress",
  ],

  // Seller fields
  seller_name: [
    "seller_name",
    "sellername",
    "seller",
    "owner",
    "owner_name",
    "ownername",
    "property_owner",
    "propertyowner",
    "homeowner",
  ],
  seller_phone: ["seller_phone", "sellerphone", "owner_phone", "ownerphone"],
  seller_email: ["seller_email", "selleremail", "owner_email", "owneremail"],
  seller_strike_price: [
    "seller_strike_price",
    "sellerstrikeprice",
    "strike_price",
    "strikeprice",
    "seller_asking",
    "sellerasking",
    "minimum_price",
    "minimumprice",
    "min_price",
    "seller_minimum",
    "sellerminimum",
    "seller_bottom_line",
    "bottom_line",
  ],

  // Market conditions
  absorption_rate: [
    "absorption_rate",
    "absorptionrate",
    "absorption",
    "market_absorption",
    "marketabsorption",
    "months_of_inventory",
    "monthsofinventory",
    "inventory_months",
    "moi",
    "dom",
  ],
  cash_buyer_share_pct: [
    "cash_buyer_share_pct",
    "cashbuyersharepct",
    "cash_buyer_share",
    "cashbuyershare",
    "cash_buyer_pct",
    "cashbuyerpct",
    "cash_buyer_percentage",
    "cashbuyerpercentage",
    "cash_buyers",
    "cashbuyers",
    "pct_cash",
    "cash_pct",
    "percent_cash",
  ],

  // Optional metadata
  tags: ["tags", "labels", "categories", "category"],
  notes: ["notes", "comments", "description", "memo", "remarks"],
  external_id: [
    "external_id",
    "externalid",
    "id",
    "record_id",
    "recordid",
    "reference",
    "ref",
    "source_id",
    "sourceid",
  ],
};

// =============================================================================
// AUTO-MAPPING LOGIC
// =============================================================================

/**
 * Normalize a header for comparison: lowercase, trim, remove special chars
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Find the best matching canonical field for a source header
 */
function findMatchingField(header: string): CanonicalField | null {
  const normalizedHeader = normalizeHeader(header);
  const headerLower = header.toLowerCase().trim();

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      // Exact match (case-insensitive)
      if (headerLower === alias) {
        return field as CanonicalField;
      }
      // Normalized match (alphanumeric only)
      if (normalizedHeader === normalizeHeader(alias)) {
        return field as CanonicalField;
      }
    }
  }

  return null;
}

/**
 * Auto-generate column mapping suggestions from headers
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<CanonicalField>();

  for (const header of headers) {
    const matchedField = findMatchingField(header);

    if (matchedField && !usedFields.has(matchedField)) {
      mapping[header] = matchedField;
      usedFields.add(matchedField);
    } else {
      mapping[header] = null; // Unmapped
    }
  }

  return mapping;
}

/**
 * Get mapping completeness info
 */
export interface MappingCompleteness {
  /** All required fields are mapped */
  isComplete: boolean;
  /** List of required fields that are mapped */
  mappedRequired: CanonicalField[];
  /** List of required fields that are NOT mapped */
  missingRequired: CanonicalField[];
  /** List of optional fields that are mapped */
  mappedOptional: CanonicalField[];
  /** Total mapped fields count */
  mappedCount: number;
}

export const REQUIRED_CANONICAL_FIELDS: CanonicalField[] = [
  "street",
  "city",
  "state",
  "zip",
  "client_name",
  "client_phone",
  "client_email",
];

export const OPTIONAL_CANONICAL_FIELDS: CanonicalField[] = [
  "seller_name",
  "seller_phone",
  "seller_email",
  "seller_strike_price",
  "absorption_rate",
  "cash_buyer_share_pct",
  "tags",
  "notes",
  "external_id",
];

export function checkMappingCompleteness(
  mapping: ColumnMapping
): MappingCompleteness {
  const mappedFields = new Set(
    Object.values(mapping).filter((f): f is CanonicalField => f !== null)
  );

  const mappedRequired = REQUIRED_CANONICAL_FIELDS.filter((f) =>
    mappedFields.has(f)
  );
  const missingRequired = REQUIRED_CANONICAL_FIELDS.filter(
    (f) => !mappedFields.has(f)
  );
  const mappedOptional = OPTIONAL_CANONICAL_FIELDS.filter((f) =>
    mappedFields.has(f)
  );

  return {
    isComplete: missingRequired.length === 0,
    mappedRequired,
    missingRequired,
    mappedOptional,
    mappedCount: mappedFields.size,
  };
}
