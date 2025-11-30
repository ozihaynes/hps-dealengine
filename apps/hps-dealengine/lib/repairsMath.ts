import type { EstimatorState } from "@ui-v2/types";
import { estimatorSections } from "@ui-v2/constants";
import { num } from "../utils/helpers";

/**
 * Compute section-level and total repair costs from estimator state.
 * This mirrors the logic used in the Repairs UI, but in a pure, testable form.
 */
export function computeSectionTotals(
  costs: EstimatorState["costs"],
  quantities: EstimatorState["quantities"]
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

        // Cost: use stored cost if present; otherwise fall back to default option
        let cost: number;
        if (itemValue && typeof itemValue === "object" && "cost" in itemValue) {
          cost = num((itemValue as any).cost);
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
