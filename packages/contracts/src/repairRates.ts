import { z } from "zod";

/**
 * Contract for requesting repair rates from v1-repair-rates.
 * dealId is preferred to anchor org resolution to the active deal.
 */
export const repairRatesRequestSchema = z.object({
  dealId: z.string().uuid(),
  profileId: z.string().uuid().nullable(),
  marketCode: z.string(),
  posture: z.string(),
});

export type RepairRatesRequest = z.infer<typeof repairRatesRequestSchema>;
