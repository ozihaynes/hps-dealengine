import type { EstimatorState } from "../types";
import { estimatorSections } from "./ui-v2-constants";

export function createInitialEstimatorState(
  lineItemRates?: Record<string, number | Record<string, number>>,
): EstimatorState {
  const costs: Record<string, Record<string, any>> = {};
  const quantities: Record<string, number> = {};

  for (const [sectionKey, section] of Object.entries(estimatorSections)) {
    costs[sectionKey] = {};

    for (const [itemKey, item] of Object.entries(section.items)) {
      const rateOverride =
        (lineItemRates?.[itemKey] as number | undefined) ??
        ((lineItemRates?.[sectionKey] as Record<string, number> | undefined)?.[
          itemKey
        ] as number | undefined);

      const defaultCondition = item.options
        ? Object.keys(item.options)[0]
        : undefined;

      const defaultCost =
        typeof rateOverride === "number"
          ? rateOverride
          : item.options && defaultCondition
          ? item.options[defaultCondition]
          : 0;

      costs[sectionKey][itemKey] = {
        condition: defaultCondition,
        cost: defaultCost,
        notes: "",
      };

      if (item.isPerUnit) {
        quantities[itemKey] = 0;
      }
    }
  }

  return {
    costs,
    quantities,
  } as EstimatorState;
}
