import { z } from "zod";
import { Postures } from "./posture";

export const RepairPsfTiersSchema = z.object({
  none: z.number().nonnegative().default(0),
  light: z.number().nonnegative().default(0),
  medium: z.number().nonnegative().default(0),
  heavy: z.number().nonnegative().default(0),
});

export const RepairBig5Schema = z.object({
  roof: z.number().nonnegative().default(0),
  hvac: z.number().nonnegative().default(0),
  repipe: z.number().nonnegative().default(0),
  electrical: z.number().nonnegative().default(0),
  foundation: z.number().nonnegative().default(0),
});

// Allow either flat item->number or nested group->(item->number) maps.
export const RepairLineItemRatesSchema = z.record(
  z.string(),
  z.union([z.number(), z.record(z.string(), z.number())]),
);

export const RepairRateProfileSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  name: z.string().min(1),
  marketCode: z.string().min(1),
  posture: z.enum(Postures).default("base"),
  asOf: z.string().min(1),
  source: z.string().optional().nullable(),
  version: z.string().min(1),
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  psfTiers: RepairPsfTiersSchema,
  big5: RepairBig5Schema,
  lineItemRates: RepairLineItemRatesSchema.optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});

export const RepairRatesSchema = z.object({
  orgId: z.string().uuid(),
  profileId: z.string().uuid().optional(),
  profileName: z.string().optional(),
  marketCode: z.string().min(1),
  posture: z.enum(Postures).default("base"),
  asOf: z.string().min(1),
  source: z.string().optional().nullable(),
  version: z.string().min(1),
  isDefault: z.boolean().optional(),
  psfTiers: RepairPsfTiersSchema,
  big5: RepairBig5Schema,
  lineItemRates: RepairLineItemRatesSchema.optional(),
});

export const RepairProfileCreateInputSchema = z.object({
  dealId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  name: z.string().min(1),
  marketCode: z.string().min(1),
  posture: z.enum(Postures).optional().default("base"),
  asOf: z.string().min(1),
  source: z.string().optional().nullable(),
  version: z.string().min(1),
  psfTiers: RepairPsfTiersSchema,
  big5: RepairBig5Schema,
  lineItemRates: RepairLineItemRatesSchema.optional(),
  cloneFromId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const RepairProfileUpdateInputSchema = z.object({
  dealId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  asOf: z.string().min(1).optional(),
  source: z.string().optional().nullable(),
  version: z.string().min(1).optional(),
  psfTiers: RepairPsfTiersSchema.optional(),
  big5: RepairBig5Schema.optional(),
  lineItemRates: RepairLineItemRatesSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const RepairProfileListQuerySchema = z.object({
  dealId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  marketCode: z.string().optional(),
  posture: z.enum(Postures).optional(),
  includeInactive: z.boolean().optional(),
});

export type RepairPsfTiers = z.infer<typeof RepairPsfTiersSchema>;
export type RepairBig5 = z.infer<typeof RepairBig5Schema>;
export type RepairLineItemRates = z.infer<typeof RepairLineItemRatesSchema>;
export type RepairRateProfile = z.infer<typeof RepairRateProfileSchema>;
export type RepairRates = z.infer<typeof RepairRatesSchema>;
export type RepairProfileCreateInput = z.infer<
  typeof RepairProfileCreateInputSchema
>;
export type RepairProfileUpdateInput = z.infer<
  typeof RepairProfileUpdateInputSchema
>;
export type RepairProfileListQuery = z.infer<
  typeof RepairProfileListQuerySchema
>;
