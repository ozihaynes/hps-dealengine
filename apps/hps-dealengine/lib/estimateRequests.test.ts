// ============================================================================
// ESTIMATE REQUESTS — Unit Tests
// ============================================================================
// File: apps/hps-dealengine/lib/estimateRequests.test.ts
// Tests: Type validation, helper functions
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  CreateEstimateRequestInputSchema,
  isActiveStatus,
  canCancel,
  getStatusColor,
  ESTIMATE_STATUS_LABELS,
  ESTIMATE_STATUS_COLORS,
  type EstimateRequestStatus,
} from "@hps-internal/contracts";

// -----------------------------------------------------------------------------
// CreateEstimateRequestInputSchema Tests
// -----------------------------------------------------------------------------

describe("CreateEstimateRequestInputSchema", () => {
  it("validates correct input with all fields", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
      gc_phone: "555-1234",
      gc_company: "Smith Contracting",
      request_notes: "Please provide detailed breakdown",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates correct input with only required fields", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing deal_id", () => {
    const input = {
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid deal_id format", () => {
    const input = {
      deal_id: "not-a-uuid",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing gc_name", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_email: "john@contractor.com",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty gc_name", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "",
      gc_email: "john@contractor.com",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("validates email format", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "not-an-email",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("gc_email");
    }
  });

  it("enforces gc_name max length (100 chars)", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "A".repeat(101),
      gc_email: "john@contractor.com",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("enforces gc_phone max length (20 chars)", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
      gc_phone: "1".repeat(21),
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("enforces gc_company max length (100 chars)", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
      gc_company: "A".repeat(101),
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("enforces request_notes max length (1000 chars)", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
      request_notes: "A".repeat(1001),
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be null", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
      gc_phone: null,
      gc_company: null,
      request_notes: null,
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("allows optional fields to be omitted", () => {
    const input = {
      deal_id: "123e4567-e89b-12d3-a456-426614174000",
      gc_name: "John Smith",
      gc_email: "john@contractor.com",
    };

    const result = CreateEstimateRequestInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Status Helper Functions Tests
// -----------------------------------------------------------------------------

describe("isActiveStatus", () => {
  it("returns true for pending status", () => {
    expect(isActiveStatus("pending")).toBe(true);
  });

  it("returns true for sent status", () => {
    expect(isActiveStatus("sent")).toBe(true);
  });

  it("returns true for viewed status", () => {
    expect(isActiveStatus("viewed")).toBe(true);
  });

  it("returns false for submitted status", () => {
    expect(isActiveStatus("submitted")).toBe(false);
  });

  it("returns false for expired status", () => {
    expect(isActiveStatus("expired")).toBe(false);
  });

  it("returns false for cancelled status", () => {
    expect(isActiveStatus("cancelled")).toBe(false);
  });
});

describe("canCancel", () => {
  it("returns true for pending status", () => {
    expect(canCancel("pending")).toBe(true);
  });

  it("returns true for sent status", () => {
    expect(canCancel("sent")).toBe(true);
  });

  it("returns true for viewed status", () => {
    expect(canCancel("viewed")).toBe(true);
  });

  it("returns false for submitted status", () => {
    expect(canCancel("submitted")).toBe(false);
  });

  it("returns false for expired status", () => {
    expect(canCancel("expired")).toBe(false);
  });

  it("returns false for cancelled status", () => {
    expect(canCancel("cancelled")).toBe(false);
  });
});

describe("getStatusColor", () => {
  const statuses: EstimateRequestStatus[] = [
    "pending",
    "sent",
    "viewed",
    "submitted",
    "expired",
    "cancelled",
  ];

  statuses.forEach((status) => {
    it(`returns color object for ${status} status`, () => {
      const color = getStatusColor(status);
      expect(color).toBeDefined();
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("border");
      expect(color).toHaveProperty("text");
    });
  });
});

// -----------------------------------------------------------------------------
// Constants Tests
// -----------------------------------------------------------------------------

describe("ESTIMATE_STATUS_LABELS", () => {
  it("has label for all statuses", () => {
    const statuses: EstimateRequestStatus[] = [
      "pending",
      "sent",
      "viewed",
      "submitted",
      "expired",
      "cancelled",
    ];

    statuses.forEach((status) => {
      expect(ESTIMATE_STATUS_LABELS[status]).toBeDefined();
      expect(typeof ESTIMATE_STATUS_LABELS[status]).toBe("string");
      expect(ESTIMATE_STATUS_LABELS[status].length).toBeGreaterThan(0);
    });
  });
});

describe("ESTIMATE_STATUS_COLORS", () => {
  it("has colors for all statuses", () => {
    const statuses: EstimateRequestStatus[] = [
      "pending",
      "sent",
      "viewed",
      "submitted",
      "expired",
      "cancelled",
    ];

    statuses.forEach((status) => {
      const colors = ESTIMATE_STATUS_COLORS[status];
      expect(colors).toBeDefined();
      expect(colors.bg).toBeDefined();
      expect(colors.border).toBeDefined();
      expect(colors.text).toBeDefined();
    });
  });

  it("uses semantic colors for statuses", () => {
    // Submitted should be green
    expect(ESTIMATE_STATUS_COLORS.submitted.border).toContain("#22c55e");

    // Expired/cancelled should be red/gray
    expect(ESTIMATE_STATUS_COLORS.expired.border).toContain("#ef4444");
    expect(ESTIMATE_STATUS_COLORS.cancelled.border).toContain("#6b7280");

    // Pending should be warning (yellow/amber)
    expect(ESTIMATE_STATUS_COLORS.pending.border).toContain("#fbbf24");
  });
});
