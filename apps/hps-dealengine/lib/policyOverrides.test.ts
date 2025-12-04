import { describe, expect, it } from "vitest";
import { buildOverrideOrFilter } from "./policyOverrides.helpers";

describe("policyOverrides filters", () => {
  it("includes run and deal filters", () => {
    const filter = buildOverrideOrFilter({
      runId: "run-123",
      dealId: "deal-456",
      includeDealIdNullForPosture: true,
      posture: "base",
    });

    expect(filter).toBe("run_id.eq.run-123,deal_id.eq.deal-456,deal_id.is.null");
  });

  it("returns null when no filters are provided", () => {
    expect(buildOverrideOrFilter({})).toBeNull();
  });
});
