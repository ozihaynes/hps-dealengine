import { z } from "zod";
import { Postures } from "./posture";

// Minimal schema to satisfy current UI reads in UnderwriteTab.
// We will expand this in P02 when we migrate settings to Supabase.
export const SettingsSchema = z.object({
  version: z.string().default("v1"),

  // Used for placeholders in UnderwriteTab (Safety on AIV)
  aivSafetyCapPercentage: z.number().optional(),

  // Used for policy-driven min spread by ARV band (currently optional in UI)
  minSpreadByArvBand: z.array(
    z.object({
      maxArv: z.number(),
      minSpread: z.number()
    })
  ).default([]),

  // Used to compute default % placeholders for commissions/sell-close/concessions
  listingCostModelSellerCostLineItems: z.array(
    z.object({
      item: z.string(),
      defaultPct: z.number().optional()
    })
  ).default([]),

  // Future-proofing: where tokenized knobs live (<AIV_CAP_PCT>, etc.)
  tokens: z.record(z.string(), z.unknown()).default({}),

  // Optional: a posture tag we can expand on later
  posture: z.enum(Postures).default("base")
});

export type Settings = z.infer<typeof SettingsSchema>;

// Keep defaults minimal—UI has its own numeric fallbacks.
// This ensures nothing crashes even if you haven't authored sandboxSettings yet.
export const policyDefaults: Settings = SettingsSchema.parse({
  version: "v1",
  minSpreadByArvBand: [],
  listingCostModelSellerCostLineItems: [],
  tokens: {}
});