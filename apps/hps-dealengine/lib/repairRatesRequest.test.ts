import { describe, expect, it } from "vitest";
import { repairRatesRequestSchema } from "@hps-internal/contracts";

describe("repairRatesRequestSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = repairRatesRequestSchema.parse({
      dealId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      profileId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      marketCode: "ORL",
      posture: "base",
    });
    expect(parsed.marketCode).toBe("ORL");
    expect(parsed.posture).toBe("base");
  });

  it("rejects missing required fields", () => {
    const parsed = repairRatesRequestSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
