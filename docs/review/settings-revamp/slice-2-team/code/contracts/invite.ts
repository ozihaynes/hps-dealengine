import { z } from "zod";

/**
 * Invite contracts for team invitation flow
 * Slice 2: Team Access & Invitations
 */

// ============================================================================
// Enums & Constants
// ============================================================================

export const InviteRoleSchema = z.enum(["analyst", "manager", "vp"]);
export type InviteRole = z.infer<typeof InviteRoleSchema>;

export const INVITE_ROLE_OPTIONS: Array<{ value: InviteRole; label: string }> = [
  { value: "analyst", label: "Underwriter" },
  { value: "manager", label: "Manager" },
  { value: "vp", label: "VP" },
];

/**
 * Role display names for UI
 */
export function getInviteRoleDisplay(role: InviteRole): string {
  const option = INVITE_ROLE_OPTIONS.find((o) => o.value === role);
  return option?.label ?? role;
}

// ============================================================================
// Send Invite
// ============================================================================

export const InviteSendRequestSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
    z.string().min(1, "Email is required").email("Invalid email format"),
  ),
  role: InviteRoleSchema,
  org_id: z.string().uuid("Invalid organization ID"),
});

export type InviteSendRequest = z.infer<typeof InviteSendRequestSchema>;

export const InvitationSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: InviteRoleSchema,
  expires_at: z.string(),
  created_at: z.string(),
});

export type Invitation = z.infer<typeof InvitationSchema>;

export const InviteSendResponseSchema = z.object({
  ok: z.literal(true),
  invitation: InvitationSchema,
  email_sent: z.boolean(),
  message: z.string(),
});

export type InviteSendResponse = z.infer<typeof InviteSendResponseSchema>;

// ============================================================================
// Accept Invite
// ============================================================================

export const InviteAcceptRequestSchema = z.object({
  token: z.string().min(32, "Invalid token"),
});

export type InviteAcceptRequest = z.infer<typeof InviteAcceptRequestSchema>;

export const InviteAcceptResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
  org_id: z.string().uuid(),
  org_name: z.string().nullable().optional(),
  role: InviteRoleSchema,
  already_member: z.boolean(),
});

export type InviteAcceptResponse = z.infer<typeof InviteAcceptResponseSchema>;

// ============================================================================
// List Invites
// ============================================================================

export const InvitationDisplaySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: InviteRoleSchema,
  expires_at: z.string(),
  created_at: z.string(),
  inviter_name: z.string(),
});

export type InvitationDisplay = z.infer<typeof InvitationDisplaySchema>;

export const InviteListResponseSchema = z.object({
  ok: z.literal(true),
  invitations: z.array(InvitationDisplaySchema),
  count: z.number().int().nonnegative(),
});

export type InviteListResponse = z.infer<typeof InviteListResponseSchema>;

// ============================================================================
// Revoke Invite
// ============================================================================

export const InviteRevokeRequestSchema = z.object({
  invitation_id: z.string().uuid("Invalid invitation ID"),
});

export type InviteRevokeRequest = z.infer<typeof InviteRevokeRequestSchema>;

export const InviteRevokeResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
  invitation_id: z.string().uuid(),
});

export type InviteRevokeResponse = z.infer<typeof InviteRevokeResponseSchema>;

// ============================================================================
// Error Response
// ============================================================================

export const InviteErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  field: z.string().optional(),
  message: z.string().optional(),
  expected_email: z.string().email().optional(),
  existing_expires_at: z.string().optional(),
});

export type InviteErrorResponse = z.infer<typeof InviteErrorResponseSchema>;
