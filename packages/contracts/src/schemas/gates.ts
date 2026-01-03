/**
 * Gate Status Schema — Pure schema module
 *
 * This module exists to break the circular dependency between
 * analyze.ts and riskGatesEnhanced.ts.
 *
 * DO NOT import from ./analyze or ./riskGatesEnhanced here.
 */
import { z } from "zod";

export const GateStatusSchema = z.enum([
  "pass",
  "watch",
  "fail",
  "info_needed",
]);

export type GateStatus = z.infer<typeof GateStatusSchema>;
