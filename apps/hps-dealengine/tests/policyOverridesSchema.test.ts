import { describe, expect, it } from "vitest";
import {
  PolicyOverrideApproveInputSchema,
  PolicyOverrideRequestInputSchema,
} from "@hps-internal/contracts";

describe("policy override schemas", () => {
  it("requires justification and tokenKey", () => {
    const parsed = PolicyOverrideRequestInputSchema.safeParse({
      dealId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      posture: "base",
      tokenKey: "policy.min_spread",
      newValue: 0.08,
      justification: "Manager approved",
    });
    expect(parsed.success).toBe(true);

    const missing = PolicyOverrideRequestInputSchema.safeParse({
      posture: "base",
      tokenKey: "",
      newValue: 0.08,
      justification: "",
    });
    expect(missing.success).toBe(false);
  });

  it("approvals accept only approved/rejected", () => {
    const ok = PolicyOverrideApproveInputSchema.safeParse({
      overrideId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      decision: "approved",
    });
    expect(ok.success).toBe(true);

    const bad = PolicyOverrideApproveInputSchema.safeParse({
      overrideId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      decision: "other",
    });
    expect(bad.success).toBe(false);
  });
});
