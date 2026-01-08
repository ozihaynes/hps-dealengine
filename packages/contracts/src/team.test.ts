import { describe, it, expect } from "vitest";
import {
  TeamRoleSchema,
  TeamMemberSchema,
  TeamListResponseSchema,
  TeamRemoveRequestSchema,
  TeamRemoveResponseSchema,
  TeamErrorResponseSchema,
  getTeamRoleDisplay,
  canManageTeam,
  TEAM_ROLE_OPTIONS,
} from "./team";

describe("team contracts", () => {
  // ==========================================================================
  // TeamRoleSchema
  // ==========================================================================

  describe("TeamRoleSchema", () => {
    it("accepts valid roles", () => {
      expect(TeamRoleSchema.parse("analyst")).toBe("analyst");
      expect(TeamRoleSchema.parse("manager")).toBe("manager");
      expect(TeamRoleSchema.parse("vp")).toBe("vp");
    });

    it("rejects invalid roles", () => {
      expect(() => TeamRoleSchema.parse("owner")).toThrow();
      expect(() => TeamRoleSchema.parse("admin")).toThrow();
      expect(() => TeamRoleSchema.parse("")).toThrow();
    });
  });

  // ==========================================================================
  // getTeamRoleDisplay
  // ==========================================================================

  describe("getTeamRoleDisplay", () => {
    it("returns correct display names", () => {
      expect(getTeamRoleDisplay("analyst")).toBe("Underwriter");
      expect(getTeamRoleDisplay("manager")).toBe("Manager");
      expect(getTeamRoleDisplay("vp")).toBe("VP");
    });
  });

  // ==========================================================================
  // canManageTeam
  // ==========================================================================

  describe("canManageTeam", () => {
    it("returns true for manager and vp", () => {
      expect(canManageTeam("manager")).toBe(true);
      expect(canManageTeam("vp")).toBe(true);
    });

    it("returns false for analyst", () => {
      expect(canManageTeam("analyst")).toBe(false);
    });
  });

  // ==========================================================================
  // TEAM_ROLE_OPTIONS
  // ==========================================================================

  describe("TEAM_ROLE_OPTIONS", () => {
    it("has correct options", () => {
      expect(TEAM_ROLE_OPTIONS).toHaveLength(3);
      expect(TEAM_ROLE_OPTIONS.map((o) => o.value)).toEqual([
        "analyst",
        "manager",
        "vp",
      ]);
    });

    it("has descriptions for all options", () => {
      TEAM_ROLE_OPTIONS.forEach((option) => {
        expect(option.description).toBeTruthy();
        expect(option.description.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // TeamMemberSchema
  // ==========================================================================

  describe("TeamMemberSchema", () => {
    it("accepts valid member", () => {
      const result = TeamMemberSchema.parse({
        user_id: "123e4567-e89b-12d3-a456-426614174000",
        role: "analyst",
        display_name: "John Doe",
        avatar_url: null,
        joined_at: "2026-01-07T00:00:00Z",
        is_self: false,
      });
      expect(result.display_name).toBe("John Doe");
    });

    it("accepts member with avatar_url", () => {
      const result = TeamMemberSchema.parse({
        user_id: "123e4567-e89b-12d3-a456-426614174000",
        role: "manager",
        display_name: "Jane Doe",
        avatar_url: "https://example.com/avatar.jpg",
        joined_at: "2026-01-07T00:00:00Z",
        is_self: true,
      });
      expect(result.avatar_url).toBe("https://example.com/avatar.jpg");
      expect(result.is_self).toBe(true);
    });

    it("rejects invalid user_id", () => {
      expect(() =>
        TeamMemberSchema.parse({
          user_id: "not-a-uuid",
          role: "analyst",
          display_name: "Test",
          avatar_url: null,
          joined_at: "2026-01-07T00:00:00Z",
          is_self: false,
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // TeamListResponseSchema
  // ==========================================================================

  describe("TeamListResponseSchema", () => {
    it("accepts empty list", () => {
      const result = TeamListResponseSchema.parse({
        ok: true,
        members: [],
        count: 0,
        can_manage: false,
        caller_role: "analyst",
      });
      expect(result.members).toHaveLength(0);
      expect(result.can_manage).toBe(false);
    });

    it("accepts list with members", () => {
      const result = TeamListResponseSchema.parse({
        ok: true,
        members: [
          {
            user_id: "123e4567-e89b-12d3-a456-426614174000",
            role: "vp",
            display_name: "VP User",
            avatar_url: null,
            joined_at: "2026-01-01T00:00:00Z",
            is_self: false,
          },
          {
            user_id: "223e4567-e89b-12d3-a456-426614174000",
            role: "analyst",
            display_name: "Analyst User",
            avatar_url: "https://example.com/avatar.jpg",
            joined_at: "2026-01-07T00:00:00Z",
            is_self: true,
          },
        ],
        count: 2,
        can_manage: true,
        caller_role: "manager",
      });
      expect(result.members).toHaveLength(2);
      expect(result.can_manage).toBe(true);
      expect(result.caller_role).toBe("manager");
    });
  });

  // ==========================================================================
  // TeamRemoveRequestSchema
  // ==========================================================================

  describe("TeamRemoveRequestSchema", () => {
    it("accepts valid request", () => {
      const result = TeamRemoveRequestSchema.parse({
        user_id: "123e4567-e89b-12d3-a456-426614174000",
        org_id: "223e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.user_id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.org_id).toBe("223e4567-e89b-12d3-a456-426614174000");
    });

    it("rejects invalid user_id", () => {
      expect(() =>
        TeamRemoveRequestSchema.parse({
          user_id: "not-a-uuid",
          org_id: "223e4567-e89b-12d3-a456-426614174000",
        })
      ).toThrow();
    });

    it("rejects invalid org_id", () => {
      expect(() =>
        TeamRemoveRequestSchema.parse({
          user_id: "123e4567-e89b-12d3-a456-426614174000",
          org_id: "not-a-uuid",
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // TeamRemoveResponseSchema
  // ==========================================================================

  describe("TeamRemoveResponseSchema", () => {
    it("accepts valid response", () => {
      const result = TeamRemoveResponseSchema.parse({
        ok: true,
        message: "Member removed from organization",
        removed_user_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.ok).toBe(true);
      expect(result.removed_user_id).toBe(
        "123e4567-e89b-12d3-a456-426614174000"
      );
    });
  });

  // ==========================================================================
  // TeamErrorResponseSchema
  // ==========================================================================

  describe("TeamErrorResponseSchema", () => {
    it("accepts error without field", () => {
      const result = TeamErrorResponseSchema.parse({
        ok: false,
        error: "Not a member of this organization",
      });
      expect(result.error).toBe("Not a member of this organization");
    });

    it("accepts error with field", () => {
      const result = TeamErrorResponseSchema.parse({
        ok: false,
        error: "Invalid user ID",
        field: "user_id",
      });
      expect(result.field).toBe("user_id");
    });
  });
});
