import type { EstimatorState } from "../types";
import type { RepairRates } from "@hps-internal/contracts";
import { estimatorSections } from "./ui-v2-constants";
import { num } from "../utils/helpers";

type LineItemRates = Record<string, number | Record<string, number>>;
type QuickEstimateArgs = {
  sqft: number;
  rehabLevel: keyof RepairRates["psfTiers"];
  big5Selections: {
    roof: boolean;
    hvac: boolean;
    repipe: boolean;
    electrical: boolean;
    foundation: boolean;
  };
  rates: Pick<RepairRates, "psfTiers" | "big5">;
};

function getRate(
  lineItemRates: LineItemRates | undefined,
  sectionKey: string,
  itemKey: string,
): number | null {
  if (!lineItemRates) return null;

  const direct = lineItemRates[itemKey];
  if (typeof direct === "number") return direct;

  const sectionBucket = lineItemRates[sectionKey];
  if (sectionBucket && typeof sectionBucket === "object") {
    const nested = (sectionBucket as Record<string, unknown>)[itemKey];
    if (typeof nested === "number") return nested;
  }

  return null;
}

/**
 * Compute section-level and total repair costs from estimator state.
 * This mirrors the logic used in the Repairs UI, but in a pure, testable form.
 */
export function computeSectionTotals(
  costs: EstimatorState["costs"],
  quantities: EstimatorState["quantities"],
  lineItemRates?: LineItemRates,
): { sectionTotals: Record<string, number>; totalRepairCost: number } {
  const sectionTotals: Record<string, number> = {};

  const sectionKeys = Object.keys(
    estimatorSections
  ) as Array<keyof typeof estimatorSections>;

  sectionKeys.forEach((sectionKey) => {
    const section = estimatorSections[sectionKey];
    const sectionCosts = (costs && (costs as any)[sectionKey as string]) || {};

    const sum = Object.entries(section.items).reduce(
      (acc, [itemKey, item]: [string, any]) => {
        const itemValue = (sectionCosts as any)[itemKey];
        const rateOverride = getRate(lineItemRates, sectionKey, itemKey);

        // Cost: user override -> rate map -> default option
        let cost: number;
        if (itemValue && typeof itemValue === "object" && "cost" in itemValue) {
          cost = num((itemValue as any).cost);
        } else if (typeof rateOverride === "number" && !isNaN(rateOverride)) {
          cost = num(rateOverride);
        } else {
          const defaultCondition = item.options
            ? Object.keys(item.options)[0]
            : undefined;
          cost =
            item.options && defaultCondition
              ? item.options[defaultCondition]
              : 0;
        }

        // Quantity: for per-unit items use quantities[itemKey] (or 0),
        // otherwise assume fixed quantity of 1.
        const q = item.isPerUnit ? (quantities?.[itemKey] ?? 0) : 1;

        return acc + cost * q;
      },
      0
    );

    sectionTotals[sectionKey as string] = sum;
  });

  const totalRepairCost = Object.values(sectionTotals).reduce(
    (acc, n) => acc + num(n),
    0
  );

  return { sectionTotals, totalRepairCost };
}

export function computeQuickEstimateTotal(args: QuickEstimateArgs): number {
  const {
    sqft,
    rehabLevel,
    big5Selections,
    rates,
  } = args;

  const psfTiers = rates.psfTiers ?? {
    none: 0,
    light: 0,
    medium: 0,
    heavy: 0,
  };
  const big5Rates = rates.big5 ?? {
    roof: 0,
    hvac: 0,
    repipe: 0,
    electrical: 0,
    foundation: 0,
  };

  const effectivePsf = (psfTiers as any)?.[rehabLevel] ?? 0;
  let total = sqft * num(effectivePsf);

  (["roof", "hvac", "repipe", "electrical", "foundation"] as const).forEach(
    (item) => {
      if (big5Selections[item]) {
        const rate = (big5Rates as any)?.[item] ?? 0;
        total += num(rate) * sqft;
      }
    },
  );

  return total;
}
