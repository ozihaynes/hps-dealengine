import type { ValuationRun } from "@hps-internal/contracts";

export type StrategyEstimate = { strategy: string; estimate: number };

export type StrategyExtractionResult =
  | { ok: true; strategies: StrategyEstimate[] }
  | { ok: false; reason: string; missing?: string[] };

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function extractCalibrationStrategiesFromRun(
  run?: Pick<ValuationRun, "output"> | null,
): StrategyExtractionResult {
  if (!run?.output) {
    return { ok: false, reason: "missing_run_output" };
  }

  const output = run.output as Record<string, unknown>;
  const candidates = [
    { strategy: "comps_v1", estimate: output.ensemble_comp_estimate ?? output.suggested_arv },
    { strategy: "avm", estimate: output.ensemble_avm_estimate ?? output.avm_reference_price },
  ];

  const strategies: StrategyEstimate[] = [];
  const missing: string[] = [];

  for (const candidate of candidates) {
    const estimate = toFiniteNumber(candidate.estimate);
    if (estimate == null) {
      missing.push(candidate.strategy);
      continue;
    }
    strategies.push({ strategy: candidate.strategy, estimate });
  }

  if (strategies.length < 2) {
    return { ok: false, reason: "insufficient_strategies", missing };
  }

  const sorted = [...strategies].sort((a, b) => a.strategy.localeCompare(b.strategy));
  return { ok: true, strategies: sorted };
}
