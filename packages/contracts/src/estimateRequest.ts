// ============================================================================
// ESTIMATE REQUEST TYPE SYSTEM
// ============================================================================
// Purpose: Type definitions for GC estimate request lifecycle
// Used by: Edge Functions, Client API, UI Components
// ============================================================================

import { z } from "zod";

// ============================================================================
// STATUS ENUM + DISPLAY CONSTANTS
// ============================================================================

export const EstimateRequestStatusSchema = z.enum([
  "pending",
  "sent",
  "viewed",
  "submitted",
  "expired",
  "cancelled",
]);

export type EstimateRequestStatus = z.infer<typeof EstimateRequestStatusSchema>;

export const ESTIMATE_STATUS_LABELS: Record<EstimateRequestStatus, string> = {
  pending: "Pending",
  sent: "Sent",
  viewed: "Viewed",
  submitted: "Submitted",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const ESTIMATE_STATUS_COLORS: Record<
  EstimateRequestStatus,
  { bg: string; border: string; text: string }
> = {
  pending: { bg: "rgba(251, 191, 36, 0.1)", border: "#fbbf24", text: "#fde047" },
  sent: { bg: "rgba(59, 130, 246, 0.1)", border: "#3b82f6", text: "#93c5fd" },
  viewed: { bg: "rgba(168, 85, 247, 0.1)", border: "#a855f7", text: "#d8b4fe" },
  submitted: {
    bg: "rgba(34, 197, 94, 0.1)",
    border: "#22c55e",
    text: "#86efac",
  },
  expired: { bg: "rgba(239, 68, 68, 0.1)", border: "#ef4444", text: "#fca5a5" },
  cancelled: {
    bg: "rgba(107, 114, 128, 0.1)",
    border: "#6b7280",
    text: "#9ca3af",
  },
};

// ============================================================================
// FULL ESTIMATE REQUEST SCHEMA
// ============================================================================

export const EstimateRequestSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  deal_id: z.string().uuid(),
  gc_name: z.string().min(1),
  gc_email: z.string().email(),
  gc_phone: z.string().nullable(),
  gc_company: z.string().nullable(),
  status: EstimateRequestStatusSchema,
  submission_token: z.string().uuid(),
  token_expires_at: z.string().datetime(),
  sent_at: z.string().datetime().nullable(),
  viewed_at: z.string().datetime().nullable(),
  submitted_at: z.string().datetime().nullable(),
  estimate_file_path: z.string().nullable(),
  estimate_file_name: z.string().nullable(),
  estimate_file_size_bytes: z.number().nullable(),
  estimate_file_type: z.string().nullable(),
  request_notes: z.string().nullable(),
  gc_notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid().nullable(),
});

export type EstimateRequest = z.infer<typeof EstimateRequestSchema>;

// ============================================================================
// CREATE INPUT SCHEMA (for UI forms)
// ============================================================================

export const CreateEstimateRequestInputSchema = z.object({
  deal_id: z.string().uuid("Invalid deal ID"),
  gc_name: z
    .string()
    .min(1, "GC name is required")
    .max(100, "Name must be under 100 characters"),
  gc_email: z.string().email("Valid email is required"),
  gc_phone: z
    .string()
    .max(20, "Phone must be under 20 characters")
    .optional()
    .nullable(),
  gc_company: z
    .string()
    .max(100, "Company name must be under 100 characters")
    .optional()
    .nullable(),
  request_notes: z
    .string()
    .max(1000, "Notes must be under 1000 characters")
    .optional()
    .nullable(),
});

export type CreateEstimateRequestInput = z.infer<
  typeof CreateEstimateRequestInputSchema
>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SendEstimateRequestResponse {
  ok: boolean;
  request_id?: string;
  email_sent?: boolean;
  message?: string;
  error?: string;
}

export interface SubmitEstimateResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

export interface EstimateValidateTokenResponse {
  id: string | null;
  org_id: string | null;
  deal_id: string | null;
  gc_name: string | null;
  gc_email: string | null;
  status: EstimateRequestStatus | null;
  token_expires_at: string | null;
  property_address: string | null;
  is_valid: boolean;
  error_message: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isActiveStatus(status: EstimateRequestStatus): boolean {
  return ["pending", "sent", "viewed"].includes(status);
}

export function canCancel(status: EstimateRequestStatus): boolean {
  return ["pending", "sent", "viewed"].includes(status);
}

export function getStatusColor(status: EstimateRequestStatus) {
  return ESTIMATE_STATUS_COLORS[status] ?? ESTIMATE_STATUS_COLORS.pending;
}
