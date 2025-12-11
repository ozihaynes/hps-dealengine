import { kbSearchStrategist } from "@hps/agents";
import type { KbChunk } from "@hps/agents";
import { z } from "zod";

export const kbChunkSchema = z.object({
  docId: z.string(),
  trustTier: z.number(),
  heading: z.string().optional(),
  text: z.string(),
});
export type { KbChunk };

export async function kbSearch(params: {
  query: string;
  category?: string;
  trustTierMax?: number;
  limit?: number;
}): Promise<KbChunk[]> {
  const { limit = 10, ...rest } = params;
  return kbSearchStrategist({ ...rest, limit });
}
