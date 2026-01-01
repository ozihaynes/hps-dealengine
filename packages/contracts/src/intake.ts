/**
 * CLIENT-INTAKE-AUTOFILL-v1: TypeScript/Zod contracts
 *
 * Defines schemas for:
 * - Postgres enum types
 * - Database row types
 * - API request/response schemas
 * - Public schema definitions (client form rendering)
 * - Private mapping definitions (staff-only)
 */
import { z } from "zod";

// ============================================================================
// ENUMS (matching Postgres enum types)
// ============================================================================

export const IntakeLinkStatusSchema = z.enum([
  "SENT",
  "IN_PROGRESS",
  "SUBMITTED",
  "EXPIRED",
  "REVOKED",
  "REJECTED",
]);
export type IntakeLinkStatus = z.infer<typeof IntakeLinkStatusSchema>;

export const IntakeSubmissionStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "PENDING_REVIEW",
  "REVISION_REQUESTED",
  "COMPLETED",
  "REJECTED",
  "ARCHIVED",
]);
export type IntakeSubmissionStatus = z.infer<typeof IntakeSubmissionStatusSchema>;

export const IntakeSubmissionSourceSchema = z.enum([
  "public_token",
  "staff_assisted",
]);
export type IntakeSubmissionSource = z.infer<typeof IntakeSubmissionSourceSchema>;

export const IntakeFileStorageStateSchema = z.enum([
  "QUARANTINE",
  "CLEAN",
  "INFECTED",
  "REJECTED",
]);
export type IntakeFileStorageState = z.infer<typeof IntakeFileStorageStateSchema>;

export const IntakeFileScanStatusSchema = z.enum([
  "PENDING",
  "CLEAN",
  "INFECTED",
  "SCAN_FAILED",
]);
export type IntakeFileScanStatus = z.infer<typeof IntakeFileScanStatusSchema>;

// ============================================================================
// SCHEMA PUBLIC JSON (Client-rendered form definition)
// ============================================================================

export const IntakeFieldTypeSchema = z.enum([
  "text",
  "email",
  "phone",
  "number",
  "currency",
  "date",
  "boolean",
  "select",
  "textarea",
]);
export type IntakeFieldType = z.infer<typeof IntakeFieldTypeSchema>;

export const IntakeFieldDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: IntakeFieldTypeSchema,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
});
export type IntakeFieldDefinition = z.infer<typeof IntakeFieldDefinitionSchema>;

export const IntakeSectionDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(IntakeFieldDefinitionSchema),
});
export type IntakeSectionDefinition = z.infer<typeof IntakeSectionDefinitionSchema>;

export const IntakeEvidenceUploadDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  accept: z.array(z.string()).min(1), // MIME types
  max_files: z.number().int().positive(),
  max_size_bytes: z.number().int().positive().optional(),
  required: z.boolean(),
});
export type IntakeEvidenceUploadDefinition = z.infer<
  typeof IntakeEvidenceUploadDefinitionSchema
>;

export const IntakeSchemaPublicSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  title: z.string().min(1),
  description: z.string().optional(),
  sections: z.array(IntakeSectionDefinitionSchema),
  evidence_uploads: z.array(IntakeEvidenceUploadDefinitionSchema).optional(),
});
export type IntakeSchemaPublic = z.infer<typeof IntakeSchemaPublicSchema>;

// ============================================================================
// MAPPING PRIVATE JSON (Staff-only mapping rules)
// ============================================================================

export const IntakeFieldTransformSchema = z.enum([
  "parseInt",
  "parseFloat",
  "parseCurrency",
  "parseBoolean",
  "parseDate",
  "trim",
  "lowercase",
  "uppercase",
]);
export type IntakeFieldTransform = z.infer<typeof IntakeFieldTransformSchema>;

export const IntakeOverwritePolicySchema = z.enum([
  "skip",
  "overwrite",
  "overwrite_if_empty",
]);
export type IntakeOverwritePolicy = z.infer<typeof IntakeOverwritePolicySchema>;

export const IntakeFieldMappingSchema = z.object({
  source_field_key: z.string().min(1),
  target_deal_path: z.string().min(1), // JSONPath-like: "payload.client.name"
  transform: IntakeFieldTransformSchema.nullable(),
  overwrite_policy: IntakeOverwritePolicySchema,
});
export type IntakeFieldMapping = z.infer<typeof IntakeFieldMappingSchema>;

export const IntakeEvidenceMappingSchema = z.object({
  source_upload_key: z.string().min(1),
  target_evidence_kind: z.string().min(1),
});
export type IntakeEvidenceMapping = z.infer<typeof IntakeEvidenceMappingSchema>;

export const IntakeMappingPrivateSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  mappings: z.array(IntakeFieldMappingSchema),
  evidence_mappings: z.array(IntakeEvidenceMappingSchema).optional(),
});
export type IntakeMappingPrivate = z.infer<typeof IntakeMappingPrivateSchema>;

// ============================================================================
// DATABASE ROW SCHEMAS
// ============================================================================

export const IntakeSchemaVersionRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  semantic_version: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  schema_public_json: IntakeSchemaPublicSchema,
  mapping_private_json: IntakeMappingPrivateSchema,
  is_active: z.boolean(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});
export type IntakeSchemaVersionRow = z.infer<typeof IntakeSchemaVersionRowSchema>;

export const IntakeLinkRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  deal_id: z.string().uuid(),
  intake_schema_version_id: z.string().uuid(),
  recipient_email: z.string().email(),
  recipient_name: z.string().nullable(),
  token_hash: z.string(),
  status: IntakeLinkStatusSchema,
  expires_at: z.string().datetime(),
  consumed_at: z.string().datetime().nullable(),
  send_count: z.number().int(),
  last_sent_at: z.string().datetime(),
  email_send_id: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type IntakeLinkRow = z.infer<typeof IntakeLinkRowSchema>;

export const IntakeSubmissionRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  deal_id: z.string().uuid(),
  intake_link_id: z.string().uuid().nullable(),
  intake_schema_version_id: z.string().uuid(),
  source: IntakeSubmissionSourceSchema,
  payload_json: z.record(z.unknown()),
  payload_hash: z.string().nullable(),
  status: IntakeSubmissionStatusSchema,
  submitted_at: z.string().datetime().nullable(),
  submitted_by_user_id: z.string().uuid().nullable(),
  completed_at: z.string().datetime().nullable(),
  prior_submission_id: z.string().uuid().nullable(),
  revision_cycle: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type IntakeSubmissionRow = z.infer<typeof IntakeSubmissionRowSchema>;

export const IntakeSubmissionFileRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  deal_id: z.string().uuid(),
  intake_submission_id: z.string().uuid(),
  intake_link_id: z.string().uuid().nullable(),
  bucket_id: z.string(),
  object_key: z.string(),
  original_filename: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int(),
  storage_state: IntakeFileStorageStateSchema,
  scan_status: IntakeFileScanStatusSchema,
  scanned_at: z.string().datetime().nullable(),
  scan_details_json: z.record(z.unknown()).nullable(),
  converted_to_evidence_id: z.string().uuid().nullable(),
  converted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type IntakeSubmissionFileRow = z.infer<typeof IntakeSubmissionFileRowSchema>;

export const IntakePopulationEventRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  deal_id: z.string().uuid(),
  intake_submission_id: z.string().uuid(),
  idempotency_key: z.string(),
  overwrite_mode: z.enum(["skip", "overwrite"]),
  overwrite_reasons_json: z.record(z.unknown()).nullable(),
  field_results_json: z.array(
    z.object({
      field_key: z.string(),
      target_path: z.string(),
      value_before: z.unknown(),
      value_after: z.unknown(),
      action: z.enum(["created", "skipped", "overwritten", "error"]),
      reason: z.string().optional(),
    })
  ),
  summary_json: z.object({
    created_count: z.number().int(),
    skipped_count: z.number().int(),
    overwritten_count: z.number().int(),
    error_count: z.number().int(),
    evidence_converted_count: z.number().int().optional(),
  }),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
});
export type IntakePopulationEventRow = z.infer<typeof IntakePopulationEventRowSchema>;

export const IntakeRevisionRequestRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  intake_submission_id: z.string().uuid(),
  requested_by: z.string().uuid(),
  request_notes: z.string(),
  new_link_id: z.string().uuid().nullable(),
  responded_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type IntakeRevisionRequestRow = z.infer<typeof IntakeRevisionRequestRowSchema>;

export const IntakeRejectionRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  intake_submission_id: z.string().uuid(),
  rejected_by: z.string().uuid(),
  rejection_reason: z.string(),
  created_at: z.string().datetime(),
});
export type IntakeRejectionRow = z.infer<typeof IntakeRejectionRowSchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

// --- Send Intake Link ---
export const SendIntakeLinkRequestSchema = z.object({
  deal_id: z.string().uuid(),
  recipient_email: z.string().email(),
  recipient_name: z.string().optional(),
  schema_version_id: z.string().uuid().optional(), // Uses active version if not specified
  expires_in_days: z.number().int().min(1).max(90).default(30),
  custom_message: z.string().max(1000).optional(),
});
export type SendIntakeLinkRequest = z.infer<typeof SendIntakeLinkRequestSchema>;

export const SendIntakeLinkResponseSchema = z.object({
  link_id: z.string().uuid(),
  intake_url: z.string().url(),
  expires_at: z.string().datetime(),
});
export type SendIntakeLinkResponse = z.infer<typeof SendIntakeLinkResponseSchema>;

// --- Validate Token (public endpoint) ---
export const ValidateTokenRequestSchema = z.object({
  token: z.string().min(32),
});
export type ValidateTokenRequest = z.infer<typeof ValidateTokenRequestSchema>;

export const ValidateTokenResponseSchema = z.object({
  valid: z.boolean(),
  link_id: z.string().uuid().optional(),
  schema: IntakeSchemaPublicSchema.optional(),
  submission_id: z.string().uuid().optional(), // Existing draft if any
  existing_payload: z.record(z.unknown()).optional(),
  recipient_name: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  error_code: z
    .enum(["INVALID_TOKEN", "EXPIRED", "CONSUMED", "REVOKED"])
    .optional(),
});
export type ValidateTokenResponse = z.infer<typeof ValidateTokenResponseSchema>;

// --- Save Draft (public endpoint - token-gated) ---
export const SaveDraftRequestSchema = z.object({
  token: z.string().min(32),
  payload: z.record(z.unknown()),
});
export type SaveDraftRequest = z.infer<typeof SaveDraftRequestSchema>;

export const SaveDraftResponseSchema = z.object({
  submission_id: z.string().uuid(),
  saved_at: z.string().datetime(),
});
export type SaveDraftResponse = z.infer<typeof SaveDraftResponseSchema>;

// --- Submit Intake (public endpoint - token-gated) ---
export const SubmitIntakeRequestSchema = z.object({
  token: z.string().min(32),
  payload: z.record(z.unknown()),
});
export type SubmitIntakeRequest = z.infer<typeof SubmitIntakeRequestSchema>;

export const SubmitIntakeResponseSchema = z.object({
  submission_id: z.string().uuid(),
  payload_hash: z.string(),
  submitted_at: z.string().datetime(),
});
export type SubmitIntakeResponse = z.infer<typeof SubmitIntakeResponseSchema>;

// --- Upload File (public endpoint - token-gated) ---
export const UploadIntakeFileRequestSchema = z.object({
  token: z.string().min(32),
  upload_key: z.string().min(1), // Matches evidence_uploads[].key in schema
  filename: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().positive(),
});
export type UploadIntakeFileRequest = z.infer<typeof UploadIntakeFileRequestSchema>;

export const UploadIntakeFileResponseSchema = z.object({
  file_id: z.string().uuid(),
  upload_url: z.string().url(), // Signed upload URL
  expires_at: z.string().datetime(),
});
export type UploadIntakeFileResponse = z.infer<typeof UploadIntakeFileResponseSchema>;

// --- Staff: Get Submission ---
export const GetIntakeSubmissionResponseSchema = z.object({
  submission: IntakeSubmissionRowSchema,
  files: z.array(IntakeSubmissionFileRowSchema),
  link: IntakeLinkRowSchema.nullable(),
  schema_version: IntakeSchemaVersionRowSchema,
  revision_requests: z.array(IntakeRevisionRequestRowSchema),
  rejections: z.array(IntakeRejectionRowSchema),
});
export type GetIntakeSubmissionResponse = z.infer<
  typeof GetIntakeSubmissionResponseSchema
>;

// --- Staff: Populate Deal ---
export const PopulateDealFromIntakeRequestSchema = z.object({
  submission_id: z.string().uuid(),
  overwrite_mode: z.enum(["skip", "overwrite"]).default("skip"),
  overwrite_reasons: z.record(z.string()).optional(), // field_key -> reason
});
export type PopulateDealFromIntakeRequest = z.infer<
  typeof PopulateDealFromIntakeRequestSchema
>;

export const PopulateDealFromIntakeResponseSchema = z.object({
  population_event_id: z.string().uuid(),
  summary: z.object({
    created_count: z.number().int(),
    skipped_count: z.number().int(),
    overwritten_count: z.number().int(),
    error_count: z.number().int(),
    evidence_converted_count: z.number().int(),
  }),
  field_results: z.array(
    z.object({
      field_key: z.string(),
      target_path: z.string(),
      action: z.enum(["created", "skipped", "overwritten", "error"]),
      reason: z.string().optional(),
    })
  ),
});
export type PopulateDealFromIntakeResponse = z.infer<
  typeof PopulateDealFromIntakeResponseSchema
>;

// --- Staff: Request Revision ---
export const RequestRevisionRequestSchema = z.object({
  submission_id: z.string().uuid(),
  notes: z.string().min(1).max(2000),
  expires_in_days: z.number().int().min(1).max(90).default(14),
});
export type RequestRevisionRequest = z.infer<typeof RequestRevisionRequestSchema>;

export const RequestRevisionResponseSchema = z.object({
  revision_request_id: z.string().uuid(),
  new_link_id: z.string().uuid(),
  intake_url: z.string().url(),
});
export type RequestRevisionResponse = z.infer<typeof RequestRevisionResponseSchema>;

// --- Staff: Reject Submission ---
export const RejectSubmissionRequestSchema = z.object({
  submission_id: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});
export type RejectSubmissionRequest = z.infer<typeof RejectSubmissionRequestSchema>;

export const RejectSubmissionResponseSchema = z.object({
  rejection_id: z.string().uuid(),
  rejected_at: z.string().datetime(),
});
export type RejectSubmissionResponse = z.infer<typeof RejectSubmissionResponseSchema>;

// --- Staff: Complete Submission ---
export const CompleteSubmissionRequestSchema = z.object({
  submission_id: z.string().uuid(),
});
export type CompleteSubmissionRequest = z.infer<typeof CompleteSubmissionRequestSchema>;

export const CompleteSubmissionResponseSchema = z.object({
  completed_at: z.string().datetime(),
});
export type CompleteSubmissionResponse = z.infer<
  typeof CompleteSubmissionResponseSchema
>;

// ============================================================================
// POLICY CONFIG SCHEMA (for org-level intake settings)
// ============================================================================

export const IntakePolicyConfigSchema = z.object({
  default_expiry_days: z.number().int().min(1).max(90).default(30),
  max_file_size_bytes: z.number().int().positive().default(26214400), // 25MB
  allowed_mime_types: z
    .array(z.string())
    .default([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]),
  require_virus_scan: z.boolean().default(true),
  auto_populate_on_submit: z.boolean().default(false),
  notify_staff_on_submit: z.boolean().default(true),
  staff_notification_emails: z.array(z.string().email()).default([]),
});
export type IntakePolicyConfig = z.infer<typeof IntakePolicyConfigSchema>;

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Public-safe view of schema version (excludes mapping_private_json) */
export const IntakeSchemaVersionPublicSchema = IntakeSchemaVersionRowSchema.omit({
  mapping_private_json: true,
});
export type IntakeSchemaVersionPublic = z.infer<
  typeof IntakeSchemaVersionPublicSchema
>;

/** Public-safe view of link (excludes token_hash) */
export const IntakeLinkPublicSchema = IntakeLinkRowSchema.omit({
  token_hash: true,
});
export type IntakeLinkPublic = z.infer<typeof IntakeLinkPublicSchema>;
