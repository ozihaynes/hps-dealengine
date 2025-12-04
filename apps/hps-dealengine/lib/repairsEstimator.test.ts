import { describe, expect, it } from "vitest";
import { createInitialEstimatorState } from "./repairsEstimator";
import { estimatorSections } from "./ui-v2-constants";

describe("repairsEstimator", () => {
  it("seeds estimator state for all estimator sections", () => {
    const state = createInitialEstimatorState();
    const sectionKeys = Object.keys(estimatorSections).sort();
    expect(Object.keys(state.costs).sort()).toEqual(sectionKeys);
  });

  it("applies line item rate overrides when provided", () => {
    const firstSectionKey = Object.keys(estimatorSections)[0];
    const firstItemKey = Object.keys(
      estimatorSections[firstSectionKey as keyof typeof estimatorSections].items,
    )[0];

    const state = createInitialEstimatorState({
      [firstItemKey]: 1234,
    });

    expect(state.costs[firstSectionKey][firstItemKey].cost).toBe(1234);
  });
});
