import { describe, expect, it } from "vitest";

import { buildStrategyViewModel } from "./overviewStrategy";

describe("buildStrategyViewModel", () => {
  it("handles null outputs safely", () => {
    const vm = buildStrategyViewModel(null);
    expect(vm.primaryTrack).toBe("unknown");
    expect(vm.primaryMao).toBeNull();
    expect(vm.workflowState).toBe("Unknown");
    expect(vm.confidenceGrade).toBe("Unknown");
  });

  it("maps wholesale track with shortfall and gap", () => {
    const vm = buildStrategyViewModel({
      primary_offer_track: "wholesale",
      primary_offer: 150000,
      mao_wholesale: 150000,
      payoff_projected: 170000,
      shortfall_vs_payoff: 20000,
      gap_flag: "wide_gap",
      seller_offer_band: "low",
      buyer_ask_band: "aggressive",
      workflow_state: "NeedsReview",
      confidence_grade: "B",
    } as any);

    expect(vm.primaryTrack).toBe("wholesale");
    expect(vm.primaryMao).toBe(150000);
    expect(vm.hasShortfall).toBe(true);
    expect(vm.bands.gapFlag).toBe(true);
    expect(vm.workflowState).toBe("NeedsReview");
    expect(vm.workflowBadge).toBe("orange");
    expect(vm.confidenceGrade).toBe("B");
    expect(vm.confidenceBadge).toBe("blue");
  });

  it("falls back to ReadyForOffer when workflow missing but offer present", () => {
    const vm = buildStrategyViewModel({
      primary_offer: 120000,
      mao_wholetail: 125000,
      primary_offer_track: "wholetail",
    } as any);

    expect(vm.workflowState).toBe("ReadyForOffer");
    expect(vm.workflowBadge).toBe("green");
    expect(vm.primaryTrack).toBe("wholetail");
    expect(vm.primaryMao).toBe(120000);
  });

  it("sets confidence C when explicitly provided", () => {
    const vm = buildStrategyViewModel({
      primary_offer_track: "flip",
      primary_offer: 180000,
      confidence_grade: "C",
    } as any);

    expect(vm.confidenceGrade).toBe("C");
    expect(vm.confidenceBadge).toBe("orange");
  });
});
