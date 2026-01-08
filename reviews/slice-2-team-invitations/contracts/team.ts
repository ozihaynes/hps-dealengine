import { z } from "zod";

/**
 * Team contracts for team member management
 * Slice 2: Team Access & Invitations
 */

// ============================================================================
// Enums & Constants
// ============================================================================

export const TeamRoleSchema = z.enum(["analyst", "manager", "vp"]);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TEAM_ROLE_OPTIONS: Array<{ value: TeamRole; label: string; description: string }> = [
  { value: "analyst", label: "Underwriter", description: "Can view and edit deals" },
  { value: "manager", label: "Manager", description: "Can approve and invite team members" },
  { value: "vp", label: "VP", description: "Full access to all organization features" },
];

/**
 * Role display names for UI
 */
export function getTeamRoleDisplay(role: TeamRole): string {
  const option = TEAM_ROLE_OPTIONS.find((o) => o.value === role);
  return option?.label ?? role;
}

/**
 * Check if a role can manage team (invite/remove members)
 */
export function canManageTeam(role: TeamRole): boolean {
  return role === "manager" || role === "vp";
}

// ============================================================================
// List Team Members
// ============================================================================

export const TeamMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: TeamRoleSchema,
  display_name: z.string(),
  avatar_url: z.string().url().nullable(),
  joined_at: z.string(),
  is_self: z.boolean(),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamListResponseSchema = z.object({
  ok: z.literal(true),
  members: z.array(TeamMemberSchema),
  count: z.number().int().nonnegative(),
  can_manage: z.boolean(),
  caller_role: TeamRoleSchema,
});

export type TeamListResponse = z.infer<typeof TeamListResponseSchema>;

// ============================================================================
// Remove Team Member
// ============================================================================

export const TeamRemoveRequestSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  org_id: z.string().uuid("Invalid organization ID"),
});

export type TeamRemoveRequest = z.infer<typeof TeamRemoveRequestSchema>;

export const TeamRemoveResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
  removed_user_id: z.string().uuid(),
});

export type TeamRemoveResponse = z.infer<typeof TeamRemoveResponseSchema>;

// ============================================================================
// Error Response
// ============================================================================

export const TeamErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  field: z.string().optional(),
});

export type TeamErrorResponse = z.infer<typeof TeamErrorResponseSchema>;
