import { describe, expect, it } from "vitest";
import { repairRatesRequestSchema } from "@hps-internal/contracts";

describe("repairRatesRequestSchema", () => {
  it("accepts a valid request", () => {
    const parsed = repairRatesRequestSchema.parse({
      dealId: "11111111-2222-4333-8444-555555555555",
      marketCode: "ORL",
      posture: "base",
      profileId: null,
    });
    expect(parsed.dealId).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("rejects missing dealId", () => {
    expect(() =>
      repairRatesRequestSchema.parse({
        marketCode: "ORL",
        posture: "base",
        profileId: null,
      }),
    ).toThrow();
  });
});
