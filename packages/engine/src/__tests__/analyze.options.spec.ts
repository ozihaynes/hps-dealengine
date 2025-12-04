import { describe, expect, it } from "vitest";
import { AnalyzeInputSchema } from "@hps-internal/contracts";

describe("AnalyzeInputSchema sandboxOptions bridge", () => {
  it("accepts sandboxOptions on the analyze envelope", () => {
    const parsed = AnalyzeInputSchema.parse({
      org_id: "11111111-1111-1111-1111-111111111111",
      posture: "base",
      deal: { arv: 200000, options: { trace: true } },
      sandboxOptions: {
        valuation: { aivSafetyCapPercentage: 90 },
        floorsSpreads: { assignmentFeeTarget: 15000 },
        repairs: { repairsHardMax: 50000 },
        carryTimeline: { carryMonthsMaximumCap: 6 },
        wholetail: { buyerTargetMarginWholetailMinPercentage: 8 },
        debtPayoff: { payoffAccrualBasisDayCountConvention: "30/360" },
        complianceRisk: { fha90DayResaleRuleGate: true },
        disposition: { doubleCloseMinSpreadThreshold: 20000 },
        workflowUi: { bankersRoundingModeNumericSafety: true },
        raw: { aivSafetyCapPercentage: 90, fha90DayResaleRuleGate: true },
      },
    }) as any;

    expect(parsed.sandboxOptions?.valuation?.aivSafetyCapPercentage).toBe(90);
    expect(parsed.deal?.arv).toBe(200000);
  });
});
