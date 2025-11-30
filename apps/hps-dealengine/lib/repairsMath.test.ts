import { describe, it, expect } from "vitest";
import { computeSectionTotals } from "./repairsMath";
import { estimatorSections } from "@ui-v2/constants";

describe("computeSectionTotals", () => {
  it("returns numeric totals for all sections even with empty state", () => {
    const costs: any = {};
    const quantities: any = {};

    const { sectionTotals, totalRepairCost } = computeSectionTotals(
      costs,
      quantities
    );

    const expectedSectionKeys = Object.keys(estimatorSections).sort();
    const actualSectionKeys = Object.keys(sectionTotals).sort();

    expect(actualSectionKeys).toEqual(expectedSectionKeys);

    for (const key of Object.keys(sectionTotals)) {
      expect(typeof sectionTotals[key]).toBe("number");
    }
    expect(typeof totalRepairCost).toBe("number");
  });

  it("respects explicit cost and quantity for at least one item", () => {
    const sectionEntries = Object.entries(estimatorSections);
    expect(sectionEntries.length).toBeGreaterThan(0);

    const [firstSectionKey, firstSection] = sectionEntries[0] as [
      string,
      any
    ];
    const itemEntries = Object.entries(firstSection.items);
    expect(itemEntries.length).toBeGreaterThan(0);

    const [firstItemKey, firstItem] = itemEntries[0] as [string, any];

    const explicitCost = 1234;
    const isPerUnit = !!firstItem.isPerUnit;
    const quantities: Record<string, number> = {};

    if (isPerUnit) {
      quantities[firstItemKey] = 2;
    }

    const costs: any = {
      [firstSectionKey]: {
        [firstItemKey]: {
          cost: explicitCost,
        },
      },
    };

    const { sectionTotals } = computeSectionTotals(costs, quantities);

    const expected = isPerUnit ? explicitCost * 2 : explicitCost;
    expect(sectionTotals[firstSectionKey]).toBe(expected);
  });
});
