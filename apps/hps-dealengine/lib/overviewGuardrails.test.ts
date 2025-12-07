import { describe, expect, it } from "vitest";

import { buildOverviewGuardrailsView } from "./overviewGuardrails";

const baseDeal: any = {
  policy: { min_spread: 5000 },
};

describe("buildOverviewGuardrailsView", () => {
  it("returns needs_run and unknown guardrails when no run is present", () => {
    const view = buildOverviewGuardrailsView({
      deal: baseDeal,
      lastAnalyzeResult: null,
      calc: null as any,
    });

    expect(view.workflowState).toBe("needs_run");
    expect(view.guardrailsStatus).toBe("unknown");
  });

  it("marks guardrails ok when offer is between floor and ceiling", () => {
    const view = buildOverviewGuardrailsView({
      deal: baseDeal,
      lastAnalyzeResult: {
        outputs: {
          respect_floor: 100000,
          buyer_ceiling: 150000,
          window_floor_to_offer: 20000,
          headroom_offer_to_ceiling: 30000,
        },
      } as any,
      calc: { instantCashOffer: 120000 } as any,
    });

    expect(view.guardrailsStatus).toBe("ok");
    expect(view.riskPosture).toBe("pass");
    expect(view.workflowState).toBe("ready_draft");
    expect(view.confidenceGrade).toBe("B");
  });

  it("marks guardrails broken when offer is below floor", () => {
    const view = buildOverviewGuardrailsView({
      deal: baseDeal,
      lastAnalyzeResult: {
        outputs: {
          respect_floor: 150000,
          buyer_ceiling: 200000,
        },
      } as any,
      calc: { instantCashOffer: 140000 } as any,
    });

    expect(view.guardrailsStatus).toBe("broken");
    expect(view.workflowState).toBe("needs_review");
  });

  it("marks guardrails tight when headroom is small", () => {
    const view = buildOverviewGuardrailsView({
      deal: baseDeal,
      lastAnalyzeResult: {
        outputs: {
          respect_floor: 100000,
          buyer_ceiling: 150000,
        },
      } as any,
      calc: { instantCashOffer: 148000 } as any,
    });

    expect(view.guardrailsStatus).toBe("tight");
  });
});
