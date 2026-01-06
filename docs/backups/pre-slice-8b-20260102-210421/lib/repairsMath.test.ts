import { describe, it, expect } from "vitest";
import { computeSectionTotals, computeQuickEstimateTotal } from "./repairsMath";
import { estimatorSections } from "./ui-v2-constants";

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

  it("uses line item rates when no explicit cost is set", () => {
    const sectionEntries = Object.entries(estimatorSections);
    const [firstSectionKey, firstSection] = sectionEntries[0] as [string, any];
    const [firstItemKey] = Object.keys(firstSection.items);

    const lineItemRates: Record<string, number> = {
      [firstItemKey]: 999,
    };

    const { sectionTotals } = computeSectionTotals(
      {},
      {},
      lineItemRates as any
    );

    expect(sectionTotals[firstSectionKey]).toBe(999);
  });

  it("quick estimate reflects changed Big 5 rates (roof 20 vs 6)", () => {
    const sqft = 1000;
    const base = computeQuickEstimateTotal({
      sqft,
      rehabLevel: "medium",
      big5Selections: {
        roof: true,
        hvac: false,
        repipe: false,
        electrical: false,
        foundation: false,
      },
      rates: {
        psfTiers: { none: 0, light: 0, medium: 40, heavy: 60 },
        big5: { roof: 6, hvac: 0, repipe: 0, electrical: 0, foundation: 0 },
      },
    });

    const higher = computeQuickEstimateTotal({
      sqft,
      rehabLevel: "medium",
      big5Selections: {
        roof: true,
        hvac: false,
        repipe: false,
        electrical: false,
        foundation: false,
      },
      rates: {
        psfTiers: { none: 0, light: 0, medium: 40, heavy: 60 },
        big5: { roof: 20, hvac: 0, repipe: 0, electrical: 0, foundation: 0 },
      },
    });

    expect(higher).toBeGreaterThan(base);
    expect(higher - base).toBeCloseTo((20 - 6) * sqft, 6);
  });

  it("line item rates drive detailed totals independent of quick estimate big5", () => {
    const lineItemRates: Record<string, number> = {
      kitchen_cabinets: 5000,
    };
    const { totalRepairCost } = computeSectionTotals({}, {}, lineItemRates as any);
    expect(totalRepairCost).toBe(5000);

    const quick = computeQuickEstimateTotal({
      sqft: 1000,
      rehabLevel: "light",
      big5Selections: {
        roof: true,
        hvac: false,
        repipe: false,
        electrical: false,
        foundation: false,
      },
      rates: {
        psfTiers: { none: 0, light: 10, medium: 20, heavy: 30 },
        big5: { roof: 5, hvac: 0, repipe: 0, electrical: 0, foundation: 0 },
      },
    });

    expect(quick).toBeGreaterThan(totalRepairCost);
  });
});
