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
      clearToCloseBufferDays: 10,
      daysToMoneyMaxDays: 75,
      holdCostsFlipFastZip: 2,
      assignmentFeeMaxPublicizedArvPercentage: 5,
      buyerSegmentationWholetailMaxRepairsAsArvPercentage: 12,
      buyerTargetMarginWholetailMinPercentage: 8,
      buyerTargetMarginWholetailMaxPercentage: 15,
      buyerTargetMarginFlipBaselinePolicy: 20,
      doubleCloseMinSpreadThreshold: 20000,
      doubleClosePerDiemCarryModeling: true,
      deedDocumentaryStampRatePolicy: 0.007,
      titlePremiumRateSource: "florida_table",
      dispositionTrackEnablement: ["cash", "wholetail"],
      bankruptcyStayGateLegalBlock: true,
      firptaWithholdingGate: true,
      flood50RuleGate: true,
      analystReviewTriggerBorderlineBandThreshold: 6000,
      cashPresentationGateMinimumSpreadOverPayoff: 15000,
      assumptionsProtocolPlaceholdersWhenEvidenceMissing: false,
      bankersRoundingModeNumericSafety: "bankers",
      buyerCostsAllocationDualScenarioRenderingWhenUnknown: true,
      buyerCostsLineItemModelingMethod: "line_item",
      abcConfidenceGradeRubric: "{\"A\":[0.8,1]}",
      allowAdvisorOverrideWorkflowState: true,
    } as any);
    const opts = sandboxToAnalyzeOptions({ sandbox: cfg as any, posture: "base" });
    expect(opts.valuation?.aivSafetyCapPercentage).toBe(85);
    expect(opts.floorsSpreads?.assignmentFeeTarget).toBe(12000);
    expect(opts.carryTimeline?.carryMonthsMaximumCap).toBe(6);
    expect(opts.complianceRisk?.fha90DayResaleRuleGate).toBe(true);
    expect(opts.floorsSpreads?.minSpreadByArvBand?.length).toBeGreaterThan(0);
    expect(opts.timeline?.clearToCloseBufferDays).toBe(10);
    expect(opts.timeline?.daysToMoneyMaxDays).toBe(75);
    expect(opts.holdCosts?.holdCostsFlipFastZip).toBe(2);
    expect(opts.profit_and_fees?.assignmentFeeTarget).toBe(12000);
    expect(opts.profit_and_fees?.assignmentFeeMaxPublicizedArvPercentage).toBe(5);
    expect(opts.profit_and_fees?.buyerSegmentationWholetailMaxRepairsAsArvPercentage).toBe(12);
    expect(opts.disposition_and_double_close?.doubleCloseMinSpreadThreshold).toBe(20000);
    expect(opts.disposition_and_double_close?.doubleClosePerDiemCarryModeling).toBe(true);
    expect(opts.disposition_and_double_close?.deedDocumentaryStampRatePolicy).toBe(0.007);
    expect(opts.disposition_and_double_close?.titlePremiumRateSource).toBe("florida_table");
    expect(opts.disposition_and_double_close?.dispositionTrackEnablement?.length).toBe(2);
    expect(opts.compliance_and_risk_gates?.bankruptcyStayGateLegalBlock).toBe(true);
    expect(opts.compliance_and_risk_gates?.firptaWithholdingGate).toBe(true);
    expect(opts.compliance_and_risk_gates?.flood50RuleGate).toBe(true);
    expect(
      opts.workflow_and_guardrails?.analystReviewTriggerBorderlineBandThreshold,
    ).toBe(6000);
    expect(
      opts.workflow_and_guardrails?.cashPresentationGateMinimumSpreadOverPayoff,
    ).toBe(15000);
    expect(
      opts.workflow_and_guardrails?.assumptionsProtocolPlaceholdersWhenEvidenceMissing,
    ).toBe(false);
    expect(opts.workflow_and_guardrails?.bankersRoundingModeNumericSafety).toBe(
      "bankers",
    );
    expect(
      opts.workflow_and_guardrails?.buyerCostsAllocationDualScenarioRenderingWhenUnknown,
    ).toBe(true);
    expect(
      opts.workflow_and_guardrails?.buyerCostsLineItemModelingMethod,
    ).toBe("line_item");
    expect(opts.workflow_and_guardrails?.abcConfidenceGradeRubric).toBe(
      "{\"A\":[0.8,1]}",
    );
    expect(
      opts.workflow_and_guardrails?.allowAdvisorOverrideWorkflowState,
    ).toBe(true);
  });
});
