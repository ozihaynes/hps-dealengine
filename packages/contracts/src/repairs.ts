import { z } from "zod";
import { Postures } from "./posture";

export const RepairPsfTiersSchema = z.object({
  none: z.number().nonnegative().default(0),
  light: z.number().nonnegative().default(0),
  medium: z.number().nonnegative().default(0),
  heavy: z.number().nonnegative().default(0),
});

export const RepairBig5Schema = z.object({
  roof: z.number().nonnegative().default(0),
  hvac: z.number().nonnegative().default(0),
  repipe: z.number().nonnegative().default(0),
  electrical: z.number().nonnegative().default(0),
  foundation: z.number().nonnegative().default(0),
});

// Allow either flat item->number or nested group->(item->number) maps.
export const RepairLineItemRatesSchema = z.record(
  z.string(),
  z.union([z.number(), z.record(z.string(), z.number())]),
);

export const RepairRateProfileSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  name: z.string().min(1),
  marketCode: z.string().min(1),
  posture: z.enum(Postures).default("base"),
  asOf: z.string().min(1),
  source: z.string().optional().nullable(),
  version: z.string().min(1),
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  psfTiers: RepairPsfTiersSchema,
  big5: RepairBig5Schema,
  lineItemRates: RepairLineItemRatesSchema.optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});

export const RepairRatesSchema = z.object({
  orgId: z.string().uuid(),
  profileId: z.string().uuid().optional(),
  profileName: z.string().optional(),
  marketCode: z.string().min(1),
  posture: z.enum(Postures).default("base"),
  asOf: z.string().min(1),
  source: z.string().optional().nullable(),
  version: z.string().min(1),
  isDefault: z.boolean().optional(),
  psfTiers: RepairPsfTiersSchema,
  big5: RepairBig5Schema,
  lineItemRates: RepairLineItemRatesSchema.optional(),
});

export const RepairProfileCreateInputSchema = z.object({
  dealId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  name: z.string().min(1),
  marketCode: z.string().min(1),
  posture: z.enum(Postures).optional().default("base"),
  asOf: z.string().min(1),
  source: z.string().optional().nullable(),
  version: z.string().min(1),
  psfTiers: RepairPsfTiersSchema,
  big5: RepairBig5Schema,
  lineItemRates: RepairLineItemRatesSchema.optional(),
  cloneFromId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const RepairProfileUpdateInputSchema = z.object({
  dealId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  asOf: z.string().min(1).optional(),
  source: z.string().optional().nullable(),
  version: z.string().min(1).optional(),
  psfTiers: RepairPsfTiersSchema.optional(),
  big5: RepairBig5Schema.optional(),
  lineItemRates: RepairLineItemRatesSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const RepairProfileListQuerySchema = z.object({
  dealId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  marketCode: z.string().optional(),
  posture: z.enum(Postures).optional(),
  includeInactive: z.boolean().optional(),
});

export type RepairPsfTiers = z.infer<typeof RepairPsfTiersSchema>;
export type RepairBig5 = z.infer<typeof RepairBig5Schema>;
export type RepairLineItemRates = z.infer<typeof RepairLineItemRatesSchema>;
export type RepairRateProfile = z.infer<typeof RepairRateProfileSchema>;
export type RepairRates = z.infer<typeof RepairRatesSchema>;
export type RepairProfileCreateInput = z.infer<
  typeof RepairProfileCreateInputSchema
>;
export type RepairProfileUpdateInput = z.infer<
  typeof RepairProfileUpdateInputSchema
>;
export type RepairProfileListQuery = z.infer<
  typeof RepairProfileListQuerySchema
>;

// ============================================================================
// ENHANCED REPAIRS TYPE SYSTEM — v2.0
// ============================================================================
// Principles Applied:
// - Zod for runtime validation (defense in depth)
// - Discriminated unions for type safety
// - Strict null handling (no implicit any)
// - Industry-standard structure (Qty × Unit × UnitCost)
// ============================================================================

// -----------------------------------------------------------------------------
// Unit Types (Industry Standard)
// -----------------------------------------------------------------------------

/**
 * Repair measurement units
 * @description Standard units used in construction estimating
 */
export const RepairUnitSchema = z.enum([
  "each", // Discrete items (fixtures, appliances)
  "sq_ft", // Area measurement (flooring, paint, drywall)
  "linear_ft", // Length measurement (baseboards, gutters)
  "square", // Roofing unit (100 sq ft)
  "lump", // Lump sum (permits, misc)
  "unit", // Generic unit
]);
export type RepairUnit = z.infer<typeof RepairUnitSchema>;

/** Unit display names for UI */
export const UNIT_DISPLAY_NAMES: Record<RepairUnit, string> = {
  each: "each",
  sq_ft: "SF",
  linear_ft: "LF",
  square: "SQ",
  lump: "LS",
  unit: "unit",
} as const;

// -----------------------------------------------------------------------------
// Condition Types
// -----------------------------------------------------------------------------

/**
 * Repair condition assessment
 * @description Maps to cost tiers in rate profiles
 */
export const RepairConditionSchema = z.enum([
  "n/a", // Not applicable / not assessed
  "good", // Minor touch-up only
  "fair", // Moderate repair needed
  "poor", // Significant repair needed
  "replace", // Full replacement required
]);
export type RepairCondition = z.infer<typeof RepairConditionSchema>;

/** Condition display names for UI */
export const CONDITION_DISPLAY_NAMES: Record<RepairCondition, string> = {
  "n/a": "N/A",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  replace: "Replace",
} as const;

// -----------------------------------------------------------------------------
// Enhanced Line Item
// -----------------------------------------------------------------------------

/**
 * Enhanced line item with Qty × Unit × UnitCost structure
 * @description Industry-standard repair line item
 *
 * Calculation Rules:
 * 1. If isManualOverride = true, use totalCost directly
 * 2. Otherwise: totalCost = quantity × unitCost
 * 3. If quantity or unitCost is null, totalCost = 0
 */
export const EnhancedLineItemSchema = z.object({
  /** Unique identifier within category (e.g., 'interiorPaint') */
  itemKey: z.string().min(1),

  /** Human-readable label (e.g., 'Interior Paint') */
  label: z.string().min(1),

  /** Parent category key (e.g., 'interior') */
  categoryKey: z.string().min(1),

  /** Condition assessment */
  condition: RepairConditionSchema.default("n/a"),

  /** Quantity (null = not entered) */
  quantity: z.number().nonnegative().nullable().default(null),

  /** Unit of measurement */
  unit: RepairUnitSchema.default("each"),

  /** Cost per unit (null = use default from rate profile) */
  unitCost: z.number().nonnegative().nullable().default(null),

  /** Computed or manual total cost */
  totalCost: z.number().nonnegative().nullable().default(null),

  /** True if user manually entered totalCost (bypasses Qty × Rate calc) */
  isManualOverride: z.boolean().default(false),

  /** User notes for this line item */
  notes: z.string().default(""),

  /** Display order within category */
  displayOrder: z.number().int().nonnegative().default(0),
});
export type EnhancedLineItem = z.infer<typeof EnhancedLineItemSchema>;

// -----------------------------------------------------------------------------
// Enhanced Category
// -----------------------------------------------------------------------------

/**
 * Category containing line items with subtotal
 */
export const EnhancedCategorySchema = z.object({
  /** Unique category identifier (e.g., 'roofing') */
  categoryKey: z.string().min(1),

  /** Human-readable title (e.g., 'Roofing') */
  title: z.string().min(1),

  /** Lucide icon name (e.g., 'Home') */
  icon: z.string().optional(),

  /** Line items in this category */
  items: z.array(EnhancedLineItemSchema),

  /** Computed subtotal (sum of item totalCosts) */
  subtotal: z.number().nonnegative().default(0),

  /** Display order in UI */
  displayOrder: z.number().int().nonnegative().default(0),
});
export type EnhancedCategory = z.infer<typeof EnhancedCategorySchema>;

// -----------------------------------------------------------------------------
// Enhanced Estimator State
// -----------------------------------------------------------------------------

/**
 * Complete enhanced estimator state
 * @description Version 2 of the estimator state with Qty × Unit × Rate structure
 */
export const EnhancedEstimatorStateSchema = z.object({
  /** Categories keyed by categoryKey */
  categories: z.record(z.string(), EnhancedCategorySchema),

  /** Sum of all category subtotals */
  grandTotal: z.number().nonnegative().default(0),

  /** Contingency percentage (0-100) */
  contingencyPercent: z.number().min(0).max(100).default(15),

  /** Computed contingency amount */
  contingencyAmount: z.number().nonnegative().default(0),

  /** Grand total + contingency */
  totalWithContingency: z.number().nonnegative().default(0),

  /** Last update timestamp (ISO string) */
  lastUpdated: z.string().datetime().optional(),

  /** Schema version (always 2 for enhanced) */
  version: z.literal(2).default(2),
});
export type EnhancedEstimatorState = z.infer<
  typeof EnhancedEstimatorStateSchema
>;

// -----------------------------------------------------------------------------
// Contingency Policy
// -----------------------------------------------------------------------------

/**
 * Contingency percentage by rehab level
 * @description Policy-driven contingency based on scope risk
 */
export const ContingencyPolicySchema = z.object({
  none: z.number().min(0).max(100).default(0),
  light: z.number().min(0).max(100).default(10),
  medium: z.number().min(0).max(100).default(15),
  heavy: z.number().min(0).max(100).default(20),
  structural: z.number().min(0).max(100).default(25),
});
export type ContingencyPolicy = z.infer<typeof ContingencyPolicySchema>;

/** Default contingency policy */
export const DEFAULT_CONTINGENCY_POLICY: ContingencyPolicy = {
  none: 0,
  light: 10,
  medium: 15,
  heavy: 20,
  structural: 25,
} as const;

// -----------------------------------------------------------------------------
// Rehab Level Type
// -----------------------------------------------------------------------------

export const RehabLevelSchema = z.enum([
  "none",
  "light",
  "medium",
  "heavy",
  "structural",
]);
export type RehabLevel = z.infer<typeof RehabLevelSchema>;

// -----------------------------------------------------------------------------
// Category Definition (for constants)
// -----------------------------------------------------------------------------

/**
 * Item definition in estimatorSectionsV2
 */
export interface EstimatorItemDefV2 {
  id: string;
  label: string;
  unit: RepairUnit;
  unitName: string;
  defaultUnitCost: number;
  options?: {
    good?: number;
    fair?: number;
    poor?: number;
    replace?: number;
  };
}

/**
 * Section/Category definition in estimatorSectionsV2
 */
export interface EstimatorSectionDefV2 {
  title: string;
  icon: string;
  displayOrder: number;
  items: Record<string, EstimatorItemDefV2>;
}
