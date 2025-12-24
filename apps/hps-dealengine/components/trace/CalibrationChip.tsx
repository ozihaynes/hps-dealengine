import React from "react";

type CalibrationInput = {
  applied?: boolean;
  reason?: string | null;
  bucket?: {
    market_key?: string | null;
    home_band?: string | null;
  } | null;
  weights_version?: number | null;
  weights_vector?: Array<{ strategy?: string | null; weight?: number | null }> | null;
  contributions?: Array<{
    strategy?: string | null;
    estimate?: number | null;
    weight?: number | null;
    contribution?: number | null;
  }> | null;
};

type CalibrationWeight = { strategy: string; weight: number };
type CalibrationContribution = { strategy: string; estimate: number; weight: number; contribution: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};

const sortByStrategy = <T extends { strategy: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => a.strategy.localeCompare(b.strategy));

const extractWeights = (value: unknown): CalibrationWeight[] => {
  if (!Array.isArray(value)) return [];
  const rows: CalibrationWeight[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const strategy = asString(entry.strategy);
    const weight = asNumber(entry.weight);
    if (!strategy || weight == null) continue;
    rows.push({ strategy, weight });
  }
  return sortByStrategy(rows);
};

const extractContributions = (value: unknown): CalibrationContribution[] => {
  if (!Array.isArray(value)) return [];
  const rows: CalibrationContribution[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const strategy = asString(entry.strategy);
    const estimate = asNumber(entry.estimate);
    const weight = asNumber(entry.weight);
    const contribution = asNumber(entry.contribution);
    if (!strategy || estimate == null || weight == null || contribution == null) continue;
    rows.push({ strategy, estimate, weight, contribution });
  }
  return sortByStrategy(rows);
};

const formatWeight = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatNumber = (value: number): string => value.toFixed(0);

export default function CalibrationChip({ calibration }: { calibration: unknown | null }) {
  const payload = isRecord(calibration) ? (calibration as CalibrationInput) : null;
  const applied = typeof payload?.applied === "boolean" ? payload.applied : null;

  if (applied == null) {
    return (
      <p className="text-[11px] text-text-secondary" data-testid="trace-calibration-missing">
        No calibration metadata on this run.
      </p>
    );
  }

  if (!applied) {
    const reason = asString(payload?.reason) ?? "not applied";
    return (
      <div
        className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100"
        data-testid="trace-calibration-skipped"
      >
        Calibration skipped: {reason}
      </div>
    );
  }

  const bucket = isRecord(payload?.bucket) ? payload?.bucket : null;
  const marketKey = asString(bucket?.market_key);
  const homeBand = asString(bucket?.home_band);
  const version = asNumber(payload?.weights_version);
  const weights = extractWeights(payload?.weights_vector);
  const contributions = extractContributions(payload?.contributions);
  const hasDetails = weights.length > 0 || contributions.length > 0;
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="space-y-2" data-testid="trace-calibration-applied">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-green-400/40 bg-green-500/10 px-2 py-0.5 text-[11px] text-green-200">
          Applied
        </span>
        <span className="text-[11px] text-text-secondary font-mono">
          Weights v{version ?? "-"} | {marketKey ?? "-"} | {homeBand ?? "-"}
        </span>
      </div>

      {hasDetails ? (
        <button
          type="button"
          className="text-[11px] text-accent-blue hover:underline"
          onClick={() => setExpanded((prev) => !prev)}
          data-testid="trace-calibration-details-toggle"
          aria-expanded={expanded}
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      ) : null}

      {expanded && hasDetails ? (
        <div className="space-y-3 text-[11px]">
          {weights.length > 0 ? (
            <div>
              <p className="label-xxs uppercase text-text-secondary mb-1">Weights vector</p>
              <div className="rounded border border-white/10 bg-white/5 px-2 py-1">
                {weights.map((row) => (
                  <div key={row.strategy} className="flex items-center justify-between">
                    <span className="font-mono text-text-primary">{row.strategy}</span>
                    <span className="font-mono text-text-primary">{formatWeight(row.weight)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {contributions.length > 0 ? (
            <div>
              <p className="label-xxs uppercase text-text-secondary mb-1">Contributions</p>
              <div className="overflow-auto rounded border border-white/10 bg-white/5">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-white/5 text-[10px] uppercase text-text-secondary">
                    <tr>
                      <th className="px-2 py-1 text-left">Strategy</th>
                      <th className="px-2 py-1 text-right">Estimate</th>
                      <th className="px-2 py-1 text-right">Weight</th>
                      <th className="px-2 py-1 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map((row) => (
                      <tr key={row.strategy} className="border-t border-white/10">
                        <td className="px-2 py-1 font-mono text-text-primary">{row.strategy}</td>
                        <td className="px-2 py-1 text-right font-mono text-text-primary">
                          {formatNumber(row.estimate)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-text-primary">
                          {formatWeight(row.weight)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono text-text-primary">
                          {formatNumber(row.contribution)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
