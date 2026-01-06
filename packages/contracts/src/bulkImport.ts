/**
 * BULK-IMPORT-v1: TypeScript/Zod contracts
 *
 * Defines schemas for:
 * - Import job and item enums
 * - Column mapping definitions
 * - Validation error structures
 * - API request/response schemas for all import endpoints
 */
import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const ImportKindSchema = z.enum(["deals", "contacts"]);
export type ImportKind = z.infer<typeof ImportKindSchema>;

export const FileTypeSchema = z.enum(["csv", "xlsx", "json"]);
export type FileType = z.infer<typeof FileTypeSchema>;

export const SourceRouteSchema = z.enum(["startup", "deals", "import"]);
export type SourceRoute = z.infer<typeof SourceRouteSchema>;

export const JobStatusSchema = z.enum([
  "draft",
  "mapped",
  "validating",
  "ready",
  "promoting",
  "complete",
  "failed",
  "archived",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const ItemStatusSchema = z.enum([
  "pending",
  "valid",
  "needs_fix",
  "promoted",
  "skipped_duplicate",
  "skipped_other",
  "failed",
]);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const SkipReasonSchema = z.enum([
  "duplicate_within_file",
  "duplicate_queued_item",
  "duplicate_existing_deal",
  "validation_failed",
  "promotion_failed",
  "user_skipped",
]);
export type SkipReason = z.infer<typeof SkipReasonSchema>;

// =============================================================================
// COLUMN MAPPING
// =============================================================================

// Canonical field names for deal import
export const CanonicalFieldSchema = z.enum([
  // Required (7)
  "street",
  "city",
  "state",
  "zip",
  "client_name",
  "client_phone",
  "client_email",
  // Optional (9)
  "seller_name",
  "seller_phone",
  "seller_email",
  "seller_strike_price",
  "absorption_rate",
  "cash_buyer_share_pct",
  "tags",
  "notes",
  "external_id",
]);
export type CanonicalField = z.infer<typeof CanonicalFieldSchema>;

export const REQUIRED_FIELDS: CanonicalField[] = [
  "street",
  "city",
  "state",
  "zip",
  "client_name",
  "client_phone",
  "client_email",
];

export const OPTIONAL_FIELDS: CanonicalField[] = [
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

// Maps source column name -> canonical field name
export const ColumnMappingSchema = z.record(
  z.string(), // source column header
  CanonicalFieldSchema.nullable() // mapped field or null if unmapped
);
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

// =============================================================================
// VALIDATION ERROR
// =============================================================================

export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  rule_id: z.string(), // e.g., 'required', 'invalid_email', 'invalid_phone', 'invalid_zip'
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// =============================================================================
// JOB SCHEMAS
// =============================================================================

// Full job record (from DB)
export const ImportJobSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  created_by: z.string().uuid(),
  source_route: SourceRouteSchema,
  import_kind: ImportKindSchema,
  file_type: FileTypeSchema,
  file_name: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  file_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  storage_bucket: z.string(),
  storage_path: z.string(),
  column_mapping: ColumnMappingSchema.nullable(),
  status: JobStatusSchema,
  status_message: z.string().nullable(),
  rows_total: z.number().int().nonnegative(),
  rows_valid: z.number().int().nonnegative(),
  rows_needs_fix: z.number().int().nonnegative(),
  rows_promoted: z.number().int().nonnegative(),
  rows_skipped_duplicate: z.number().int().nonnegative(),
  rows_skipped_other: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ImportJob = z.infer<typeof ImportJobSchema>;

// =============================================================================
// ITEM SCHEMAS
// =============================================================================

// Full item record (from DB)
export const ImportItemSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  job_id: z.string().uuid(),
  row_number: z.number().int().positive(),
  raw_payload: z.record(z.unknown()),
  normalized_payload: z.record(z.unknown()),
  validation_errors: z.array(ValidationErrorSchema),
  dedupe_key: z.string().regex(/^[0-9a-f]{64}$/),
  status: ItemStatusSchema,
  skip_reason: SkipReasonSchema.nullable(),
  matching_item_id: z.string().uuid().nullable(),
  matching_deal_id: z.string().uuid().nullable(),
  error_message: z.string().nullable(),
  promoted_deal_id: z.string().uuid().nullable(),
  promoted_at: z.string().datetime().nullable(),
  promoted_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ImportItem = z.infer<typeof ImportItemSchema>;

// =============================================================================
// API: CREATE JOB
// =============================================================================

export const ImportJobCreateInputSchema = z.object({
  source_route: SourceRouteSchema,
  import_kind: ImportKindSchema.default("deals"),
  file_type: FileTypeSchema,
  file_name: z.string().min(1).max(255),
  file_size_bytes: z.number().int().positive().max(52428800), // 50MB max
  file_sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export type ImportJobCreateInput = z.infer<typeof ImportJobCreateInputSchema>;

export const ImportJobCreateResultSchema = z.object({
  job: ImportJobSchema,
  upload_url: z.string().url(),
  upload_path: z.string(),
});
export type ImportJobCreateResult = z.infer<typeof ImportJobCreateResultSchema>;

// =============================================================================
// API: UPDATE JOB (column mapping, status)
// =============================================================================

export const ImportJobUpdateInputSchema = z.object({
  job_id: z.string().uuid(),
  column_mapping: ColumnMappingSchema.optional(),
  status: JobStatusSchema.optional(),
  status_message: z.string().nullable().optional(),
});
export type ImportJobUpdateInput = z.infer<typeof ImportJobUpdateInputSchema>;

export const ImportJobUpdateResultSchema = z.object({
  job: ImportJobSchema,
});
export type ImportJobUpdateResult = z.infer<typeof ImportJobUpdateResultSchema>;

// =============================================================================
// API: UPSERT ITEMS (chunked, max 200)
// =============================================================================

export const ImportItemInputSchema = z.object({
  row_number: z.number().int().positive(),
  raw_payload: z.record(z.unknown()),
  normalized_payload: z.record(z.unknown()),
  dedupe_key: z.string().regex(/^[0-9a-f]{64}$/),
});
export type ImportItemInput = z.infer<typeof ImportItemInputSchema>;

export const ImportItemsUpsertInputSchema = z.object({
  job_id: z.string().uuid(),
  items: z.array(ImportItemInputSchema).min(1).max(200),
});
export type ImportItemsUpsertInput = z.infer<typeof ImportItemsUpsertInputSchema>;

export const ImportItemsUpsertResultSchema = z.object({
  job: ImportJobSchema, // Updated with new counts
  items_created: z.number().int().nonnegative(),
  items_updated: z.number().int().nonnegative(),
  items_skipped_duplicate: z.number().int().nonnegative(),
  validation_summary: z.object({
    valid: z.number().int().nonnegative(),
    needs_fix: z.number().int().nonnegative(),
    errors_by_field: z.record(z.number().int().nonnegative()),
  }),
});
export type ImportItemsUpsertResult = z.infer<typeof ImportItemsUpsertResultSchema>;

// =============================================================================
// API: UPDATE SINGLE ITEM (inline fix)
// =============================================================================

export const ImportItemUpdateInputSchema = z.object({
  item_id: z.string().uuid(),
  normalized_payload: z.record(z.unknown()),
});
export type ImportItemUpdateInput = z.infer<typeof ImportItemUpdateInputSchema>;

export const ImportItemUpdateResultSchema = z.object({
  item: ImportItemSchema,
  job: ImportJobSchema, // Updated counts
});
export type ImportItemUpdateResult = z.infer<typeof ImportItemUpdateResultSchema>;

// =============================================================================
// API: PROMOTE ITEMS (batched, max 50)
// =============================================================================

export const ImportPromoteInputSchema = z.object({
  job_id: z.string().uuid(),
  item_ids: z.array(z.string().uuid()).min(1).max(50),
});
export type ImportPromoteInput = z.infer<typeof ImportPromoteInputSchema>;

export const PromotionResultSchema = z.object({
  item_id: z.string().uuid(),
  success: z.boolean(),
  deal_id: z.string().uuid().nullable(),
  error: z.string().nullable(),
});
export type PromotionResult = z.infer<typeof PromotionResultSchema>;

export const ImportPromoteResultSchema = z.object({
  job: ImportJobSchema, // Updated counts
  results: z.array(PromotionResultSchema),
  promoted_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
});
export type ImportPromoteResult = z.infer<typeof ImportPromoteResultSchema>;

// =============================================================================
// API: LIST JOBS
// =============================================================================

export const ImportJobsListInputSchema = z.object({
  status: JobStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});
export type ImportJobsListInput = z.infer<typeof ImportJobsListInputSchema>;

export const ImportJobsListResultSchema = z.object({
  jobs: z.array(ImportJobSchema),
  total: z.number().int().nonnegative(),
  has_more: z.boolean(),
});
export type ImportJobsListResult = z.infer<typeof ImportJobsListResultSchema>;

// =============================================================================
// API: LIST ITEMS
// =============================================================================

export const ImportItemsListInputSchema = z.object({
  job_id: z.string().uuid(),
  status: ItemStatusSchema.optional(),
  limit: z.number().int().positive().max(200).default(50),
  offset: z.number().int().nonnegative().default(0),
});
export type ImportItemsListInput = z.infer<typeof ImportItemsListInputSchema>;

export const ImportItemsListResultSchema = z.object({
  items: z.array(ImportItemSchema),
  total: z.number().int().nonnegative(),
  has_more: z.boolean(),
});
export type ImportItemsListResult = z.infer<typeof ImportItemsListResultSchema>;

// =============================================================================
// API: ARCHIVE JOB
// =============================================================================

export const ImportJobArchiveInputSchema = z.object({
  job_id: z.string().uuid(),
});
export type ImportJobArchiveInput = z.infer<typeof ImportJobArchiveInputSchema>;

export const ImportJobArchiveResultSchema = z.object({
  job: ImportJobSchema,
});
export type ImportJobArchiveResult = z.infer<typeof ImportJobArchiveResultSchema>;
