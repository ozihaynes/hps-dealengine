import { describe, expect, it } from "vitest";
import { summarizeStrategistContext } from "@/lib/strategistContext";
import { DEFAULT_SANDBOX_CONFIG } from "@/constants/sandboxSettings";

describe("summarizeStrategistContext", () => {
  it("includes outputs, sandbox knobs, evidence, and overrides", () => {
    const ctx = summarizeStrategistContext({
      runOutput: { outputs: { arv: 200000, buyer_ceiling: 150000 } },
      sandbox: { ...DEFAULT_SANDBOX_CONFIG, aivSafetyCapPercentage: 90 } as any,
      evidenceStatus: [{ kind: "payoff_letter", status: "missing" }],
      overrides: [
        {
          id: "1",
          orgId: "o",
          dealId: "d",
          runId: null,
          posture: "base",
          tokenKey: "policy.min_spread",
          oldValue: 0.12,
          newValue: 0.1,
          justification: "test",
          status: "approved",
          requestedBy: null,
          requestedAt: null,
          approvedBy: null,
          approvedAt: null,
        },
      ],
    });

    expect(ctx).toContain("Buyer Ceiling");
    expect(ctx).toContain("AIV Safety Cap");
    expect(ctx).toContain("Evidence");
    expect(ctx).toContain("Overrides");
  });
});
