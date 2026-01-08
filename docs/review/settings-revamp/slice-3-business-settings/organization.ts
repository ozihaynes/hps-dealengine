import { z } from "zod";

/**
 * Organization contracts for business settings
 * Slice 3: Business Settings & Logo Upload
 */

// ============================================================================
// Constants
// ============================================================================

export const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_LOGO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "image/gif",
] as const;
export type AllowedLogoType = (typeof ALLOWED_LOGO_TYPES)[number];

export const MAX_ORG_NAME_LENGTH = 100;
export const MIN_ORG_NAME_LENGTH = 1;

// ============================================================================
// Organization Schema
// ============================================================================

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  logo_url: z.string().url().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// ============================================================================
// Get Organization
// ============================================================================

export const OrgGetRequestSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
});

export type OrgGetRequest = z.infer<typeof OrgGetRequestSchema>;

export const OrgGetResponseSchema = z.object({
  ok: z.literal(true),
  organization: OrganizationSchema,
  // P0-001 FIX: Remove 'owner' - doesn't exist in membership_role enum
  caller_role: z.enum(["analyst", "manager", "vp"]),
});

export type OrgGetResponse = z.infer<typeof OrgGetResponseSchema>;

// ============================================================================
// Update Organization
// ============================================================================

export const OrgUpdateRequestSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
  name: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z
      .string()
      .min(MIN_ORG_NAME_LENGTH, "Organization name cannot be blank")
      .max(MAX_ORG_NAME_LENGTH, `Organization name cannot exceed ${MAX_ORG_NAME_LENGTH} characters`)
      .optional()
  ),
  logo_url: z.string().url().nullable().optional(),
});

export type OrgUpdateRequest = z.infer<typeof OrgUpdateRequestSchema>;

export const OrgUpdateResponseSchema = z.object({
  ok: z.literal(true),
  organization: OrganizationSchema,
  message: z.string(),
});

export type OrgUpdateResponse = z.infer<typeof OrgUpdateResponseSchema>;

// ============================================================================
// Logo Upload URL
// ============================================================================

export const LogoUploadUrlRequestSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
  content_type: z.enum(ALLOWED_LOGO_TYPES, {
    errorMap: () => ({
      message: `Invalid file type. Allowed: ${ALLOWED_LOGO_TYPES.join(", ")}`,
    }),
  }),
  file_size: z
    .number()
    .int()
    .positive("File size must be positive")
    .max(MAX_LOGO_SIZE, `File too large. Maximum size is ${MAX_LOGO_SIZE / 1024 / 1024}MB`),
});

export type LogoUploadUrlRequest = z.infer<typeof LogoUploadUrlRequestSchema>;

export const LogoUploadUrlResponseSchema = z.object({
  ok: z.literal(true),
  upload_url: z.string().url(),
  token: z.string(),
  path: z.string(),
  public_url: z.string().url(),
  expires_in: z.number().int().positive(),
});

export type LogoUploadUrlResponse = z.infer<typeof LogoUploadUrlResponseSchema>;

// ============================================================================
// Error Response
// ============================================================================

export const OrgErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  field: z.string().optional(),
});

export type OrgErrorResponse = z.infer<typeof OrgErrorResponseSchema>;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate if a file type is allowed for logo upload
 */
export function isAllowedLogoType(mimeType: string): mimeType is AllowedLogoType {
  return ALLOWED_LOGO_TYPES.includes(mimeType as AllowedLogoType);
}

/**
 * Validate if a file size is within limits
 */
export function isValidLogoSize(size: number): boolean {
  return size > 0 && size <= MAX_LOGO_SIZE;
}

/**
 * Get file extension from content type
 */
export function getLogoExtension(contentType: AllowedLogoType): string {
  const extMap: Record<AllowedLogoType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extMap[contentType];
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
