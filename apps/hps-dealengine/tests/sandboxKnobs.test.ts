import { describe, expect, it } from "vitest";
import { SANDBOX_V1_KNOBS } from "@/constants/sandboxKnobs";

describe("SANDBOX_V1_KNOBS", () => {
  it("includes labels, groups, and stable keys", () => {
    expect(SANDBOX_V1_KNOBS.length).toBeGreaterThan(0);
    const groups = new Set(SANDBOX_V1_KNOBS.map((k) => k.group));
    expect(groups.has("Valuation")).toBe(true);
    expect(SANDBOX_V1_KNOBS.find((k) => k.key === "aivSafetyCapPercentage")).toBeTruthy();
  });
});
