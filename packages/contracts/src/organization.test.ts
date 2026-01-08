import { describe, it, expect } from "vitest";
import {
  OrganizationSchema,
  OrgGetRequestSchema,
  OrgGetResponseSchema,
  OrgUpdateRequestSchema,
  OrgUpdateResponseSchema,
  LogoUploadUrlRequestSchema,
  LogoUploadUrlResponseSchema,
  OrgErrorResponseSchema,
  MAX_LOGO_SIZE,
  ALLOWED_LOGO_TYPES,
  MAX_ORG_NAME_LENGTH,
  isAllowedLogoType,
  isValidLogoSize,
  getLogoExtension,
  formatFileSize,
} from "./organization";

describe("organization contracts", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const validOrg = {
    id: validUuid,
    name: "Test Organization",
    logo_url: "https://example.com/logo.png",
    created_at: "2026-01-07T00:00:00Z",
    updated_at: "2026-01-07T00:00:00Z",
  };

  // ==========================================================================
  // Constants
  // ==========================================================================

  describe("Constants", () => {
    it("MAX_LOGO_SIZE is 5MB", () => {
      expect(MAX_LOGO_SIZE).toBe(5 * 1024 * 1024);
    });

    it("ALLOWED_LOGO_TYPES has correct types", () => {
      expect(ALLOWED_LOGO_TYPES).toContain("image/jpeg");
      expect(ALLOWED_LOGO_TYPES).toContain("image/png");
      expect(ALLOWED_LOGO_TYPES).toContain("image/svg+xml");
      expect(ALLOWED_LOGO_TYPES).toContain("image/webp");
      expect(ALLOWED_LOGO_TYPES).toContain("image/gif");
      expect(ALLOWED_LOGO_TYPES).toHaveLength(5);
    });

    it("MAX_ORG_NAME_LENGTH is 100", () => {
      expect(MAX_ORG_NAME_LENGTH).toBe(100);
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe("isAllowedLogoType", () => {
    it("returns true for allowed types", () => {
      expect(isAllowedLogoType("image/jpeg")).toBe(true);
      expect(isAllowedLogoType("image/png")).toBe(true);
      expect(isAllowedLogoType("image/svg+xml")).toBe(true);
      expect(isAllowedLogoType("image/webp")).toBe(true);
      expect(isAllowedLogoType("image/gif")).toBe(true);
    });

    it("returns false for disallowed types", () => {
      expect(isAllowedLogoType("image/bmp")).toBe(false);
      expect(isAllowedLogoType("application/pdf")).toBe(false);
      expect(isAllowedLogoType("text/plain")).toBe(false);
      expect(isAllowedLogoType("")).toBe(false);
    });
  });

  describe("isValidLogoSize", () => {
    it("returns true for valid sizes", () => {
      expect(isValidLogoSize(1)).toBe(true);
      expect(isValidLogoSize(1024)).toBe(true);
      expect(isValidLogoSize(MAX_LOGO_SIZE)).toBe(true);
    });

    it("returns false for invalid sizes", () => {
      expect(isValidLogoSize(0)).toBe(false);
      expect(isValidLogoSize(-1)).toBe(false);
      expect(isValidLogoSize(MAX_LOGO_SIZE + 1)).toBe(false);
    });
  });

  describe("getLogoExtension", () => {
    it("returns correct extensions", () => {
      expect(getLogoExtension("image/jpeg")).toBe("jpg");
      expect(getLogoExtension("image/png")).toBe("png");
      expect(getLogoExtension("image/svg+xml")).toBe("svg");
      expect(getLogoExtension("image/webp")).toBe("webp");
      expect(getLogoExtension("image/gif")).toBe("gif");
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("formats kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("formats megabytes", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    });
  });

  // ==========================================================================
  // OrganizationSchema
  // ==========================================================================

  describe("OrganizationSchema", () => {
    it("accepts valid organization", () => {
      const result = OrganizationSchema.parse(validOrg);
      expect(result.id).toBe(validUuid);
      expect(result.name).toBe("Test Organization");
    });

    it("accepts organization without logo_url", () => {
      const result = OrganizationSchema.parse({
        ...validOrg,
        logo_url: null,
      });
      expect(result.logo_url).toBeNull();
    });

    it("accepts organization without updated_at", () => {
      const { updated_at, ...orgWithoutUpdatedAt } = validOrg;
      const result = OrganizationSchema.parse(orgWithoutUpdatedAt);
      expect(result.updated_at).toBeUndefined();
    });

    it("rejects invalid UUID", () => {
      expect(() =>
        OrganizationSchema.parse({
          ...validOrg,
          id: "not-a-uuid",
        })
      ).toThrow();
    });

    it("rejects empty name", () => {
      expect(() =>
        OrganizationSchema.parse({
          ...validOrg,
          name: "",
        })
      ).toThrow();
    });

    it("rejects name over 100 characters", () => {
      expect(() =>
        OrganizationSchema.parse({
          ...validOrg,
          name: "a".repeat(101),
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // OrgGetRequestSchema
  // ==========================================================================

  describe("OrgGetRequestSchema", () => {
    it("accepts valid org_id", () => {
      const result = OrgGetRequestSchema.parse({
        org_id: validUuid,
      });
      expect(result.org_id).toBe(validUuid);
    });

    it("rejects invalid org_id", () => {
      expect(() =>
        OrgGetRequestSchema.parse({
          org_id: "not-a-uuid",
        })
      ).toThrow();
    });

    it("rejects missing org_id", () => {
      expect(() => OrgGetRequestSchema.parse({})).toThrow();
    });
  });

  // ==========================================================================
  // OrgGetResponseSchema
  // ==========================================================================

  describe("OrgGetResponseSchema", () => {
    it("accepts valid response", () => {
      const result = OrgGetResponseSchema.parse({
        ok: true,
        organization: validOrg,
        caller_role: "vp",
      });
      expect(result.ok).toBe(true);
      expect(result.caller_role).toBe("vp");
    });

    it("accepts all valid roles", () => {
      // P0-001 FIX: Only test valid roles (owner doesn't exist in DB)
      for (const role of ["analyst", "manager", "vp"]) {
        const result = OrgGetResponseSchema.parse({
          ok: true,
          organization: validOrg,
          caller_role: role,
        });
        expect(result.caller_role).toBe(role);
      }
    });

    it("rejects invalid role", () => {
      expect(() =>
        OrgGetResponseSchema.parse({
          ok: true,
          organization: validOrg,
          caller_role: "admin",
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // OrgUpdateRequestSchema
  // ==========================================================================

  describe("OrgUpdateRequestSchema", () => {
    it("accepts valid update with name", () => {
      const result = OrgUpdateRequestSchema.parse({
        org_id: validUuid,
        name: "New Name",
      });
      expect(result.name).toBe("New Name");
    });

    it("accepts valid update with logo_url", () => {
      const result = OrgUpdateRequestSchema.parse({
        org_id: validUuid,
        logo_url: "https://example.com/new-logo.png",
      });
      expect(result.logo_url).toBe("https://example.com/new-logo.png");
    });

    it("accepts null logo_url to remove logo", () => {
      const result = OrgUpdateRequestSchema.parse({
        org_id: validUuid,
        logo_url: null,
      });
      expect(result.logo_url).toBeNull();
    });

    it("trims name whitespace", () => {
      const result = OrgUpdateRequestSchema.parse({
        org_id: validUuid,
        name: "  Trimmed Name  ",
      });
      expect(result.name).toBe("Trimmed Name");
    });

    it("rejects blank name", () => {
      expect(() =>
        OrgUpdateRequestSchema.parse({
          org_id: validUuid,
          name: "",
        })
      ).toThrow();
    });

    it("rejects whitespace-only name", () => {
      expect(() =>
        OrgUpdateRequestSchema.parse({
          org_id: validUuid,
          name: "   ",
        })
      ).toThrow();
    });

    it("rejects name over 100 characters", () => {
      expect(() =>
        OrgUpdateRequestSchema.parse({
          org_id: validUuid,
          name: "a".repeat(101),
        })
      ).toThrow();
    });

    it("rejects invalid org_id", () => {
      expect(() =>
        OrgUpdateRequestSchema.parse({
          org_id: "not-a-uuid",
          name: "Valid Name",
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // OrgUpdateResponseSchema
  // ==========================================================================

  describe("OrgUpdateResponseSchema", () => {
    it("accepts valid response", () => {
      const result = OrgUpdateResponseSchema.parse({
        ok: true,
        organization: validOrg,
        message: "Organization updated successfully",
      });
      expect(result.ok).toBe(true);
      expect(result.message).toBe("Organization updated successfully");
    });
  });

  // ==========================================================================
  // LogoUploadUrlRequestSchema
  // ==========================================================================

  describe("LogoUploadUrlRequestSchema", () => {
    it("accepts valid request", () => {
      const result = LogoUploadUrlRequestSchema.parse({
        org_id: validUuid,
        content_type: "image/png",
        file_size: 1024 * 1024,
      });
      expect(result.content_type).toBe("image/png");
      expect(result.file_size).toBe(1024 * 1024);
    });

    it("accepts all valid content types", () => {
      for (const contentType of ALLOWED_LOGO_TYPES) {
        const result = LogoUploadUrlRequestSchema.parse({
          org_id: validUuid,
          content_type: contentType,
          file_size: 1024,
        });
        expect(result.content_type).toBe(contentType);
      }
    });

    it("rejects invalid content type", () => {
      expect(() =>
        LogoUploadUrlRequestSchema.parse({
          org_id: validUuid,
          content_type: "image/bmp",
          file_size: 1024,
        })
      ).toThrow();
    });

    it("rejects file size over 5MB", () => {
      expect(() =>
        LogoUploadUrlRequestSchema.parse({
          org_id: validUuid,
          content_type: "image/png",
          file_size: MAX_LOGO_SIZE + 1,
        })
      ).toThrow();
    });

    it("rejects zero file size", () => {
      expect(() =>
        LogoUploadUrlRequestSchema.parse({
          org_id: validUuid,
          content_type: "image/png",
          file_size: 0,
        })
      ).toThrow();
    });

    it("rejects negative file size", () => {
      expect(() =>
        LogoUploadUrlRequestSchema.parse({
          org_id: validUuid,
          content_type: "image/png",
          file_size: -1,
        })
      ).toThrow();
    });

    it("rejects invalid org_id", () => {
      expect(() =>
        LogoUploadUrlRequestSchema.parse({
          org_id: "not-a-uuid",
          content_type: "image/png",
          file_size: 1024,
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // LogoUploadUrlResponseSchema
  // ==========================================================================

  describe("LogoUploadUrlResponseSchema", () => {
    it("accepts valid response", () => {
      const result = LogoUploadUrlResponseSchema.parse({
        ok: true,
        upload_url: "https://storage.supabase.co/upload",
        token: "abc123",
        path: `${validUuid}/logo.png`,
        public_url: "https://storage.supabase.co/public/org-assets/logo.png",
        expires_in: 60,
      });
      expect(result.ok).toBe(true);
      expect(result.expires_in).toBe(60);
    });

    it("rejects invalid upload_url", () => {
      expect(() =>
        LogoUploadUrlResponseSchema.parse({
          ok: true,
          upload_url: "not-a-url",
          token: "abc123",
          path: `${validUuid}/logo.png`,
          public_url: "https://storage.supabase.co/public/org-assets/logo.png",
          expires_in: 60,
        })
      ).toThrow();
    });

    it("rejects zero expires_in", () => {
      expect(() =>
        LogoUploadUrlResponseSchema.parse({
          ok: true,
          upload_url: "https://storage.supabase.co/upload",
          token: "abc123",
          path: `${validUuid}/logo.png`,
          public_url: "https://storage.supabase.co/public/org-assets/logo.png",
          expires_in: 0,
        })
      ).toThrow();
    });
  });

  // ==========================================================================
  // OrgErrorResponseSchema
  // ==========================================================================

  describe("OrgErrorResponseSchema", () => {
    it("accepts error without field", () => {
      const result = OrgErrorResponseSchema.parse({
        ok: false,
        error: "Internal server error",
      });
      expect(result.ok).toBe(false);
      expect(result.field).toBeUndefined();
    });

    it("accepts error with field", () => {
      const result = OrgErrorResponseSchema.parse({
        ok: false,
        error: "Organization name cannot be blank",
        field: "name",
      });
      expect(result.field).toBe("name");
    });
  });
});
