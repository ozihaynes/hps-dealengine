import React, { useMemo, useState } from "react";
import type { RepairRates } from "@/lib/repairRates";
import type {
  Deal,
  EngineCalculations,
  EstimatorItem,
  EstimatorState,
} from "../../types";
import { fmt$, num } from "../../utils/helpers";
import { estimatorSections, Icons } from "../../constants";
import { GlassCard, Button, Icon, SelectField } from "../ui";
import { computeSectionTotals } from "@/lib/repairsMath";

// --- Interfaces ---

interface RepairsTabProps {
  deal: Deal;
  setDealValue: (path: string, value: any) => void;
  calc: EngineCalculations;
  estimatorState: EstimatorState;
  onCostChange: (
    sectionKey: string,
    itemKey: string,
    field: string,
    value: any
  ) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
  onReset: () => void;
  repairRates?: RepairRates;
  marketCode?: string;
  ratesStatus?: "idle" | "loading" | "loaded" | "error";
  ratesError?: string;
}

interface EstimatorRowProps {
  itemKey: string;
  item: EstimatorItem;
  value: any;
  quantity: number;
  onValueChange: (itemKey: string, field: string, value: any) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
}

interface EstimatorSectionProps {
  sectionKey: string;
  section: (typeof estimatorSections)[string];
  // Costs for this specific section only
  costs: EstimatorState["costs"][string] | undefined;
  quantities: EstimatorState["quantities"];
  sectionTotal: number;
  onCostChange: (
    sectionKey: string,
    itemKey: string,
    field: string,
    value: any
  ) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
}

// --- Sub-components ---

const RatesMetaBar: React.FC<{
  asOf?: string;
  market?: string;
  version?: string;
  status?: "idle" | "loading" | "loaded" | "error";
  error?: string;
}> = ({ asOf, market, version, status = "idle", error }) => {
  if (status === "loading") {
    return (
      <div className="info-card flex items-center justify-between mb-2 border border-white/5">
        <div className="label-xs">Loading repair unit rates.</div>
        <div className="text-xs text-text-secondary/80">Market {market ?? "ORL"}</div>
      </div>
    );
  }

  return (
    <div className="info-card flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-2 border border-white/5 px-3 py-2">
      <div className="label-xs">
        Repair unit rates · {market ?? "ORL"} {version ? `v${version}` : ""} · last update:{" "}
        <strong className="text-text-primary/90">{asOf ?? "unknown"}</strong>
      </div>
      <div className="text-xs text-text-secondary/80">
        {status === "error"
          ? `Rates unavailable${error ? `: ${error}` : ""}`
          : "Sources: policy-backed rate sets (PSF tiers + Big 5)."}
      </div>
    </div>
  );
};

/**
 * QuickEstimate:
 * - reads sqft from both deal *and* calc (multiple likely paths)
 * - uses live PSF tiers + Big 5 $/sqft
 * - writes total into costs.repairs_base when applied
 */
const QuickEstimate: React.FC<{
  deal: Deal;
  calc: EngineCalculations;
  setDealValue: (path: string, value: any) => void;
  psfTiers: RepairRates["psfTiers"];
  big5Rates: RepairRates["big5"];
}> = ({ deal, calc, setDealValue, psfTiers, big5Rates }) => {
  const [rehabLevel, setRehabLevel] = useState<string>("none");
  const [big5, setBig5] = useState<{
    roof: boolean;
    hvac: boolean;
    repipe: boolean;
    electrical: boolean;
    foundation: boolean;
  }>({
    roof: false,
    hvac: false,
    repipe: false,
    electrical: false,
    foundation: false,
  });

  /**
   * ROBUST SQFT RESOLUTION - FIXED VERSION
   * Checks multiple common paths in both calc and deal objects
   */
  const resolveSqft = () => {
    const d = deal as any;
    const c = calc as any;

    // Priority order: calc first (more likely normalized), then deal
    const candidates = [
      // Calc paths (most likely to be standardized)
      c?.subject_sqft,
      c?.subject?.sqft,
      c?.subject?.living_area,
      c?.property?.sqft,
      c?.property?.living_area,
      c?.property?.area,
      c?.sqft,

      // Deal paths (original input data)
      d?.property?.sqft,
      d?.property?.living_area,
      d?.property?.area,
      d?.subject?.sqft,
      d?.subject?.living_area,
      d?.subject?.area,
      d?.cma?.subject?.sqft,
      d?.cma?.subject?.area,
      d?.sqft,
      d?.living_area,
      d?.area,
    ];

    for (const cand of candidates) {
      // Check for valid number
      if (typeof cand === "number" && !isNaN(cand) && cand > 0) {
        return Math.max(0, cand);
      }

      // Check for string that can be parsed
      if (typeof cand === "string" && cand.trim() !== "") {
        const n = Number(cand.replace(/[^\d.]/g, ""));
        if (!isNaN(n) && n > 0) {
          return Math.max(0, n);
        }
      }
    }

    // If we get here, sqft is not found - log warning in development
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️ Square footage not found in deal or calc objects.",
        "\nSearched paths:",
        candidates.map((_, i) => `Candidate ${i}`),
        "\nDeal structure:",
        JSON.stringify(deal, null, 2),
        "\nCalc structure:",
        JSON.stringify(calc, null, 2)
      );
    }

    return 0;
  };

  const quickEstimateTotal = useMemo(() => {
    const sqft = resolveSqft();
    const effectivePsf =
      (psfTiers as any)?.[rehabLevel as keyof typeof psfTiers] ?? 0;

    let total = sqft * effectivePsf;

    (["roof", "hvac", "repipe", "electrical", "foundation"] as const).forEach(
      (item) => {
        if (big5[item]) {
          const rate =
            (big5Rates as any)?.[item as keyof RepairRates["big5"]] ?? 0;
          total += rate * sqft;
        }
      }
    );

    return total;
  }, [rehabLevel, big5, psfTiers, big5Rates, deal, calc]);

  const toggle = (k: keyof typeof big5) =>
    setBig5((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <GlassCard className="p-5 md:p-6 space-y-3">
      <h3 className="text-lg font-bold text-text-primary">
        Quick Estimate Calculator
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Rehab Level (PSF Tiers)"
          value={rehabLevel}
          onChange={(e: any) => setRehabLevel(e.target.value)}
        >
          <option value="none">
            None (${psfTiers?.none ?? 0}/sqft)
          </option>
          <option value="light">
            Light Cosmetic (${psfTiers?.light ?? 0}/sqft)
          </option>
          <option value="medium">
            Medium / Full Rehab (${psfTiers?.medium ?? 0}/sqft)
          </option>
          <option value="heavy">
            Heavy Rehab (${psfTiers?.heavy ?? 0}/sqft)
          </option>
        </SelectField>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Big 5 Budget Killers
          </label>
          <div className="space-y-1">
            {(
              [
                "roof",
                "hvac",
                "repipe",
                "electrical",
                "foundation",
              ] as const
            ).map((item) => (
              <label
                key={item}
                className="flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-accent-blue"
                    checked={big5[item]}
                    onChange={() => toggle(item)}
                  />
                  <span className="text-text-primary capitalize">
                    {item}
                  </span>
                </div>
                <span className="text-text-secondary">
                  +${big5Rates?.[item] ?? 0}/sqft
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 p-3 info-card border border-white/5 flex items-center justify-between rounded-lg">
        <div>
          <div className="label-xs">Quick Estimate Total</div>
          <div className="text-xl font-bold">
            {fmt$(quickEstimateTotal, 0)}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setDealValue("costs.repairs_base", quickEstimateTotal)}
        >
          Apply as Repair Budget
        </Button>
      </div>
    </GlassCard>
  );
};

const EstimatorRow: React.FC<EstimatorRowProps> = ({
  itemKey,
  item,
  value,
  quantity,
  onValueChange,
  onQuantityChange,
}) => {
  const currentCondition =
    value?.condition || Object.keys(item.options ?? {})[0];
  const currentCost =
    value?.cost ??
    (item.options && currentCondition in item.options
      ? item.options[currentCondition]
      : 0);
  const currentNotes = value?.notes || "";

  const handleConditionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nextCondition = e.target.value;
    const nextCost =
      item.options && nextCondition in item.options
        ? item.options[nextCondition]
        : currentCost;

    onValueChange(itemKey, "condition", nextCondition);
    onValueChange(itemKey, "cost", nextCost);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(itemKey, "notes", e.target.value);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextQty = num(e.target.value);
    onQuantityChange(itemKey, nextQty);
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextCost = Math.max(0, num(e.target.value));
    onValueChange(itemKey, "cost", nextCost);
  };

  return (
    <tr>
      <td className="p-2">
        <div className="font-medium text-xs text-text-primary">
          {item.label}
        </div>
      </td>
      <td className="p-2">
        {item.options ? (
          <select
            className="dark-input w-full"
            value={currentCondition}
            onChange={handleConditionChange}
          >
            {Object.keys(item.options).map((optKey) => (
              <option key={optKey} value={optKey}>
                {optKey}
              </option>
            ))}
          </select>
        ) : (
          <span className="muted text-xs">—</span>
        )}
      </td>
      <td className="p-2">
        <input
          type="text"
          value={currentNotes}
          onChange={handleNotesChange}
          placeholder="Specifics..."
          className="dark-input"
        />
      </td>
      <td className="p-2">
        <div className="flex items-center justify-end gap-2">
          {item.isPerUnit ? (
            <input
              type="number"
              min={0}
              value={quantity ?? 0}
              onChange={handleQuantityChange}
              className="w-16 text-right dark-input"
              placeholder="0"
            />
          ) : (
            <span className="muted text-right w-full block pr-2">—</span>
          )}
          {item.unitName ? (
            <span className="text-xs muted w-14 text-left">
              {item.unitName}
            </span>
          ) : null}
        </div>
      </td>
      <td className="p-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-sm text-text-primary/40">
            $
          </span>
          <input
            type="number"
            value={currentCost}
            onChange={handleCostChange}
            className="dark-input prefixed text-right font-semibold"
            placeholder={item.isPerUnit ? "Unit $" : "Total $"}
          />
        </div>
      </td>
    </tr>
  );
};

const EstimatorSection: React.FC<EstimatorSectionProps> = ({
  sectionKey,
  section,
  costs,
  quantities,
  sectionTotal,
  onCostChange,
  onQuantityChange,
}) => {
  return (
    <GlassCard className="p-5 md:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="label-sm text-text-primary">
            {section.title}
          </div>
        </div>
        <div className="text-right">
          <div className="label-xs text-text-secondary uppercase">
            Section Total
          </div>
          <div className="font-semibold text-sm text-text-primary">
            {fmt$(sectionTotal, 0)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 label-xs">Item</th>
              <th className="text-left p-2 label-xs w-1/4">
                Condition / Tier
              </th>
              <th className="text-left p-2 label-xs w-1/5">Notes</th>
              <th className="text-right p-2 label-xs w-[120px]">
                Qty
              </th>
              <th className="text-right p-2 label-xs w-1/5">
                Unit Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(section.items).map((itemKey) => (
              <EstimatorRow
                key={itemKey}
                itemKey={itemKey}
                item={section.items[itemKey]}
                value={costs?.[itemKey]}
                quantity={quantities?.[itemKey]}
                onValueChange={(itemKey, field, value) =>
                  onCostChange(sectionKey, itemKey, field, value)
                }
                onQuantityChange={onQuantityChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

// --- Main Component ---

const RepairsTab: React.FC<RepairsTabProps> = ({
  deal,
  setDealValue,
  calc,
  estimatorState,
  onCostChange,
  onQuantityChange,
  onReset,
  repairRates,
  marketCode,
  ratesStatus,
  ratesError,
}) => {
  const { costs, quantities } = estimatorState;

  const ratesAsOf = repairRates?.asOf ?? "unknown";
  const psfTiers = repairRates?.psfTiers ?? {
    none: 0,
    light: 25,
    medium: 40,
    heavy: 60,
  };
  const big5Rates = repairRates?.big5 ?? {
    roof: 6,
    hvac: 6,
    repipe: 5,
    electrical: 5.5,
    foundation: 15,
  };

  const { sectionTotals, totalRepairCost } = useMemo(
    () => computeSectionTotals(costs, quantities),
    [costs, quantities]
  );

  return (
    <div className="space-y-4 repairs-scope">
      <RatesMetaBar
        asOf={ratesAsOf}
        market={repairRates?.market ?? marketCode}
        version={repairRates?.version}
        status={ratesStatus}
        error={ratesError}
      />
      <QuickEstimate
        deal={deal}
        calc={calc}
        setDealValue={setDealValue}
        psfTiers={psfTiers}
        big5Rates={big5Rates}
      />
      <GlassCard className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Icon d={Icons.wrench} size={18} className="text-accent-blue" />{" "}
            Detailed Repairs Estimator
          </h2>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset Detailed
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(estimatorSections).map((key) => (
            <div key={key} className="info-card">
              <div className="flex items-center gap-2 label-xs mb-0.5">
                <Icon
                  d={
                    Icons[
                      estimatorSections[key as keyof typeof estimatorSections]
                        .icon as keyof typeof Icons
                    ]
                  }
                  size={14}
                  className="text-accent-blue"
                />
                <span>
                  {estimatorSections[key as keyof typeof estimatorSections]
                    .title}
                </span>
              </div>
              <div className="text-base font-semibold">
                {fmt$(sectionTotals[key] ?? 0, 0)}
              </div>
            </div>
          ))}
          <div className="highlight-card col-span-2 md:col-span-4 flex justify-between items-center">
            <div className="text-sm text-text-secondary font-bold">
              DETAILED REPAIR SUBTOTAL
            </div>
            <div className="text-lg font-extrabold">
              {fmt$(totalRepairCost, 0)}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-text-secondary/80">
          Contingency auto-sets from risk. Final Repairs w/ Contingency:{" "}
          <span className="font-bold text-text-primary">
            {fmt$(calc.repairs_with_contingency, 0)}
          </span>
        </div>
      </GlassCard>
      {Object.keys(estimatorSections).map((sectionKey) => (
        <EstimatorSection
          key={sectionKey}
          sectionKey={sectionKey}
          section={estimatorSections[sectionKey as keyof typeof estimatorSections]}
          costs={estimatorState.costs[sectionKey]}
          quantities={quantities}
          sectionTotal={sectionTotals[sectionKey] ?? 0}
          onCostChange={onCostChange}
          onQuantityChange={onQuantityChange}
        />
      ))}
    </div>
  );
};

export default RepairsTab;
