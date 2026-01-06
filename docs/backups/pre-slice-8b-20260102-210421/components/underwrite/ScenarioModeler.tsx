// apps/hps-dealengine/components/underwrite/ScenarioModeler.tsx

import React, { useState, useMemo } from "react";
import type { Deal, EngineCalculations, SandboxConfig } from "../../types";
import NumericInput from "../ui/NumericInput";
import { fmt$, num } from "../../utils/helpers";
import { HPSEngine } from "../../services/engine";

interface ScenarioModelerProps {
  deal: Deal;
  setDealValue: (path: string, value: any) => void;
  sandbox: SandboxConfig;
  calc: EngineCalculations;
}

/**
 * ScenarioModeler
 *
 * Pixel-parity with .tmp/ui-v2, but hardened so it never crashes if
 * deal.policy / deal.costs are missing or partially populated.
 */
const ScenarioModeler: React.FC<ScenarioModelerProps> = ({
  deal,
  setDealValue, // reserved for future use if we want to sync scenario back into the deal
  sandbox,
  calc,
}) => {
  // Initial scenario inputs derived safely from the deal
  const [scenarioDays, setScenarioDays] = useState<number | null>(
    typeof deal?.policy?.manual_days_to_money === "number"
      ? deal.policy.manual_days_to_money
      : null,
  );
  const [scenarioRepairs, setScenarioRepairs] = useState<number | null>(
    typeof deal?.costs?.repairs_base === "number"
      ? deal.costs.repairs_base
      : null,
  );
  const [scenarioConcessions, setScenarioConcessions] = useState<number | null>(
    typeof deal?.costs?.concessions_pct === "number"
      ? (deal.costs.concessions_pct as number) * 100
      : null,
  );

  const scenarioResult = useMemo(() => {
    // Clone the deal defensively; support undefined / null
    const scenarioDealData: any = JSON.parse(JSON.stringify(deal ?? {}));

    // Normalize nested containers so later writes are always safe
    if (!scenarioDealData.policy) {
      scenarioDealData.policy = {};
    }
    if (!scenarioDealData.costs) {
      scenarioDealData.costs = {};
    }

    // Ensure numeric fields are always numbers (or null where appropriate)
    scenarioDealData.policy.manual_days_to_money =
      scenarioDays === null || typeof scenarioDays === "undefined"
        ? null
        : num(scenarioDays);

    scenarioDealData.costs.repairs_base =
      scenarioRepairs === null ? null : num(scenarioRepairs);
    scenarioDealData.costs.concessions_pct =
      scenarioConcessions === null ? null : num(scenarioConcessions) / 100;

    // Run the deterministic engine with sandbox policy settings
    return HPSEngine.runEngine({ deal: scenarioDealData as Deal }, sandbox);
  }, [deal, scenarioDays, scenarioRepairs, scenarioConcessions, sandbox]);

  const { calculations: scenarioCalc } = scenarioResult;
  // Use the passed-in calc for the "current" baseline
  const originalCalc = calc;

  const renderDelta = (
    original: number,
    scenario: number,
    formatter: (v: number) => string | number = (v) => fmt$(v, 0)
  ) => {
    const delta =
      isFinite(scenario) && isFinite(original) ? scenario - original : Number.NaN;

    if (!isFinite(delta) || Math.abs(delta) < 0.01) {
      return <span className="text-text-secondary/70">—</span>;
    }

    const positive = delta > 0;
    const colorClass = positive ? "text-accent-green" : "text-accent-orange";
    const sign = positive ? "+" : "";

    return (
      <span className={colorClass}>
        {sign}
        {formatter(delta)}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
      {/* Left: Scenario inputs */}
      <div className="md:col-span-1 space-y-4 info-card border border-white/5 p-4">
        <h3 className="font-semibold text-text-primary">Model Scenario</h3>

        <div className="space-y-2">
          <label className="block text-base font-medium text-text-primary">
            Force Days to Money
          </label>
          <NumericInput
            value={scenarioDays}
            onValueChange={setScenarioDays}
            placeholder="e.g., 14"
            className="w-full"
          />
          <p className="text-xs text-text-secondary/70">days</p>
        </div>

        <div className="space-y-2">
          <label className="block text-base font-medium text-text-primary">
            Adjust Repair Budget
          </label>
          <NumericInput
            value={scenarioRepairs}
            onValueChange={setScenarioRepairs}
            placeholder="e.g., 25000"
            className="w-full"
          />
          <p className="text-xs text-text-secondary/70">USD</p>
        </div>

        <div className="space-y-2">
          <label className="block text-base font-medium text-text-primary">
            Adjust Seller Concessions
          </label>
          <NumericInput
            value={scenarioConcessions}
            onValueChange={setScenarioConcessions}
            placeholder="e.g., 2"
            className="w-full"
          />
          <p className="text-xs text-text-secondary/70">%</p>
        </div>
      </div>

      {/* Right: Scenario vs Current comparison */}
      <div className="md:col-span-2 info-card p-4 border border-white/5">
        <h3 className="font-semibold text-text-primary mb-3">
          Scenario Outcome vs. Current
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-text-primary/10">
              <th className="text-left pb-2 label-xs">Metric</th>
              <th className="text-right pb-2 label-xs">Current Deal</th>
              <th className="text-right pb-2 label-xs">Scenario</th>
              <th className="text-right pb-2 label-xs">Delta</th>
            </tr>
          </thead>
          <tbody>
            {/* Instant Cash Offer */}
            <tr>
              <td className="py-2 font-semibold">Instant Cash Offer</td>
              <td className="py-2 text-right font-mono">
                {fmt$(originalCalc.instantCashOffer, 0)}
              </td>
              <td className="py-2 text-right font-mono font-bold text-lg text-yellow-300">
                {fmt$(scenarioCalc.instantCashOffer, 0)}
              </td>
              <td className="py-2 text-right font-mono">
                {renderDelta(
                  originalCalc.instantCashOffer,
                  scenarioCalc.instantCashOffer
                )}
              </td>
            </tr>

            {/* Net to Seller */}
            <tr className="border-t border-text-primary/10">
              <td className="py-2 font-semibold">Net to Seller</td>
              <td className="py-2 text-right font-mono">
                {fmt$(originalCalc.netToSeller, 0)}
              </td>
              <td className="py-2 text-right font-mono font-bold text-lg text-yellow-300">
                {fmt$(scenarioCalc.netToSeller, 0)}
              </td>
              <td className="py-2 text-right font-mono">
                {renderDelta(originalCalc.netToSeller, scenarioCalc.netToSeller)}
              </td>
            </tr>

            {/* Days to Money */}
            <tr className="border-t border-text-primary/10">
              <td className="py-2 font-semibold text-text-secondary/70">
                Days to Money
              </td>
              <td className="py-2 text-right font-mono text-text-secondary/70">
                {originalCalc.urgencyDays > 0
                  ? `${originalCalc.urgencyDays}d`
                  : "—"}
              </td>
              <td className="py-2 text-right font-mono text-text-secondary/70">
                {scenarioCalc.urgencyDays > 0
                  ? `${scenarioCalc.urgencyDays}d`
                  : "—"}
              </td>
              <td className="py-2 text-right font-mono">
                {renderDelta(
                  originalCalc.urgencyDays,
                  scenarioCalc.urgencyDays,
                  (v) => `${Math.round(v)}d`
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScenarioModeler;
