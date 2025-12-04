import { describe, expect, it } from "vitest";
import { sandboxToAnalyzeOptions } from "@/lib/sandboxToAnalyzeOptions";
import { mergeSandboxConfig } from "@/constants/sandboxSettings";
import { DEFAULT_SANDBOX_CONFIG } from "@/constants/sandboxSettings";

describe("sandboxToAnalyzeOptions", () => {
  it("maps key valuation/profit knobs into analyze options", () => {
    const cfg = mergeSandboxConfig({
      ...DEFAULT_SANDBOX_CONFIG,
      aivSafetyCapPercentage: 85,
      minSpreadByArvBand: [{ bandName: "Base", maxArv: 400000, minSpread: 10000 }],
      assignmentFeeTarget: 12000,
      carryMonthsMaximumCap: 6,
      fha90DayResaleRuleGate: true,
    } as any);
    const opts = sandboxToAnalyzeOptions({ sandbox: cfg as any, posture: "base" });
    expect(opts.valuation?.aivSafetyCapPercentage).toBe(85);
    expect(opts.floorsSpreads?.assignmentFeeTarget).toBe(12000);
    expect(opts.carryTimeline?.carryMonthsMaximumCap).toBe(6);
    expect(opts.complianceRisk?.fha90DayResaleRuleGate).toBe(true);
    expect(opts.floorsSpreads?.minSpreadByArvBand?.length).toBeGreaterThan(0);
  });
});
