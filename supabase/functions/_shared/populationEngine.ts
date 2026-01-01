/**
 * Population Engine - Deterministic + Idempotent field population
 *
 * This module provides reusable logic for:
 * - Building deterministic population plans from intake mappings
 * - Computing idempotency keys to prevent duplicate writes
 * - Applying field transforms (parseInt, parseFloat, etc.)
 * - Managing nested JSON paths for deal updates
 */

// ============================================================================
// Types
// ============================================================================

export type OverwriteMode = "skip" | "overwrite";

export type FieldAction = "CREATE" | "SKIP" | "OVERWRITE" | "ERROR";

export type FieldResult = {
  field_key: string;
  target_path: string;
  value_before: unknown;
  value_after: unknown;
  action: FieldAction;
  reason: string | null;
};

export type PopulationSummary = {
  created_count: number;
  skipped_count: number;
  overwritten_count: number;
  error_count: number;
  evidence_converted_count: number;
};

export type FieldMapping = {
  source_field_key: string;
  target_deal_path: string;
  transform: string | null;
  overwrite_policy: string;
};

export type MappingPrivate = {
  version: string;
  mappings: FieldMapping[];
  evidence_mappings?: Array<{
    source_upload_key: string;
    target_evidence_kind: string;
  }>;
};

export type PopulationPlan = {
  fieldResults: FieldResult[];
  dealUpdates: Record<string, unknown>;
  summary: PopulationSummary;
};

// ============================================================================
// Transform Functions
// ============================================================================

const transforms: Record<string, (value: unknown) => unknown> = {
  parseInt: (v) => {
    const parsed = parseInt(String(v), 10);
    return isNaN(parsed) ? null : parsed;
  },
  parseFloat: (v) => {
    const parsed = parseFloat(String(v));
    return isNaN(parsed) ? null : parsed;
  },
  parseCurrency: (v) => {
    // Remove $, commas, parse as float
    const cleaned = String(v).replace(/[$,]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  },
  parseDate: (v) => {
    const d = new Date(v as string | number | Date);
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  },
  parseBoolean: (v) => {
    if (typeof v === "boolean") return v;
    const s = String(v).toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  },
  trim: (v) => {
    if (typeof v === "string") return v.trim();
    return v;
  },
  lowercase: (v) => {
    if (typeof v === "string") return v.toLowerCase();
    return v;
  },
  uppercase: (v) => {
    if (typeof v === "string") return v.toUpperCase();
    return v;
  },
};

/**
 * Apply a transform function to a value
 */
export function applyTransform(
  value: unknown,
  transformName: string | null
): { success: boolean; value: unknown; error?: string } {
  if (!transformName) {
    return { success: true, value };
  }

  const fn = transforms[transformName];
  if (!fn) {
    return { success: false, value: null, error: `unknown_transform: ${transformName}` };
  }

  try {
    const transformed = fn(value);
    return { success: true, value: transformed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, value: null, error: `transform_failed: ${message}` };
  }
}

// ============================================================================
// Nested Path Utilities
// ============================================================================

/**
 * Get a value from a nested object using dot notation
 * Example: getNestedValue(obj, "payload.client.name")
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a value in a nested object using dot notation
 * Creates intermediate objects as needed
 * Example: setNestedValue(obj, "payload.client.name", "John")
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || current[part] === null || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

// ============================================================================
// Idempotency Key Computation
// ============================================================================

/**
 * Compute SHA-256 hash of input data
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const digest = await crypto.subtle.digest("SHA-256", dataBytes);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute idempotency key for a population operation
 * Key = SHA-256(submission_id + payload_hash + mapping_version + overwrite_mode)
 */
export async function computeIdempotencyKey(
  submissionId: string,
  payloadHash: string | null,
  mappingVersion: string,
  overwriteMode: OverwriteMode
): Promise<string> {
  const keyData = JSON.stringify({
    submission_id: submissionId,
    payload_hash: payloadHash ?? "",
    mapping_version: mappingVersion,
    overwrite_mode: overwriteMode,
  });
  return sha256(keyData);
}

// ============================================================================
// Population Plan Builder
// ============================================================================

/**
 * Build a deterministic population plan from intake data
 *
 * This function is pure and deterministic:
 * - Same inputs always produce the same outputs
 * - No side effects (does not modify deal)
 * - Returns a plan that can be inspected or executed
 */
export function buildPopulationPlan(
  submissionPayload: Record<string, unknown>,
  currentDeal: Record<string, unknown>,
  mappingPrivate: MappingPrivate,
  overwriteMode: OverwriteMode
): PopulationPlan {
  const fieldResults: FieldResult[] = [];
  const dealUpdates: Record<string, unknown> = {};
  const summary: PopulationSummary = {
    created_count: 0,
    skipped_count: 0,
    overwritten_count: 0,
    error_count: 0,
    evidence_converted_count: 0,
  };

  // Process each mapping in order (deterministic)
  for (const mapping of mappingPrivate.mappings) {
    const { source_field_key, target_deal_path, transform } = mapping;

    // Get source value from submission payload
    const sourceValue = submissionPayload[source_field_key];

    // Get current value from deal
    const currentValue = getNestedValue(currentDeal, target_deal_path);

    // Prepare result
    const result: FieldResult = {
      field_key: source_field_key,
      target_path: target_deal_path,
      value_before: currentValue ?? null,
      value_after: null,
      action: "SKIP",
      reason: null,
    };

    // Check if source value is empty
    if (sourceValue === null || sourceValue === undefined || sourceValue === "") {
      result.action = "SKIP";
      result.reason = "source_empty";
      summary.skipped_count++;
      fieldResults.push(result);
      continue;
    }

    // Apply transform if specified
    const transformResult = applyTransform(sourceValue, transform);
    if (!transformResult.success) {
      result.action = "ERROR";
      result.reason = transformResult.error ?? "transform_failed";
      summary.error_count++;
      fieldResults.push(result);
      continue;
    }

    const transformedValue = transformResult.value;

    // Determine action based on current value and overwrite mode
    const hasExistingValue =
      currentValue !== null && currentValue !== undefined && currentValue !== "";

    if (!hasExistingValue) {
      // No existing value - CREATE
      result.action = "CREATE";
      result.value_after = transformedValue;
      result.reason = null;
      summary.created_count++;
      setNestedValue(dealUpdates, target_deal_path, transformedValue);
    } else if (overwriteMode === "skip") {
      // Has value and skip mode - SKIP
      result.action = "SKIP";
      result.reason = "field_exists";
      summary.skipped_count++;
    } else {
      // Has value and overwrite mode - OVERWRITE
      result.action = "OVERWRITE";
      result.value_after = transformedValue;
      result.reason = "overwrite_mode";
      summary.overwritten_count++;
      setNestedValue(dealUpdates, target_deal_path, transformedValue);
    }

    fieldResults.push(result);
  }

  return { fieldResults, dealUpdates, summary };
}

/**
 * Merge deal updates into existing deal object
 * Handles nested payload updates correctly
 */
export function mergeDealUpdates(
  currentDeal: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, unknown> {
  // Deep clone current deal
  const merged = JSON.parse(JSON.stringify(currentDeal));

  // For each update path, set the value
  const applyUpdates = (
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    prefix = ""
  ) => {
    for (const [key, value] of Object.entries(source)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        // Nested object - recurse
        if (!(key in target) || target[key] === null || typeof target[key] !== "object") {
          target[key] = {};
        }
        applyUpdates(target[key] as Record<string, unknown>, value as Record<string, unknown>, path);
      } else {
        // Leaf value - set directly
        target[key] = value;
      }
    }
  };

  applyUpdates(merged, updates);
  return merged;
}
