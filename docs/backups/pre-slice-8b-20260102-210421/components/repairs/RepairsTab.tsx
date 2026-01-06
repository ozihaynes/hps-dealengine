import React, { useMemo, useState, useCallback } from "react";
import type { RepairRates } from "@hps-internal/contracts";
import type {
  Deal,
  EngineCalculations,
  EstimatorItem,
  EstimatorState,
} from "../../types";
import { fmt$ } from "../../utils/helpers";
import { estimatorSections, Icons } from "../../constants";
import { GlassCard, Button, Icon, SelectField } from "../ui";
import NumericInput from "../ui/NumericInput";
import { InfoTooltip } from "../ui/InfoTooltip";
import { computeSectionTotals, computeQuickEstimateTotal } from "@/lib/repairsMath";

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
  onQuantityChange: (itemKey: string, value: number | null) => void;
  onReset: () => void;
  repairRates?: RepairRates;
  marketCode?: string;
  activeProfileName?: string;
  posture?: string;
  ratesStatus?: "idle" | "loading" | "loaded" | "error";
  ratesError?: string;
  meta?: {
    profileId?: string | null;
    profileName?: string | null;
    marketCode?: string | null;
    posture?: string | null;
    asOf?: string | null;
    source?: string | null;
    version?: string | null;
  } | null;
  onQuickApply?: () => void;
  onDetailedApply?: () => void;
}

interface EstimatorRowProps {
  itemKey: string;
  item: EstimatorItem;
  value: any;
  quantity: number | null;
  onValueChange: (itemKey: string, field: string, value: any) => void;
  onQuantityChange: (itemKey: string, value: number | null) => void;
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
  onQuantityChange: (itemKey: string, value: number | null) => void;
}

// --- Sub-components ---

const RatesMetaBar: React.FC<{
  asOf?: string;
  market?: string;
  posture?: string;
  profileName?: string;
  version?: string;
  status?: "idle" | "loading" | "loaded" | "error";
  error?: string;
}> = ({
  asOf,
  market,
  posture,
  profileName,
  version,
  status = "idle",
  error,
}) => {
  const displayVersion = version
    ? version.startsWith("v")
      ? version
      : `v${version}`
    : "";

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
        Repair unit rates - {market ?? "ORL"} {displayVersion} - posture {posture ?? "base"} - last update:{" "}
        <strong className="text-text-primary/90">{asOf ?? "unknown"}</strong>
        {profileName ? ` - ${profileName}` : ""}
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
  onApply?: () => void;
}> = ({ deal, calc, setDealValue, psfTiers, big5Rates, onApply }) => {
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
  const [hasInteracted, setHasInteracted] = useState(false);
  const hydratedRef = React.useRef(false);
  const persisted = (deal as any)?.repairs?.quickEstimate ?? null;
  const dealIdFromUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("dealId")
      : null;
  const storageKey = dealIdFromUrl
    ? `hps-repairs-quick-estimate:${dealIdFromUrl}`
    : null;
  const effectiveRehabLevel = hasInteracted
    ? rehabLevel
    : persisted?.rehabLevel ?? rehabLevel;
  const effectiveBig5 = useMemo(
    () =>
      hasInteracted
        ? { ...(persisted?.big5 ?? {}), ...big5 }
        : { ...big5, ...(persisted?.big5 ?? {}) },
    [big5, hasInteracted, persisted],
  );

  /**
   * ROBUST SQFT RESOLUTION - FIXED VERSION
   * Checks multiple common paths in both calc and deal objects
   */
  const resolveSqft = useCallback(() => {
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
  }, [calc, deal]);

  const quickEstimateTotal = useMemo(() => {
    const sqft = resolveSqft();
    return computeQuickEstimateTotal({
      sqft,
      rehabLevel: effectiveRehabLevel as keyof typeof psfTiers,
      big5Selections: effectiveBig5,
      rates: { psfTiers, big5: big5Rates },
    });
  }, [effectiveRehabLevel, effectiveBig5, psfTiers, big5Rates, resolveSqft]);

  const toggle = (k: keyof typeof big5, value: boolean) =>
    setBig5((prev) => ({ ...prev, [k]: value }));

  // Hydrate quick estimate selections from saved deal state without triggering apply
  React.useEffect(() => {
    const saved = (deal as any)?.repairs?.quickEstimate;
    if (!saved || hydratedRef.current) return;
    if (saved.rehabLevel) {
      setRehabLevel(saved.rehabLevel);
    }
    if (saved.big5) {
      setBig5((prev) => ({ ...prev, ...saved.big5 }));
    }
    hydratedRef.current = true;
  }, [deal]);

  React.useEffect(() => {
    if (!storageKey || persisted) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (parsed?.rehabLevel) {
        setRehabLevel(parsed.rehabLevel);
      }
      if (parsed?.big5) {
        setBig5((prev) => ({ ...prev, ...parsed.big5 }));
      }
    } catch {
      // ignore storage parse errors
    }
  }, [persisted, storageKey]);

  const applyBudgetWith = React.useCallback(
    (nextRehabLevel: string, nextBig5: typeof big5) => {
      const sqft = resolveSqft();
      const total = computeQuickEstimateTotal({
        sqft,
        rehabLevel: nextRehabLevel as keyof typeof psfTiers,
        big5Selections: nextBig5,
        rates: { psfTiers, big5: big5Rates },
      });
      const snapshot = {
        ...(persisted ?? {}),
        rehabLevel: nextRehabLevel,
        big5: nextBig5,
        sqft,
        total,
      };
      setDealValue("repairs.quickEstimate", snapshot);
      setDealValue("repairs.total", total);
      setDealValue("repairs_total", total);
      setDealValue("repairsTotal", total);
      setDealValue("costs.repairs_base", total);
      setDealValue("costs.repairs", total);
      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
        } catch {
          // ignore storage write errors
        }
      }
      if (onApply) {
        setTimeout(() => {
          onApply();
        }, 0);
      }
    },
    [big5Rates, onApply, persisted, psfTiers, resolveSqft, setDealValue, storageKey],
  );

  const applyBudget = React.useCallback(() => {
    applyBudgetWith(effectiveRehabLevel, effectiveBig5);
  }, [applyBudgetWith, effectiveBig5, effectiveRehabLevel]);

  // Auto-apply when the user has interacted with the calculator
  React.useEffect(() => {
    if (hasInteracted) {
      applyBudget();
    }
  }, [applyBudget, hasInteracted]);

  return (
    <GlassCard className="p-5 md:p-6 space-y-3">
      <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
        Quick Estimate Calculator
        <InfoTooltip helpKey="quick_estimate" />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Rehab Level (PSF Tiers)"
          value={effectiveRehabLevel}
          dataTestId="repairs-rehab-level"
          onChange={(e: any) => {
            const nextValue = e.target.value;
            setHasInteracted(true);
            setRehabLevel(nextValue);
            applyBudgetWith(nextValue, effectiveBig5);
          }}
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
          <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
            Big 5 Budget Killers
            <InfoTooltip helpKey="big5_repairs" />
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
                    checked={Boolean(effectiveBig5[item])}
                    data-testid={item === "roof" ? "repairs-big5-roof" : undefined}
                    onChange={() => {
                      const currentValue = Boolean(effectiveBig5[item]);
                      const nextValue = !currentValue;
                      const nextBig5 = { ...effectiveBig5, [item]: nextValue };
                      setHasInteracted(true);
                      toggle(item, nextValue);
                      applyBudgetWith(effectiveRehabLevel, nextBig5);
                    }}
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
      <div className="highlight-card flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm text-text-secondary font-bold uppercase">
            Quick Estimate Total
          </div>
          <div className="text-xl font-extrabold">
            {fmt$(quickEstimateTotal, 0)}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setHasInteracted(true);
            applyBudget();
          }}
        >
          Use as Repair Budget
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

  const handleQuantityChange = (nextQty: number | null) => {
    onQuantityChange(itemKey, nextQty);
  };

  const handleCostChange = (nextCost: number | null) => {
    const clamped =
      nextCost == null ? null : Math.max(0, nextCost);
    onValueChange(itemKey, "cost", clamped);
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
              className="input-base w-full"
              value={currentCondition}
              onChange={handleConditionChange}
              aria-label={`${item.label} condition`}
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
          className="input-base"
          aria-label={`${item.label} notes`}
        />
      </td>
      <td className="p-2">
        <div className="flex items-center justify-end gap-2">
          {item.isPerUnit ? (
            <NumericInput
              value={quantity ?? null}
              onValueChange={handleQuantityChange}
              placeholder="0"
              min={0}
              className="w-16"
              aria-label={`${item.label} quantity`}
            />
          ) : (
            <span className="muted text-right w-full block pr-2">-</span>
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
          <NumericInput
            value={currentCost ?? null}
            onValueChange={handleCostChange}
            placeholder={item.isPerUnit ? "Unit $" : "Total $"}
            className="font-semibold"
            aria-label={`${item.label} cost`}
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
  activeProfileName,
  posture,
  ratesStatus,
  ratesError,
  meta,
  onQuickApply,
  onDetailedApply,
}) => {
  const { costs, quantities } = estimatorState;
  const effectiveMarket = meta?.marketCode ?? repairRates?.marketCode ?? marketCode;
  const effectivePosture = meta?.posture ?? repairRates?.posture ?? posture;
  const effectiveProfileName =
    meta?.profileName ?? repairRates?.profileName ?? activeProfileName;
  const effectiveAsOf = meta?.asOf ?? repairRates?.asOf ?? "unknown";
  const effectiveVersion = meta?.version ?? repairRates?.version;

  const psfTiers = repairRates?.psfTiers ?? {
    none: 0,
    light: 0,
    medium: 0,
    heavy: 0,
  };
  const big5Rates = repairRates?.big5 ?? {
    roof: 0,
    hvac: 0,
    repipe: 0,
    electrical: 0,
    foundation: 0,
  };

  const { sectionTotals, totalRepairCost } = useMemo(
    () =>
      computeSectionTotals(
        costs,
        quantities,
        (repairRates?.lineItemRates as any) ?? undefined
      ),
    [costs, quantities, repairRates?.lineItemRates]
  );

  const applyDetailedBudget = useCallback(() => {
    const applied = totalRepairCost || 0;
    setDealValue("repairs.total", applied);
    setDealValue("repairs_total", applied);
    setDealValue("repairsTotal", applied);
    setDealValue("costs.repairs_base", applied);
    setDealValue("costs.repairs", applied);
    onDetailedApply?.();
  }, [setDealValue, totalRepairCost, onDetailedApply]);

  return (
    <div className="space-y-4 repairs-scope">
      <RatesMetaBar
        asOf={effectiveAsOf}
        market={effectiveMarket}
        posture={effectivePosture}
        profileName={effectiveProfileName ?? undefined}
        version={effectiveVersion ?? undefined}
        status={ratesStatus}
        error={ratesError}
      />
      <QuickEstimate
        key={repairRates?.profileId ?? "quick-estimate"}
        deal={deal}
        calc={calc}
        setDealValue={setDealValue}
        psfTiers={psfTiers}
        big5Rates={big5Rates}
        onApply={onQuickApply}
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
          <div className="highlight-card col-span-2 md:col-span-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-text-secondary font-bold">
                DETAILED REPAIR SUBTOTAL
              </div>
              <div className="text-xl font-extrabold">
                {fmt$(totalRepairCost, 0)}
              </div>
            </div>
            <Button size="sm" onClick={applyDetailedBudget}>
              Use as Repair Budget
            </Button>
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
