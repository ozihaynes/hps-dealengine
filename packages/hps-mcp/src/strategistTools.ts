import { z } from "zod";
import {
  aggregateRiskGates,
  computeKpiSnapshot,
  getKpiSnapshot,
  getRiskGateStats,
  getSandboxSettings,
  type StrategistTimeRange,
  type KpiSnapshot,
  type RiskGateStats,
} from "@hps/agents";

export type TimeRange = StrategistTimeRange;

export type RunLite = {
  id: string;
  deal_id?: string | null;
  created_at?: string | null;
  output?: any;
};

export const kpiSnapshotSchema = z.object({
  dealCount: z.number(),
  runCount: z.number(),
  readyForOfferCount: z.number(),
  spreadBands: z.record(z.string(), z.number()),
  assignmentFeeBands: z.record(z.string(), z.number()),
  timelineUrgency: z.record(z.string(), z.number()),
});
export type KpiSnapshotSchemaType = z.infer<typeof kpiSnapshotSchema>;
export type { KpiSnapshot, RiskGateStats };

export { computeKpiSnapshot, aggregateRiskGates, getKpiSnapshot, getRiskGateStats, getSandboxSettings };
