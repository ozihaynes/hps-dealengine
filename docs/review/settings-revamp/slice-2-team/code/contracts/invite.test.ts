import { describe, it, expect } from "vitest";
import {
  InviteSendRequestSchema,
  InviteAcceptRequestSchema,
  InviteRevokeRequestSchema,
  InviteSendResponseSchema,
  InviteAcceptResponseSchema,
  InviteListResponseSchema,
  InviteRevokeResponseSchema,
  InviteErrorResponseSchema,
  InviteRoleSchema,
  getInviteRoleDisplay,
  INVITE_ROLE_OPTIONS,
} from "./invite";

describe("invite contracts", () => {
  // ==========================================================================
  // InviteRoleSchema
  // ==========================================================================

  describe("InviteRoleSchema", () => {
    it("accepts valid roles", () => {
      expect(InviteRoleSchema.parse("analyst")).toBe("analyst");
      expect(InviteRoleSchema.parse("manager")).toBe("manager");
      expect(InviteRoleSchema.parse("vp")).toBe("vp");
    });

    it("rejects invalid roles", () => {
      expect(() => InviteRoleSchema.parse("owner")).toThrow();
      expect(() => InviteRoleSchema.parse("admin")).toThrow();
      expect(() => InviteRoleSchema.parse("")).toThrow();
    });
  });

  // ==========================================================================
  // getInviteRoleDisplay
  // ==========================================================================

  describe("getInviteRoleDisplay", () => {
    it("returns correct display names", () => {
      expect(getInviteRoleDisplay("analyst")).toBe("Underwriter");
      expect(getInviteRoleDisplay("manager")).toBe("Manager");
      expect(getInviteRoleDisplay("vp")).toBe("VP");
    });
  });

  // ==========================================================================
  // INVITE_ROLE_OPTIONS
  // ==========================================================================

  describe("INVITE_ROLE_OPTIONS", () => {
    it("has correct options", () => {
      expect(INVITE_ROLE_OPTIONS).toHaveLength(3);
      expect(INVITE_ROLE_OPTIONS.map((o) => o.value)).toEqual([
        "analyst",
        "manager",
        "vp",
      ]);
    });
  });

  // ==========================================================================
  // InviteSendRequestSchema
  // ==========================================================================

  describe("InviteSendRequestSchema", () => {
    it("accepts valid request", () => {
      const result = InviteSendRequestSchema.parse({
        email: "test@example.com",
        role: "analyst",
        org_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.email).toBe("test@example.com");
      expect(result.role).toBe("analyst");
    });

    it("normalizes email to lowercase", () => {
      const result = InviteSendRequestSchema.parse({
        email: "TEST@EXAMPLE.COM",
        role: "manager",
        org_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.email).toBe("test@example.com");
    });

    it("trims email whitespace", () => {
      const result = InviteSendRequestSchema.parse({
        email: "  test@example.com  ",
        role: "vp",
        org_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.email).toBe("test@example.com");
    });

    it("rejects empty email", () => {
      expect(() =>
        InviteSendRequestSchema.parse({
          email: "",
          role: "analyst",
          org_id: "123e4567-e89b-12d3-a456-426614174000",
        })
      ).toThrow();
    });

    it("rejects invalid email format", () => {
      expect(() =>
        InviteSendRequestSchema.parse({
          email: "not-an-email",
          role: "analyst",
          org_id: "123e4567-e89b-12d3-a456-426614174000",
        })
      ).toThrow();
    });

    it("rejects invalid org_id", () => {
      expect(() =>
        InviteSendRequestSchema.parse({
          email: "test@example.com",
          role: "analyst",
          org_id: "not-a-uuid",
        })
      ).toThrow();
    });

    it("rejects invalid role", () => {
      expect(() =>
        InviteSendRequestSchema.parse({
          email: "test@example.com",
          role: "owner",
          org_id: "123e4567-e89b-12d3-a456-426614174000",
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // InviteAcceptRequestSchema
  // ==========================================================================

  describe("InviteAcceptRequestSchema", () => {
    it("accepts valid token", () => {
      const result = InviteAcceptRequestSchema.parse({
        token: "a".repeat(64),
      });
      expect(result.token).toHaveLength(64);
    });

    it("rejects short token", () => {
      expect(() =>
        InviteAcceptRequestSchema.parse({
          token: "tooshort",
        })
      ).toThrow();
    });

    it("rejects empty token", () => {
      expect(() =>
        InviteAcceptRequestSchema.parse({
          token: "",
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // InviteRevokeRequestSchema
  // ==========================================================================

  describe("InviteRevokeRequestSchema", () => {
    it("accepts valid invitation_id", () => {
      const result = InviteRevokeRequestSchema.parse({
        invitation_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.invitation_id).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("rejects invalid invitation_id", () => {
      expect(() =>
        InviteRevokeRequestSchema.parse({
          invitation_id: "not-a-uuid",
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // Response Schemas
  // ==========================================================================

  describe("InviteSendResponseSchema", () => {
    it("accepts valid response", () => {
      const result = InviteSendResponseSchema.parse({
        ok: true,
        invitation: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          email: "test@example.com",
          role: "analyst",
          expires_at: "2026-01-14T00:00:00Z",
          created_at: "2026-01-07T00:00:00Z",
        },
        email_sent: true,
        message: "Invitation sent to test@example.com",
      });
      expect(result.ok).toBe(true);
      expect(result.email_sent).toBe(true);
    });
  });

  describe("InviteAcceptResponseSchema", () => {
    it("accepts valid response with already_member true", () => {
      const result = InviteAcceptResponseSchema.parse({
        ok: true,
        message: "You're already a member",
        org_id: "123e4567-e89b-12d3-a456-426614174000",
        org_name: "Test Org",
        role: "analyst",
        already_member: true,
      });
      expect(result.already_member).toBe(true);
    });

    it("accepts valid response with already_member false", () => {
      const result = InviteAcceptResponseSchema.parse({
        ok: true,
        message: "Welcome!",
        org_id: "123e4567-e89b-12d3-a456-426614174000",
        role: "manager",
        already_member: false,
      });
      expect(result.already_member).toBe(false);
    });
  });

  describe("InviteListResponseSchema", () => {
    it("accepts empty list", () => {
      const result = InviteListResponseSchema.parse({
        ok: true,
        invitations: [],
        count: 0,
      });
      expect(result.invitations).toHaveLength(0);
    });

    it("accepts list with invitations", () => {
      const result = InviteListResponseSchema.parse({
        ok: true,
        invitations: [
          {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "test@example.com",
            role: "analyst",
            expires_at: "2026-01-14T00:00:00Z",
            created_at: "2026-01-07T00:00:00Z",
            inviter_name: "John Doe",
          },
        ],
        count: 1,
      });
      expect(result.invitations).toHaveLength(1);
      expect(result.invitations[0].inviter_name).toBe("John Doe");
    });
  });

  describe("InviteRevokeResponseSchema", () => {
    it("accepts valid response", () => {
      const result = InviteRevokeResponseSchema.parse({
        ok: true,
        message: "Invitation revoked",
        invitation_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("InviteErrorResponseSchema", () => {
    it("accepts error with field", () => {
      const result = InviteErrorResponseSchema.parse({
        ok: false,
        error: "Invalid email format",
        field: "email",
      });
      expect(result.field).toBe("email");
    });

    it("accepts error with expected_email", () => {
      const result = InviteErrorResponseSchema.parse({
        ok: false,
        error: "Email mismatch",
        message: "Please sign in with the correct email",
        expected_email: "expected@example.com",
      });
      expect(result.expected_email).toBe("expected@example.com");
    });

    it("accepts error with existing_expires_at", () => {
      const result = InviteErrorResponseSchema.parse({
        ok: false,
        error: "Invite already pending",
        existing_expires_at: "2026-01-14T00:00:00Z",
      });
      expect(result.existing_expires_at).toBe("2026-01-14T00:00:00Z");
    });
  });
});
